import type { Club } from '../../data/clubs'
import type { PlayerSave } from '../../state/save'
import { rivalSquadFor } from '../market/aiTransfers'
import { squadWithSignings } from '../market/market'
import { playerAgeInSeason } from './aging'
import { FORMATIONS } from './formation'
import { lineupRating, squadPlayersFor, userAsSquadPlayer, USER_SQUAD_INDEX, type SquadPlayer } from './players'
import { bestLineup } from './bestLineup'
import { sectorRatings, type SectorRatings } from './sectors'
import type { PlayerGender } from '../../state/save'

/**
 * O MEU time de verdade: elenco gerado + reforços contratados + o craque —
 * uma fonte só para força/estrelas em todas as telas (reforço chegou ou
 * jovem evoluiu, o overall do time sobe junto).
 */

export const myTeamPlayers = (save: PlayerSave, club: Club): readonly SquadPlayer[] =>
  squadWithSignings(squadPlayersFor(club, save.careerYear, save.appearance.gender), save.signings, save.careerYear).map(
    (player, index) =>
      index === USER_SQUAD_INDEX
        ? userAsSquadPlayer(player, save.playerName, save.attributes, save.playerPosition, playerAgeInSeason(save.playerAge, save.careerYear))
        : player,
  )

/** Força da escalação atual do MEU time (com reforços e idade do ano). */
export const myTeamRating = (save: PlayerSave, club: Club): number => {
  const squad = myTeamPlayers(save, club)
  return lineupRating(
    save.lineup.map((squadIndex) => squad[squadIndex]),
    FORMATIONS[save.formation].slots,
  )
}

/**
 * Força padrão de um clube rival (11 titulares, formação clássica).
 * Com a divisão informada, inclui as contratações da IA (Séries A/B).
 */
export const opponentTeamRating = (club: Club, careerYear: number, division = -1): number => {
  const squad = rivalSquadFor(club, division, careerYear)
  const lineup = bestLineup(squad, FORMATIONS['4-3-3'])
  return lineupRating(lineup.map((index) => squad[index]), FORMATIONS['4-3-3'].slots)
}

/** Setores do SEU time, pelo esquema escalado. */
export const myTeamSectors = (save: PlayerSave, club: Club): SectorRatings =>
  sectorRatings(
    save.lineup.map((squadIndex) => myTeamPlayers(save, club)[squadIndex]),
    FORMATIONS[save.formation],
  )

/** Setores do adversário. */
export const opponentSectors = (
  club: Club,
  careerYear: number,
  division = -1,
  gender: PlayerGender = 'masculino',
): SectorRatings =>
  sectorRatings(rivalSquadFor(club, division, careerYear, gender).slice(0, 11), FORMATIONS['4-3-3'])
