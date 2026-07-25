import { beforeEach, describe, expect, test, vi } from 'vitest'

/**
 * A regra que este arquivo protege: som de partida NÃO sobrevive à partida.
 * A torcida toca em loop, então sem um "stop" explícito ela seguia tocando
 * no menu depois do jogo.
 */

interface FakeNode {
  start: ReturnType<typeof vi.fn>
  stop: ReturnType<typeof vi.fn>
  connect: (node: unknown) => unknown
  onended: (() => void) | null
  loop: boolean
  buffer: unknown
}

const created: FakeNode[] = []

const makeNode = (): FakeNode => {
  const node: FakeNode = {
    start: vi.fn(),
    stop: vi.fn(),
    connect: (next: unknown) => next,
    onended: null,
    loop: false,
    buffer: null,
  }
  created.push(node)
  return node
}

class FakeAudioContext {
  currentTime = 0
  destination = {}
  sampleRate = 48000
  createGain = () => ({
    gain: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: (next: unknown) => next,
  })
  createBufferSource = () => makeNode()
  createOscillator = () => ({
    ...makeNode(),
    type: 'sine',
    frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
  })
  createBiquadFilter = () => ({
    type: 'bandpass',
    Q: { value: 0 },
    frequency: { value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
    connect: (next: unknown) => next,
  })
  createBuffer = (_ch: number, len: number) => ({ getChannelData: () => new Float32Array(len) })
  decodeAudioData = async () => ({ duration: 1 })
}

/** Sample decodificado na hora: o loop da torcida começa de verdade. */
const stubEnvironment = (): void => {
  vi.stubGlobal('AudioContext', FakeAudioContext)
  vi.stubGlobal('fetch', vi.fn(async () => ({ arrayBuffer: async () => new ArrayBuffer(8) })))
}

const loadAudio = async () => {
  vi.resetModules()
  created.length = 0
  stubEnvironment()
  const audio = await import('./audio')
  audio.initAudio()
  // deixa as promises de fetch/decode resolverem
  await new Promise((resolve) => setTimeout(resolve, 0))
  return audio
}

beforeEach(() => {
  vi.unstubAllGlobals()
})

describe('ciclo de vida do som da partida', () => {
  test('startAmbience liga a torcida em LOOP', async () => {
    // Arrange
    const audio = await loadAudio()

    // Act
    audio.startAmbience()

    // Assert
    const looping = created.filter((node) => node.loop)
    expect(looping.length).toBeGreaterThan(0)
    expect(looping[0].start).toHaveBeenCalled()
  })

  test('stopMatchAudio cala a torcida ao sair do gramado', async () => {
    // Arrange
    const audio = await loadAudio()
    audio.startAmbience()
    const looping = created.filter((node) => node.loop)

    // Act
    audio.stopMatchAudio()

    // Assert
    for (const node of looping) expect(node.stop).toHaveBeenCalled()
  })

  test('efeito disparado no último lance não vaza para o menu', async () => {
    // Arrange
    const audio = await loadAudio()
    audio.startAmbience()
    audio.playStageEvent('goal')
    const soundingBefore = created.filter((node) => node.start.mock.calls.length > 0)

    // Act
    audio.stopMatchAudio()

    // Assert: tudo que estava soando foi interrompido
    expect(soundingBefore.length).toBeGreaterThan(1)
    for (const node of soundingBefore) expect(node.stop).toHaveBeenCalled()
  })

  test('voltar ao gramado religa a torcida depois de ter parado', async () => {
    // Arrange
    const audio = await loadAudio()
    audio.startAmbience()
    audio.stopMatchAudio()
    const before = created.filter((node) => node.loop).length

    // Act
    audio.startAmbience()

    // Assert
    expect(created.filter((node) => node.loop).length).toBeGreaterThan(before)
  })

  test('startAmbience repetido não empilha torcida em cima de torcida', async () => {
    // Arrange
    const audio = await loadAudio()

    // Act: o efeito pode rodar de novo (StrictMode) sem parar antes
    audio.startAmbience()
    audio.startAmbience()
    audio.startAmbience()

    // Assert
    expect(created.filter((node) => node.loop)).toHaveLength(1)
  })

  test('stopMatchAudio sem nada tocando não quebra', async () => {
    const audio = await loadAudio()
    expect(() => audio.stopMatchAudio()).not.toThrow()
  })
})
