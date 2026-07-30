import { describe, expect, it } from 'vitest'
import type { SectorRatings } from '../squad/sectors'
import { DEFAULT_MATCH_CONFIG } from './config'
import { autoProbsForSectors, matchConfigForSectors, type AutoProbInput } from './difficulty'

/*
 * Estas duas são o caminho VIVO da partida (MatchScreen usa as versões por
 * setor, não as por overall) e estavam sem nenhuma cobertura. Fixar o
 * comportamento aqui antes de mexer no formato das probabilidades.
 */

const setores = (def: number, mei: number, ata: number): SectorRatings => ({ def, mei, ata })

const IGUAIS = setores(70, 70, 70)
const BASE: AutoProbInput = { shotGoal: 0.34, defenseSave: 0.42 }

describe('matchConfigForSectors', () => {
  it('confronto igual mantém as chances perto da base', () => {
    const config = matchConfigForSectors(DEFAULT_MATCH_CONFIG, IGUAIS, IGUAIS)
    expect(config.teamGoalChance).toBeCloseTo(DEFAULT_MATCH_CONFIG.teamGoalChance, 5)
    expect(config.opponentGoalChance).toBeCloseTo(DEFAULT_MATCH_CONFIG.opponentGoalChance, 5)
  })

  it('meu ataque contra defesa fraca aumenta minha chance de marcar', () => {
    const forte = matchConfigForSectors(DEFAULT_MATCH_CONFIG, setores(70, 70, 90), setores(50, 70, 70))
    expect(forte.teamGoalChance).toBeGreaterThan(DEFAULT_MATCH_CONFIG.teamGoalChance)
  })

  it('minha defesa forte reduz a chance do adversário', () => {
    const solido = matchConfigForSectors(DEFAULT_MATCH_CONFIG, setores(90, 70, 70), setores(70, 70, 60))
    expect(solido.opponentGoalChance).toBeLessThan(DEFAULT_MATCH_CONFIG.opponentGoalChance)
  })

  it('ganhar o meio-campo rende mais chutes', () => {
    const dominante = matchConfigForSectors(DEFAULT_MATCH_CONFIG, setores(70, 95, 70), setores(70, 55, 70))
    expect(dominante.playerShots).toBeGreaterThan(DEFAULT_MATCH_CONFIG.playerShots)
  })

  it('ganhar o meio-campo rende mais DECISÕES', () => {
    // a decisão é o lance de construção: antes era o único que mexia no placar
    // sem a dificuldade poder modulá-lo
    const dominante = matchConfigForSectors(DEFAULT_MATCH_CONFIG, setores(70, 95, 70), setores(70, 55, 70))
    expect(dominante.playerDecisions).toBeGreaterThan(DEFAULT_MATCH_CONFIG.playerDecisions)
  })

  it('perder o meio-campo nunca zera as decisões', () => {
    const atropelado = matchConfigForSectors(DEFAULT_MATCH_CONFIG, setores(40, 40, 40), setores(95, 95, 95))
    expect(atropelado.playerDecisions).toBeGreaterThanOrEqual(1)
  })

  it('nunca deixa a partida sem nenhum lance jogável', () => {
    const atropelado = matchConfigForSectors(DEFAULT_MATCH_CONFIG, setores(40, 40, 40), setores(95, 95, 95))
    expect(atropelado.playerShots).toBeGreaterThanOrEqual(1)
  })

  it('duelo travado entre setores fortes segura os dois placares', () => {
    const aberto = matchConfigForSectors(DEFAULT_MATCH_CONFIG, setores(50, 50, 50), setores(50, 50, 50))
    const travado = matchConfigForSectors(DEFAULT_MATCH_CONFIG, setores(95, 95, 95), setores(95, 95, 95))
    expect(travado.teamGoalChance).toBeLessThan(aberto.teamGoalChance)
    expect(travado.opponentGoalChance).toBeLessThan(aberto.opponentGoalChance)
  })

  it('mantém as chances dentro de piso e teto mesmo no abismo', () => {
    const zebra = matchConfigForSectors(DEFAULT_MATCH_CONFIG, setores(30, 30, 30), setores(99, 99, 99))
    expect(zebra.teamGoalChance).toBeGreaterThanOrEqual(0.05)
    expect(zebra.opponentGoalChance).toBeLessThanOrEqual(0.9)
  })

  it('não muta a config recebida', () => {
    const antes = { ...DEFAULT_MATCH_CONFIG }
    matchConfigForSectors(DEFAULT_MATCH_CONFIG, setores(90, 90, 90), setores(50, 50, 50))
    expect(DEFAULT_MATCH_CONFIG).toEqual(antes)
  })
})

describe('autoProbsForSectors', () => {
  it('confronto igual mantém as probabilidades perto da base', () => {
    const probs = autoProbsForSectors(BASE, IGUAIS, IGUAIS)
    expect(probs.shotGoal).toBeCloseTo(BASE.shotGoal, 5)
    expect(probs.defenseSave).toBeCloseTo(BASE.defenseSave, 5)
  })

  it('ataque melhor que a defesa deles converte mais chutes', () => {
    const probs = autoProbsForSectors(BASE, setores(70, 70, 95), setores(55, 70, 70))
    expect(probs.shotGoal).toBeGreaterThan(BASE.shotGoal)
  })

  it('defesa melhor que o ataque deles salva mais', () => {
    const probs = autoProbsForSectors(BASE, setores(95, 70, 70), setores(70, 70, 55))
    expect(probs.defenseSave).toBeGreaterThan(BASE.defenseSave)
  })

  it('respeita piso e teto: nem azarão sem chance, nem favorito imbatível', () => {
    const atropelado = autoProbsForSectors(BASE, setores(30, 30, 30), setores(99, 99, 99))
    const atropelando = autoProbsForSectors(BASE, setores(99, 99, 99), setores(30, 30, 30))
    for (const valor of Object.values(atropelado)) {
      expect(valor).toBeGreaterThanOrEqual(0.08)
    }
    for (const valor of Object.values(atropelando)) {
      expect(valor).toBeLessThanOrEqual(0.92)
    }
  })

  it('jogo travado derruba a conversão de chute', () => {
    const aberto = autoProbsForSectors(BASE, setores(50, 50, 50), setores(50, 50, 50))
    const travado = autoProbsForSectors(BASE, setores(95, 95, 95), setores(95, 95, 95))
    expect(travado.shotGoal).toBeLessThan(aberto.shotGoal)
  })

  it('não muta a base recebida', () => {
    const antes = { ...BASE }
    autoProbsForSectors(BASE, setores(90, 90, 90), setores(50, 50, 50))
    expect(BASE).toEqual(antes)
  })
})
