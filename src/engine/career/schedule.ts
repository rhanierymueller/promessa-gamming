import { isInLibertados, type PlayerSave } from '../../state/save'
import {
  isLibertadosRunning,
  libertadosMatchIndex,
  MATCHES_PER_EDITION,
  type LibertadosKnockoutStage,
} from '../libertados/types'
import { fixturesForRound } from '../season/season'
import { SEASON_ROUNDS } from '../season/types'
import {
  firstKnockoutStage,
  KNOCKOUT_ORDER,
  GROUP_ROUNDS,
  playerTournamentOpponentId,
  STAGE_NAMES,
  tournamentKindForYear,
  type TournamentKind,
  type TournamentState,
  type TournamentStage,
} from '../tournament/tournament'
import { nationById } from '../../data/nations'
import {
  compareDates,
  copaBrasilDate,
  libertadosDate,
  roundDate,
  tournamentMatchDate,
  type CalendarDate,
} from './calendar'
import { copaBrasilOpponentId } from '../copaBrasil/copaBrasil'
import {
  copaBrasilMatchIndex,
  isCopaBrasilRunning,
  KNOCKOUT_ORDER as COPA_BRASIL_ORDER,
  MATCHES_PER_EDITION as COPA_BRASIL_MATCHES,
  STAGE_NAMES as COPA_BRASIL_STAGES,
  type CopaBrasilKnockoutStage,
} from '../copaBrasil/types'

/**
 * A agenda da temporada: TODOS os compromissos do jogador, de todas as
 * competições, em ordem cronológica.
 *
 * Antes, cada tela refazia esta conta do seu jeito — o calendário montava um
 * mapa por competição, a Home tinha o próprio cálculo de "quem joga primeiro" e
 * a copa de seleções não entrava em nenhum dos dois. Uma fonte só evita que as
 * telas discordem sobre quando é o próximo jogo.
 */

export type CompetitionId = 'liga' | 'libertados' | 'copa-brasil' | TournamentKind

export interface ScheduleResult {
  readonly teamGoals: number
  readonly opponentGoals: number
}

export interface ScheduledMatch {
  readonly competition: CompetitionId
  readonly date: CalendarDate
  /** "Rodada 3", "Fase de grupos", "Semifinal" — o que situa o jogo. */
  readonly stageLabel: string
  /** null enquanto o adversário não foi sorteado (copa antes do sorteio). */
  readonly opponentId: string | null
  readonly isHome: boolean
  /**
   * O jogo já aconteceu. Vem do andamento da competição, não do histórico: o
   * save guarda só as últimas partidas da carreira, então uma rodada antiga
   * pode ter sido disputada sem ter registro para exibir.
   */
  readonly isPlayed: boolean
  /** O placar, quando o histórico ainda o alcança. */
  readonly result: ScheduleResult | null
}

/** Um compromisso da copa de seleções: a fase e, nos grupos, qual rodada. */
interface TournamentSlot {
  readonly stage: TournamentStage
  readonly round: number
}

const resultOf = (teamGoals: number, opponentGoals: number): ScheduleResult => ({
  teamGoals,
  opponentGoals,
})

/** Jogos da liga: um por rodada, com o resultado quando já foi disputado. */
const leagueMatches = (save: PlayerSave): readonly ScheduledMatch[] => {
  const played = save.history.filter((record) => record.competition === 'liga')
  const matches: ScheduledMatch[] = []
  for (let round = 0; round < SEASON_ROUNDS; round++) {
    const fixture = fixturesForRound(save.season, round).find(
      (entry) => entry.homeId === save.clubId || entry.awayId === save.clubId,
    )
    if (!fixture) continue
    // o histórico guarda as últimas partidas de TODA a carreira: as desta
    // temporada são as `currentRound` finais
    const isPlayed = round < save.season.currentRound
    const record = isPlayed
      ? played[played.length - save.season.currentRound + round] ?? null
      : null
    matches.push({
      competition: 'liga',
      date: roundDate(save.careerYear, round, isInLibertados(save)),
      stageLabel: `Rodada ${round + 1}`,
      opponentId: fixture.homeId === save.clubId ? fixture.awayId : fixture.homeId,
      isHome: fixture.homeId === save.clubId,
      isPlayed,
      result: record ? resultOf(record.teamGoals, record.opponentGoals) : null,
    })
  }
  return matches
}

/** Nome da fase da Libertados, com a mão (ida/volta) quando é mata-mata. */
const libertadosStageLabel = (index: number): string => {
  if (index < GROUP_ROUNDS * 2) return `Grupos · rodada ${index + 1}`
  const offset = index - GROUP_ROUNDS * 2
  const stage = KNOCKOUT_ORDER[Math.floor(offset / 2)]
  const leg = offset % 2 === 0 ? 'ida' : 'volta'
  return stage ? `${STAGE_NAMES[stage]} · ${leg}` : 'Mata-mata'
}

/**
 * Jogos da Libertados. A edição tem data para todos os 14 compromissos desde o
 * primeiro dia; o adversário de um mata-mata que ainda não foi sorteado sai
 * como null e a tela mostra a taça no lugar do escudo.
 */
const libertadosMatches = (save: PlayerSave): readonly ScheduledMatch[] => {
  const state = save.libertados
  if (!state || !state.playerClubId) return []
  const clubId = state.playerClubId
  const running = isLibertadosRunning(state.stage)
  // onde a edição está agora: tudo antes disso já foi disputado
  const currentIndex = running
    ? libertadosMatchIndex(state.stage as LibertadosKnockoutStage | 'groups', state.round)
    : MATCHES_PER_EDITION
  const matches: ScheduledMatch[] = []
  for (let index = 0; index < MATCHES_PER_EDITION; index++) {
    const played = state.results.find(
      (result) =>
        libertadosMatchIndex(result.stage as LibertadosKnockoutStage | 'groups', result.round) ===
          index &&
        (result.homeId === clubId || result.awayId === clubId),
    )
    // a edição acaba quando o clube cai: sem jogo disputado e sem torneio
    // rodando, não há compromisso nenhum a marcar
    if (!played && !running) continue
    const isHome = played ? played.homeId === clubId : index % 2 === 0
    matches.push({
      competition: 'libertados',
      date: libertadosDate(save.careerYear, index),
      stageLabel: libertadosStageLabel(index),
      opponentId: played ? (played.homeId === clubId ? played.awayId : played.homeId) : null,
      isHome,
      isPlayed: played !== undefined || index < currentIndex,
      result: played
        ? resultOf(
            played.homeId === clubId ? played.homeGoals : played.awayGoals,
            played.homeId === clubId ? played.awayGoals : played.homeGoals,
          )
        : null,
    })
  }
  return matches
}

/**
 * Jogos da Copa do Brasil: as cinco fases em ida e volta, nas semanas que a
 * Libertados deixa livres. O adversário de uma fase futura só aparece quando a
 * chave chega nela — até lá é a taça no lugar do escudo.
 */
const copaBrasilMatches = (save: PlayerSave): readonly ScheduledMatch[] => {
  const state = save.copaBrasil
  if (!state || !state.playerClubId) return []
  const clubId = state.playerClubId
  const running = isCopaBrasilRunning(state.stage)
  const currentIndex = running
    ? copaBrasilMatchIndex(state.stage as CopaBrasilKnockoutStage, state.round)
    : COPA_BRASIL_MATCHES
  const opponentId = copaBrasilOpponentId(state)

  const matches: ScheduledMatch[] = []
  for (let index = 0; index < COPA_BRASIL_MATCHES; index++) {
    const played = state.results.find(
      (result) =>
        copaBrasilMatchIndex(result.stage, result.round) === index &&
        (result.homeId === clubId || result.awayId === clubId),
    )
    // eliminado: os jogos que ele não vai disputar somem da agenda
    if (!played && !running) continue
    const stage = COPA_BRASIL_ORDER[Math.floor(index / 2)]
    const leg = index % 2 === 0 ? 'ida' : 'volta'
    matches.push({
      competition: 'copa-brasil',
      date: copaBrasilDate(save.careerYear, index),
      stageLabel: `${COPA_BRASIL_STAGES[stage]} · ${leg}`,
      opponentId: played
        ? played.homeId === clubId
          ? played.awayId
          : played.homeId
        : index === currentIndex
          ? opponentId
          : null,
      isHome: played ? played.homeId === clubId : index % 2 === 0,
      isPlayed: played !== undefined || index < currentIndex,
      result: played
        ? resultOf(
            played.homeId === clubId ? played.homeGoals : played.awayGoals,
            played.homeId === clubId ? played.awayGoals : played.homeGoals,
          )
        : null,
    })
  }
  return matches
}

/**
 * As fases da copa de seleções em ordem: as rodadas de grupo e, depois, o
 * mata-mata a partir da primeira fase daquele formato.
 *
 * A Copa do Mundo tem 8 grupos e começa nas oitavas; a Copa América tem 2 e
 * entra direto na semifinal. Montar a sequência evita uma fórmula de índice que
 * precise conhecer o formato — e o mata-mata aqui é jogo único, ao contrário da
 * Libertados, que é ida e volta.
 */
const tournamentSlots = (state: TournamentState): readonly TournamentSlot[] => {
  const groups: TournamentSlot[] = Array.from({ length: GROUP_ROUNDS }, (_, round) => ({
    stage: 'groups' as const,
    round,
  }))
  const first = KNOCKOUT_ORDER.indexOf(firstKnockoutStage(state))
  const knockout: TournamentSlot[] = KNOCKOUT_ORDER.slice(first).map((stage) => ({
    stage,
    round: 0,
  }))
  return [...groups, ...knockout]
}

const tournamentStageLabel = (slot: TournamentSlot): string =>
  slot.stage === 'groups' ? `Grupos · rodada ${slot.round + 1}` : STAGE_NAMES[slot.stage]

/**
 * Jogos da copa de seleções. Enquanto não há convocação, a competição ainda
 * aparece na agenda — pelo tipo do ano — com data e fase, mas sem adversário:
 * é a Copa que vem aí, não um jogo marcado.
 */
const tournamentMatches = (save: PlayerSave): readonly ScheduledMatch[] => {
  const state = save.tournament
  const kind =
    state?.kind ??
    tournamentKindForYear(
      save.careerYear,
      nationById(save.nationalityId)?.confederation ?? 'america',
    )
  if (!kind) return []

  if (!state) {
    // sem sorteio ainda: marca só a abertura, para o jogador saber que existe
    return [
      {
        competition: kind,
        date: tournamentMatchDate(save.careerYear, 0),
        stageLabel: STAGE_NAMES.groups,
        opponentId: null,
        isHome: true,
        isPlayed: save.tournamentPlayed,
        result: null,
      },
    ]
  }

  const slots = tournamentSlots(state)
  const running = slots.findIndex(
    (slot) => slot.stage === state.stage && slot.round === state.round,
  )
  // fora da chave (eliminado ou campeão) a competição acabou para o jogador
  const currentIndex = running < 0 ? slots.length : running
  const opponentId = playerTournamentOpponentId(state)
  return slots.map((slot, index) => {
    const played = state.results.find(
      (result) =>
        result.stage === slot.stage &&
        result.round === slot.round &&
        (result.homeId === state.playerNationId || result.awayId === state.playerNationId),
    )
    const isHome = played ? played.homeId === state.playerNationId : true
    return {
      competition: kind,
      date: tournamentMatchDate(save.careerYear, index),
      stageLabel: tournamentStageLabel(slot),
      // só o confronto ATUAL tem adversário conhecido — o resto da chave
      // depende de quem vencer antes
      opponentId: played
        ? played.homeId === state.playerNationId
          ? played.awayId
          : played.homeId
        : index === currentIndex
          ? opponentId
          : null,
      isHome,
      isPlayed: played !== undefined || index < currentIndex,
      result: played
        ? resultOf(
            played.homeId === state.playerNationId ? played.homeGoals : played.awayGoals,
            played.homeId === state.playerNationId ? played.awayGoals : played.homeGoals,
          )
        : null,
    }
  })
}

/** Todos os compromissos da temporada, em ordem cronológica. */
export const seasonSchedule = (save: PlayerSave): readonly ScheduledMatch[] =>
  [
    ...leagueMatches(save),
    ...libertadosMatches(save),
    ...copaBrasilMatches(save),
    ...tournamentMatches(save),
  ].sort((a, b) => compareDates(a.date, b.date))

/**
 * O próximo compromisso: o primeiro que ainda não foi jogado.
 *
 * Com duas competições abertas, "próxima rodada" não basta — quem joga primeiro
 * é quem tem a data mais próxima, e a agenda já vem ordenada por isso.
 */
export const nextScheduled = (save: PlayerSave): ScheduledMatch | null =>
  seasonSchedule(save).find((match) => !match.isPlayed) ?? null
