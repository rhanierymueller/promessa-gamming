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
  // "e-mail já cadastrado" NÃO pode virar mensagem: com ela, uma lista de
  // e-mails vazados vira lista de quem joga aqui. Manda para o login, que
  // é a saída certa tanto para quem já tem conta quanto para quem errou.
  if (normalized.includes('already registered')) {
    return 'Não deu para criar a conta com esses dados. Se você já tem conta, entre pelo login ou use "Esqueci minha senha".'
  }
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
    const { data, error: signUpError } = await client.auth.signUp({
      email: email.trim(),
      password,
    })
    if (signUpError) {
      if (isNetworkError(signUpError.message)) return { ok: true, offline: true }
      return { ok: false, message: friendlyAuthError(signUpError.message) }
    }

    // Com "Confirm email" ligado no Supabase o cadastro não abre sessão: sem
    // ela o claim_username morreria em "não autenticado". O username fica
    // para depois da confirmação — a carreira local começa do mesmo jeito.
    if (!data.session) return { ok: true, offline: true }

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

export type PasswordResetRequestResult =
  | { readonly ok: true }
  | { readonly ok: true; readonly offline: true }
  | { readonly ok: false; readonly message: string }

/** "Espere um pouco" do servidor (rate limit de e-mails de recuperação). */
const isRateLimited = (message: string): boolean =>
  /rate limit|too many|security purposes|after \d+ seconds/i.test(message)

/** Para onde o link de recuperação volta (a própria origem do app). */
const appRedirectUrl = (): string | undefined =>
  typeof window !== 'undefined' ? window.location.origin : undefined

/**
 * Pede o link de recuperação. A resposta é NEUTRA de propósito: erros que
 * revelariam se o e-mail tem conta viram sucesso genérico (anti-enumeração).
 */
export const requestPasswordReset = async (email: string): Promise<PasswordResetRequestResult> => {
  const client = getClient()
  if (!client) return { ok: true, offline: true }
  try {
    const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: appRedirectUrl(),
    })
    if (error) {
      if (isNetworkError(error.message)) return { ok: true, offline: true }
      if (isRateLimited(error.message)) {
        return { ok: false, message: 'Muitos pedidos seguidos — aguarde um minuto e tente de novo.' }
      }
      const normalized = error.message.toLowerCase()
      if (normalized.includes('invalid') || normalized.includes('validate email')) {
        return { ok: false, message: 'E-mail inválido.' }
      }
      return { ok: true }
    }
    return { ok: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : ''
    if (isNetworkError(message)) return { ok: true, offline: true }
    return { ok: true }
  }
}

export type UpdatePasswordResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly message: string }

/**
 * Define a nova senha usando a sessão criada pelo link de recuperação.
 * Trocar senha nunca "dá certo" offline: sem servidor, falha explícita.
 */
export const updatePassword = async (newPassword: string): Promise<UpdatePasswordResult> => {
  const client = getClient()
  if (!client) {
    return { ok: false, message: 'Servidor não configurado — não dá para trocar a senha agora.' }
  }
  try {
    const { data } = await client.auth.getSession()
    if (!data.session) {
      return { ok: false, message: 'Link inválido ou expirado — peça um novo link de recuperação.' }
    }
    const { error } = await client.auth.updateUser({ password: newPassword })
    if (error) {
      if (isNetworkError(error.message)) {
        return { ok: false, message: 'Sem conexão com o servidor — tente de novo em instantes.' }
      }
      const normalized = error.message.toLowerCase()
      if (normalized.includes('different')) {
        return { ok: false, message: 'A nova senha precisa ser diferente da atual.' }
      }
      if (normalized.includes('password')) {
        return { ok: false, message: 'Senha recusada pelo servidor — tente outra mais forte.' }
      }
      if (normalized.includes('expired') || normalized.includes('session')) {
        return { ok: false, message: 'Link inválido ou expirado — peça um novo link de recuperação.' }
      }
      return { ok: false, message: `Não deu para trocar a senha agora: ${error.message}` }
    }
    // senha trocada = qualquer sessão antiga (inclusive de um invasor) morre.
    // Falhar aqui não desfaz a troca: o resultado continua sendo sucesso.
    try {
      await client.auth.signOut({ scope: 'others' })
    } catch {
      // sessões antigas seguem vivas até expirar — a senha nova já vale
    }
    return { ok: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : ''
    if (isNetworkError(message)) {
      return { ok: false, message: 'Sem conexão com o servidor — tente de novo em instantes.' }
    }
    return { ok: false, message: 'Não deu para trocar a senha agora — tente de novo.' }
  }
}

export type DeleteAccountResult =
  | { readonly ok: true }
  | { readonly ok: true; readonly offline: true }
  | { readonly ok: false; readonly message: string }

/**
 * Por que exclusão NÃO tem modo offline: a tela promete apagamento
 * irreversível. Dizer "excluída" quando o servidor não apagou deixaria os
 * dados vivos no banco com o usuário achando o contrário — falha só falha.
 */
const deleteFailureMessage = (message: string): string => {
  if (isNetworkError(message)) {
    return 'Sem conexão com o servidor — a conta NÃO foi excluída. Tente de novo.'
  }
  if (isMissingRpc(message)) {
    return 'A exclusão de conta ainda não está disponível neste servidor — a conta NÃO foi excluída.'
  }
  return 'Não deu para excluir a conta agora — a conta NÃO foi excluída. Tente de novo.'
}

/** Apaga a conta online (RPC delete_account) e encerra a sessão. */
export const deleteAccount = async (): Promise<DeleteAccountResult> => {
  const client = getClient()
  // sem servidor não existe conta online: só o apagamento local segue
  if (!client) return { ok: true, offline: true }
  try {
    const { error } = await client.rpc('delete_account')
    if (error) return { ok: false, message: deleteFailureMessage(error.message) }
    await client.auth.signOut().catch(() => undefined)
    return { ok: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : ''
    return { ok: false, message: deleteFailureMessage(message) }
  }
}
