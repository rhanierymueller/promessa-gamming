import { CLUBS } from '../../data/clubs'
import { nationAsClub, nationById } from '../../data/nations'
import type { MarketPlayer } from '../market/market'
import type { Divisions } from '../pyramid/pyramid'
import { divisionOf } from '../pyramid/pyramid'
import { FORMATIONS } from './formation'
import { SQUAD_SIZE, squadPlayersFor, type SquadPlayer, type SquadPosition } from './players'
import type { PlayerGender } from '../../state/save'

/**
 * Convocação: a seleção é a NATA do jogo, não um elenco gerado à parte. Os
 * candidatos são os jogadores dos clubes da liga (todos brasileiros) mais os
 * craques à venda no mercado, e cada vaga fica com o melhor overall daquela
 * posição. Determinístico: mesma temporada, mesma convocação.
 */

/** Divisões de onde saem convocados — a base da seleção é a elite. */
const SCOUTED_DIVISIONS = 2

/** Formação da seleção; o banco completa com uma de cada posição. */
const NATIONAL_FORMATION = '4-3-3'
const BENCH: readonly SquadPosition[] = ['GOL', 'ZAG', 'LE', 'VOL', 'MEI', 'PON', 'ATA']

/** O mercado guarda o pico do jogador; aqui ele vira um jogador de elenco. */
const fromMarket = (player: MarketPlayer): SquadPlayer => ({
  id: player.id,
  name: player.name,
  position: player.position,
  altPositions: player.altPositions,
  age: player.age,
  potential: player.potential,
  peakAge: player.peakAge,
  shirt: 0,
  attrs: player.attrs,
  overall: player.overall,
})

/**
 * Todo mundo elegível para a seleção. Os clubes da liga são brasileiros, então
 * só entram na convocação do Brasil; do mercado, vale a nacionalidade do
 * jogador.
 */
const candidatesFor = (
  nationId: string,
  divisions: Divisions,
  careerYear: number,
  market: readonly MarketPlayer[],
  gender: PlayerGender,
): readonly SquadPlayer[] => {
  const fromMarketPool = market
    .filter((player) => player.nationality === nationId)
    .map(fromMarket)
  if (nationId !== 'brasil') return fromMarketPool

  const fromLeague = CLUBS.filter(
    (club) => divisionOf(divisions, club.id) <= SCOUTED_DIVISIONS,
  ).flatMap((club) => squadPlayersFor(club, careerYear, gender))
  return [...fromLeague, ...fromMarketPool]
}

/** Melhor disponível para a posição, tirando quem já foi convocado. */
const bestFor = (
  position: SquadPosition,
  pool: readonly SquadPlayer[],
  taken: ReadonlySet<string>,
): SquadPlayer | null => {
  let best: SquadPlayer | null = null
  for (const player of pool) {
    if (taken.has(player.id) || player.position !== position) continue
    if (!best || player.overall > best.overall) best = player
  }
  return best
}

/**
 * Os 18 convocados: 11 pelas vagas da formação, 7 de banco. Se a nação não
 * tiver gente suficiente de verdade (seleções estrangeiras, cujo único
 * candidato é o mercado), cai no elenco gerado para não quebrar o torneio.
 */
export const nationalSquadFor = (
  nationId: string,
  divisions: Divisions,
  careerYear: number,
  market: readonly MarketPlayer[],
  /**
   * O SEU craque. Convocado é convocado: ele entra na posição dele mesmo que
   * o overall não esteja entre os melhores — a seleção é a recompensa da
   * carreira, não um ranking frio.
   */
  user: SquadPlayer | null = null,
  gender: PlayerGender = 'masculino',
): readonly SquadPlayer[] => {
  const nation = nationById(nationId)
  if (!nation) return []
  const generated = squadPlayersFor(nationAsClub(nation), careerYear, gender)
  const pool = candidatesFor(nationId, divisions, careerYear, market, gender)
  if (pool.length < SQUAD_SIZE) return generated

  const slots = [...FORMATIONS[NATIONAL_FORMATION].slots, ...BENCH]
  // a vaga do craque é a PRIMEIRA da posição dele entre os titulares
  const userSlot = user ? slots.findIndex((position, index) => index < 11 && position === user.position) : -1
  const taken = new Set<string>(user ? [user.id] : [])
  const called: SquadPlayer[] = []

  slots.forEach((position, index) => {
    if (user && index === userSlot) {
      called.push({ ...user, shirt: index + 1 })
      return
    }
    const picked = bestFor(position, pool, taken)
    // sem candidato daquela posição, o gerado cobre a vaga
    const player = picked ?? generated[index]
    taken.add(player.id)
    called.push({ ...player, shirt: index + 1 })
  })

  // posição sem vaga entre os titulares: entra mesmo assim, no banco
  if (user && userSlot < 0) {
    return [...called.slice(0, SQUAD_SIZE - 1), { ...user, shirt: SQUAD_SIZE }]
  }
  return called
}
