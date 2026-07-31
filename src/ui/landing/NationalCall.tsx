import copaAmerica from '../../assets/trophies/copa-america.png'
import copaMundo from '../../assets/trophies/copa-mundo.png'
import ligaNacoes from '../../assets/trophies/liga-nacoes.png'
import { NATIONS, PLAYABLE_NATIONS } from '../../data/nations'
import { NationFlag } from '../NationFlag'

/**
 * A convocação: o que vem depois do clube. Fica entre a parede de figurinhas e
 * o placar, porque é a promessa que fecha a caminhada do túnel — o clube te
 * forma, a seleção te chama.
 *
 * As bandeiras saem de PLAYABLE_NATIONS, não de uma escolhida a dedo: a
 * nacionalidade é decisão do jogador no cadastro, e fixar uma só dava a
 * entender que o jogo é de um país.
 */

const TROPHIES: readonly { readonly art: string; readonly name: string }[] = [
  { art: copaAmerica, name: 'Copa América' },
  { art: ligaNacoes, name: 'Liga das Nações' },
  { art: copaMundo, name: 'Copa do Mundo' },
]

export const NationalCall = () => (
  <section className="callup-strip">
    <div className="callup-glow" aria-hidden="true" />

    <div className="callup-inner reveal">
      <p className="tunnel-eyebrow">Convocação</p>
      <h2 className="callup-title">Um dia o telefone toca</h2>
      <p className="callup-body">
        A temporada fecha em dezembro e a lista sai. Se a sua fase convenceu, você troca a camisa
        do clube pela da seleção que escolheu no cadastro — e o torneio daquele ano depende de
        onde você nasceu.
      </p>
    </div>

    <div className="callup-flags reveal" aria-label="Seleções que podem convocar você">
      {PLAYABLE_NATIONS.map((nation) => (
        <NationFlag key={nation.id} nationId={nation.id} size={30} title={nation.name} />
      ))}
    </div>
    <p className="callup-flags-note reveal">
      {PLAYABLE_NATIONS.length} seleções podem te convocar · {NATIONS.length} disputam o mundo
    </p>

    <ul className="callup-shelf reveal">
      {TROPHIES.map((trophy) => (
        <li className="callup-trophy" key={trophy.name}>
          <img src={trophy.art} alt="" aria-hidden="true" />
          <strong>{trophy.name}</strong>
        </li>
      ))}
    </ul>
  </section>
)
