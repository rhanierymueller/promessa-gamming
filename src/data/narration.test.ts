import { describe, expect, it } from 'vitest'
import { acaoDaJogada, fechoDaDecisao, withCast } from './narration'

const cast = {
  name: 'Rhaniery',
  mate: 'Jonas',
  rival: 'Emerson',
}

describe('narração da decisão', () => {
  it('preenche todos os personagens do lance', () => {
    expect(
      withCast('{name} acha {mate}, mas {rival} corta o passe.', cast),
    ).toBe('Rhaniery acha Jonas, mas Emerson corta o passe.')
  })

  it('narra a ação escolhida antes do desfecho', () => {
    expect(
      withCast(acaoDaJogada('tabela-e-infiltrar', 'chance'), cast),
    ).toContain('Rhaniery tabela de primeira com Jonas')
    expect(
      withCast(acaoDaJogada('tabela-e-infiltrar', 'contra'), cast),
    ).toBe('A tabela não voltou — interceptaram no meio do caminho.')
  })

  it('separa o fecho de gol, assistência e contra-ataque', () => {
    expect(withCast(fechoDaDecisao('gol', false, 0) ?? '', cast)).toContain(
      'GOOOOL DE Rhaniery',
    )
    expect(withCast(fechoDaDecisao('chance', true, 1) ?? '', cast)).toContain(
      'Jonas bate de primeira',
    )
    expect(withCast(fechoDaDecisao('contra', false, 2) ?? '', cast)).toContain(
      'Emerson aparece sozinho',
    )
  })

  it('não inventa uma segunda batida quando o lance termina sem finalização', () => {
    expect(fechoDaDecisao('nada', false, 0)).toBeNull()
    expect(fechoDaDecisao('perdeu', false, 0)).toBeNull()
  })
})
