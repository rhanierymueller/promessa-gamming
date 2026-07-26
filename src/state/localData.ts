/**
 * Dados que o jogo guarda neste aparelho.
 *
 * Existe como lista única porque limpar "quase tudo" é pior do que não limpar:
 * ao sair da conta, um save esquecido apareceria para a próxima pessoa que
 * usasse o navegador; ao excluir a conta, seria dado pessoal sobrevivendo a um
 * pedido de exclusão. Chave nova do jogo entra aqui.
 */

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** Progresso: some ao sair da conta e ao excluir. */
export const CAREER_KEYS: readonly string[] = [
  'promessa.save',
  'promessa.pending-match',
]

/** Preferências do aparelho: ficam ao sair, somem ao excluir a conta. */
export const PREFERENCE_KEYS: readonly string[] = [
  'promessa.volume',
  'promessa.muted',
]

const remove = (storage: StorageLike, keys: readonly string[]): void => {
  for (const key of keys) storage.removeItem(key)
}

/**
 * Sair da conta: leva o progresso, mantém as preferências. Volume e som são
 * do APARELHO, não da conta — quem sair não quer o som voltando ao padrão.
 */
export const clearCareerData = (storage: StorageLike): void => {
  remove(storage, CAREER_KEYS)
}

/** Excluir a conta: não sobra nada deste aparelho. */
export const clearAllLocalData = (storage: StorageLike): void => {
  remove(storage, [...CAREER_KEYS, ...PREFERENCE_KEYS])
}
