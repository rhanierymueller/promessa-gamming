import { describe, expect, test } from 'vitest'
import { nextFixture } from './nextFixture'
import { createSave, type PlayerSave } from '../../state/save'
import { createLibertados } from '../libertados/libertados'
import { SEASON_ROUNDS } from '../season/types'

const BRASILEIROS = ['leoes-capital', 'mare-rubra', 'imperial', 'atlantico']

const base = (): PlayerSave => createSave({ playerName: 'Tuca', clubId: 'leoes-capital' })!

const comLibertados = (over: Partial<PlayerSave> = {}): PlayerSave => {
  const save = base()
  return {
    ...save,
    libertados: createLibertados(4, save.careerYear, save.clubId, BRASILEIROS),
    libertadosQualified: true,
    ...over,
  }
}

describe('próximo compromisso da temporada', () => {
  test('sem Libertados, o compromisso é sempre a rodada da liga', () => {
    expect(nextFixture(base())?.kind).toBe('liga')
  })

  test('temporada encerrada e sem torneio não tem compromisso', () => {
    const save = base()
    expect(nextFixture({ ...save, season: { ...save.season, currentRound: SEASON_ROUNDS } })).toBeNull()
  })

  test('em março, antes de a Libertados começar, a liga vem primeiro', () => {
    const escolhido = nextFixture(comLibertados())
    expect(escolhido?.kind).toBe('liga')
    expect(escolhido?.date.month).toBe(2)
  })

  test('com a liga adiantada, o jogo do continente vem primeiro', () => {
    // liga na 10ª rodada (julho) e Libertados ainda na 1ª rodada de grupo (abril)
    const save = comLibertados()
    const escolhido = nextFixture({ ...save, season: { ...save.season, currentRound: 10 } })
    expect(escolhido?.kind).toBe('libertados')
    expect(escolhido?.date.month).toBe(3)
  })

  test('torneio encerrado deixa só a liga', () => {
    const save = comLibertados()
    const encerrado = { ...save.libertados!, stage: 'eliminated' as const }
    expect(nextFixture({ ...save, libertados: encerrado })?.kind).toBe('liga')
  })

  test('liga encerrada deixa só o torneio', () => {
    const save = comLibertados()
    const escolhido = nextFixture({ ...save, season: { ...save.season, currentRound: SEASON_ROUNDS } })
    expect(escolhido?.kind).toBe('libertados')
  })
})
