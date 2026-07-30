import { describe, expect, test } from 'vitest'
import { chooseSave, resolveSync } from './syncPolicy'

/*
 * A regra decide qual carreira sobrevive quando o mesmo jogador jogou em dois
 * aparelhos. Errar aqui APAGA carreira, então ela é pura e testada à parte.
 */

describe('quem vence na sincronização', () => {
  test('sem nada na nuvem, a carreira do aparelho sobe', () => {
    // é o caso de quem já jogava antes da sincronização existir
    expect(chooseSave({ localSavedAt: 500, cloudSavedAt: null })).toBe('local')
  })

  test('sem nada no aparelho, a carreira da nuvem desce', () => {
    expect(chooseSave({ localSavedAt: null, cloudSavedAt: 500 })).toBe('cloud')
  })

  test('sem nada dos dois lados, não há o que sincronizar', () => {
    expect(chooseSave({ localSavedAt: null, cloudSavedAt: null })).toBe('nenhum')
  })

  test('vence o salvo por último — o aparelho', () => {
    expect(chooseSave({ localSavedAt: 900, cloudSavedAt: 400 })).toBe('local')
  })

  test('vence o salvo por último — a nuvem', () => {
    expect(chooseSave({ localSavedAt: 400, cloudSavedAt: 900 })).toBe('cloud')
  })

  test('empate fica com o aparelho: sem diferença, não vale trocar a tela do jogador', () => {
    expect(chooseSave({ localSavedAt: 700, cloudSavedAt: 700 })).toBe('local')
  })

  test('save antigo sem carimbo de tempo perde para um carimbado', () => {
    // saves criados antes desta versão não têm savedAt
    expect(chooseSave({ localSavedAt: 0, cloudSavedAt: 100 })).toBe('cloud')
    expect(chooseSave({ localSavedAt: 100, cloudSavedAt: 0 })).toBe('local')
  })
})

describe('resolveSync: a nuvem que não respondeu', () => {
  const local = 2000
  const cloud = 3000

  test('nuvem ILEGÍVEL nunca é sobrescrita, mesmo com save local mais antigo', () => {
    // Arrange & Act: é o cenário que apagava carreira em silêncio
    const decision = resolveSync({ localSavedAt: local, cloud: 'ilegivel', cloudSavedAt: null })

    // Assert
    expect(decision.pushLocal).toBe(false)
    expect(decision.useCloud).toBe(false)
    expect(decision.winner).toBe('local')
  })

  test('nuvem INDISPONÍVEL também não é sobrescrita', () => {
    const decision = resolveSync({ localSavedAt: local, cloud: 'indisponivel', cloudSavedAt: null })
    expect(decision.pushLocal).toBe(false)
  })

  test('nuvem VAZIA recebe o save do aparelho — é seguro afirmar que está atrás', () => {
    const decision = resolveSync({ localSavedAt: local, cloud: 'vazia', cloudSavedAt: null })
    expect(decision.pushLocal).toBe(true)
    expect(decision.winner).toBe('local')
  })

  test('nuvem com save mais novo vence e não é sobrescrita', () => {
    const decision = resolveSync({ localSavedAt: local, cloud: 'save', cloudSavedAt: cloud })
    expect(decision.useCloud).toBe(true)
    expect(decision.pushLocal).toBe(false)
    expect(decision.winner).toBe('cloud')
  })

  test('save local mais novo sobe para a nuvem', () => {
    const decision = resolveSync({ localSavedAt: cloud, cloud: 'save', cloudSavedAt: local })
    expect(decision.pushLocal).toBe(true)
    expect(decision.useCloud).toBe(false)
  })

  test('sem save nenhum, não há o que escrever', () => {
    const decision = resolveSync({ localSavedAt: null, cloud: 'vazia', cloudSavedAt: null })
    expect(decision.pushLocal).toBe(false)
    expect(decision.winner).toBe('nenhum')
  })

  test('sem save local e nuvem ilegível não inventa vencedor', () => {
    const decision = resolveSync({ localSavedAt: null, cloud: 'ilegivel', cloudSavedAt: null })
    expect(decision.winner).toBe('nenhum')
    expect(decision.pushLocal).toBe(false)
  })
})
