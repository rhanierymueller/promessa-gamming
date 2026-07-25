/**
 * Volume do jogo num controle contínuo — o usuário arrasta até onde quiser,
 * em vez de escolher entre degraus prontos.
 *
 * O padrão é baixo de propósito: o site começa a tocar música assim que abre,
 * e ninguém deve levar susto ao entrar.
 */

export const MIN_VOLUME = 0
export const MAX_VOLUME = 1
export const DEFAULT_VOLUME = 0.18
/** Equivalente do degrau "alto" do controle antigo, para quem já o usava. */
export const HIGH_VOLUME = 0.6
/** Passo do controle: fino o bastante para ajustar, grosso o bastante para acertar. */
export const VOLUME_STEP = 0.02

/**
 * A música é ambientação da tela de resultado: acompanha o controle de volume,
 * mas numa fração dele para ficar de fundo, nunca em primeiro plano.
 */
const MUSIC_RATIO = 0.18

export const clampVolume = (value: number): number => {
  if (!Number.isFinite(value)) return DEFAULT_VOLUME
  return Math.min(MAX_VOLUME, Math.max(MIN_VOLUME, value))
}

/** Ganho do canal mestre (efeitos, torcida, narração). */
export const effectsGainFor = (volume: number): number => clampVolume(volume)

/** Ganho da música de fundo. */
export const musicGainFor = (volume: number): number => clampVolume(volume) * MUSIC_RATIO

export const isMuted = (volume: number): boolean => clampVolume(volume) <= MIN_VOLUME

export const volumeLabel = (volume: number): string =>
  isMuted(volume) ? 'Som desligado' : `Volume ${Math.round(clampVolume(volume) * 100)}%`

/** Degraus do controle antigo, ainda salvos no navegador de quem já jogou. */
const LEGACY_LEVELS: Record<string, number> = {
  mute: MIN_VOLUME,
  low: DEFAULT_VOLUME,
  high: HIGH_VOLUME,
}

/**
 * Lê a preferência salva. Aceita os formatos anteriores (degraus e o antigo
 * liga/desliga em chave própria), senão quem já tinha silenciado o jogo
 * voltaria a ouvir som sem pedir.
 */
export const parseStoredVolume = (raw: string | null, legacyMuted: string | null): number => {
  if (raw === null) return legacyMuted === '1' ? MIN_VOLUME : DEFAULT_VOLUME
  const level = LEGACY_LEVELS[raw]
  if (level !== undefined) return level
  const parsed = Number(raw)
  return raw.trim() !== '' && Number.isFinite(parsed) ? clampVolume(parsed) : DEFAULT_VOLUME
}
