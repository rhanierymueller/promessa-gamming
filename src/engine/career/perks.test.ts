import { describe, expect, test } from 'vitest'
import { DEFAULT_DEFENSE_CONFIG } from '../defense/defense'
import { DEFAULT_SHOT_CONFIG } from '../shot/config'
import { DEFAULT_WALL } from '../shot/wall'
import {
  PERKS,
  PERK_IDS,
  applyPerksToDefense,
  applyPerksToShot,
  applyPerksToWall,
  captainMomentum,
  isPerfectRating,
  perkOptionsFor,
  PERFECT_GAMES_FOR_PERK,
  PERFECT_RATING,
  perkById,
  perkDecisionSeconds,
  perkPassChance,
  perkTrainingBonus,
} from './perks'


describe('catálogo de perks', () => {
  test('todos os perks têm nome e descrição', () => {
    for (const id of PERK_IDS) {
      const perk = perkById(id)
      expect(perk.name.length).toBeGreaterThan(0)
      expect(perk.description.length).toBeGreaterThan(0)
    }
  })

  test('catálogo cobre os 8 perks planejados', () => {
    expect(PERKS).toHaveLength(8)
  })
})

describe('gatilho da habilidade: cinco atuações nota 10', () => {
  test('só nota 10 conta como atuação perfeita', () => {
    expect(isPerfectRating(10)).toBe(true)
    expect(isPerfectRating(9.9)).toBe(false)
    expect(isPerfectRating(8)).toBe(false)
  })

  test('o preço da habilidade é alto de propósito', () => {
    expect(PERFECT_GAMES_FOR_PERK).toBe(5)
    expect(PERFECT_RATING).toBe(10)
  })
})

describe('oferta de perks', () => {
  test('oferece 3 opções para quem não tem nenhum', () => {
    const offer = perkOptionsFor([])
    expect(offer).toHaveLength(3)
    expect(new Set(offer).size).toBe(3)
  })

  test('não oferece perk já adquirido', () => {
    const owned = [perkOptionsFor([])[0]]
    expect(perkOptionsFor(owned)).not.toContain(owned[0])
  })

  test('com quase tudo adquirido, oferece o que resta', () => {
    const owned = PERK_IDS.slice(0, PERK_IDS.length - 1)
    expect(perkOptionsFor(owned)).toEqual([PERK_IDS[PERK_IDS.length - 1]])
  })

  test('com tudo adquirido, oferta vazia', () => {
    expect(perkOptionsFor(PERK_IDS)).toHaveLength(0)
  })
})

describe('efeitos dos perks', () => {
  test('matador reduz a dispersão só quando o time não está vencendo', () => {
    const clutch = applyPerksToShot(DEFAULT_SHOT_CONFIG, ['matador'], { clutch: true, tournament: false })
    const winning = applyPerksToShot(DEFAULT_SHOT_CONFIG, ['matador'], { clutch: false, tournament: false })
    expect(clutch.dispersionX).toBeLessThan(DEFAULT_SHOT_CONFIG.dispersionX)
    expect(winning.dispersionX).toBe(DEFAULT_SHOT_CONFIG.dispersionX)
  })

  test('craque de copa afina o chute em torneios', () => {
    const config = applyPerksToShot(DEFAULT_SHOT_CONFIG, ['craque-de-copa'], { clutch: false, tournament: true })
    expect(config.dispersionX).toBeLessThan(DEFAULT_SHOT_CONFIG.dispersionX)
  })

  test('folha seca encolhe o pulo da barreira', () => {
    const wall = applyPerksToWall(DEFAULT_WALL, ['folha-seca'])
    expect(wall.jumpBoost).toBeLessThan(DEFAULT_WALL.jumpBoost)
  })

  test('muralha estica a luva do goleiro', () => {
    const config = applyPerksToDefense(DEFAULT_DEFENSE_CONFIG, ['muralha'])
    expect(config.reach).toBeGreaterThan(DEFAULT_DEFENSE_CONFIG.reach)
  })

  test('maestro soma chance de passe sem estourar o teto', () => {
    expect(perkPassChance(0.6, ['maestro'])).toBeCloseTo(0.65)
    expect(perkPassChance(0.96, ['maestro'])).toBe(0.97)
    expect(perkPassChance(0.6, [])).toBe(0.6)
  })

  test('frieza estica o tempo de decisão', () => {
    expect(perkDecisionSeconds(6, ['frieza'])).toBeCloseTo(9)
    expect(perkDecisionSeconds(6, [])).toBe(6)
  })

  test('capitão amplia só o momentum positivo', () => {
    expect(captainMomentum(0.5, ['capitao'])).toBeCloseTo(0.65)
    expect(captainMomentum(-0.3, ['capitao'])).toBe(-0.3)
    expect(captainMomentum(0.9, ['capitao'])).toBe(1)
    expect(captainMomentum(0.5, [])).toBe(0.5)
  })

  test('ídolo da torcida rende ponto extra só em vitória', () => {
    expect(perkTrainingBonus(['idolo-da-torcida'], true)).toBe(1)
    expect(perkTrainingBonus(['idolo-da-torcida'], false)).toBe(0)
    expect(perkTrainingBonus([], true)).toBe(0)
  })
})
