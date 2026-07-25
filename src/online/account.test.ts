import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { deleteAccount, registerAccount, requestPasswordReset, updatePassword } from './account'
import { getClient } from './leagues'

vi.mock('./leagues', () => ({
  getClient: vi.fn(),
  isOnlineAvailable: vi.fn(() => true),
}))

const mockedGetClient = vi.mocked(getClient)

interface ClientMocks {
  readonly auth?: AuthMocks
  readonly rpc?: ReturnType<typeof vi.fn>
}

interface AuthMocks {
  readonly resetPasswordForEmail?: ReturnType<typeof vi.fn>
  readonly getSession?: ReturnType<typeof vi.fn>
  readonly updateUser?: ReturnType<typeof vi.fn>
  readonly signOut?: ReturnType<typeof vi.fn>
  readonly signUp?: ReturnType<typeof vi.fn>
}

const okSignOut = (): ReturnType<typeof vi.fn> => vi.fn().mockResolvedValue({ error: null })

const clientWith = (auth: AuthMocks): SupabaseClient =>
  ({ auth }) as unknown as SupabaseClient

const rpcClient = (mocks: ClientMocks): SupabaseClient => mocks as unknown as SupabaseClient

const activeSession = { data: { session: { user: { id: 'u1' } } } }

beforeEach(() => {
  mockedGetClient.mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('requestPasswordReset', () => {
  test('sem servidor configurado segue offline sem travar', async () => {
    // Arrange
    mockedGetClient.mockReturnValue(null)

    // Act
    const result = await requestPasswordReset('craque@email.com')

    // Assert
    expect(result).toEqual({ ok: true, offline: true })
  })

  test('sucesso envia o e-mail trimado ao Supabase', async () => {
    // Arrange
    const resetPasswordForEmail = vi.fn().mockResolvedValue({ error: null })
    mockedGetClient.mockReturnValue(clientWith({ resetPasswordForEmail }))

    // Act
    const result = await requestPasswordReset('  craque@email.com  ')

    // Assert
    expect(result).toEqual({ ok: true })
    expect(resetPasswordForEmail).toHaveBeenCalledWith('craque@email.com', expect.anything())
  })

  test('o link volta para a PRÓPRIA origem do app (nunca para outro domínio)', async () => {
    // Arrange: sem window (ambiente node dos testes) o redirect não é inventado
    const resetPasswordForEmail = vi.fn().mockResolvedValue({ error: null })
    mockedGetClient.mockReturnValue(clientWith({ resetPasswordForEmail }))
    vi.stubGlobal('window', { location: { origin: 'https://promessa.app' } })

    // Act
    await requestPasswordReset('craque@email.com')

    // Assert
    expect(resetPasswordForEmail).toHaveBeenCalledWith('craque@email.com', {
      redirectTo: 'https://promessa.app',
    })
  })

  test('erro desconhecido NÃO revela se o e-mail existe (resposta neutra)', async () => {
    // Arrange: servidor devolvendo algo como "User not found"
    const resetPasswordForEmail = vi.fn().mockResolvedValue({ error: { message: 'User not found' } })
    mockedGetClient.mockReturnValue(clientWith({ resetPasswordForEmail }))

    // Act
    const result = await requestPasswordReset('naoexiste@email.com')

    // Assert: mesma resposta de sucesso — sem enumeração de contas
    expect(result).toEqual({ ok: true })
  })

  test('rate limit do servidor vira pedido de espera', async () => {
    const resetPasswordForEmail = vi.fn().mockResolvedValue({
      error: { message: 'For security purposes, you can only request this once every 60 seconds' },
    })
    mockedGetClient.mockReturnValue(clientWith({ resetPasswordForEmail }))

    const result = await requestPasswordReset('craque@email.com')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toMatch(/aguarde/i)
  })

  test('queda de rede segue offline em vez de erro', async () => {
    const resetPasswordForEmail = vi.fn().mockRejectedValue(new Error('Failed to fetch'))
    mockedGetClient.mockReturnValue(clientWith({ resetPasswordForEmail }))

    const result = await requestPasswordReset('craque@email.com')

    expect(result).toEqual({ ok: true, offline: true })
  })

  test('e-mail rejeitado pelo servidor tem mensagem própria', async () => {
    const resetPasswordForEmail = vi.fn().mockResolvedValue({
      error: { message: 'Unable to validate email address: invalid format' },
    })
    mockedGetClient.mockReturnValue(clientWith({ resetPasswordForEmail }))

    const result = await requestPasswordReset('quebrado@')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toMatch(/e-mail inválido/i)
  })
})

describe('updatePassword', () => {
  test('sem servidor a troca FALHA explicitamente (nunca sucesso silencioso)', async () => {
    // Arrange
    mockedGetClient.mockReturnValue(null)

    // Act
    const result = await updatePassword('nova-senha-123')

    // Assert
    expect(result.ok).toBe(false)
  })

  test('sem sessão de recuperação avisa que o link expirou', async () => {
    // Arrange
    const getSession = vi.fn().mockResolvedValue({ data: { session: null } })
    mockedGetClient.mockReturnValue(clientWith({ getSession }))

    // Act
    const result = await updatePassword('nova-senha-123')

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toMatch(/expirado/i)
  })

  test('com sessão válida troca a senha', async () => {
    const getSession = vi.fn().mockResolvedValue(activeSession)
    const updateUser = vi.fn().mockResolvedValue({ error: null })
    mockedGetClient.mockReturnValue(clientWith({ getSession, updateUser, signOut: okSignOut() }))

    const result = await updatePassword('nova-senha-123')

    expect(result).toEqual({ ok: true })
    expect(updateUser).toHaveBeenCalledWith({ password: 'nova-senha-123' })
  })

  test('troca de senha derruba as OUTRAS sessões (sessão de invasor morre)', async () => {
    // Arrange
    const getSession = vi.fn().mockResolvedValue(activeSession)
    const updateUser = vi.fn().mockResolvedValue({ error: null })
    const signOut = okSignOut()
    mockedGetClient.mockReturnValue(clientWith({ getSession, updateUser, signOut }))

    // Act
    await updatePassword('nova-senha-123')

    // Assert: 'others' preserva a sessão de quem acabou de trocar
    expect(signOut).toHaveBeenCalledWith({ scope: 'others' })
  })

  test('falha ao derrubar outras sessões NÃO transforma sucesso em erro', async () => {
    // Arrange: senha já trocada, mas o signOut morre
    const getSession = vi.fn().mockResolvedValue(activeSession)
    const updateUser = vi.fn().mockResolvedValue({ error: null })
    const signOut = vi.fn().mockRejectedValue(new Error('Failed to fetch'))
    mockedGetClient.mockReturnValue(clientWith({ getSession, updateUser, signOut }))

    // Act
    const result = await updatePassword('nova-senha-123')

    // Assert
    expect(result).toEqual({ ok: true })
  })

  test('senha igual à anterior tem mensagem própria', async () => {
    const getSession = vi.fn().mockResolvedValue(activeSession)
    const updateUser = vi.fn().mockResolvedValue({
      error: { message: 'New password should be different from the old password.' },
    })
    mockedGetClient.mockReturnValue(clientWith({ getSession, updateUser }))

    const result = await updatePassword('mesma-senha-123')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toMatch(/diferente/i)
  })

  test('senha recusada pelo servidor pede outra mais forte', async () => {
    const getSession = vi.fn().mockResolvedValue(activeSession)
    const updateUser = vi.fn().mockResolvedValue({
      error: { message: 'Password should be at least 8 characters.' },
    })
    mockedGetClient.mockReturnValue(clientWith({ getSession, updateUser }))

    const result = await updatePassword('curta12')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toMatch(/senha/i)
  })

  test('erro desconhecido do servidor ainda vira mensagem (nunca fica mudo)', async () => {
    // Arrange
    const getSession = vi.fn().mockResolvedValue(activeSession)
    const updateUser = vi.fn().mockResolvedValue({ error: { message: 'unexpected_failure' } })
    mockedGetClient.mockReturnValue(clientWith({ getSession, updateUser, signOut: okSignOut() }))

    // Act
    const result = await updatePassword('nova-senha-123')

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message.length).toBeGreaterThan(0)
  })

  test('queda de rede na troca vira erro visível (não sucesso)', async () => {
    const getSession = vi.fn().mockResolvedValue(activeSession)
    const updateUser = vi.fn().mockRejectedValue(new Error('Failed to fetch'))
    mockedGetClient.mockReturnValue(clientWith({ getSession, updateUser }))

    const result = await updatePassword('nova-senha-123')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toMatch(/conexão/i)
  })
})

describe('deleteAccount (exclusão de conta — LGPD)', () => {
  test('RPC ausente no banco NÃO pode virar "conta excluída"', async () => {
    // Arrange: migration 0004 não aplicada — a função não existe no servidor
    const rpc = vi.fn().mockResolvedValue({
      error: { message: 'Could not find the function public.delete_account in the schema cache' },
    })
    const signOut = okSignOut()
    mockedGetClient.mockReturnValue(rpcClient({ rpc, auth: { signOut } }))

    // Act
    const result = await deleteAccount()

    // Assert: a UI promete exclusão irreversível — não pode mentir
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toMatch(/não foi excluída|não deu/i)
  })

  test('exclusão bem-sucedida encerra a sessão', async () => {
    // Arrange
    const rpc = vi.fn().mockResolvedValue({ error: null })
    const signOut = okSignOut()
    mockedGetClient.mockReturnValue(rpcClient({ rpc, auth: { signOut } }))

    // Act
    const result = await deleteAccount()

    // Assert
    expect(result).toEqual({ ok: true })
    expect(signOut).toHaveBeenCalled()
  })

  test('sem servidor configurado o apagamento local segue (jogo offline)', async () => {
    mockedGetClient.mockReturnValue(null)
    expect(await deleteAccount()).toEqual({ ok: true, offline: true })
  })

  test('queda de rede não finge exclusão', async () => {
    // Arrange
    const rpc = vi.fn().mockRejectedValue(new Error('Failed to fetch'))
    mockedGetClient.mockReturnValue(rpcClient({ rpc, auth: { signOut: okSignOut() } }))

    // Act
    const result = await deleteAccount()

    // Assert
    expect(result.ok).toBe(false)
  })
})

describe('registerAccount com confirmação de e-mail ativa', () => {
  test('sem sessão após o cadastro, NÃO chama claim_username (evita erro "não autenticado")', async () => {
    // Arrange: Supabase com "Confirm email" ligado devolve user sem sessão
    const signUp = vi.fn().mockResolvedValue({ data: { user: { id: 'u1' }, session: null }, error: null })
    const rpc = vi.fn()
    mockedGetClient.mockReturnValue(rpcClient({ rpc, auth: { signUp } }))

    // Act
    const result = await registerAccount('craque@email.com', 'craque_10', 'senha-forte-1')

    // Assert
    expect(rpc).not.toHaveBeenCalled()
    expect(result.ok).toBe(true)
  })

  test('com sessão ativa o username é reivindicado normalmente', async () => {
    // Arrange
    const signUp = vi.fn().mockResolvedValue({
      data: { user: { id: 'u1' }, session: { access_token: 'tok' } },
      error: null,
    })
    const rpc = vi.fn().mockResolvedValue({ error: null })
    mockedGetClient.mockReturnValue(rpcClient({ rpc, auth: { signUp } }))

    // Act
    const result = await registerAccount('craque@email.com', ' craque_10 ', 'senha-forte-1')

    // Assert
    expect(rpc).toHaveBeenCalledWith('claim_username', { p_username: 'craque_10' })
    expect(result).toEqual({ ok: true })
  })

  test('e-mail já cadastrado não é revelado na mensagem', async () => {
    // Arrange
    const signUp = vi.fn().mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'User already registered' },
    })
    mockedGetClient.mockReturnValue(rpcClient({ rpc: vi.fn(), auth: { signUp } }))

    // Act
    const result = await registerAccount('vazado@email.com', 'craque_10', 'senha-forte-1')

    // Assert: a mensagem não AFIRMA que a conta existe — só oferece o login
    // como saída, o que serve igual para e-mail cadastrado ou digitado errado
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).not.toMatch(/^este e-mail já/i)
      expect(result.message).not.toMatch(/already registered/i)
      expect(result.message).toMatch(/se você já tem conta/i)
      expect(result.message).toMatch(/login|esqueci/i)
    }
  })
})
