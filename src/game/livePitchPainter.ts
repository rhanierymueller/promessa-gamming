import { fieldName } from '../data/squadNames'
import { ballLiftFor, ballPointAt, travelProgressFor } from './liveBallPhysics'
import {
  H,
  USER_COLOR,
  W,
  toPitch,
  type SimPlayer,
  type SimState,
  type Vec,
} from './livePitchScene'

/**
 * Tudo que a mesa tática DESENHA.
 *
 * Saiu de `LivePitch.tsx` porque o componente tinha ultrapassado 900 linhas e
 * misturava três responsabilidades: decidir a jogada, mover a bola e pintar o
 * quadro. Aqui fica só a pintura — nenhuma função daqui altera o estado da
 * simulação, elas só leem `sim` e escrevem no canvas.
 */

export interface PitchPainterDeps {
  readonly ctx: CanvasRenderingContext2D
  /** Estado vivo da simulação: o pintor LÊ, nunca escreve. */
  readonly sim: SimState
  readonly teamColor: string
  readonly opponentColor: string
  readonly faceImages: Map<string, HTMLImageElement>
  readonly userFaceImageRef: { current: HTMLImageElement | null }
  /** O gramado é montado quando a textura carrega, então vem como função. */
  readonly pitchCanvas: () => CanvasImageSource
  readonly ballTexture: HTMLImageElement
}

export interface PitchPainter {
  readonly drawPitch: () => void
  readonly drawPlayer: (p: SimPlayer, t: number) => void
  readonly drawLabels: () => void
  readonly drawBall: () => void
}

export const createPitchPainter = ({
  ctx,
  sim,
  teamColor,
  opponentColor,
  faceImages,
  userFaceImageRef,
  pitchCanvas,
  ballTexture,
}: PitchPainterDeps): PitchPainter => {
  const drawPitch = (): void => {
    ctx.drawImage(pitchCanvas(), 0, 0, W, H)
  }

  const drawPlayer = (p: SimPlayer, t: number): void => {
    const pos = toPitch(p.pos)
    const wobble = Math.sin(t * 2 + pos.x) * 0.6
    const color = p.isUser ? USER_COLOR : p.side === 'team' ? teamColor : opponentColor
    const faceImage = p.isUser ? userFaceImageRef.current : p.face ? faceImages.get(p.face.url) : null
    // sombra
    ctx.beginPath()
    ctx.ellipse(pos.x, pos.y + 5, 4.5, 1.6, 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.fill()
    // anel do usuário
    if (p.isUser) {
      ctx.beginPath()
      ctx.arc(pos.x, pos.y + wobble, 8 + Math.sin(t * 4) * 1.2, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255,210,63,0.6)'
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
    // corpo com volume: gradiente radial (luz vinda de cima-esquerda)
    const body = ctx.createRadialGradient(pos.x - 1.6, pos.y + wobble - 1.8, 0.8, pos.x, pos.y + wobble, 5.4)
    body.addColorStop(0, 'rgba(255,255,255,0.85)')
    body.addColorStop(0.25, color)
    body.addColorStop(1, color)
    ctx.beginPath()
    ctx.arc(pos.x, pos.y + wobble, 5, 0, Math.PI * 2)
    ctx.fillStyle = body
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'
    ctx.lineWidth = 1.1
    ctx.stroke()
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'
    ctx.lineWidth = 0.6
    ctx.stroke()

    // Retrato dentro do marcador. Enquanto a imagem carrega, o corpo
    // colorido acima continua sendo um fallback completo.
    if (faceImage?.complete && faceImage.naturalWidth > 0) {
      const radius = p.isUser ? 5.7 : 5
      const diameter = radius * 2
      const xShift = p.isUser ? 0 : p.face?.xShiftPercent ?? 0
      const topCrop = p.isUser ? 0 : p.face?.topCropPercent ?? 0
      const topCropUnits = (diameter * topCrop) / 100
      ctx.save()
      ctx.beginPath()
      ctx.arc(pos.x, pos.y + wobble, radius, 0, Math.PI * 2)
      ctx.clip()
      // Mesmo sendo pixel art, aqui o retrato é REDUZIDO de ~100 px para
      // ~11 px; suavizar preserva olhos e rosto. Pixelado só ajuda ao ampliar.
      ctx.imageSmoothingEnabled = true
      ctx.drawImage(
        faceImage,
        pos.x - radius + (diameter * xShift) / 100,
        pos.y + wobble - radius - topCropUnits,
        diameter,
        diameter + topCropUnits,
      )
      ctx.restore()

      // O aro preserva a leitura imediata de quem joga por cada lado.
      ctx.beginPath()
      ctx.arc(pos.x, pos.y + wobble, p.isUser ? 6.3 : 5.5, 0, Math.PI * 2)
      ctx.strokeStyle = color
      ctx.lineWidth = p.isUser ? 1.8 : 1.4
      ctx.stroke()
    }
  }

  const LABEL_MIN_DX = 26
  const LABEL_MIN_DY = 8

  /** Nomes desenhados por último, empurrando pra baixo quem colidiria. */
  const drawLabels = (): void => {
    const placed: { x: number; y: number }[] = []
    const entries = sim.players
      .map((p) => ({ ...toPitch(p.pos), isUser: p.isUser, label: fieldName(p.name) }))
      .sort((a, b) => a.y - b.y)
    for (const entry of entries) {
      let y = entry.y + 14
      while (placed.some((q) => Math.abs(q.x - entry.x) < LABEL_MIN_DX && Math.abs(q.y - y) < LABEL_MIN_DY)) {
        y += LABEL_MIN_DY
      }
      placed.push({ x: entry.x, y })
      ctx.font = entry.isUser ? 'bold 7.5px monospace' : '7px monospace'
      ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(10,14,10,0.85)'
      ctx.fillText(entry.label, entry.x + 0.7, y + 0.7)
      ctx.fillStyle = entry.isUser ? USER_COLOR : 'rgba(245,240,230,0.92)'
      ctx.fillText(entry.label, entry.x, y)
    }
  }

  const drawBall = (): void => {
    const pos = toPitch(sim.ball)
    const lift = sim.phase === 'ballMoving'
      ? ballLiftFor(sim.ballProgress, sim.ballMotion, sim.ballDistance)
      : 0

    if (sim.phase === 'ballMoving') {
      // Rastro acompanha a curva e a altura em vez de cortar caminho reto.
      const trailLength = sim.ballMotion === 'shot' ? 0.28 : sim.ballMotion === 'lofted-pass' ? 0.2 : 0.1
      const trailStart = Math.max(0, sim.ballProgress - trailLength)
      const steps = 7
      let firstPixel: Vec | null = null
      let lastPixel: Vec | null = null
      ctx.beginPath()
      for (let step = 0; step <= steps; step++) {
        const rawProgress = trailStart + (sim.ballProgress - trailStart) * (step / steps)
        const travelProgress = travelProgressFor(rawProgress, sim.ballMotion)
        const point = ballPointAt(sim.ballFrom, sim.ballTo, travelProgress, sim.ballCurve)
        const pixel = toPitch(point)
        const pointLift = ballLiftFor(rawProgress, sim.ballMotion, sim.ballDistance)
        const liftedPixel = { x: pixel.x, y: pixel.y - 1.2 - pointLift }
        if (step === 0) {
          ctx.moveTo(liftedPixel.x, liftedPixel.y)
          firstPixel = liftedPixel
        } else {
          ctx.lineTo(liftedPixel.x, liftedPixel.y)
        }
        lastPixel = liftedPixel
      }
      if (firstPixel && lastPixel) {
        const trail = ctx.createLinearGradient(firstPixel.x, firstPixel.y, lastPixel.x, lastPixel.y)
        trail.addColorStop(0, 'rgba(245,240,230,0)')
        trail.addColorStop(1, sim.ballMotion === 'shot' ? 'rgba(255,210,63,0.68)' : 'rgba(245,240,230,0.42)')
        ctx.strokeStyle = trail
        ctx.lineWidth = sim.ballMotion === 'shot' ? 1.6 : 1
        ctx.stroke()
      }
    }

    // A sombra encolhe e perde força conforme a bola sobe.
    const shadowScale = Math.max(0.42, 1 - lift * 0.055)
    ctx.beginPath()
    ctx.ellipse(pos.x, pos.y + 1.5, 3 * shadowScale, 1.25 * shadowScale, 0, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(0,0,0,${Math.max(0.12, 0.36 - lift * 0.025)})`
    ctx.fill()
    const ballY = pos.y - 1.2 - lift
    const size = 7.2 + Math.min(1, lift / 8) * 1.2

    if (ballTexture.complete && ballTexture.naturalWidth > 0) {
      ctx.save()
      ctx.translate(pos.x, ballY)
      ctx.rotate(sim.ballRotation)
      ctx.drawImage(ballTexture, -size / 2, -size / 2, size, size)
      ctx.restore()
    } else {
      // Fallback já parece uma bola, não apenas um ponto branco.
      const shine = ctx.createRadialGradient(pos.x - 1, ballY - 1, 0.4, pos.x, ballY, size / 2)
      shine.addColorStop(0, '#FFFFFF')
      shine.addColorStop(1, '#D8D4C8')
      ctx.beginPath()
      ctx.arc(pos.x, ballY, size / 2, 0, Math.PI * 2)
      ctx.fillStyle = shine
      ctx.fill()
      ctx.beginPath()
      ctx.arc(pos.x, ballY, 1.2, 0, Math.PI * 2)
      ctx.fillStyle = '#171717'
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.65)'
      ctx.lineWidth = 0.7
      ctx.stroke()
    }
  }

  return { drawPitch, drawPlayer, drawLabels, drawBall }
}
