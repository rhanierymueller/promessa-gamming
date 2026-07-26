import { describe, expect, test } from 'vitest'
import { initialsOf } from './initials'

describe('initialsOf', () => {
  test('usa as duas primeiras palavras do nome', () => {
    expect(initialsOf('Vinícius Sales')).toBe('VS')
    expect(initialsOf('Antoine Renard')).toBe('AR')
  })

  test('limita a duas letras em nomes longos', () => {
    expect(initialsOf('Léo da Silva Barbosa')).toBe('LD')
  })

  test('devolve uma letra quando o nome tem só uma palavra', () => {
    expect(initialsOf('Pelé')).toBe('P')
  })

  test('ignora espaços extras entre e ao redor das palavras', () => {
    expect(initialsOf('  João   Pedro  ')).toBe('JP')
  })

  test('preserva acentos na inicial', () => {
    expect(initialsOf('Ángel Ómar')).toBe('ÁÓ')
  })

  test('devolve string vazia quando não há nome', () => {
    expect(initialsOf('')).toBe('')
    expect(initialsOf('   ')).toBe('')
  })
})
