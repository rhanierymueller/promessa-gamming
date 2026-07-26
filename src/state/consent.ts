/**
 * Aceite dos termos e da política de privacidade (LGPD).
 *
 * A lei exige consentimento INFORMADO, LIVRE e com prova de quando foi dado.
 * Por isso o registro guarda a VERSÃO aceita: mudando o que se coleta, a
 * versão sobe e o aceite antigo deixa de valer — quem já jogava é perguntado
 * de novo, em vez de ser tratado como se tivesse concordado com algo que nem
 * existia quando aceitou.
 */

/** Suba quando o texto mudar de forma relevante (o que se coleta, com quem se compartilha). */
export const TERMS_VERSION = 1

export interface ConsentRecord {
  /** Versão dos termos que a pessoa leu e aceitou. */
  readonly version: number
  /** Quando aceitou (epoch ms) — a prova exigida pela lei. */
  readonly acceptedAt: number
}

/** O aceite guardado cobre a versão atual dos termos? */
export const isConsentCurrent = (consent: ConsentRecord | null): boolean =>
  consent !== null && consent.version >= TERMS_VERSION && consent.acceptedAt > 0

export const recordConsent = (now: number): ConsentRecord => ({
  version: TERMS_VERSION,
  acceptedAt: now,
})

/** Lê o aceite salvo; devolve null para qualquer coisa fora do formato. */
export const parseConsent = (value: unknown): ConsentRecord | null => {
  if (typeof value !== 'object' || value === null) return null
  const raw = value as Record<string, unknown>
  if (typeof raw.version !== 'number' || typeof raw.acceptedAt !== 'number') return null
  if (raw.acceptedAt <= 0) return null
  return { version: raw.version, acceptedAt: raw.acceptedAt }
}

/**
 * Inventário do que o jogo guarda. Fica no código, e não só no texto legal,
 * porque é ele que a tela de privacidade exibe: assim a lista mostrada não
 * envelhece em relação ao que o sistema realmente coleta.
 */
export interface DataItem {
  readonly what: string
  readonly why: string
  readonly where: 'aparelho' | 'servidor'
}

export const DATA_INVENTORY: readonly DataItem[] = [
  { what: 'E-mail', why: 'Entrar na conta e recuperar a senha', where: 'servidor' },
  { what: 'Nome de usuário', why: 'Identificar você nas ligas de amigos', where: 'servidor' },
  { what: 'Nome do atleta e do clube', why: 'Aparecer no ranking das ligas', where: 'servidor' },
  { what: 'Progresso da carreira', why: 'Continuar de onde parou em outro aparelho', where: 'servidor' },
  { what: 'Pontuação semanal', why: 'Montar o ranking das ligas de amigos', where: 'servidor' },
  { what: 'Preferências de som', why: 'Manter o volume como você deixou', where: 'aparelho' },
]
