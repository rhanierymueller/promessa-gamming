import { ATTRIBUTE_KEYS, type PlayerAttributes } from '../engine/career/attributes'
import type { PlayerFieldPosition } from '../engine/squad/formation'
import { isOffensiveName } from './moderation'
import { CREATE_EXTRA_POINTS, MAX_CLUB_NAME, PLAYER_MAX_AGE, PLAYER_MIN_AGE } from './save'

/**
 * Validação do cadastro — cada campo devolve uma mensagem amigável.
 * A senha nunca sai daqui para o save: só vai para o Supabase Auth.
 */

export interface RegistrationForm {
  readonly playerName: string
  readonly teamName: string
  readonly playerAge: number
  readonly playerPosition: PlayerFieldPosition
  readonly nationalityId: string
  readonly attributes: PlayerAttributes
  readonly email: string
  readonly username: string
  readonly password: string
  readonly confirmPassword: string
}

export type RegistrationErrors = Partial<Record<keyof RegistrationForm, string>>

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,16}$/
export const MIN_PASSWORD = 6
const MIN_TEAM_NAME = 2
const BASE_ATTR_TOTAL = 12

/** Pontos ainda não distribuídos na criação (base 3 em cada + 10 extras). */
export const remainingCreatePoints = (attributes: PlayerAttributes): number => {
  const spent = ATTRIBUTE_KEYS.reduce((sum, key) => sum + attributes[key], 0) - BASE_ATTR_TOTAL
  return Math.max(0, CREATE_EXTRA_POINTS - spent)
}

export interface RegistrationOptions {
  /** Sessão já autenticada: pula e-mail/usuário/senha. */
  readonly skipAccount?: boolean
}

export const validateRegistration = (
  form: RegistrationForm,
  options: RegistrationOptions = {},
): RegistrationErrors => {
  const errors: RegistrationErrors = {}

  if (form.playerName.trim().length === 0) {
    errors.playerName = 'Diga como a torcida vai te chamar.'
  } else if (isOffensiveName(form.playerName)) {
    errors.playerName = 'Esse nome não pode ser usado — escolha outro.'
  }
  const teamName = form.teamName.trim()
  if (teamName.length < MIN_TEAM_NAME || teamName.length > MAX_CLUB_NAME) {
    errors.teamName = `O nome do time precisa ter entre ${MIN_TEAM_NAME} e ${MAX_CLUB_NAME} letras.`
  } else if (isOffensiveName(teamName)) {
    errors.teamName = 'Esse nome de time não pode ser usado — escolha outro.'
  }
  if (
    !Number.isInteger(form.playerAge) ||
    form.playerAge < PLAYER_MIN_AGE ||
    form.playerAge > PLAYER_MAX_AGE
  ) {
    errors.playerAge = `Idade entre ${PLAYER_MIN_AGE} e ${PLAYER_MAX_AGE} anos.`
  }
  const spent = ATTRIBUTE_KEYS.reduce((sum, key) => sum + form.attributes[key], 0) - BASE_ATTR_TOTAL
  if (spent > CREATE_EXTRA_POINTS || ATTRIBUTE_KEYS.some((key) => form.attributes[key] > 10 || form.attributes[key] < 1)) {
    errors.attributes = `Você tem ${CREATE_EXTRA_POINTS} pontos para distribuir (máximo 10 por atributo).`
  }
  if (!options.skipAccount) {
    if (!EMAIL_PATTERN.test(form.email.trim())) {
      errors.email = 'Digite um e-mail válido.'
    }
    if (!USERNAME_PATTERN.test(form.username.trim())) {
      errors.username = 'Nome de usuário: 3-16 letras, números ou _ (sem espaços).'
    } else if (isOffensiveName(form.username)) {
      errors.username = 'Esse nome de usuário não pode ser usado.'
    }
    if (form.password.length < MIN_PASSWORD) {
      errors.password = `A senha precisa de pelo menos ${MIN_PASSWORD} caracteres.`
    }
    if (form.confirmPassword !== form.password) {
      errors.confirmPassword = 'As senhas não conferem.'
    }
  }
  return errors
}
