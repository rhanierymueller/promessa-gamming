import * as THREE from 'three'
import type { KeeperPose, StrikerPose } from '../assets'

/**
 * Jogador estilizado para a cena 3D do lance.
 *
 * Não é um modelo importado: é montado de primitivas, mas com o que faz um
 * boneco parecer gente e não um cano — tronco modelado, ombros, cotovelos e
 * joelhos que dobram, mãos, chuteira, meião, rosto e cabelo. Sombreamento
 * cel (toon) e contorno escuro dão o acabamento de desenho, que combina com
 * o resto do jogo e esconde a simplicidade da geometria.
 *
 * O movimento não pula entre poses: cada junta segue o alvo por uma MOLA
 * levemente subamortecida, então há antecipação, um resto de balanço e as
 * partes chegam em tempos diferentes. Por cima entram respiração, troca de
 * peso, cabeça seguindo a bola e squash no impacto — o que separa um boneco
 * posado de um que parece vivo.
 *
 * Convenção de eixos do boneco: frente = −z, origem nos pés.
 */

export interface FigureColors {
  readonly kit: string
  readonly shorts?: string
  readonly socks?: string
  readonly skin?: string
  readonly hair?: string
  /** Luvas de goleiro: mãos maiores nesta cor. */
  readonly gloves?: string
  /** Número nas costas. */
  readonly number?: string
}

export interface FigurePose {
  /** Tombo lateral (rad). Positivo tomba para a esquerda do boneco. */
  readonly roll?: number
  /** Inclinação para a frente (rad). */
  readonly lean?: number
  /** 0 em pé, 1 agachado: dobra joelhos e quadril, abaixa o corpo. */
  readonly crouch?: number
  /** Braço à frente (rad). */
  readonly armL?: number
  readonly armR?: number
  /** Braço aberto/levantado pelo lado (rad; π = braço no alto). */
  readonly spreadL?: number
  readonly spreadR?: number
  /** Cotovelo dobrado (rad). */
  readonly elbowL?: number
  readonly elbowR?: number
  /** Coxa à frente (rad). */
  readonly legL?: number
  readonly legR?: number
  /** Joelho dobrado (rad). */
  readonly kneeL?: number
  readonly kneeR?: number
  /** Cabeça baixa (rad, positivo olha para o chão). */
  readonly head?: number
  /** Achatamento do corpo (0..0.15): impacto, aterrissagem. */
  readonly squash?: number
  /** Quanto a cabeça segue o alvo do olhar (0..1). */
  readonly track?: number
  /** Quanto o corpo "respira" e troca de peso (0..1). */
  readonly alive?: number
}

type PoseValues = Required<FigurePose>

const REST: PoseValues = {
  roll: 0,
  lean: 0,
  crouch: 0,
  armL: 0,
  armR: 0,
  spreadL: 0.12,
  spreadR: 0.12,
  elbowL: 0.2,
  elbowR: 0.2,
  legL: 0,
  legR: 0,
  kneeL: 0,
  kneeR: 0,
  head: 0,
  squash: 0,
  track: 1,
  alive: 1,
}

const KEYS = Object.keys(REST) as (keyof PoseValues)[]

/** Rigidez da mola: quanto maior, mais rápido a junta chega ao alvo. */
export const STIFFNESS = {
  /** Espera, caminhada, lamento. */
  calmo: 140,
  /** Corrida, comemoração. */
  vivo: 300,
  /** Mergulho, chute: precisa chegar a tempo do lance. */
  explosivo: 520,
} as const

/** Abaixo de 1 a mola passa do alvo e volta: é esse resto que dá vida. */
const DAMPING_RATIO = 0.72

// ─── materiais ───────────────────────────────────────────────────────────────

let gradientMap: THREE.DataTexture | null = null

/** Quatro tons: é o que dá o degrau de luz do desenho animado. */
const toonGradient = (): THREE.DataTexture => {
  if (gradientMap) return gradientMap
  const data = new Uint8Array([90, 150, 215, 255])
  gradientMap = new THREE.DataTexture(data, 4, 1, THREE.RedFormat)
  gradientMap.minFilter = THREE.NearestFilter
  gradientMap.magFilter = THREE.NearestFilter
  gradientMap.needsUpdate = true
  return gradientMap
}

const toon = (color: string): THREE.MeshToonMaterial =>
  new THREE.MeshToonMaterial({ color, gradientMap: toonGradient() })

const OUTLINE = new THREE.MeshBasicMaterial({ color: '#1a1428', side: THREE.BackSide })

/** Contorno de cartoon: a mesma malha, virada do avesso e um pouco maior. */
const outlined = (mesh: THREE.Mesh, thickness = 1.07): THREE.Mesh => {
  const hull = new THREE.Mesh(mesh.geometry, OUTLINE)
  hull.scale.setScalar(thickness)
  mesh.add(hull)
  mesh.castShadow = true
  return mesh
}

const numberTexture = (text: string): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.clearRect(0, 0, 128, 128)
    ctx.font = 'bold 96px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineWidth = 10
    ctx.strokeStyle = '#1a1428'
    ctx.strokeText(text, 64, 68)
    ctx.fillStyle = '#f6f6f6'
    ctx.fillText(text, 64, 68)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

// ─── partes ──────────────────────────────────────────────────────────────────

const capsule = (r: number, length: number, material: THREE.Material): THREE.Mesh =>
  outlined(new THREE.Mesh(new THREE.CapsuleGeometry(r, length, 4, 12), material))

const sphere = (r: number, material: THREE.Material, thickness?: number): THREE.Mesh =>
  outlined(new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), material), thickness)

/** Tronco torneado: ombros largos, cintura mais fina, quadril. */
const torsoGeometry = (): THREE.LatheGeometry => {
  const profile: [number, number][] = [
    [0.13, 0],
    [0.2, 0.03],
    [0.205, 0.14],
    [0.195, 0.3],
    [0.225, 0.44],
    [0.235, 0.52],
    [0.19, 0.57],
    [0.08, 0.6],
    [0, 0.6],
  ]
  return new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 22)
}

interface Limb {
  readonly pivot: THREE.Group
  readonly joint: THREE.Group
}

/** Membro em dois segmentos: pivô de cima (ombro/quadril) e articulação (cotovelo/joelho). */
const limb = (
  upper: { r: number; length: number; material: THREE.Material },
  lower: { r: number; length: number; material: THREE.Material },
  end: THREE.Mesh,
): Limb => {
  const pivot = new THREE.Group()
  const upperMesh = capsule(upper.r, upper.length, upper.material)
  upperMesh.position.y = -upper.length / 2
  pivot.add(upperMesh)

  const joint = new THREE.Group()
  joint.position.y = -upper.length
  const lowerMesh = capsule(lower.r, lower.length, lower.material)
  lowerMesh.position.y = -lower.length / 2
  end.position.y = -lower.length
  joint.add(lowerMesh, end)
  pivot.add(joint)
  return { pivot, joint }
}

// ─── mola ────────────────────────────────────────────────────────────────────

class Spring {
  value: number
  private velocity = 0

  constructor(value: number) {
    this.value = value
  }

  /** Integra a mola até o alvo; `dt` já vem aparado por quem chama. */
  step(target: number, dt: number, stiffness: number): void {
    const damping = 2 * DAMPING_RATIO * Math.sqrt(stiffness)
    const accel = stiffness * (target - this.value) - damping * this.velocity
    this.velocity += accel * dt
    this.value += this.velocity * dt
  }

  snap(target: number): void {
    this.value = target
    this.velocity = 0
  }
}

const HEAD_HEIGHT = 1.52
const MAX_DT = 1 / 30

export class Figure {
  readonly group = new THREE.Group()
  private readonly body = new THREE.Group()
  private readonly kit: THREE.MeshToonMaterial
  private readonly socks: THREE.MeshToonMaterial
  private readonly head: THREE.Group
  private readonly armL: Limb
  private readonly armR: Limb
  private readonly legL: Limb
  private readonly legR: Limb
  private readonly springs: Record<keyof PoseValues, Spring>
  private readonly gaze = { yaw: new Spring(0), pitch: new Spring(0) }
  private lookTarget: THREE.Vector3 | null = null
  private readonly scratch = new THREE.Vector3()
  private started = false

  constructor(colors: FigureColors) {
    this.kit = toon(colors.kit)
    this.socks = toon(colors.socks ?? colors.kit)
    const skin = toon(colors.skin ?? '#c98a5b')
    const shorts = toon(colors.shorts ?? '#f4f4f4')
    const hair = toon(colors.hair ?? '#2b1d14')
    const shoe = toon('#1f1b24')
    const white = toon('#f6f6f6')

    // tronco, gola e calção
    const torso = outlined(new THREE.Mesh(torsoGeometry(), this.kit), 1.05)
    torso.position.y = 0.7
    const collar = outlined(new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.028, 8, 18), white))
    collar.rotation.x = Math.PI / 2
    collar.position.y = 1.3
    const trunks = outlined(
      new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.225, 0.24, 18), shorts),
      1.05,
    )
    trunks.position.y = 0.6

    // cabeça: crânio, cabelo com franja, olhos
    this.head = new THREE.Group()
    this.head.position.y = 1.36
    const skull = sphere(0.2, skin, 1.06)
    skull.position.y = 0.16
    const cap = outlined(
      new THREE.Mesh(new THREE.SphereGeometry(0.212, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.52), hair),
      1.04,
    )
    cap.position.set(0, 0.17, 0.01)
    cap.rotation.x = -0.25
    const fringe = outlined(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.09, 0.1), hair), 1.04)
    fringe.position.set(0, 0.28, -0.15)
    fringe.rotation.x = 0.35
    const eyeMat = new THREE.MeshBasicMaterial({ color: '#f8f8f8' })
    const pupilMat = new THREE.MeshBasicMaterial({ color: '#1a1428' })
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 8), eyeMat)
      eye.position.set(side * 0.075, 0.17, -0.17)
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), pupilMat)
      pupil.position.set(side * 0.075, 0.17, -0.2)
      this.head.add(eye, pupil)
    }
    this.head.add(skull, cap, fringe)

    // braços: manga (kit) até o cotovelo, antebraço de pele, mão ou luva
    const hand = (): THREE.Mesh =>
      colors.gloves ? sphere(0.08, toon(colors.gloves)) : sphere(0.058, skin)
    this.armL = limb(
      { r: 0.06, length: 0.27, material: this.kit },
      { r: 0.048, length: 0.24, material: skin },
      hand(),
    )
    this.armR = limb(
      { r: 0.06, length: 0.27, material: this.kit },
      { r: 0.048, length: 0.24, material: skin },
      hand(),
    )
    this.armL.pivot.position.set(-0.25, 1.2, 0)
    this.armR.pivot.position.set(0.25, 1.2, 0)
    for (const side of [-1, 1]) {
      const shoulder = sphere(0.085, this.kit)
      shoulder.position.set(side * 0.24, 1.2, 0)
      this.body.add(shoulder)
    }

    // pernas: coxa de pele, meião, chuteira
    const boot = (): THREE.Mesh => {
      const mesh = outlined(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.24), shoe), 1.06)
      mesh.position.z = -0.05
      return mesh
    }
    this.legL = limb(
      { r: 0.075, length: 0.3, material: skin },
      { r: 0.062, length: 0.27, material: this.socks },
      boot(),
    )
    this.legR = limb(
      { r: 0.075, length: 0.3, material: skin },
      { r: 0.062, length: 0.27, material: this.socks },
      boot(),
    )
    this.legL.pivot.position.set(-0.1, 0.62, 0)
    this.legR.pivot.position.set(0.1, 0.62, 0)

    this.body.add(
      torso, collar, trunks, this.head,
      this.armL.pivot, this.armR.pivot, this.legL.pivot, this.legR.pivot,
    )

    if (colors.number) {
      const back = new THREE.Mesh(
        new THREE.PlaneGeometry(0.26, 0.26),
        new THREE.MeshBasicMaterial({ map: numberTexture(colors.number), transparent: true }),
      )
      back.position.set(0, 1.08, 0.215)
      this.body.add(back)
    }

    this.group.add(this.body)
    this.group.scale.setScalar(1.05)

    this.springs = Object.fromEntries(
      KEYS.map((key) => [key, new Spring(REST[key])]),
    ) as Record<keyof PoseValues, Spring>
  }

  setKit(color: string): void {
    this.kit.color.set(color)
    this.socks.color.set(color)
  }

  /** Para onde a cabeça olha (coordenadas do mundo); null = para a frente. */
  lookAt(target: THREE.Vector3 | null): void {
    this.lookTarget = target
  }

  /**
   * Leva o boneco na direção da pose. Não é imediato: cada junta segue o
   * alvo pela sua mola, com a rigidez pedida — mergulho chega rápido, espera
   * chega mole. `time` alimenta respiração e balanço.
   */
  pose(target: FigurePose, dt: number, time: number, stiffness: number = STIFFNESS.calmo): void {
    const step = Math.min(MAX_DT, Math.max(0, dt))
    const s = this.springs
    for (const key of KEYS) {
      const value = target[key] ?? REST[key]
      // a primeira pose entra sem transição: ninguém "escorrega" até o lugar
      if (!this.started) s[key].snap(value)
      else s[key].step(value, step, stiffness)
    }
    this.started = true
    this.updateGaze(step)
    this.apply(time)
  }

  private updateGaze(dt: number): void {
    let yaw = 0
    let pitch = 0
    if (this.lookTarget) {
      // alvo no espaço do boneco, relativo à cabeça
      const local = this.group.worldToLocal(this.scratch.copy(this.lookTarget))
      local.y -= HEAD_HEIGHT
      const flat = Math.hypot(local.x, local.z)
      // frente é −z: virar para +x pede rotação negativa em y
      yaw = THREE.MathUtils.clamp(-Math.atan2(local.x, -local.z), -0.9, 0.9)
      pitch = THREE.MathUtils.clamp(Math.atan2(local.y, flat), -0.55, 0.6)
    }
    this.gaze.yaw.step(yaw, dt, 90)
    this.gaze.pitch.step(pitch, dt, 90)
  }

  private apply(time: number): void {
    const v = (key: keyof PoseValues): number => this.springs[key].value
    const crouch = v('crouch')
    const alive = THREE.MathUtils.clamp(v('alive'), 0, 1) * (1 - Math.min(1, Math.abs(v('roll'))))
    const track = THREE.MathUtils.clamp(v('track'), 0, 1)

    // respiração e troca de peso: quase nada, mas é o que tira o ar de estátua
    const breath = Math.sin(time * 2.3) * 0.012 * alive
    const sway = Math.sin(time * 0.9) * 0.02 * alive
    const squash = Math.max(-0.2, Math.min(0.2, v('squash')))

    this.body.rotation.set(-v('lean'), 0, v('roll') + sway * 0.6)
    this.body.position.set(sway, -crouch * 0.26 - squash * 0.12, 0)
    this.body.scale.set(1 + squash + breath * 0.3, 1 - squash + breath, 1 + squash)

    // coxa para a frente é +x; joelho dobra o pé para trás (−x)
    this.legL.pivot.rotation.x = v('legL') + crouch * 0.9
    this.legR.pivot.rotation.x = v('legR') + crouch * 0.9
    this.legL.joint.rotation.x = -(v('kneeL') + crouch * 1.5)
    this.legR.joint.rotation.x = -(v('kneeR') + crouch * 1.5)

    const armSway = Math.sin(time * 1.7) * 0.03 * alive
    this.armL.pivot.rotation.set(v('armL') + armSway, 0, -v('spreadL'))
    this.armR.pivot.rotation.set(v('armR') - armSway, 0, v('spreadR'))
    this.armL.joint.rotation.x = v('elbowL')
    this.armR.joint.rotation.x = v('elbowR')

    this.head.rotation.set(
      -v('head') + this.gaze.pitch.value * track,
      this.gaze.yaw.value * track,
      0,
    )
  }
}

// ─── poses ───────────────────────────────────────────────────────────────────

export interface PoseTarget {
  readonly pose: FigurePose
  readonly stiffness: number
}

const reach = (dir: number, amount: number): FigurePose =>
  dir > 0
    ? { spreadR: amount, elbowR: 0.05, spreadL: 0.4, armL: 0.6, elbowL: 0.8 }
    : { spreadL: amount, elbowL: 0.05, spreadR: 0.4, armR: 0.6, elbowR: 0.8 }

const NO_TRACK: FigurePose = { track: 0, alive: 0 }

/** Pose do goleiro a partir da encenação do palco. `dir` é o lado do mergulho. */
export const keeperPoseParams = (pose: KeeperPose, dir: number, time: number): PoseTarget => {
  const roll = (amount: number): number => dir * amount
  switch (pose) {
    case 'crouch':
    case 'step':
      return {
        pose: { crouch: 0.55, lean: 0.3, armL: 0.7, armR: 0.7, elbowL: 1.1, elbowR: 1.1, spreadL: 0.55, spreadR: 0.55, head: -0.15 },
        stiffness: STIFFNESS.calmo,
      }
    case 'jump':
      return {
        pose: { spreadL: 2.9, spreadR: 2.9, elbowL: 0.1, elbowR: 0.1, kneeL: 0.7, kneeR: 0.7, legL: 0.3, legR: 0.3, ...NO_TRACK },
        stiffness: STIFFNESS.explosivo,
      }
    case 'takeoff':
      return {
        pose: { roll: roll(0.6), lean: 0.2, ...reach(dir, 2.7), legL: 0.3, kneeL: 0.5, legR: -0.2, ...NO_TRACK },
        stiffness: STIFFNESS.explosivo,
      }
    case 'diveL':
    case 'diveR':
      return {
        pose: { roll: roll(1.15), ...reach(dir, 2.9), legL: 0.35, kneeL: 0.6, legR: -0.1, kneeR: 0.2, ...NO_TRACK },
        stiffness: STIFFNESS.explosivo,
      }
    case 'fly':
      return {
        pose: { roll: roll(1.5), spreadL: 2.9, spreadR: 2.7, elbowL: 0.05, elbowR: 0.1, legL: 0.1, legR: -0.1, ...NO_TRACK },
        stiffness: STIFFNESS.explosivo,
      }
    case 'punch':
    case 'tip':
      return {
        pose: { roll: roll(1.0), spreadL: 2.85, spreadR: 2.85, elbowL: 0.15, elbowR: 0.15, kneeL: 0.3, kneeR: 0.5, ...NO_TRACK },
        stiffness: STIFFNESS.explosivo,
      }
    case 'saved':
      // aterrissou: o corpo achata e as pernas encolhem em volta da bola
      return {
        pose: { roll: roll(1.5), armL: 1.5, armR: 1.5, elbowL: 1.5, elbowR: 1.5, spreadL: 0.35, spreadR: 0.35, legL: 0.6, kneeL: 0.9, legR: 0.3, kneeR: 0.6, head: 0.4, squash: 0.08, ...NO_TRACK },
        stiffness: STIFFNESS.vivo,
      }
    case 'getup':
      return {
        pose: { roll: roll(0.45), crouch: 0.9, lean: 0.5, armL: 0.9, armR: 0.9, elbowL: 0.6, elbowR: 0.6, squash: 0.04, track: 0 },
        stiffness: STIFFNESS.calmo,
      }
    case 'sad':
      return {
        pose: { head: 0.6, lean: 0.15, elbowL: 0.05, elbowR: 0.05, track: 0 },
        stiffness: STIFFNESS.calmo,
      }
    case 'idle':
    default:
      return {
        pose: { spreadL: 0.3, spreadR: 0.3, elbowL: 0.4, elbowR: 0.4, legL: Math.sin(time) * 0.04 },
        stiffness: STIFFNESS.calmo,
      }
  }
}

/** Ciclo de corrida contínuo: perna de trás dobra o joelho, braço oposto acompanha. */
const runCycle = (phase: number): FigurePose => {
  const s = Math.sin(phase)
  return {
    lean: 0.3,
    legL: s * 0.8,
    legR: -s * 0.8,
    kneeL: s < 0 ? -s * 1.3 : 0.2,
    kneeR: s > 0 ? s * 1.3 : 0.2,
    armL: -s * 0.8,
    armR: s * 0.8,
    elbowL: 1.2,
    elbowR: 1.2,
    spreadL: 0.2,
    spreadR: 0.2,
    alive: 0,
  }
}

/**
 * Pose do batedor a partir da encenação do palco. `runP` é o progresso da
 * corrida (0..1), para o ciclo ser contínuo em vez de quatro quadros.
 */
export const strikerPoseParams = (
  pose: StrikerPose,
  flightT: number,
  time: number,
  runP: number,
): PoseTarget => {
  switch (pose) {
    case 'run':
    case 'run2':
    case 'run3':
    case 'run4':
      return { pose: runCycle(runP * Math.PI * 6), stiffness: STIFFNESS.vivo }
    case 'kick': {
      const swing = Math.min(1, flightT / 0.14)
      return {
        pose: {
          lean: -0.05,
          legR: -0.9 + swing * 2.1,
          kneeR: 1.4 - swing * 1.3,
          legL: 0.15,
          kneeL: 0.25,
          armL: 0.9,
          spreadL: 0.9,
          elbowL: 0.5,
          armR: -0.5,
          spreadR: 0.6,
          elbowR: 0.4,
          // o impacto achata o corpo por um instante
          squash: swing > 0.6 ? 0.07 : 0,
          ...NO_TRACK,
        },
        stiffness: STIFFNESS.explosivo,
      }
    }
    case 'kick2':
      return {
        pose: { lean: 0.2, legR: 1.0, kneeR: 0.15, legL: -0.1, kneeL: 0.3, armL: 0.5, spreadL: 0.8, armR: -0.4, spreadR: 0.5, track: 0 },
        stiffness: STIFFNESS.vivo,
      }
    case 'celebrate':
      return {
        pose: {
          spreadL: 2.9,
          spreadR: 2.9,
          elbowL: 0.3,
          elbowR: 0.3,
          head: -0.35,
          legL: Math.sin(time * 9) * 0.3,
          legR: -Math.sin(time * 9) * 0.3,
          kneeL: 0.4,
          kneeR: 0.4,
          track: 0,
        },
        stiffness: STIFFNESS.vivo,
      }
    case 'lament':
      // mãos na cabeça
      return {
        pose: { spreadL: 2.3, spreadR: 2.3, elbowL: 2.2, elbowR: 2.2, head: 0.6, lean: 0.25, track: 0 },
        stiffness: STIFFNESS.calmo,
      }
    case 'back':
    default:
      return {
        pose: { spreadL: 0.2, spreadR: 0.2, elbowL: 0.3, elbowR: 0.3 },
        stiffness: STIFFNESS.calmo,
      }
  }
}

/** Barreira: braços cruzados protegendo, joelhos flexionados no pulo. */
export const wallPoseParams = (jumping: boolean): PoseTarget => ({
  pose: {
    armL: 1.5,
    armR: 1.5,
    elbowL: 1.6,
    elbowR: 1.6,
    spreadL: 0.25,
    spreadR: 0.25,
    crouch: jumping ? 0 : 0.12,
    kneeL: jumping ? 0.8 : 0,
    kneeR: jumping ? 0.8 : 0,
    legL: jumping ? 0.4 : 0,
    legR: jumping ? 0.4 : 0,
    head: 0.1,
    alive: 0.5,
  },
  stiffness: jumping ? STIFFNESS.explosivo : STIFFNESS.calmo,
})
