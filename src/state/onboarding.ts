/**
 * Primeira vez em cada tela: o jogo mostra um tour curto e nunca mais.
 *
 * A marca fica FORA do save de propósito — é memória do aparelho, não da
 * carreira. Recomeçar a carreira (ou logar em outra conta) não deve reabrir
 * o tour para quem já aprendeu a jogar aqui.
 */

export type OnboardingArea = 'home' | 'match' | 'shot'

const keyFor = (area: OnboardingArea): string => `promessa.onboarding.${area}`

/** Interface mínima de storage — igual à do save, para testar sem navegador. */
interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export const hasSeenOnboarding = (storage: StorageLike, area: OnboardingArea): boolean =>
  storage.getItem(keyFor(area)) !== null

export const markOnboardingSeen = (storage: StorageLike, area: OnboardingArea): void => {
  storage.setItem(keyFor(area), '1')
}
