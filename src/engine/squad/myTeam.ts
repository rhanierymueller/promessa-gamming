import type { Club } from '../../data/clubs'
import type { PlayerSave } from '../../state/save'
import { rivalSquadFor } from '../market/aiTransfers'
import { squadWithSignings } from '../market/market'
import { divisionOf } from '../pyramid/pyramid'
import { playerAgeInSeason } from './aging'
import { FORMATIONS } from './formation'
import { squadPlayersFor, userAsSquadPlayer, USER_SQUAD_INDEX, type SquadPlayer } from './players'
import type { SectorRatings } from './sectors'
import { bestLineupStrength, lineupStrength } from './teamStrength'
import type { PlayerGender } from '../../state/save'

/**
 * O MEU time de verdade: elenco gerado + reforços contratados + o craque —
 * uma fonte só para força/estrelas em todas as telas (reforço chegou ou
 * jovem evoluiu, o overall do time sobe junto).
 */

export const myTeamPlayers = (save: PlayerSave, club: Club): readonly SquadPlayer[] =>
  squadWithSignings(
    // a divisão que o clube disputa HOJE: subir de série reforça o elenco
    squadPlayersFor(
      club,
      save.careerYear,
      save.appearance.gender,
      divisionOf(save.divisions, club.id),
    ),
    save.signings,
    save.careerYear,
    USER_SQUAD_INDEX,
    save.playerSales,
  ).map((player, index) =>
    index === USER_SQUAD_INDEX
      ? userAsSquadPlayer(player, save.playerName, save.attributes, save.playerPosition, playerAgeInSeason(save.playerAge, save.careerYear))
      : player,
  )

/** Força da escalação atual do MEU time (com reforços e idade do ano). */
export const myTeamRating = (save: PlayerSave, club: Club): number => {
  const squad = myTeamPlayers(save, club)
  return lineupStrength(squad, save.lineup, FORMATIONS[save.formation]).overall
}

/**
 * Força padrão de um clube rival (11 titulares, formação clássica).
 * Com a divisão informada, inclui as contratações da IA (Séries A/B).
 */
export const opponentTeamRating = (
  club: Club,
  careerYear: number,
  division = -1,
  /** Anos em que o clube levantou a taça continental — repassa a rivalSquadFor. */
  continentalTitleYears: readonly number[] = [],
): number => {
  const squad = rivalSquadFor(club, division, careerYear, 'masculino', continentalTitleYears)
  return bestLineupStrength(squad, FORMATIONS['4-3-3']).overall
}

/** Setores do SEU time, pelo esquema escalado. */
export const myTeamSectors = (save: PlayerSave, club: Club): SectorRatings =>
  lineupStrength(
    myTeamPlayers(save, club),
    save.lineup,
    FORMATIONS[save.formation],
  ).sectors

/** Setores do adversário. */
export const opponentSectors = (
  club: Club,
  careerYear: number,
  division = -1,
  gender: PlayerGender = 'masculino',
  /** Anos em que o clube levantou a taça continental — repassa a rivalSquadFor. */
  continentalTitleYears: readonly number[] = [],
): SectorRatings =>
  bestLineupStrength(
    rivalSquadFor(club, division, careerYear, gender, continentalTitleYears),
    FORMATIONS['4-3-3'],
  ).sectors
