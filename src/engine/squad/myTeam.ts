import type { Club } from '../../data/clubs'
import type { PlayerSave } from '../../state/save'
import { squadWithSignings } from '../market/market'
import { FORMATIONS } from './formation'
import { lineupRating, squadPlayersFor, userAsSquadPlayer, USER_SQUAD_INDEX, type SquadPlayer } from './players'

/**
 * O MEU time de verdade: elenco gerado + reforços contratados + o craque —
 * uma fonte só para força/estrelas em todas as telas (reforço chegou ou
 * jovem evoluiu, o overall do time sobe junto).
 */

export const myTeamPlayers = (save: PlayerSave, club: Club): readonly SquadPlayer[] =>
  squadWithSignings(squadPlayersFor(club, save.careerYear), save.signings, save.careerYear).map(
    (player, index) =>
      index === USER_SQUAD_INDEX
        ? userAsSquadPlayer(player, save.playerName, save.attributes, save.playerPosition)
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

/** Força padrão de um clube rival (11 titulares, formação clássica). */
export const opponentTeamRating = (club: Club, careerYear: number): number =>
  lineupRating(squadPlayersFor(club, careerYear).slice(0, 11), FORMATIONS['4-3-3'].slots)
