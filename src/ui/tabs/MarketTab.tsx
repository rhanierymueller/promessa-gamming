import { BadgeDollarSign, ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { NATIONS, nationById } from '../../data/nations'
import { formatMoney, marketPoolFor, type MarketPlayer } from '../../engine/market/market'
import type { SquadPosition } from '../../engine/squad/players'
import { signPlayer, type PlayerSave } from '../../state/save'
import { NationFlag } from '../NationFlag'
import { OverallStars } from '../OverallStars'
import { ovrClass, PlayerCardModal } from '../PlayerCard'

/** Transfermarket: filtros estilo FIFA e contratação com a verba da divisão. */

interface MarketTabProps {
  readonly save: PlayerSave
  readonly onSaveChange: (save: PlayerSave) => void
}

const POSITIONS: readonly SquadPosition[] = ['GOL', 'LD', 'ZAG', 'LE', 'VOL', 'MEI', 'PON', 'ATA']

const AGE_FILTERS = [
  { id: 'all', label: 'Todas as idades', min: 0, max: 99 },
  { id: '16-20', label: '16-20 anos', min: 16, max: 20 },
  { id: '21-25', label: '21-25 anos', min: 21, max: 25 },
  { id: '26-30', label: '26-30 anos', min: 26, max: 30 },
  { id: '31+', label: '31+ anos', min: 31, max: 99 },
] as const

const PRICE_FILTERS = [
  { id: 'all', label: 'Todos os preços', min: 0, max: Infinity },
  { id: 'barato', label: 'Até R$ 400 mil', min: 0, max: 399_999 },
  { id: 'mediano', label: 'R$ 400 a 800 mil', min: 400_000, max: 800_000 },
  { id: 'bom', label: 'R$ 1,5 a 8 mi', min: 1_500_000, max: 8_000_000 },
  { id: 'otimo', label: 'R$ 8 a 25 mi', min: 8_000_000, max: 25_000_000 },
  { id: 'galactico', label: 'R$ 30 mi ou mais', min: 30_000_000, max: Infinity },
] as const

export const MarketTab = ({ save, onSaveChange }: MarketTabProps) => {
  const [position, setPosition] = useState<'all' | SquadPosition>('all')
  const [nationality, setNationality] = useState('all')
  const [ageFilter, setAgeFilter] = useState<(typeof AGE_FILTERS)[number]['id']>('all')
  const [priceFilter, setPriceFilter] = useState<(typeof PRICE_FILTERS)[number]['id']>('all')
  const [isWithinBudgetOnly, setIsWithinBudgetOnly] = useState(true)
  const [selected, setSelected] = useState<MarketPlayer | null>(null)
  const [confirming, setConfirming] = useState<MarketPlayer | null>(null)
  const [hiredNote, setHiredNote] = useState<string | null>(null)
  const [page, setPage] = useState(0)

  const pool = useMemo(
    () => marketPoolFor(save.season.seed, save.careerYear),
    [save.season.seed, save.careerYear],
  )
  const signedIds = useMemo(() => new Set(save.signings.map((signing) => signing.id)), [save.signings])
  // histórico zera a cada temporada: só as contratações do ano corrente
  const seasonSignings = useMemo(
    () => save.signings.filter((signing) => signing.boughtYear === save.careerYear),
    [save.signings, save.careerYear],
  )
  const seasonSpent = seasonSignings.reduce((sum, signing) => sum + signing.price, 0)

  const listed = useMemo(() => {
    const age = AGE_FILTERS.find((entry) => entry.id === ageFilter)!
    const price = PRICE_FILTERS.find((entry) => entry.id === priceFilter)!
    return pool
      .filter((player) => !signedIds.has(player.id))
      .filter((player) => position === 'all' || player.position === position)
      .filter((player) => nationality === 'all' || player.nationality === nationality)
      .filter((player) => player.age >= age.min && player.age <= age.max)
      .filter((player) => player.price >= price.min && player.price <= price.max)
      .filter((player) => !isWithinBudgetOnly || player.price <= save.budget)
      .sort((a, b) => b.overall - a.overall)
  }, [pool, signedIds, position, nationality, ageFilter, priceFilter, isWithinBudgetOnly, save.budget])

  const PAGE_SIZE = 15
  const totalPages = Math.max(1, Math.ceil(listed.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages - 1)
  const paged = listed.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE)

  const confirmHire = (player: MarketPlayer): void => {
    onSaveChange(signPlayer(save, player))
    setConfirming(null)
    setSelected(null)
    setHiredNote(`${player.name} agora é do seu time — confira na aba Time › Elenco (linha destacada).`)
  }

  return (
    <div className="tab-panel">
      <div className="card card-wide">
        <div className="market-header">
          <span className="card-label">Mercado de transferências</span>
          <span className="market-budget">
            <BadgeDollarSign size={16} aria-hidden="true" />
            Verba: <strong>{formatMoney(save.budget)}</strong>
          </span>
        </div>

        <div className="market-filters">
          <select
            className="squad-select"
            value={position}
            aria-label="Filtrar por posição"
            onChange={(event) => { setPage(0); setPosition(event.target.value as 'all' | SquadPosition) }}
          >
            <option value="all">Todas as posições</option>
            {POSITIONS.map((entry) => (
              <option key={entry} value={entry}>{entry}</option>
            ))}
          </select>
          <select
            className="squad-select"
            value={nationality}
            aria-label="Filtrar por nacionalidade"
            onChange={(event) => { setPage(0); setNationality(event.target.value) }}
          >
            <option value="all">Todas as nacionalidades</option>
            {NATIONS.map((nation) => (
              <option key={nation.id} value={nation.id}>{nation.name}</option>
            ))}
          </select>
          <select
            className="squad-select"
            value={ageFilter}
            aria-label="Filtrar por idade"
            onChange={(event) => { setPage(0); setAgeFilter(event.target.value as typeof ageFilter) }}
          >
            {AGE_FILTERS.map((entry) => (
              <option key={entry.id} value={entry.id}>{entry.label}</option>
            ))}
          </select>
          <select
            className="squad-select"
            value={priceFilter}
            aria-label="Filtrar por preço"
            onChange={(event) => { setPage(0); setPriceFilter(event.target.value as typeof priceFilter) }}
          >
            {PRICE_FILTERS.map((entry) => (
              <option key={entry.id} value={entry.id}>{entry.label}</option>
            ))}
          </select>
          <label className="market-within">
            <input
              type="checkbox"
              checked={isWithinBudgetOnly}
              onChange={(event) => { setPage(0); setIsWithinBudgetOnly(event.target.checked) }}
            />
            Só dentro da verba
          </label>
        </div>

        {hiredNote && (
          <p className="market-hired-note" role="status">{hiredNote}</p>
        )}
        <div className="market-list">
          {listed.length === 0 && (
            <p className="muted">
              {isWithinBudgetOnly
                ? 'Nenhum jogador dentro da verba com esses filtros — desmarque "Só dentro da verba" para ver o mercado todo.'
                : 'Nenhum jogador com esses filtros — afrouxa a peneira.'}
            </p>
          )}
          {paged.map((player) => {
            const affordable = player.price <= save.budget
            return (
              <div
                key={player.id}
                className="market-row"
                role="button"
                tabIndex={0}
                onClick={() => setSelected(player)}
                onKeyDown={(event) => { if (event.key === 'Enter') setSelected(player) }}
              >
                <span className="squad-pos">{player.position}</span>
                <NationFlag
                  nationId={player.nationality}
                  size={16}
                  title={nationById(player.nationality)?.name ?? 'Bandeira'}
                />
                <span className="market-name">{player.name}</span>
                <span className="squad-age">{player.age} anos</span>
                <span className="market-stars">
                  <OverallStars overall={player.overall} size={11} />
                  <span className={`squad-ovr ${ovrClass(player.overall)}`}>{player.overall}</span>
                </span>
                <span className="market-price">{formatMoney(player.price)}</span>
                <button
                  className="btn market-buy"
                  disabled={!affordable}
                  title={affordable ? `Contratar por ${formatMoney(player.price)}` : 'Verba insuficiente'}
                  onClick={(event) => {
                    event.stopPropagation()
                    setConfirming(player)
                  }}
                >
                  {affordable ? 'Contratar' : 'Sem verba'}
                </button>
              </div>
            )
          })}
        </div>
        {totalPages > 1 && (
          <div className="market-pagination">
            <button
              className="btn btn-secondary market-page-btn"
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
              aria-label="Página anterior"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="market-page-info">
              Página {currentPage + 1} de {totalPages} · {listed.length} jogadores
            </span>
            <button
              className="btn btn-secondary market-page-btn"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setPage(currentPage + 1)}
              aria-label="Próxima página"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        )}
        <p className="muted table-note">
          Reforço contratado entra no SEU elenco no lugar do jogador mais fraco da posição.
          A verba renova a cada temporada conforme a divisão.
        </p>
      </div>

      <div className="card card-wide">
        <div className="market-header">
          <span className="card-label">Contratações da temporada · ano {save.careerYear}</span>
          {seasonSignings.length > 0 && (
            <span className="market-budget">Investido: <strong>{formatMoney(seasonSpent)}</strong></span>
          )}
        </div>
        {seasonSignings.length === 0 ? (
          <p className="muted">Nenhuma contratação nesta temporada — a janela está aberta.</p>
        ) : (
          <div className="market-list">
            {seasonSignings.map((signing) => (
              <div key={signing.id} className="market-row market-row-history">
                <span className="squad-pos">{signing.position}</span>
                <NationFlag
                  nationId={signing.nationality}
                  size={16}
                  title={nationById(signing.nationality)?.name ?? 'Bandeira'}
                />
                <span className="market-name">{signing.name}</span>
                <span className="squad-age">{signing.baseAge} anos</span>
                <span className="market-stars" />
                <span className="market-price">{formatMoney(signing.price)}</span>
                <span className="signing-tag">reforço</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {confirming && (
        <div className="sim-confirm" role="dialog" aria-modal="true" aria-labelledby="hire-confirm-title">
          <div className="sim-confirm-box">
            <h3 id="hire-confirm-title">Confirmar contratação?</h3>
            <p>
              <strong>{confirming.name}</strong> ({confirming.position} · overall {confirming.overall}) por{' '}
              <strong>{formatMoney(confirming.price)}</strong>.
              <br />
              Ele entra no SEU elenco no lugar do {confirming.position} mais fraco.
              Verba restante: <strong>{formatMoney(save.budget - confirming.price)}</strong>.
            </p>
            <div className="sim-confirm-actions">
              <button className="btn btn-secondary" onClick={() => setConfirming(null)}>
                Cancelar
              </button>
              <button className="btn" onClick={() => confirmHire(confirming)}>
                Contratar
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <PlayerCardModal
          player={selected}
          clubName="Livre no mercado"
          isUser={false}
          renameState={null}
          onClose={() => setSelected(null)}
          footer={
            <button
              className="btn"
              disabled={selected.price > save.budget}
              onClick={() => setConfirming(selected)}
            >
              Contratar por {formatMoney(selected.price)}
            </button>
          }
        />
      )}
    </div>
  )
}
