import { describe, expect, test } from 'vitest'
import { chooseSave } from './syncPolicy'

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
