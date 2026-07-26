import type { SectorRatings } from '../engine/squad/sectors'

/**
 * Comparação de DEFESA, MEIO e ATAQUE entre dois times.
 *
 * O overall único escondia a cara do adversário: 65 de um time que segura tudo
 * é bem diferente de 65 de um time que troca gols. Aqui dá para ver onde o
 * jogo vai ser decidido antes de entrar em campo.
 */

const LINHAS: readonly { readonly key: keyof SectorRatings; readonly label: string }[] = [
  { key: 'def', label: 'Defesa' },
  { key: 'mei', label: 'Meio' },
  { key: 'ata', label: 'Ataque' },
]

interface SectorBarsProps {
  readonly mine: SectorRatings
  readonly theirs: SectorRatings
  readonly myAbbr: string
  readonly theirAbbr: string
}

export const SectorBars = ({ mine, theirs, myAbbr, theirAbbr }: SectorBarsProps) => (
  <div className="sector-bars">
    <div className="sector-head">
      <span className="sector-team">{myAbbr}</span>
      <span className="sector-title">Força por setor</span>
      <span className="sector-team">{theirAbbr}</span>
    </div>
    {LINHAS.map(({ key, label }) => {
      const meu = mine[key]
      const dele = theirs[key]
      // a barra mostra a FATIA de cada lado, não o valor absoluto: é a
      // comparação que interessa na hora de escolher como jogar
      const fatia = meu + dele === 0 ? 50 : Math.round((meu / (meu + dele)) * 100)
      return (
        <div className="sector-row" key={key}>
          <strong className={`sector-value${meu > dele ? ' sector-value-up' : ''}`}>{meu}</strong>
          <span className="sector-mid">
            <span className="sector-label">{label}</span>
            <span className="sector-bar">
              <span className="sector-fill" style={{ width: `${fatia}%` }} />
            </span>
          </span>
          <strong className={`sector-value sector-value-opp${dele > meu ? ' sector-value-up' : ''}`}>
            {dele}
          </strong>
        </div>
      )
    })}
  </div>
)
