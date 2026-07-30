import { useEffect, useState } from 'react'
import {
  createFriendLeague,
  isOnlineAvailable,
  joinFriendLeague,
  leagueWeeklyRanking,
  myLeagues,
  type FriendLeague,
  type RankingRow,
} from '../online/leagues'
import { isValidLeagueCode } from '../online/points'
import { isOffensiveName } from '../state/moderation'
import type { PlayerSave } from '../state/save'

interface FriendsLeaguesProps {
  readonly save: PlayerSave
}

/** Ligas entre amigos: criar/entrar por código + ranking semanal. */
export const FriendsLeagues = ({ save }: FriendsLeaguesProps) => {
  const [leagues, setLeagues] = useState<readonly FriendLeague[]>([])
  const [selected, setSelected] = useState<FriendLeague | null>(null)
  const [ranking, setRanking] = useState<readonly RankingRow[]>([])
  const [newName, setNewName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const refreshLeagues = async (): Promise<void> => {
    setStatus('loading')
    try {
      const list = await myLeagues(save)
      setLeagues(list)
      setSelected((current) => current ?? list[0] ?? null)
      setStatus('idle')
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'erro inesperado')
      setStatus('error')
    }
  }

  useEffect(() => {
    if (isOnlineAvailable()) void refreshLeagues()
    // carrega uma vez ao abrir a sub-aba
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selected) {
      setRanking([])
      return
    }
    let cancelled = false
    leagueWeeklyRanking(save, selected.id)
      .then((rows) => {
        if (!cancelled) setRanking(rows)
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'erro inesperado')
          setStatus('error')
        }
      })
    return () => {
      cancelled = true
    }
    // recarrega ao trocar de liga
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id])

  const onCreate = async (): Promise<void> => {
    if (newName.trim().length === 0) return
    if (isOffensiveName(newName)) {
      setErrorMessage('esse nome de liga não pode ser usado — escolha outro')
      setStatus('error')
      return
    }
    setStatus('loading')
    try {
      const league = await createFriendLeague(save, newName)
      setNewName('')
      setLeagues((current) => [...current, league])
      setSelected(league)
      setStatus('idle')
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'erro inesperado')
      setStatus('error')
    }
  }

  const onJoin = async (): Promise<void> => {
    if (!isValidLeagueCode(joinCode)) {
      setErrorMessage('código deve ter 6 letras/números (ex.: ABC234)')
      setStatus('error')
      return
    }
    setStatus('loading')
    try {
      const league = await joinFriendLeague(save, joinCode)
      setJoinCode('')
      setLeagues((current) =>
        current.some((item) => item.id === league.id) ? current : [...current, league],
      )
      setSelected(league)
      setStatus('idle')
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'erro inesperado')
      setStatus('error')
    }
  }

  if (!isOnlineAvailable()) {
    return (
      <div className="card friends-panel">
        <span className="card-label">Liga de amigos</span>
        <p className="muted">O modo online não está configurado nesta instalação.</p>
      </div>
    )
  }

  return (
    <>
      <div className="card friends-panel">
        <span className="card-label">Suas ligas de amigos</span>
        {leagues.length === 0 && status !== 'loading' && (
          <p className="muted">Crie uma liga e mande o código pros amigos — ou entre com um código.</p>
        )}
        {leagues.length > 0 && (
          <div className="friends-league-list">
            {leagues.map((league) => (
              <button
                key={league.id}
                type="button"
                className={`friends-league${selected?.id === league.id ? ' friends-league-active' : ''}`}
                onClick={() => setSelected(league)}
              >
                {league.name}
              </button>
            ))}
          </div>
        )}
        <div className="friends-forms">
          <div className="friends-form">
            <input
              className="create-input"
              type="text"
              maxLength={24}
              placeholder="Nome da nova liga"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
            />
            <button className="btn" onClick={() => void onCreate()} disabled={status === 'loading'}>
              Criar
            </button>
          </div>
          <div className="friends-form">
            <input
              className="create-input friends-code-input"
              type="text"
              maxLength={6}
              placeholder="CÓDIGO"
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
            />
            <button className="btn btn-secondary" onClick={() => void onJoin()} disabled={status === 'loading'}>
              Entrar
            </button>
          </div>
        </div>
        {status === 'error' && <p className="friends-error">⚠ {errorMessage}</p>}
        {status === 'loading' && <p className="muted">carregando…</p>}
      </div>

      {selected && (
        <div className="card friends-panel">
          <span className="card-label">
            {selected.name} · ranking da semana
          </span>
          <p className="muted table-note">
            Código de convite: <strong className="friends-code">{selected.code}</strong> — compartilhe!
          </p>
          {ranking.length === 0 && <p className="muted">Sem pontos ainda esta semana — joguem pela liga!</p>}
          {ranking.map((row, index) => (
            <div key={row.playerId} className={`table-row${row.isMe ? ' table-player' : ''}`}>
              <span className="table-pos">{index + 1}</span>
              <span className="table-club">
                <span className="table-club-name">
                  {row.name}
                  {row.clubName ? <span className="fixture-venue"> · {row.clubName}</span> : null}
                </span>
              </span>
              <span className="table-num table-points">{row.points}</span>
              <span className="table-num">{row.matches}j</span>
            </div>
          ))}
          <p className="muted table-note">
            Pontos da semana: vitória 3 · empate 1 + seus gols + bônus de gala (nota 8+).
          </p>
        </div>
      )}
    </>
  )
}
