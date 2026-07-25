import { MIN_PASSWORD } from './registration'

/**
 * Recuperação de senha — validação da nova senha e cooldown local entre
 * pedidos de link (anti-spam). O limite de verdade fica no servidor
 * (rate limit do Supabase Auth); aqui é só a primeira barreira de UX.
 */

export interface PasswordResetErrors {
  readonly password?: string
  readonly confirmPassword?: string
}

export const validateNewPassword = (
  password: string,
  confirmPassword: string,
): PasswordResetErrors => {
  const errors: { password?: string; confirmPassword?: string } = {}
  if (password.length < MIN_PASSWORD) {
    errors.password = `A senha precisa de pelo menos ${MIN_PASSWORD} caracteres.`
  }
  if (confirmPassword !== password) {
    errors.confirmPassword = 'As senhas não conferem.'
  }
  return errors
}

const RESET_REQUEST_KEY = 'promessa.reset-request'

/** Espera mínima entre pedidos de link de recuperação. */
export const RESET_COOLDOWN_MS = 60_000

export type CooldownStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export const markResetRequested = (storage: CooldownStorage, now: number): void => {
  storage.setItem(RESET_REQUEST_KEY, String(now))
}

/** Quanto falta (ms) para poder pedir outro link; 0 = liberado. */
export const resetCooldownRemaining = (storage: CooldownStorage, now: number): number => {
  const raw = storage.getItem(RESET_REQUEST_KEY)
  if (!raw) return 0
  const requestedAt = Number(raw)
  if (!Number.isFinite(requestedAt)) return 0
  // timestamp no futuro (relógio mexido) não pode travar além do cooldown
  const elapsed = Math.max(0, now - Math.min(requestedAt, now))
  return Math.max(0, RESET_COOLDOWN_MS - elapsed)
}
