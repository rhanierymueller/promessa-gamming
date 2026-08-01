import { isInLibertados, type PlayerSave } from '../../state/save'
import { isLibertadosRunning, libertadosMatchIndex } from '../libertados/types'
import { isSeasonOver } from '../season/season'
import { compareDates, libertadosDate, roundDate, type CalendarDate } from './calendar'

/**
 * Com duas competições abertas, "próxima rodada" não basta: quem joga primeiro
 * é quem tem a data mais próxima. É esta função que a Home consulta.
 */

export type FixtureKind = 'liga' | 'libertados'

export interface NextFixture {
  readonly kind: FixtureKind
  readonly date: CalendarDate
}

export const nextFixture = (save: PlayerSave): NextFixture | null => {
  const inLibertados = isInLibertados(save)

  const league: NextFixture | null = isSeasonOver(save.season)
    ? null
    : { kind: 'liga', date: roundDate(save.careerYear, save.season.currentRound, inLibertados) }

  const cup: NextFixture | null =
    save.libertados && isLibertadosRunning(save.libertados.stage)
      ? {
          kind: 'libertados',
          date: libertadosDate(
            save.careerYear,
            libertadosMatchIndex(
              save.libertados.stage as 'groups' | 'r16' | 'quarter' | 'semi' | 'final',
              save.libertados.round,
            ),
          ),
        }
      : null

  if (!league) return cup
  if (!cup) return league
  return compareDates(cup.date, league.date) < 0 ? cup : league
}
