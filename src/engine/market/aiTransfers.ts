import type { Club } from '../../data/clubs'
import { clubById } from '../../data/clubs'
import { NATIONS } from '../../data/nations'
import { ageFactor, RETIRE_AGE, type Potential } from '../squad/aging'
import type { PlayerGender } from '../../state/save'
import {
  clubBaseQuality,
  squadPlayersFor,
  type FifaAttributes,
  type SquadPlayer,
  type SquadPosition,
} from '../squad/players'
import {
  hashSeed,
  nextRoll,
  overallFor,
  priceRangeFor,
  scaleAttrs,
  squadWithSignings,
  uniqueName,
  type Signing,
} from './market'

/**
 * Mercado dos rivais: todo clube da pirâmide contrata sozinho, uma vez por
 * temporada — jogadores gerados (não os da sua vitrine), determinísticos por
 * clube+ano. O alvo sai da régua da divisão que o clube disputa HOJE, então
 * subir de série muda o que ele consegue comprar.
 *
 * O contratado entra pelo MESMO motor do seu mercado (squadWithSignings):
 * substitui o mais fraco da posição, envelhece e se aposenta aos 38 — mas só
 * segue no time enquanto render mais que a prata da casa.
 */

/**
 * Divisão mais baixa que ainda contrata — a pirâmide inteira (0 = A … 3 = D).
 *
 * Antes só A e B iam ao mercado, e a Série D não tinha via nenhuma de melhorar:
 * o elenco só envelhecia. Clube pequeno compra pequeno (o alvo sai da régua da
 * própria divisão), mas compra.
 */
const AI_DIVISION_LIMIT = 3

const NO_SIGNING_SHARE = 0.35
const DOUBLE_SIGNING_SHARE = 0.15
/** Chance de a contratação ser uma BOMBA (craque acima do nível do clube). */
const BLOCKBUSTER_SHARE = 0.05
/** Bomba digna de manchete nacional. */
const HEADLINE_OVERALL = 80

/**
 * Reforço de clube chega PRONTO — na janela se compra rendimento, não projeto
 * (garoto de futuro entra pela base, como regen). Fora da faixa de auge o
 * contratado nunca alcançaria o titular que veio substituir.
 */
const AI_MIN_AGE = 24
const AI_MAX_AGE = 29
const ATTR_SPREAD = 5
/** Margem mínima do reforço sobre quem ele empurra para fora do time. */
const AI_SIGNING_EDGE = 2
/** Teto de tentativas ao levantar o pico do reforço — trava de segurança. */
const RAISE_STEPS = 60
const BLOCKBUSTER_BOOST = 14
/**
 * Reforço do clube campeão continental, na janela seguinte ao título — o
 * dobro da bomba comum, porque 50 milhões (LIBERTADOS_PRIZE) compram melhor.
 */
const CONTINENTAL_CHAMPION_BOOST = 28
const GOALKEEPER_SHARE = 0.06

const LINE_POSITIONS: readonly SquadPosition[] = ['LD', 'ZAG', 'LE', 'VOL', 'MEI', 'PON', 'ATA']

const POTENTIAL_HIGH_SHARE = 0.15

const ATTR_KEYS = ['pac', 'fin', 'pas', 'dri', 'def', 'fis'] as const

/** Pior overall do elenco naquela posição — a vaga que o reforço vem tomar. */
const weakestAt = (squad: readonly SquadPlayer[], position: SquadPosition): number => {
  const inPosition = squad.filter((player) => player.position === position)
  return inPosition.length === 0 ? 0 : Math.min(...inPosition.map((player) => player.overall))
}

/**
 * Levanta o pico do reforço até ele render HOJE acima do piso pedido.
 *
 * Sem isto o clube contratava um clone da própria régua: como o alvo saía de
 * `clubBaseQuality` e o elenco já tinha crescido por cima dela, a "contratação"
 * entrava PIOR que o titular que empurrava para fora — e o time piorava a cada
 * janela. Quem paga por um reforço leva alguém melhor do que já tem.
 */
const raisePeakUntil = (
  position: SquadPosition,
  peak: FifaAttributes,
  factor: number,
  floor: number,
): FifaAttributes => {
  let raised = peak
  for (let step = 0; step < RAISE_STEPS; step++) {
    if (overallFor(position, scaleAttrs(raised, factor)) > floor) return raised
    const next = Object.fromEntries(
      ATTR_KEYS.map((key) => [key, Math.min(95, raised[key] + 1)]),
    ) as unknown as FifaAttributes
    if (ATTR_KEYS.every((key) => next[key] === raised[key])) return raised
    raised = next
  }
  return raised
}

export interface AiTransfer {
  readonly clubId: string
  readonly year: number
  readonly signing: Signing
  readonly overallAtSigning: number
  readonly isBlockbuster: boolean
}

/** Todas as contratações do clube até a temporada atual (vazio p/ C e D). */
export const aiTransfersFor = (
  club: Club,
  division: number,
  careerYear: number,
  /** Anos em que o clube levantou a taça continental — cofre cheio na janela seguinte. */
  continentalTitleYears: readonly number[] = [],
): readonly AiTransfer[] => {
  if (division > AI_DIVISION_LIMIT || division < 0) return []
  const transfers: AiTransfer[] = []
  const usedNames = new Set<string>()
  const clubBase = clubBaseQuality(club, division)

  for (let year = 1; year <= careerYear; year++) {
    let state = hashSeed(`${club.id}-mercado-ia-${year}`)
    const [countRoll, s1] = nextRoll(state)
    state = s1
    const rolledCount =
      countRoll < NO_SIGNING_SHARE ? 0 : countRoll < 1 - DOUBLE_SIGNING_SHARE ? 1 : 2
    /*
     * Cofre cheio na janela seguinte ao título: o campeão continental do ano
     * passado contrata pelo menos um reforço, mesmo que o sorteio natural
     * desse zero. O roll acima já aconteceu igual para todo mundo — só o
     * RESULTADO é sobrescrito, e só neste ano; anos sem título (a imensa
     * maioria) seguem com a mesma contagem de sempre.
     */
    const isPostTitleYear = continentalTitleYears.includes(year - 1)
    const count = isPostTitleYear ? Math.max(rolledCount, 1) : rolledCount

    for (let index = 0; index < count; index++) {
      const [positionRoll, s2] = nextRoll(state)
      state = s2
      const position: SquadPosition =
        positionRoll < GOALKEEPER_SHARE
          ? 'GOL'
          : LINE_POSITIONS[
              Math.floor(((positionRoll - GOALKEEPER_SHARE) / (1 - GOALKEEPER_SHARE)) * LINE_POSITIONS.length) %
                LINE_POSITIONS.length
            ]

      const [ageRoll, s3] = nextRoll(state)
      state = s3
      const baseAge = AI_MIN_AGE + Math.floor(ageRoll * (AI_MAX_AGE - AI_MIN_AGE + 1))

      const [bombRoll, s4] = nextRoll(state)
      state = s4
      // a PRIMEIRA contratação do ano pós-título é garantidamente uma bomba —
      // de novo, o roll aconteceu igual; só o resultado muda, e só para ela
      const isChampionSigning = isPostTitleYear && index === 0
      const isBlockbuster = isChampionSigning ? true : bombRoll < BLOCKBUSTER_SHARE

      const [potentialRoll, s5] = nextRoll(state)
      state = s5
      // ninguém paga preço de mercado por um jogador sem teto: reforço é alto ou médio
      const potential: Potential = potentialRoll < POTENTIAL_HIGH_SHARE ? 'alto' : 'medio'

      const boost = isChampionSigning
        ? CONTINENTAL_CHAMPION_BOOST
        : isBlockbuster
          ? BLOCKBUSTER_BOOST
          : 0
      const target = clubBase + boost
      const attrs = {} as Record<'pac' | 'fin' | 'pas' | 'dri' | 'def' | 'fis', number>
      for (const key of ATTR_KEYS) {
        const [attrRoll, sN] = nextRoll(state)
        state = sN
        attrs[key] = Math.max(30, Math.min(95, Math.round(target + (attrRoll - 0.5) * 2 * ATTR_SPREAD)))
      }
      // o reforço tem de bater quem já está lá — senão a janela só atrapalha
      const factor = ageFactor(baseAge, potential)
      const floor = weakestAt(squadPlayersFor(club, year, 'masculino', division), position) +
        AI_SIGNING_EDGE +
        boost
      const peakAttrs = raisePeakUntil(position, attrs, factor, floor)

      const [nationRoll, s6] = nextRoll(state)
      state = s6
      const nationality =
        nationRoll < 0.7
          ? 'brasil'
          : NATIONS[Math.floor(((nationRoll - 0.7) / 0.3) * NATIONS.length) % NATIONS.length].id

      const [firstRoll, s7] = nextRoll(state)
      state = s7
      const [lastRoll, s8] = nextRoll(state)
      state = s8
      const name = uniqueName(nationality, firstRoll, lastRoll, usedNames)

      const overallAtSigning = overallFor(position, scaleAttrs(peakAttrs, factor))

      const [priceRoll, s9] = nextRoll(state)
      state = s9
      const range = priceRangeFor(overallAtSigning)
      const price = Math.round((range.min + priceRoll * (range.max - range.min)) / 10_000) * 10_000

      transfers.push({
        clubId: club.id,
        year,
        isBlockbuster,
        overallAtSigning,
        signing: {
          id: `mkt-ai-${club.id}-${year}-${index}`,
          name,
          position,
          altPositions: [],
          nationality,
          baseAge,
          boughtYear: year,
          potential,
          peakAttrs,
          price,
        },
      })
    }
  }
  return transfers
}

/**
 * Elenco de um clube RIVAL com as contratações da IA aplicadas.
 *
 * Um contratado não fica dez anos no time por direito adquirido: em cada
 * temporada o clube confere se ele ainda rende mais que a prata da casa e, se
 * não rende, a vaga volta para o garoto. Sem isso cada janela deixava um
 * veterano travando um slot e o elenco afundava temporada após temporada —
 * contratar chegava a deixar o time PIOR do que se ninguém tivesse chegado.
 */
export const rivalSquadFor = (
  club: Club,
  division: number,
  careerYear: number,
  gender: PlayerGender = 'masculino',
  /** Anos em que o clube levantou a taça continental — repassa a aiTransfersFor. */
  continentalTitleYears: readonly number[] = [],
): readonly SquadPlayer[] => {
  const base = squadPlayersFor(club, careerYear, gender, division)
  const signings = aiTransfersFor(club, division, careerYear, continentalTitleYears).map(
    (transfer) => transfer.signing,
  )
  const reinforced = squadWithSignings(base, signings, careerYear, -1)
  return reinforced.map((player, index) =>
    player.overall >= base[index].overall ? player : base[index],
  )
}

/**
 * A bomba de mercado do ano (se houver): a contratação 80+ mais forte entre
 * os clubes de A e B nesta temporada — rara de propósito, vira manchete.
 */
export const blockbusterOfTheYear = (
  divisions: readonly (readonly string[])[],
  careerYear: number,
  excludeClubId: string,
): AiTransfer | null => {
  const candidates: AiTransfer[] = []
  for (let division = 0; division <= AI_DIVISION_LIMIT; division++) {
    for (const clubId of divisions[division] ?? []) {
      if (clubId === excludeClubId) continue
      const club = clubById(clubId)
      if (!club) continue
      for (const transfer of aiTransfersFor(club, division, careerYear)) {
        if (transfer.year !== careerYear) continue
        if (!transfer.isBlockbuster || transfer.overallAtSigning < HEADLINE_OVERALL) continue
        candidates.push(transfer)
      }
    }
  }
  if (candidates.length === 0) return null
  return [...candidates].sort((a, b) => b.overallAtSigning - a.overallAtSigning)[0]
}

/** Idade limite reexportada para quem monta elencos de rivais. */
export { RETIRE_AGE }
