import * as THREE from 'three'
import { goalCenter } from '../../engine/shot/config'
import { keeperPoseFor, strikerPoseFor, wallPlacementFor } from '../render'
import { Figure, keeperPoseParams, strikerPoseParams, wallPoseParams } from './figure'
import { ballFlightPosition, CFG, type StageState } from '../stage'

/**
 * Renderizador 3D do lance (TESTE): Three.js no lugar dos PNGs.
 *
 * Lê o MESMO `StageState` que o desenho em pixel — quem decide onde a bola
 * está, qual a pose do goleiro e se a barreira pulou continua sendo
 * `stage.ts`/`render.ts`. Aqui só se traduz o espaço lógico 180×320 para
 * metros e se desenha com luz, sombra e volume.
 *
 * Mapeamento: o gol lógico tem 136 unidades de largura e mede 7,32 m; a
 * distância bola→gol (122 unidades) vale os 11 m do pênalti. Assim as
 * proporções do jogo (alcance do goleiro, altura da barreira) sobrevivem
 * intactas na cena.
 */

/** Metros por unidade lógica (x e altura). */
const S = 7.32 / (CFG.goal.right - CFG.goal.left)
/** Linha do gol no mundo; a marca do pênalti fica em z = 0. */
const GOAL_Z = -11
const DEPTH_UNITS = CFG.ballStartY - CFG.goal.floorY
const GOAL_HEIGHT = CFG.goal.barHeight * S
const GOAL_HALF = 7.32 / 2
/** Bola um pouco maior que a real (0,11 m): a 11 m ela precisa ser legível. */
const BALL_R = 0.16
/** Fundo da rede: mais funda embaixo que em cima, como um gol de verdade. */
const NET_DEPTH_BOTTOM = 2.0
const NET_DEPTH_TOP = 0.9
const NET_BULGE_RADIUS = 1.7
const NET_BULGE_TIME = 0.9

const worldX = (lx: number): number => (lx - goalCenter(CFG)) * S
const worldZ = (groundY: number): number =>
  GOAL_Z + ((groundY - CFG.goal.floorY) / DEPTH_UNITS) * -GOAL_Z
const worldY = (height: number): number => height * S

export interface SceneColors {
  /** Uniforme de quem CHUTA. */
  readonly striker: string
  /** Uniforme do goleiro. */
  readonly keeper: string
  /** Uniforme da barreira (cobrança de falta). */
  readonly wall: string
}

// ─── texturas procedurais ────────────────────────────────────────────────────

const canvasTexture = (
  width: number,
  height: number,
  paint: (ctx: CanvasRenderingContext2D) => void,
): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (ctx) paint(ctx)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/** Gramado com faixas de corte alternadas. */
const grassTexture = (): THREE.CanvasTexture => {
  const texture = canvasTexture(256, 256, (ctx) => {
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#4f9a3c' : '#5aab46'
      ctx.fillRect(0, i * 32, 256, 32)
    }
    // grão sutil para não parecer plástico
    for (let i = 0; i < 1800; i++) {
      ctx.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)'
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2)
    }
  })
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(4, 12)
  return texture
}

/** Bola: branca com gomos escuros. */
const ballTexture = (): THREE.CanvasTexture =>
  canvasTexture(256, 128, (ctx) => {
    ctx.fillStyle = '#f4f1e8'
    ctx.fillRect(0, 0, 256, 128)
    ctx.fillStyle = '#1a1a22'
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 6; col++) {
        const x = col * 42 + (row % 2) * 21 + 21
        const y = row * 42 + 21
        ctx.beginPath()
        for (let k = 0; k < 5; k++) {
          const angle = (Math.PI * 2 * k) / 5 - Math.PI / 2
          const px = x + Math.cos(angle) * 11
          const py = y + Math.sin(angle) * 11
          if (k === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.closePath()
        ctx.fill()
      }
    }
  })

// ─── rede ────────────────────────────────────────────────────────────────────

interface NetPanel {
  readonly base: Float32Array
  readonly lines: THREE.LineSegments
}

/** Profundidade da rede na altura y (rampa do fundo). */
const netDepthAt = (y: number): number =>
  NET_DEPTH_BOTTOM + (NET_DEPTH_TOP - NET_DEPTH_BOTTOM) * (y / GOAL_HEIGHT)

const gridLines = (
  cols: number,
  rows: number,
  point: (u: number, v: number) => [number, number, number],
  material: THREE.Material,
): NetPanel => {
  const points: number[] = []
  const push = (a: [number, number, number], b: [number, number, number]): void => {
    points.push(...a, ...b)
  }
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c < cols; c++) {
      push(point(c / cols, r / rows), point((c + 1) / cols, r / rows))
    }
  }
  for (let c = 0; c <= cols; c++) {
    for (let r = 0; r < rows; r++) {
      push(point(c / cols, r / rows), point(c / cols, (r + 1) / rows))
    }
  }
  const base = new Float32Array(points)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(base.slice(), 3))
  return { base, lines: new THREE.LineSegments(geometry, material) }
}

// ─── a cena ──────────────────────────────────────────────────────────────────

export class ShotScene3D {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera: THREE.PerspectiveCamera
  private readonly ball: THREE.Mesh
  private readonly ballMaterial: THREE.MeshStandardMaterial
  private readonly ballShadow: THREE.Mesh
  private readonly keeper: Figure
  private readonly striker: Figure
  private readonly wall: readonly Figure[]
  private readonly net: readonly NetPanel[]
  private readonly observer: ResizeObserver | null
  private colors: SceneColors
  private disposed = false

  constructor(canvas: HTMLCanvasElement, colors: SceneColors) {
    this.colors = colors
    // fundo transparente: o cenário (torcida, céu) é o PNG do estádio por
    // baixo do canvas, o mesmo do modo pixel — só o campo e os jogadores são 3D
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05

    this.camera = new THREE.PerspectiveCamera(50, 9 / 16, 0.1, 120)

    // luz: céu difuso + sol lateral com sombra
    this.scene.add(new THREE.HemisphereLight('#dbeeff', '#3e7a2c', 0.9))
    const sun = new THREE.DirectionalLight('#fff2d8', 1.7)
    sun.position.set(7, 14, 6)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    sun.shadow.camera.left = -14
    sun.shadow.camera.right = 14
    sun.shadow.camera.top = 14
    sun.shadow.camera.bottom = -18
    sun.shadow.camera.near = 1
    sun.shadow.camera.far = 40
    sun.shadow.bias = -0.0008
    this.scene.add(sun)

    this.buildPitch()
    this.net = this.buildGoal()

    this.ballMaterial = new THREE.MeshStandardMaterial({
      map: ballTexture(),
      roughness: 0.55,
      metalness: 0,
      transparent: true,
    })
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 28, 18), this.ballMaterial)
    this.ball.castShadow = true
    this.scene.add(this.ball)
    // sombra de contato: a sombra do sol fica longe quando a bola sobe
    this.ballShadow = new THREE.Mesh(
      new THREE.CircleGeometry(BALL_R * 1.1, 20),
      new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.35 }),
    )
    this.ballShadow.rotation.x = -Math.PI / 2
    this.scene.add(this.ballShadow)

    this.keeper = new Figure({ kit: colors.keeper, gloves: '#f4f4f4', number: '1' })
    this.keeper.group.rotation.y = Math.PI
    this.striker = new Figure({ kit: colors.striker, number: '10' })
    this.wall = [0, 1, 2].map(() => {
      const figure = new Figure({ kit: colors.wall })
      figure.group.rotation.y = Math.PI
      figure.group.visible = false
      this.scene.add(figure.group)
      return figure
    })
    this.scene.add(this.keeper.group, this.striker.group)

    this.observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => this.resize())
    this.observer?.observe(canvas)
    this.resize()
  }

  setColors(colors: SceneColors): void {
    if (colors === this.colors) return
    this.colors = colors
    this.keeper.setKit(colors.keeper)
    this.striker.setKit(colors.striker)
    for (const figure of this.wall) figure.setKit(colors.wall)
  }

  private buildPitch(): void {
    // o gramado 3D termina logo atrás da rede: dali para cima quem aparece é
    // o PNG do estádio, com a torcida e o céu que o modo pixel já tinha
    const far = GOAL_Z - NET_DEPTH_BOTTOM - 1.2
    const near = 24
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(70, near - far),
      new THREE.MeshLambertMaterial({ map: grassTexture() }),
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.z = (near + far) / 2
    ground.receiveShadow = true
    this.scene.add(ground)

    const lineMat = new THREE.MeshBasicMaterial({ color: '#f6f6f0' })
    const line = (w: number, d: number, x: number, z: number): void => {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lineMat)
      mesh.rotation.x = -Math.PI / 2
      mesh.position.set(x, 0.006, z)
      this.scene.add(mesh)
    }
    const LW = 0.12
    // linha de fundo, pequena área (5,5 m) e grande área (16,5 m)
    line(44, LW, 0, GOAL_Z)
    line(18.32, LW, 0, GOAL_Z + 5.5)
    line(LW, 5.5, -9.16, GOAL_Z + 2.75)
    line(LW, 5.5, 9.16, GOAL_Z + 2.75)
    line(40.32, LW, 0, GOAL_Z + 16.5)
    line(LW, 16.5, -20.16, GOAL_Z + 8.25)
    line(LW, 16.5, 20.16, GOAL_Z + 8.25)
    // marca do pênalti
    const spot = new THREE.Mesh(new THREE.CircleGeometry(0.12, 16), lineMat)
    spot.rotation.x = -Math.PI / 2
    spot.position.set(0, 0.006, 0)
    this.scene.add(spot)
  }

  private buildGoal(): readonly NetPanel[] {
    const postMat = new THREE.MeshStandardMaterial({ color: '#f8f8f4', roughness: 0.35 })
    const R = 0.06
    const post = (x: number, z: number, h: number): void => {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(R, R, h, 14), postMat)
      mesh.position.set(x, h / 2, z)
      mesh.castShadow = true
      this.scene.add(mesh)
    }
    post(-GOAL_HALF, GOAL_Z, GOAL_HEIGHT)
    post(GOAL_HALF, GOAL_Z, GOAL_HEIGHT)
    const bar = new THREE.Mesh(
      new THREE.CylinderGeometry(R, R, 7.32 + R * 2, 14),
      postMat,
    )
    bar.rotation.z = Math.PI / 2
    bar.position.set(0, GOAL_HEIGHT, GOAL_Z)
    bar.castShadow = true
    this.scene.add(bar)
    // suportes traseiros: da trave ao chão, inclinados para trás
    for (const x of [-GOAL_HALF, GOAL_HALF]) {
      const length = Math.hypot(GOAL_HEIGHT, NET_DEPTH_BOTTOM)
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.6, R * 0.6, length, 8), postMat)
      strut.position.set(x, GOAL_HEIGHT / 2, GOAL_Z - NET_DEPTH_BOTTOM / 2)
      strut.rotation.x = Math.atan2(NET_DEPTH_BOTTOM, GOAL_HEIGHT)
      this.scene.add(strut)
    }

    const netMat = new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55 })
    const back = gridLines(26, 10, (u, v) => {
      const y = v * GOAL_HEIGHT
      return [-GOAL_HALF + u * 7.32, y, GOAL_Z - netDepthAt(y)]
    }, netMat)
    const roof = gridLines(26, 3, (u, v) => [
      -GOAL_HALF + u * 7.32,
      GOAL_HEIGHT,
      GOAL_Z - v * NET_DEPTH_TOP,
    ], netMat)
    const sides = [-GOAL_HALF, GOAL_HALF].map((x) =>
      gridLines(6, 10, (u, v) => {
        const y = v * GOAL_HEIGHT
        return [x, y, GOAL_Z - u * netDepthAt(y)]
      }, netMat),
    )
    const panels = [back, roof, ...sides]
    for (const panel of panels) this.scene.add(panel.lines)
    return panels
  }

  private updateNet(state: StageState): void {
    const bulge = state.netBulge && state.netBulge.t < NET_BULGE_TIME ? state.netBulge : null
    const springy = bulge
      ? Math.max(0, 1 - bulge.t / NET_BULGE_TIME) * Math.cos(bulge.t * 14) * 0.6
      : 0
    const bx = bulge ? worldX(bulge.x) : 0
    const by = bulge ? (CFG.goal.floorY - bulge.y) * S : 0
    const time = state.time
    for (const panel of this.net) {
      const attr = panel.lines.geometry.getAttribute('position') as THREE.BufferAttribute
      const out = attr.array as Float32Array
      const base = panel.base
      for (let i = 0; i < base.length; i += 3) {
        const x = base[i]
        const y = base[i + 1]
        const z = base[i + 2]
        // brisa: a rede pendurada respira, mais em cima que embaixo
        const hang = 0.2 + (y / GOAL_HEIGHT) * 0.8
        let dz = Math.sin(time * 1.4 + x * 1.3 + y * 1.7) * 0.03 * hang
        let dx = Math.sin(time * 1.1 + y * 2.1) * 0.012 * hang
        if (bulge) {
          const d = Math.hypot(x - bx, y - by)
          if (d < NET_BULGE_RADIUS) {
            const force = (1 - d / NET_BULGE_RADIUS) * springy
            dz -= force
            dx += ((x - bx) / Math.max(0.01, d)) * force * 0.25
          }
        }
        out[i] = x + dx
        out[i + 1] = y
        out[i + 2] = z + dz
      }
      attr.needsUpdate = true
    }
  }

  resize(): void {
    const canvas = this.renderer.domElement
    const width = canvas.clientWidth || 360
    const height = canvas.clientHeight || 640
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
  }

  private placeCamera(state: StageState): void {
    const ballZ = worldZ(state.ballStartY)
    const shake = state.shake > 0 ? state.shake * 0.012 : 0
    // atrás e acima do batedor: a bola fica no terço de baixo, o gol no de cima
    this.camera.position.set(
      (Math.random() - 0.5) * shake,
      4.6 + (Math.random() - 0.5) * shake,
      ballZ + 9,
    )
    // inclinada para a linha do gol cair a ~44% da altura, onde o PNG do
    // estádio põe o muro da torcida — a trave fica na frente da torcida
    this.camera.lookAt(0, -0.85, GOAL_Z + 1)
  }

  private placeBall(state: StageState): void {
    const { ball, ballShadow, ballMaterial } = this
    ballMaterial.opacity = 1
    ball.visible = true
    ballShadow.visible = true

    if (state.phase === 'ready' || state.phase === 'runup') {
      ball.position.set(worldX(state.ballX), BALL_R, worldZ(state.ballStartY))
      ball.rotation.set(0, 0, 0)
    } else if (state.phase === 'flying') {
      const flight = ballFlightPosition(state)
      if (!flight) {
        ball.visible = false
        ballShadow.visible = false
        return
      }
      const height = flight.groundY - flight.y
      ball.position.set(worldX(flight.x), BALL_R + worldY(height), worldZ(flight.groundY))
      ball.rotation.x = -state.flightT * 14
      ball.rotation.y = state.sim ? state.sim.flight.curve * 0.05 : 0
    } else if (state.phase === 'result' && state.post) {
      const held =
        state.results[state.results.length - 1] === 'save' && !state.sim?.outcome.deflected
      if (held) {
        ball.visible = false
        ballShadow.visible = false
        return
      }
      const fadeStart = state.post.kind === 'post' ? 1.6 : 0.7
      ballMaterial.opacity =
        state.post.t > fadeStart ? Math.max(0, 1 - (state.post.t - fadeStart) / 0.4) : 1
      const z = Math.max(GOAL_Z - NET_DEPTH_BOTTOM + BALL_R, worldZ(state.post.y))
      ball.position.set(worldX(state.post.x), BALL_R, z)
      ball.rotation.x = -state.post.t * 8
    } else {
      ball.visible = false
      ballShadow.visible = false
      return
    }
    ballShadow.position.set(ball.position.x, 0.004, ball.position.z)
    const lift = ball.position.y - BALL_R
    const shadowMat = ballShadow.material as THREE.MeshBasicMaterial
    // some junto com a bola: sombra sem bola parecia uma marca no gramado
    shadowMat.opacity = Math.max(0.08, 0.38 - lift * 0.12) * ballMaterial.opacity
    ballShadow.visible = ballMaterial.opacity > 0.02
    ballShadow.scale.setScalar(1 + lift * 0.35)
  }

  private placeKeeper(state: StageState): void {
    const placement = keeperPoseFor(state)
    const center = goalCenter(CFG)
    const dir =
      placement.pose === 'diveL'
        ? -1
        : placement.pose === 'diveR'
          ? 1
          : placement.flip
            ? -1
            : placement.x < center
              ? -1
              : 1
    this.keeper.pose(keeperPoseParams(placement.pose, dir, state.time))
    this.keeper.group.position.set(worldX(placement.x), worldY(placement.lift), GOAL_Z + 0.5)
  }

  private placeStriker(state: StageState): void {
    const placement = strikerPoseFor(state)
    if (!placement) {
      this.striker.group.visible = false
      return
    }
    this.striker.group.visible = true
    const bounce =
      placement.pose === 'celebrate' ? Math.abs(Math.sin(state.time * 9)) * 0.18 : 0
    this.striker.pose(strikerPoseParams(placement.pose, state.flightT, state.time))
    // os deslocamentos laterais foram calibrados para a câmera do pixel; com a
    // câmera atrás do batedor, metade deles basta para ele não cobrir a régua
    const ballX = state.sim ? state.sim.flight.startX : state.ballX
    const footX = ballX + (placement.footX - ballX) * 0.55
    this.striker.group.position.set(worldX(footX), bounce, worldZ(placement.footY))
    // olha para o gol; ao correr, aponta levemente para a bola
    this.striker.group.rotation.y = placement.pose.startsWith('run') ? 0.35 : 0
  }

  private placeWall(state: StageState): void {
    const placement = wallPlacementFor(state)
    for (const [i, figure] of this.wall.entries()) {
      figure.group.visible = placement !== null
      if (!placement) continue
      const spacing = (i - 1) * 0.52
      figure.pose(wallPoseParams(placement.jumping))
      figure.group.position.set(
        worldX(placement.centerX) + spacing,
        worldY(placement.lift),
        worldZ(placement.groundY),
      )
    }
  }

  render(state: StageState, colors: SceneColors): void {
    if (this.disposed) return
    this.setColors(colors)
    this.placeCamera(state)
    this.updateNet(state)
    this.placeBall(state)
    this.placeKeeper(state)
    this.placeStriker(state)
    this.placeWall(state)
    this.renderer.render(this.scene, this.camera)
  }

  dispose(): void {
    this.disposed = true
    this.observer?.disconnect()
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
        object.geometry.dispose()
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        for (const material of materials) {
          if ('map' in material && material.map instanceof THREE.Texture) material.map.dispose()
          material.dispose()
        }
      }
    })
    this.renderer.dispose()
  }
}
