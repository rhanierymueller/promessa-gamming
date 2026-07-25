import { describe, expect, test } from 'vitest'
import { isRecoveryHash, recoveryErrorMessage } from './recoveryLink'

describe('isRecoveryHash', () => {
  test('reconhece o link de recuperação do Supabase', () => {
    // Arrange
    const hash = '#access_token=abc.def&expires_in=3600&refresh_token=xyz&token_type=bearer&type=recovery'

    // Act + Assert
    expect(isRecoveryHash(hash)).toBe(true)
  })

  test('URL comum não é link de recuperação', () => {
    expect(isRecoveryHash('')).toBe(false)
    expect(isRecoveryHash('#')).toBe(false)
    expect(isRecoveryHash('#/rota/qualquer')).toBe(false)
  })

  test('outros tipos de link (magic link, convite) não abrem a tela de senha', () => {
    expect(isRecoveryHash('#access_token=abc&type=magiclink')).toBe(false)
    expect(isRecoveryHash('#access_token=abc&type=signup')).toBe(false)
    expect(isRecoveryHash('#access_token=abc&type=invite')).toBe(false)
  })

  test('não cai em "type=recovery" forjado dentro de outro valor', () => {
    // Arrange: valor que CONTÉM o texto mas não é o parâmetro type
    const hash = '#access_token=abc&redirect=type%3Drecovery'

    // Act + Assert
    expect(isRecoveryHash(hash)).toBe(false)
  })
})

describe('recoveryErrorMessage', () => {
  test('sem erro no fragmento não há mensagem', () => {
    expect(recoveryErrorMessage('')).toBeNull()
    expect(recoveryErrorMessage('#access_token=abc&type=recovery')).toBeNull()
  })

  test('link expirado tem mensagem própria', () => {
    // Arrange
    const hash = '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid'

    // Act
    const message = recoveryErrorMessage(hash)

    // Assert
    expect(message).toMatch(/expirou/i)
  })

  test('erro desconhecido ainda avisa o usuário (nunca fica mudo)', () => {
    expect(recoveryErrorMessage('#error=server_error')).toBeTruthy()
  })

  test('não repassa o texto do servidor para a tela', () => {
    // Arrange: descrição do servidor não deve vazar para a UI
    const hash = '#error=server_error&error_description=internal+db+failure+at+auth.users'

    // Act
    const message = recoveryErrorMessage(hash)

    // Assert
    expect(message).not.toMatch(/auth\.users|internal/i)
  })
})
