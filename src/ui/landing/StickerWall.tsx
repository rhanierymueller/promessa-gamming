import celebrateSprite from '../../assets/sprites/s_celebrate.png'
import kickSprite from '../../assets/sprites/s_kick_noball.png'
import portraitSprite from '../../assets/sprites/s_portrait.png'
import runSprite from '../../assets/sprites/s_run.png'

/**
 * A parede do vestiário: os quatro pilares do jogo colados como figurinhas de
 * álbum — tortas, sobrepostas, uma delas repetida. Substitui o grid de cartões
 * com ícone que dava cara de template.
 */

interface StickerWallProps {
  /** Poeira no facho: quantidade fixa para não virar enfeite aleatório. */
  readonly motes?: number
}

interface Sticker {
  readonly num: string
  readonly art: string
  readonly title: string
  readonly text: string
  readonly dupe?: boolean
}

const STICKERS: readonly Sticker[] = [
  {
    num: 'nº 01',
    art: kickSprite,
    title: 'O chute é seu',
    text: 'Mira com o dedo, força e altura na régua. O goleiro lê a sua curva. Se isolou, foi você — não foi dado escondido.',
  },
  {
    num: 'nº 02',
    art: portraitSprite,
    title: 'Você é o técnico',
    text: 'Escolhe a formação, escala os 11, batiza cada jogador. Botar zagueiro no ataque? Pode. O time sente na hora.',
  },
  {
    num: 'nº 03',
    art: runSprite,
    title: 'Carreira viva',
    text: 'Quatro divisões, acesso e queda. Moleque que estoura com potencial, veterano que pendura a chuteira aos 38.',
  },
  {
    num: 'nº 04',
    art: celebrateSprite,
    title: 'Liga com os amigos',
    text: 'Liga por código de convite e ranking toda semana. Zebra do seu amigo continua inaceitável.',
    dupe: true,
  },
]

/** Posições fixas da poeira dentro do facho, em % da cena. */
const MOTE_SPOTS: readonly { readonly left: string; readonly top: string; readonly delay: string }[] = [
  { left: '44%', top: '18%', delay: '0s' },
  { left: '52%', top: '30%', delay: '1.4s' },
  { left: '47%', top: '44%', delay: '2.9s' },
  { left: '56%', top: '12%', delay: '4.1s' },
  { left: '41%', top: '36%', delay: '5.6s' },
]

export const StickerWall = ({ motes = MOTE_SPOTS.length }: StickerWallProps) => (
  <section className="tunnel">
    <div className="tunnel-wall" aria-hidden="true" />
    <div className="tunnel-lamp" aria-hidden="true" />
    <div className="tunnel-beam" aria-hidden="true" />
    {MOTE_SPOTS.slice(0, motes).map((spot) => (
      <span
        key={spot.delay}
        className="tunnel-mote"
        aria-hidden="true"
        style={{ left: spot.left, top: spot.top, animationDelay: spot.delay }}
      />
    ))}

    <div className="tunnel-head reveal">
      <p className="tunnel-eyebrow">Túnel · parede do vestiário</p>
      <h2 className="tunnel-title">Feito para quem decide o jogo</h2>
    </div>

    <div className="sticker-wall">
      {STICKERS.map((sticker, index) => (
        <div
          key={sticker.num}
          className="sticker-slot reveal"
          style={{ transitionDelay: `${index * 90}ms` }}
        >
          <article className="sticker">
            <span className="sticker-tape sticker-tape-a" aria-hidden="true" />
            <span className="sticker-tape sticker-tape-b" aria-hidden="true" />
            <span className="sticker-num">{sticker.num}</span>
            <img className="sticker-art" src={sticker.art} alt="" aria-hidden="true" />
            <h3>{sticker.title}</h3>
            <p>{sticker.text}</p>
            {sticker.dupe && <span className="sticker-dupe">repetida</span>}
          </article>
        </div>
      ))}
    </div>
  </section>
)
