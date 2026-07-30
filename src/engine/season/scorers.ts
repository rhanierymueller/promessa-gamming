import { clubById } from '../../data/clubs'
import { createRng, nextFloat } from '../rng'
import { squadPlayersFor, type SquadPlayer } from '../squad/players'
import { computeTable } from './season'
import type { PlayerGender } from '../../state/save'
import type { SeasonState } from './types'

/**
 * Artilharia da temporada. Os gols NÃO são inventados: cada clube marcou uma
 * quantidade exata na tabela, e essa quantidade é repartida entre os jogadores
 * dele. Quem faz gol é sorteado pelo peso da posição e da finalização, com
 * semente fixa — a mesma temporada devolve sempre a mesma artilharia.
 */

export interface ScorerRow {
  readonly playerId: string
  readonly name: string
  readonly clubId: string
  readonly goals: number
  readonly isUser: boolean
}

/** Chance relativa de um jogador ser o autor, por posição. */
const POSITION_WEIGHT: Record<string, number> = {
  ATA: 10,
  PON: 6,
  MEI: 4,
  VOL: 1.5,
  LD: 0.8,
  LE: 0.8,
  ZAG: 0.7,
  GOL: 0.02,
}

/** Finalização acima da média puxa o peso para cima (0.5× a ~1.6×). */
const finishingFactor = (player: SquadPlayer): number => 0.5 + (player.attrs.fin / 100) * 1.1

const weightOf = (player: SquadPlayer): number =>
  (POSITION_WEIGHT[player.position] ?? 1) * finishingFactor(player)

/**
 * Um time de verdade costuma ter uma referência ofensiva. Sem esse foco, os
 * gols dos 18 jogadores ficavam diluídos demais e o líder da IA terminava uma
 * liga de 13 rodadas com cerca de 8 gols, mesmo quando o protagonista passava
 * dos 20. O melhor peso ofensivo do elenco recebe esta concentração adicional;
 * os gols totais do clube continuam rigorosamente iguais aos da tabela.
 */
const STAR_SCORER_MULTIPLIER = 2.5

/** Semente estável por clube: a artilharia não muda a cada renderização. */
/** Semente estável por clube/seleção — compartilhada com a artilharia de copa. */
export const clubSeed = (seasonSeed: number, clubId: string): number => {
  let hash = seasonSeed >>> 0
  for (let i = 0; i < clubId.length; i++) {
    hash ^= clubId.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** Reparte os `goals` do clube entre o elenco, respeitando os pesos. */
/** Reparte os gols de um time entre os jogadores dele, pela posição. */
export const distribute = (
  squad: readonly SquadPlayer[],
  goals: number,
  seed: number,
): ReadonlyMap<string, number> => {
  const tally = new Map<string, number>()
  if (goals <= 0 || squad.length === 0) return tally
  const weights = squad.map(weightOf)
  const starIndex = weights.reduce(
    (bestIndex, weight, index) => weight > weights[bestIndex] ? index : bestIndex,
    0,
  )
  weights[starIndex] *= STAR_SCORER_MULTIPLIER
  const total = weights.reduce((sum, value) => sum + value, 0)
  let rng = createRng(seed)
  for (let i = 0; i < goals; i++) {
    const roll = nextFloat(rng)
    rng = roll.next
    let target = roll.value * total
    let index = 0
    while (index < squad.length - 1 && target > weights[index]) {
      target -= weights[index]
      index++
    }
    const player = squad[index]
    tally.set(player.id, (tally.get(player.id) ?? 0) + 1)
  }
  return tally
}

export interface ScorersInput {
  readonly season: SeasonState
  readonly careerYear: number
  /** Clube do jogador — os gols DELE já são conhecidos e não se sorteiam. */
  readonly userClubId: string
  readonly userName: string
  /** Gols de liga do craque nesta temporada. */
  readonly userGoals: number
  /** Nomes que o jogador batizou (playerId → nome). */
  readonly customNames?: Readonly<Record<string, string>>
  /** Gênero do mundo do jogo — carreira feminina tem elencos de jogadoras. */
  readonly gender?: PlayerGender
}

/**
 * Tabela de artilheiros ordenada. O total de cada clube bate exatamente com
 * o "gols pró" da classificação — nada de número solto.
 */
export const seasonScorers = (input: ScorersInput, limit = 10): readonly ScorerRow[] => {
  const { season, careerYear, userClubId, userName, userGoals, customNames = {} } = input
  const goalsByClub = new Map(computeTable(season).map((row) => [row.clubId, row.goalsFor]))
  const rows: ScorerRow[] = []

  for (const clubId of season.participants) {
    const club = clubById(clubId)
    if (!club) continue
    const clubGoals = goalsByClub.get(clubId) ?? 0
    const isUserClub = clubId === userClubId
    const squad = squadPlayersFor(club, careerYear, input.gender ?? 'masculino')

    if (isUserClub) {
      // os seus gols são fato; só o restante do clube entra no sorteio
      const mine = Math.min(userGoals, clubGoals)
      if (mine > 0) {
        rows.push({ playerId: 'voce', name: userName, clubId, goals: mine, isUser: true })
      }
      const rest = squad.filter((player) => player.id !== 'voce')
      for (const [playerId, goals] of distribute(rest, clubGoals - mine, clubSeed(season.seed, clubId))) {
        const player = rest.find((entry) => entry.id === playerId)!
        rows.push({
          playerId,
          name: customNames[playerId] ?? player.name,
          clubId,
          goals,
          isUser: false,
        })
      }
      continue
    }

    for (const [playerId, goals] of distribute(squad, clubGoals, clubSeed(season.seed, clubId))) {
      const player = squad.find((entry) => entry.id === playerId)!
      rows.push({ playerId, name: player.name, clubId, goals, isUser: false })
    }
  }

  return rows
    .sort((a, b) => b.goals - a.goals || (a.isUser ? -1 : b.isUser ? 1 : a.name.localeCompare(b.name)))
    .slice(0, limit)
}
