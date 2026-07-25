import ambienceUrl from '../assets/audio/ambience.m4a'
import gaspUrl from '../assets/audio/gasp.m4a'
import goalUrl from '../assets/audio/goal.m4a'
import { DEFAULT_VOLUME, effectsGainFor } from '../engine/audio/volume'
import type { StageEvent } from './stage'

type SampleKey = 'goal' | 'gasp' | 'ambience'
const SAMPLE_URLS: Record<SampleKey, string> = { goal: goalUrl, gasp: gaspUrl, ambience: ambienceUrl }

let ac: AudioContext | null = null
let noiseBuf: AudioBuffer | null = null
let masterGain: GainNode | null = null
let gain = effectsGainFor(DEFAULT_VOLUME)

/** Volume de todo o áudio do jogo (canal mestre), de 0 a 1. */
export const setVolume = (volume: number): void => {
  gain = effectsGainFor(volume)
  if (masterGain && ac) {
    masterGain.gain.setValueAtTime(gain, ac.currentTime)
  }
}

const output = (): AudioNode => masterGain ?? ac!.destination
const samples: Partial<Record<SampleKey, AudioBuffer>> = {}

/**
 * Tudo que está soando agora. Sem esse registro nada consegue ser
 * interrompido — foi assim que a torcida em loop seguia tocando no menu
 * depois da partida.
 */
const playing = new Set<AudioScheduledSourceNode>()

const track = <T extends AudioScheduledSourceNode>(node: T): T => {
  playing.add(node)
  node.onended = () => { playing.delete(node) }
  return node
}

/** A torcida de fundo só deve existir enquanto o gramado estiver na tela. */
let ambienceWanted = false
let ambienceSource: AudioBufferSourceNode | null = null

const playSample = (key: SampleKey, vol: number, loop = false): AudioBufferSourceNode | null => {
  const buffer = samples[key]
  if (!ac || !buffer) return null
  const src = ac.createBufferSource()
  src.buffer = buffer
  src.loop = loop
  const gain = ac.createGain()
  gain.gain.value = vol
  src.connect(gain).connect(output())
  src.start()
  return track(src)
}

/** Entra no gramado: liga a torcida de fundo (em loop). */
export const startAmbience = (): void => {
  ambienceWanted = true
  if (ambienceSource) return
  // sem o sample carregado ainda, o loadSample liga assim que decodificar
  ambienceSource = playSample('ambience', 0.07, true)
}

/** Sai do gramado: cala a torcida e qualquer efeito ainda soando. */
export const stopMatchAudio = (): void => {
  ambienceWanted = false
  ambienceSource = null
  for (const node of [...playing]) {
    try {
      node.stop()
    } catch {
      // já terminou sozinho — nada a fazer
    }
  }
  playing.clear()
}

const loadSample = (key: SampleKey, url: string): void => {
  if (!ac) return
  const context = ac
  fetch(url)
    .then((r) => r.arrayBuffer())
    .then((buf) => context.decodeAudioData(buf))
    .then((decoded) => {
      samples[key] = decoded
      // o gramado pediu a torcida antes do sample ficar pronto: liga agora
      if (key === 'ambience' && ambienceWanted && !ambienceSource) {
        ambienceSource = playSample('ambience', 0.07, true)
      }
    })
    .catch(() => { /* síntese cobre */ })
}

/** Precisa ser chamado a partir de um gesto do usuário (política de autoplay). */
export const initAudio = (): void => {
  if (ac) return
  try {
    ac = new AudioContext()
    masterGain = ac.createGain()
    masterGain.gain.value = gain
    masterGain.connect(ac.destination)
    const len = Math.floor(ac.sampleRate * 3)
    noiseBuf = ac.createBuffer(1, len, ac.sampleRate)
    const data = noiseBuf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    for (const [key, url] of Object.entries(SAMPLE_URLS) as [SampleKey, string][]) {
      loadSample(key, url)
    }
  } catch {
    ac = null
  }
}

const beep = (f0: number, f1: number, dur: number, type: OscillatorType, vol: number): void => {
  if (!ac) return
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(f0, ac.currentTime)
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, f1), ac.currentTime + dur)
  gain.gain.setValueAtTime(vol, ac.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur)
  osc.connect(gain).connect(output())
  osc.start()
  osc.stop(ac.currentTime + dur)
  track(osc)
}

const noiseBurst = (dur: number, freq: number, vol: number): void => {
  if (!ac || !noiseBuf) return
  const src = ac.createBufferSource()
  const filter = ac.createBiquadFilter()
  const gain = ac.createGain()
  src.buffer = noiseBuf
  filter.type = 'bandpass'
  filter.frequency.value = freq
  gain.gain.setValueAtTime(vol, ac.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur)
  src.connect(filter).connect(gain).connect(output())
  src.start()
  src.stop(ac.currentTime + dur + 0.05)
  track(src)
}

/** Fallback sintetizado de torcida quando o sample real não carregou. */
const crowdLayer = (dur: number, f0: number, f1: number, q: number, vol: number, attack: number, release: number): void => {
  if (!ac || !noiseBuf) return
  const src = ac.createBufferSource()
  src.buffer = noiseBuf
  src.loop = true
  const filter = ac.createBiquadFilter()
  filter.type = 'bandpass'
  filter.Q.value = q
  filter.frequency.setValueAtTime(f0, ac.currentTime)
  filter.frequency.linearRampToValueAtTime(f1, ac.currentTime + dur)
  const gain = ac.createGain()
  gain.gain.setValueAtTime(0.0001, ac.currentTime)
  gain.gain.exponentialRampToValueAtTime(vol, ac.currentTime + attack)
  gain.gain.setValueAtTime(vol, ac.currentTime + Math.max(attack, dur - release))
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur)
  src.connect(filter).connect(gain).connect(output())
  src.start()
  src.stop(ac.currentTime + dur + 0.05)
  track(src)
}

/** Comemoração da torcida: alta demais atropelava o resto do áudio. */
const GOAL_CROWD_VOLUME = 0.12

const crowdRoar = (): void => {
  crowdLayer(2.4, 380, 820, 0.8, 0.08, 0.1, 1.5)
  crowdLayer(2.4, 1300, 1900, 1.4, 0.03, 0.14, 1.6)
}

const crowdGasp = (vol: number): void => {
  crowdLayer(0.9, 350, 640, 1.1, vol, 0.09, 0.55)
}

export const playStageEvent = (event: StageEvent): void => {
  switch (event) {
    case 'kick':
      noiseBurst(0.09, 500, 0.5)
      beep(140, 90, 0.08, 'sine', 0.3)
      break
    case 'goal':
      if (!playSample('goal', GOAL_CROWD_VOLUME)) crowdRoar()
      beep(523, 523, 0.1, 'square', 0.12)
      setTimeout(() => beep(659, 659, 0.1, 'square', 0.12), 110)
      setTimeout(() => beep(784, 784, 0.22, 'square', 0.14), 220)
      break
    case 'save':
      beep(190, 120, 0.16, 'sawtooth', 0.25)
      noiseBurst(0.1, 300, 0.3)
      if (!playSample('gasp', 0.5)) crowdGasp(0.28)
      break
    case 'post':
      beep(1250, 750, 0.28, 'triangle', 0.3)
      if (!playSample('gasp', 0.75)) crowdGasp(0.45)
      break
    case 'miss':
      beep(300, 170, 0.3, 'sine', 0.15)
      if (!playSample('gasp', 0.6)) crowdGasp(0.35)
      break
    case 'blocked':
      noiseBurst(0.12, 350, 0.5)
      beep(160, 90, 0.12, 'sine', 0.3)
      if (!playSample('gasp', 0.45)) crowdGasp(0.25)
      break
    case 'defenseSave':
      noiseBurst(0.1, 300, 0.4)
      if (!playSample('goal', GOAL_CROWD_VOLUME)) crowdRoar()
      break
    case 'defenseConcede':
      beep(220, 120, 0.35, 'sawtooth', 0.2)
      if (!playSample('gasp', 0.7)) crowdGasp(0.4)
      break
  }
}
