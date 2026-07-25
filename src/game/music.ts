import { DEFAULT_VOLUME, isMuted, musicGainFor } from '../engine/audio/volume'
import songUrl from '../assets/audio/songs/main_song.mp3'

/**
 * Música da tela de resultado. Fica fora do AudioContext do jogo de propósito:
 * é uma faixa longa em loop, que o <audio> transmite aos poucos em vez de
 * decodificar os megabytes inteiros na memória.
 *
 * Toca só enquanto o fim de jogo está na tela — entra com o resultado e para
 * quando o jogador sai.
 */

let element: HTMLAudioElement | null = null
let wanted = false
let level = DEFAULT_VOLUME
/** Espera um gesto do usuário quando o navegador barra o autoplay. */
let unlocking = false

const UNLOCK_EVENTS = ['pointerdown', 'keydown'] as const

const audio = (): HTMLAudioElement => {
  if (element) return element
  const created = new Audio(songUrl)
  created.loop = true
  created.preload = 'auto'
  created.volume = musicGainFor(level)
  element = created
  return created
}

const unlockOnGesture = (): void => {
  if (unlocking) return
  unlocking = true
  const resume = (): void => {
    for (const event of UNLOCK_EVENTS) window.removeEventListener(event, resume)
    unlocking = false
    if (wanted) startResultsMusic()
  }
  for (const event of UNLOCK_EVENTS) window.addEventListener(event, resume, { once: true })
}

/** Resultado na tela: música em loop, baixinha. */
export const startResultsMusic = (): void => {
  wanted = true
  if (isMuted(level)) return
  const player = audio()
  player.volume = musicGainFor(level)
  /*
   * O navegador só libera o som depois de um gesto. Em vez de desistir,
   * fica de tocaia no primeiro clique/tecla — assim a música entra sozinha
   * assim que o usuário encosta na tela.
   */
  player.play().catch(unlockOnGesture)
}

/** Saiu do resultado: silencia a música. */
export const stopResultsMusic = (): void => {
  wanted = false
  if (!element) return
  element.pause()
  element.currentTime = 0
}

/** Aplica o volume escolhido no controle de som. */
export const setMusicVolume = (next: number): void => {
  level = next
  if (!element) {
    // ainda não existe player: se o menu já pediu música, é hora de ligar
    if (wanted && !isMuted(next)) startResultsMusic()
    return
  }
  element.volume = musicGainFor(next)
  if (isMuted(next)) {
    element.pause()
    return
  }
  if (wanted && element.paused) startResultsMusic()
}
