/**
 * Leitura do link de recuperação de senha que chega na URL.
 * O Supabase devolve tudo no fragmento (#): ou o token da sessão temporária
 * (type=recovery) ou um erro (link expirado/já usado). Funções puras para
 * dar para testar sem navegador.
 */

/** O fragmento traz um link de recuperação válido? */
export const isRecoveryHash = (hash: string): boolean => {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  return params.get('type') === 'recovery'
}

/** Mensagem para o usuário quando o link não vale mais; null se não houve erro. */
export const recoveryErrorMessage = (hash: string): string | null => {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  if (!params.has('error') && !params.has('error_code')) return null
  const code = `${params.get('error_code') ?? ''} ${params.get('error') ?? ''}`
  if (/otp_expired|access_denied|expired/i.test(code)) {
    return 'O link de recuperação expirou ou já foi usado — peça um novo.'
  }
  return 'Não deu para abrir o link de recuperação — peça um novo.'
}
