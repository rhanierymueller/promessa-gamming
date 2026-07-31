/**
 * Uma linha de comparação ao vivo: seu número, a fatia visual e o do rival.
 *
 * Arquivo próprio porque é usada pela tela da partida E pelo resumo — e porque
 * `MatchScreen.tsx` precisava emagrecer.
 */

export interface LiveStatProps {
  readonly label: string
  readonly mine: number
  readonly theirs: number
  readonly suffix?: string
  /** Detalhe entre parênteses, tipo quantos chutes foram no gol. */
  readonly mineNote?: string
  readonly theirsNote?: string
}

/** Uma linha de comparação: seu número, a fatia visual e o do adversário. */
export const LiveStat = ({ label, mine, theirs, suffix = '', mineNote, theirsNote }: LiveStatProps) => {
  const total = mine + theirs
  // sem nada acontecendo ainda, a barra fica no meio em vez de zerada
  const share = total === 0 ? 50 : Math.round((mine / total) * 100)
  return (
    <div className="live-stat">
      <strong className="live-stat-value">
        {mine}{suffix}
        {mineNote && <em>({mineNote})</em>}
      </strong>
      <span className="live-stat-mid">
        <span className="live-stat-label">{label}</span>
        <span className="live-stat-bar">
          <span className="live-stat-fill" style={{ width: `${share}%` }} />
        </span>
      </span>
      <strong className="live-stat-value live-stat-value-opp">
        {theirsNote && <em>({theirsNote})</em>}
        {theirs}{suffix}
      </strong>
    </div>
  )
}
