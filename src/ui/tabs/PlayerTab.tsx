import { clubById } from '../../data/clubs'
import { nationById } from '../../data/nations'
import {
  ATTRIBUTE_KEYS,
  ATTRIBUTE_LABELS,
  canUpgrade,
  MAX_ATTRIBUTE,
  upgradeCost,
} from '../../engine/career/attributes'
import { perkById } from '../../engine/career/perks'
import { HAIR_COLORS, KIT_COLORS, SKIN_TONES } from '../../game/appearance'
import { celebrationUrlsFor, CELEBRATION_NAMES } from '../../game/assets'
import { DIVISION_NAMES, divisionOf } from '../../engine/pyramid/pyramid'
import {
  currentPlayerAge,
  clubDisplayName,
  setAppearance,
  setCelebration,
  trainAttribute,
  type PlayerSave,
} from '../../state/save'
import { NationFlag } from '../NationFlag'
import roomArt from '../../assets/backgrounds/quarto.png'
import { groupAwards, groupTrophies, RoomShelf } from '../PlayerRoom'
import { usePlayerPortrait } from '../usePlayerPortrait'
import '../styles/room.css'

/**
 * Meu jogador: o quarto do craque.
 *
 * A carreira estava espalhada — número no Perfil, taça na aba Time, atributo
 * noutro canto. Aqui tudo vira UM lugar, e um lugar com cara de quarto: o
 * painel de substituição com os números, a parede de conquistas, a prateleira
 * dos prêmios e a mesa com o computador. É a sala de quem está construindo
 * uma carreira, não uma tela de estatística.
 */

interface PlayerTabProps {
  readonly save: PlayerSave
  readonly onSaveChange: (save: PlayerSave) => void
}

const averageRating = (save: PlayerSave): string =>
  save.career.games === 0 ? '—' : (save.career.ratingSum / save.career.games).toFixed(1)

const goalsPerGame = (save: PlayerSave): string =>
  save.career.games === 0 ? '—' : (save.career.goals / save.career.games).toFixed(2)

/*
 * Onde as duas tábuas da arte ficam, em % da altura da cena. Medido na arte:
 * mexer aqui sem trocar a imagem descola os troféus da madeira.
 */
/** Cor do quadradinho de escolha; o índice 0 mantém a arte original. */
const swatchColor = (rgb: readonly [number, number, number] | null): string =>
  rgb ? `rgb(${rgb[0]},${rgb[1]},${rgb[2]})` : '#C08850'

const SHELF_TOP = 17.8
const SHELF_BOTTOM = 29.4

export const PlayerTab = ({ save, onSaveChange }: PlayerTabProps) => {
  const portrait = usePlayerPortrait(save.appearance)
  const club = clubById(save.clubId)
  const nation = nationById(save.nationalityId)
  const division = divisionOf(save.divisions, save.clubId)
  const trophies = groupTrophies(save.trophies)
  const awards = groupAwards(save.awards)

  return (
    <div className="tab-panel player-room">
      {/* ---------- o quarto ---------- */}
      <section className="room-scene card-wide" aria-label="O quarto do craque">
        {/* o palco carrega a arte E o que fica sobre ela: escalando o conjunto,
            os troféus nunca descolam das tábuas — escalar só a imagem, como
            estava no celular, deixava as peças flutuando no ar */}
        <div className="room-stage">
        <img className="room-art" src={roomArt} alt="" aria-hidden="true" />

        {/* o pôster do craque ocupa a parede vazia acima da cama */}
        <figure className="room-poster">
          {portrait ? (
            <img src={portrait} alt="" aria-hidden="true" />
          ) : (
            <span className="room-poster-empty" aria-hidden="true" />
          )}
          <figcaption>
            <strong>{save.playerName}</strong>
            <span>
              {save.playerPosition} · {currentPlayerAge(save)} · #{save.shirtNumber}
            </span>
          </figcaption>
        </figure>

        {/* as duas tábuas da arte viram estantes: taças em cima, prêmios embaixo */}
        <RoomShelf pieces={trophies} boardTop={SHELF_TOP} label="Títulos do clube" />
        <RoomShelf pieces={awards} boardTop={SHELF_BOTTOM} label="Prêmios individuais" />

        {trophies.length === 0 && awards.length === 0 && (
          <p className="room-empty-hint">
            As prateleiras estão vazias. Ganhe um título ou seja artilheiro de
            uma competição — é aqui que fica.
          </p>
        )}
        </div>
      </section>

      {/* ---------- o painel de substituição com os números ---------- */}
      <section className="subboard card-wide" aria-label="Números da carreira">
        <span className="subboard-frame" aria-hidden="true" />
        <div className="subboard-grid">
          {[
            { label: 'Gols', value: save.career.goals },
            { label: 'Jogos', value: save.career.games },
            { label: 'Vitórias', value: save.career.wins },
            { label: 'Taças', value: save.trophies.length },
            { label: 'Prêmios', value: save.awards.length },
            { label: 'Nota', value: averageRating(save) },
            { label: 'Gols/jogo', value: goalsPerGame(save) },
            { label: 'Temporadas', value: save.careerYear },
          ].map((stat) => (
            <div className="subboard-cell" key={stat.label}>
              <span className="subboard-value">{stat.value}</span>
              <span className="subboard-label">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- onde ele joga ---------- */}
      <div className="card card-wide room-badges">
        <div className="room-badge">
          <span className="room-badge-label">Clube</span>
          <strong>{club ? clubDisplayName(save, club.id) : '—'}</strong>
          <span className="room-badge-sub">{DIVISION_NAMES[division] ?? 'sem divisão'}</span>
        </div>
        {nation && (
          <div className="room-badge">
            <span className="room-badge-label">Seleção</span>
            <span className="room-badge-flag">
              <NationFlag nationId={nation.id} size={26} title={nation.name} />
            </span>
            <strong>{nation.name}</strong>
          </div>
        )}
      </div>

      {/* ---------- treino: onde os pontos viram atributo ---------- */}
      <div className="card card-wide">
        <div className="attr-header">
          <span className="card-label">Atributos</span>
          <span className="attr-points">{save.trainingPoints} pts de treino</span>
        </div>
        <div className="room-attrs">
          {ATTRIBUTE_KEYS.map((key) => {
            const level = save.attributes[key]
            const cost = upgradeCost(level)
            const affordable = canUpgrade(save.attributes, key, save.trainingPoints)
            return (
              <div className="room-attr" key={key}>
                <span className="room-attr-name">{ATTRIBUTE_LABELS[key]}</span>
                <span className="room-attr-bar" aria-label={`${level} de ${MAX_ATTRIBUTE}`}>
                  {Array.from({ length: MAX_ATTRIBUTE }, (_, i) => (
                    <span key={i} className={`room-attr-pip${i < level ? ' room-attr-pip-on' : ''}`} />
                  ))}
                </span>
                <span className="room-attr-value">{level}</span>
                <button
                  className="btn attr-btn"
                  disabled={!affordable}
                  onClick={() => onSaveChange(trainAttribute(save, key))}
                >
                  {level >= MAX_ATTRIBUTE ? 'MAX' : `+1 (${cost}pt)`}
                </button>
              </div>
            )
          })}
        </div>
        <p className="muted table-note">
          Pontos vêm das suas notas: 8.0+ rende 3, 6.5+ rende 2, 5.0+ rende 1.
        </p>

        {save.perks.length > 0 && (
          <>
            <span className="card-label room-perks-label">Habilidades</span>
            <ul className="room-perks">
              {save.perks.map((perkId) => {
                const perk = perkById(perkId)
                return (
                  <li className="room-perk" key={perkId}>
                    <strong>{perk.name}</strong>
                    <span>{perk.description}</span>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>

      {/* ---------- aparência e comemoração ---------- */}
      <div className="card card-wide">
        <span className="card-label">Aparência</span>
        {([
          ['skin', 'Pele', SKIN_TONES],
          ['hair', 'Cabelo', HAIR_COLORS],
          ['kit', 'Uniforme', KIT_COLORS],
        ] as const).map(([field, label, options]) => (
          <div className="appearance-row" key={field}>
            <span className="appearance-label">{label}</span>
            <div className="swatch-row" role="radiogroup" aria-label={label}>
              {options.map((option, index) => {
                const isActive = save.appearance[field] === index
                return (
                  <button
                    key={option.name}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    aria-label={option.name}
                    className={`swatch${isActive ? ' swatch-active' : ''}`}
                    style={{ background: swatchColor(option.rgb) }}
                    onClick={() => onSaveChange(setAppearance(save, { ...save.appearance, [field]: index }))}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="card card-wide">
        <span className="card-label">Comemoração</span>
        <p className="muted table-note">Como você celebra os seus gols.</p>
        <div className="celebration-grid" role="radiogroup" aria-label="Escolha de comemoração">
          {celebrationUrlsFor(save.appearance.gender).map((url, index) => {
            const isActive = save.celebrationId === index
            return (
              <button
                key={url}
                type="button"
                role="radio"
                aria-checked={isActive}
                className={`celebration-option${isActive ? ' celebration-active' : ''}`}
                onClick={() => onSaveChange(setCelebration(save, index))}
              >
                <img src={url} alt={CELEBRATION_NAMES[index]} />
                <span>{CELEBRATION_NAMES[index]}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
