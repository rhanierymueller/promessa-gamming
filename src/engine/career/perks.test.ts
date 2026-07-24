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
  dueMilestone,
  offerForMilestone,
  perkById,
  perkDecisionSeconds,
  perkPassChance,
  perkTrainingBonus,
  type MilestoneSnapshot,
} from './perks'

const SNAPSHOT_ZERO: MilestoneSnapshot = {
  games: 0,
  goals: 0,
  lastRating: 0,
  trophiesCount: 0,
  promoted: false,
}

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

describe('marcos de desbloqueio', () => {
  test('sem feitos não há marco devido', () => {
    expect(dueMilestone(SNAPSHOT_ZERO, [])).toBeNull()
  })

  test('nota 8+ libera o primeiro marco', () => {
    const due = dueMilestone({ ...SNAPSHOT_ZERO, games: 1, lastRating: 8.2 }, [])
    expect(due).toBe('jogao-de-gala')
  })

  test('marco já reivindicado não repete', () => {
    const due = dueMilestone({ ...SNAPSHOT_ZERO, games: 1, lastRating: 9 }, ['jogao-de-gala'])
    expect(due).toBeNull()
  })

  test('10 gols na carreira liberam o marco de artilheiro', () => {
    const due = dueMilestone({ ...SNAPSHOT_ZERO, games: 8, goals: 10 }, ['jogao-de-gala'])
    expect(due).toBe('artilheiro-10')
  })

  test('promoção e título têm marcos próprios', () => {
    expect(dueMilestone({ ...SNAPSHOT_ZERO, promoted: true }, [])).toBe('promovido')
    expect(dueMilestone({ ...SNAPSHOT_ZERO, trophiesCount: 1 }, ['promovido'])).toBe('campeao')
  })

  test('um marco por vez: o mais antigo pendente vem primeiro', () => {
    const due = dueMilestone(
      { games: 60, goals: 40, lastRating: 9, trophiesCount: 2, promoted: true },
      [],
    )
    expect(due).toBe('jogao-de-gala')
  })
})

describe('oferta de perks', () => {
  test('oferece 3 opções para quem não tem nenhum', () => {
    const offer = offerForMilestone('jogao-de-gala', [])
    expect(offer).toHaveLength(3)
    expect(new Set(offer).size).toBe(3)
  })

  test('não oferece perk já adquirido', () => {
    const first = offerForMilestone('jogao-de-gala', [])
    const owned = [first[0]]
    const second = offerForMilestone('artilheiro-10', owned)
    expect(second).not.toContain(owned[0])
  })

  test('com quase tudo adquirido, oferece o que resta', () => {
    const owned = PERK_IDS.slice(0, PERK_IDS.length - 1)
    const offer = offerForMilestone('campeao', owned)
    expect(offer).toEqual([PERK_IDS[PERK_IDS.length - 1]])
  })

  test('com tudo adquirido, oferta vazia', () => {
    expect(offerForMilestone('campeao', PERK_IDS)).toHaveLength(0)
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
