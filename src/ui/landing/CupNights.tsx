import copaBrasilTrophy from '../../assets/trophies/copa-brasil.png'
import libertadosTrophy from '../../assets/trophies/libertados.png'
import { COPA_BRASIL_TEAMS } from '../../engine/copaBrasil/types'
import { GROUP_COUNT, GROUP_SIZE } from '../../engine/libertados/types'

/**
 * As noites de meio de semana: as duas copas de CLUBE, entre a parede de
 * figurinhas e a convocação.
 *
 * O lugar dela na página é o argumento: a caminhada vai do clube (figurinhas)
 * para as copas do clube e só então para a seleção. A quarta-feira vem antes
 * do telefone tocar.
 */

interface Cup {
  readonly id: string
  readonly art: string
  readonly name: string
  readonly tag: string
  readonly line: string
  readonly text: string
}

const CUPS: readonly Cup[] = [
  {
    id: 'libertados',
    art: libertadosTrophy,
    name: 'Copa Libertados',
    tag: 'Continental',
    line: `${GROUP_COUNT} grupos de ${GROUP_SIZE} · ida e volta`,
    text: 'Termine entre os quatro primeiros da Série A e o continente inteiro passa a ser problema seu. Fase de grupos, mata-mata e uma final que vale a temporada — sempre em ida e volta.',
  },
  {
    id: 'copa-brasil',
    art: copaBrasilTrophy,
    name: 'Copa do Brasil',
    tag: 'Nacional',
    line: `${COPA_BRASIL_TEAMS} clubes · dos 16 avos à final`,
    text: 'As quatro divisões no mesmo sorteio: a elite pode cair com um time da Série D logo na estreia. Seu clube está sempre na chave — e duas quartas-feiras ruins encerram a campanha.',
  },
]

export const CupNights = () => (
  <section className="cupnights">
    <div className="cupnights-floodlight cupnights-floodlight-a" aria-hidden="true" />
    <div className="cupnights-floodlight cupnights-floodlight-b" aria-hidden="true" />
    <div className="cupnights-haze" aria-hidden="true" />

    <div className="cupnights-head reveal">
      <p className="tunnel-eyebrow">Meio de semana</p>
      <h2 className="cupnights-title">
        No mata-mata<br />
        <em>não há returno</em>
      </h2>
      <p className="cupnights-body">
        Uma semana o continente, na outra o país. O campeonato ainda dá tempo de recuperar
        pontos perdidos; a quarta-feira, não. Quem sai, sai naquela noite.
      </p>
    </div>

    <div className="cupnights-cups">
      {CUPS.map((cup, index) => (
        <article
          key={cup.id}
          className={`cupnights-cup cupnights-cup-${cup.id} reveal`}
          style={{ transitionDelay: `${index * 120}ms` }}
        >
          <div className="cupnights-pedestal" aria-hidden="true">
            <span className="cupnights-beam" />
            <img className="cupnights-art" src={cup.art} alt="" />
            <span className="cupnights-shadow" />
          </div>
          <span className="cupnights-tag">{cup.tag}</span>
          <h3 className="cupnights-name">{cup.name}</h3>
          <p className="cupnights-line">{cup.line}</p>
          <p className="cupnights-text">{cup.text}</p>
        </article>
      ))}
    </div>

    <p className="cupnights-note reveal">
      Classificado para as duas, você joga todo meio de semana. É quando o elenco que você
      montou mostra se tem banco.
    </p>
  </section>
)
