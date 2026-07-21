import { getClient, isOnlineAvailable } from './leagues'

/**
 * Cadastro de conta: e-mail + senha vão para o Supabase Auth; o username
 * público (único, garantido pelo banco) vai para o perfil. Sem Supabase
 * configurado o jogo segue 100% local e o cadastro não bloqueia.
 */

export type RegisterResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly message: string }
  | { readonly ok: true; readonly offline: true }

const friendlyAuthError = (message: string): string => {
  const normalized = message.toLowerCase()
  if (normalized.includes('already registered')) return 'Este e-mail já tem conta.'
  if (normalized.includes('username já em uso')) return 'Este nome de usuário já existe — escolha outro.'
  if (normalized.includes('password')) return 'Senha recusada pelo servidor — tente outra.'
  if (normalized.includes('invalid') && normalized.includes('email')) return 'E-mail inválido.'
  return `Não deu para criar a conta agora: ${message}`
}

/** Sem internet (ou servidor fora do ar) o jogo segue local — nunca trava. */
const isNetworkError = (message: string): boolean =>
  /fetch|network|failed to fetch|load failed/i.test(message)

/** Migração 0003 ainda não aplicada no projeto — segue local sem bloquear. */
const isMissingRpc = (message: string): boolean =>
  /claim_username|delete_account|does not exist|not found/i.test(message)

export const registerAccount = async (
  email: string,
  username: string,
  password: string,
): Promise<RegisterResult> => {
  if (!isOnlineAvailable()) return { ok: true, offline: true }
  const client = getClient()
  if (!client) return { ok: true, offline: true }

  try {
    const { error: signUpError } = await client.auth.signUp({
      email: email.trim(),
      password,
    })
    if (signUpError) {
      if (isNetworkError(signUpError.message)) return { ok: true, offline: true }
      return { ok: false, message: friendlyAuthError(signUpError.message) }
    }

    const { error: usernameError } = await client.rpc('claim_username', {
      p_username: username.trim(),
    })
    if (usernameError) {
      if (isNetworkError(usernameError.message) || isMissingRpc(usernameError.message)) {
        return { ok: true, offline: true }
      }
      return { ok: false, message: friendlyAuthError(usernameError.message) }
    }

    return { ok: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : ''
    if (isNetworkError(message)) return { ok: true, offline: true }
    return { ok: false, message: friendlyAuthError(message || 'erro inesperado') }
  }
}

export type SignInResult =
  | { readonly ok: true }
  | { readonly ok: true; readonly offline: true }
  | { readonly ok: false; readonly message: string }

/** Entra com e-mail e senha. Sem servidor/rede, o jogo segue local. */
export const signInAccount = async (email: string, password: string): Promise<SignInResult> => {
  const client = getClient()
  if (!client) return { ok: true, offline: true }
  try {
    const { error } = await client.auth.signInWithPassword({ email: email.trim(), password })
    if (error) {
      if (isNetworkError(error.message)) return { ok: true, offline: true }
      const normalized = error.message.toLowerCase()
      if (normalized.includes('invalid login')) {
        return { ok: false, message: 'E-mail ou senha incorretos.' }
      }
      return { ok: false, message: friendlyAuthError(error.message) }
    }
    return { ok: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : ''
    if (isNetworkError(message)) return { ok: true, offline: true }
    return { ok: false, message: friendlyAuthError(message || 'erro inesperado') }
  }
}

/**
 * E-mail da sessão ativa, se for uma conta DE VERDADE. Sessões anônimas
 * (usadas pelas ligas de amigos) não contam — senão o cadastro esconderia
 * os campos de e-mail/senha sem existir conta nenhuma.
 */
export const currentSessionEmail = async (): Promise<string | null> => {
  const client = getClient()
  if (!client) return null
  try {
    const { data } = await client.auth.getSession()
    const user = data.session?.user
    if (!user || user.is_anonymous || !user.email || user.email.length === 0) return null
    return user.email
  } catch {
    return null
  }
}

export type DeleteAccountResult =
  | { readonly ok: true }
  | { readonly ok: true; readonly offline: true }
  | { readonly ok: false; readonly message: string }

/** Apaga a conta online (RPC delete_account) e encerra a sessão. */
export const deleteAccount = async (): Promise<DeleteAccountResult> => {
  const client = getClient()
  if (!client) return { ok: true, offline: true }
  try {
    const { error } = await client.rpc('delete_account')
    if (error && !isNetworkError(error.message) && !isMissingRpc(error.message)) {
      return { ok: false, message: `Não deu para excluir a conta agora: ${error.message}` }
    }
    await client.auth.signOut().catch(() => undefined)
    return error ? { ok: true, offline: true } : { ok: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : ''
    if (isNetworkError(message)) return { ok: true, offline: true }
    return { ok: false, message: `Não deu para excluir a conta agora: ${message}` }
  }
}
