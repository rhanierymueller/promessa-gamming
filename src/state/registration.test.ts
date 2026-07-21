import { describe, expect, test } from 'vitest'
import { DEFAULT_ATTRIBUTES } from '../engine/career/attributes'
import { remainingCreatePoints, validateRegistration, type RegistrationForm } from './registration'

const valid: RegistrationForm = {
  playerName: 'Craque da Vila',
  teamName: 'Galáticos FC',
  playerAge: 22,
  playerPosition: 'MEI',
  nationalityId: 'brasil',
  attributes: { finalizacao: 6, passe: 6, cobranca: 5, defesa: 5 },
  email: 'craque@email.com',
  username: 'craque_10',
  password: 'segredo123',
  confirmPassword: 'segredo123',
}

describe('validateRegistration', () => {
  test('formulário completo passa sem erros', () => {
    // Act
    const result = validateRegistration(valid)

    // Assert
    expect(result).toEqual({})
  })

  test('aponta cada campo inválido com mensagem própria', () => {
    // Act
    const result = validateRegistration({
      ...valid,
      playerName: ' ',
      teamName: 'A',
      playerAge: 12,
      email: 'sem-arroba',
      username: 'x',
      password: '123',
      confirmPassword: '456',
    })

    // Assert
    expect(result.playerName).toBeTruthy()
    expect(result.teamName).toBeTruthy()
    expect(result.playerAge).toBeTruthy()
    expect(result.email).toBeTruthy()
    expect(result.username).toBeTruthy()
    expect(result.password).toBeTruthy()
    expect(result.confirmPassword).toBeTruthy()
  })

  test('username só aceita letras, números e underline (3-16)', () => {
    expect(validateRegistration({ ...valid, username: 'craque 10' }).username).toBeTruthy()
    expect(validateRegistration({ ...valid, username: 'craque-10' }).username).toBeTruthy()
    expect(validateRegistration({ ...valid, username: 'Craque_10' })).toEqual({})
  })

  test('pontos extras além do limite reprovam', () => {
    // Arrange: 11 pontos extras (base 12 + 11 = 23)
    const result = validateRegistration({
      ...valid,
      attributes: { finalizacao: 8, passe: 6, cobranca: 5, defesa: 4 },
    })

    // Assert
    expect(result.attributes).toBeTruthy()
  })
})

describe('validateRegistration com sessão ativa (sem campos de conta)', () => {
  test('ignora e-mail/usuário/senha quando a conta já existe', () => {
    // Act
    const result = validateRegistration(
      { ...valid, email: '', username: '', password: '', confirmPassword: '' },
      { skipAccount: true },
    )

    // Assert
    expect(result).toEqual({})
  })

  test('continua validando os campos do craque', () => {
    // Act
    const result = validateRegistration({ ...valid, playerName: ' ', teamName: 'A' }, { skipAccount: true })

    // Assert
    expect(result.playerName).toBeTruthy()
    expect(result.teamName).toBeTruthy()
  })
})

describe('filtro de ofensas no cadastro', () => {
  test('nome do time, do craque e username ofensivos são apontados', () => {
    const result = validateRegistration({
      ...valid,
      playerName: 'Bosta',
      teamName: 'Puta FC',
      username: 'fdp_10',
    })
    expect(result.playerName).toBeTruthy()
    expect(result.teamName).toBeTruthy()
    expect(result.username).toBeTruthy()
  })
})

describe('remainingCreatePoints', () => {
  test('conta o que falta distribuir a partir da base', () => {
    expect(remainingCreatePoints(DEFAULT_ATTRIBUTES)).toBe(10)
    expect(remainingCreatePoints({ finalizacao: 6, passe: 6, cobranca: 5, defesa: 5 })).toBe(0)
    expect(remainingCreatePoints({ finalizacao: 4, passe: 3, cobranca: 3, defesa: 3 })).toBe(9)
  })
})
