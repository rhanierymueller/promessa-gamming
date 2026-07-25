import { BadgeDollarSign, CalendarDays, House, Shield, User, Volume2, VolumeX, type LucideIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { clubById, type Club } from '../data/clubs'
import { nationAsClub, nationById } from '../data/nations'
import { isCallUpEligible } from '../engine/career/callup'
import { stadiumTierFor } from '../engine/career/stadium'
import { divisionOf } from '../engine/pyramid/pyramid'
import { createRng } from '../engine/rng'
import { advanceSeason, isSeasonOver, playerOpponentId } from '../engine/season/season'
import {
  advanceTournament,
  createTournament,
  playerTournamentOpponentId,
  type TournamentKind,
} from '../engine/tournament/tournament'
import { initAudio, setMuted } from '../game/audio'
import { stadiumBackgroundUrl } from '../game/assets'
import { submitLeagueMatch } from '../online/leagues'
import { MatchScreen } from '../game/MatchScreen'
import { ShotStage } from '../game/ShotStage'
import {
  applySeason,
  applyTournament,
  displayClub,
  loadSave,
  persistSave,
  recordMatch,
  startNewSeason,
  withTournamentState,
  type MatchRecord,
  type PlayerSave,
} from '../state/save'
import {
  clearPendingMatch,
  forfeitRecord,
  markPendingMatch,
  readPendingMatch,
} from '../state/pendingMatch'
import { isRecoveryHash, recoveryErrorMessage } from '../state/recoveryLink'
import { currentSessionEmail, deleteAccount } from '../online/account'
import { getClient, isOnlineAvailable } from '../online/leagues'
import { AuthGate } from './AuthGate'
import { CharacterCreate } from './CharacterCreate'
import { Landing } from './Landing'
import { PasswordReset } from './PasswordReset'
import { HomeTab } from './tabs/HomeTab'
import { MarketTab } from './tabs/MarketTab'
import { MatchesTab } from './tabs/MatchesTab'
import { ProfileTab } from './tabs/ProfileTab'
import { TeamTab } from './tabs/TeamTab'

type Tab = 'home' | 'matches' | 'team' | 'market' | 'profile'
type Screen = 'tabs' | 'match' | 'training' | 'gk-training'

interface MatchSetup {
  readonly seed: number
  readonly kind: 'liga' | 'torneio'
  readonly club: Club
  readonly opponent: Club
}

/** Aplica um resultado no save: histórico + liga (ou torneio) avançam juntos. */
const applyMatchOutcome = (
  save: PlayerSave,
  record: MatchRecord,
  kind: 'liga' | 'torneio',
  seed: number,
): PlayerSave => {
  let updated = recordMatch(save, record)
  if (kind === 'liga') {
    const simulated = advanceSeason(
      updated.season,
      record.teamGoals,
      record.opponentGoals,
      createRng((seed ^ 0x9e3779b9) >>> 0),
    )
    updated = applySeason(updated, simulated.value)
  } else if (updated.tournament) {
    const advanced = advanceTournament(
      updated.tournament,
      record.teamGoals,
      record.opponentGoals,
      createRng((seed ^ 0x51ed2701) >>> 0),
    )
    updated = withTournamentState(updated, advanced.value.state)
  }
  return updated
}

/** Carrega o save e cobra o W.O. de quem saiu no meio de uma partida. */
const loadSaveChargingForfeit = (): PlayerSave | null => {
  const loaded = loadSave(localStorage)
  const pending = readPendingMatch(localStorage)
  if (!pending) return loaded
  clearPendingMatch(localStorage)
  if (!loaded) return loaded
  const updated = applyMatchOutcome(loaded, forfeitRecord(pending, Date.now()), pending.kind, pending.seed)
  persistSave(localStorage, updated)
  return updated
}

const MUTE_KEY = 'promessa.muted'

const loadMuted = (): boolean => localStorage.getItem(MUTE_KEY) === '1'

/**
 * Tira o token da barra de endereços. No fluxo implícito o SDK deixa
 * access_token/refresh_token no fragmento da URL — some do histórico,
 * de prints e de link copiado sem perder a sessão (já está no storage).
 */
const clearAuthFragment = (): void => {
  if (window.location.hash.length === 0) return
  history.replaceState(null, '', window.location.pathname + window.location.search)
}

interface MuteButtonProps {
  readonly muted: boolean
  readonly onToggle: () => void
}

const MuteButton = ({ muted, onToggle }: MuteButtonProps) => (
  <button
    className="mute-btn"
    onClick={onToggle}
    aria-label={muted ? 'Ativar som' : 'Silenciar som'}
    title={muted ? 'Ativar som' : 'Silenciar som'}
  >
    {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
  </button>
)

const TAB_ITEMS: readonly { id: Tab; icon: LucideIcon; label: string }[] = [
  { id: 'home', icon: House, label: 'Início' },
  { id: 'matches', icon: CalendarDays, label: 'Liga' },
  { id: 'team', icon: Shield, label: 'Time' },
  { id: 'market', icon: BadgeDollarSign, label: 'Mercado' },
  { id: 'profile', icon: User, label: 'Perfil' },
]

export const App = () => {
  const [save, setSave] = useState<PlayerSave | null>(loadSaveChargingForfeit)
  // a landing é a home; Jogar passa pelo portão de login/cadastro; 'recovery'
  // é a tela de nova senha aberta pelo link do e-mail
  const [gate, setGate] = useState<'landing' | 'auth' | 'signup' | 'game' | 'recovery'>(() =>
    isRecoveryHash(window.location.hash) ? 'recovery' : 'landing',
  )
  // aviso mostrado no login (ex.: link de recuperação expirado)
  const [authNotice, setAuthNotice] = useState<string | null>(null)
  // sessão lembrada pelo SDK do Supabase (token em localStorage, renovado
  // automaticamente — a SENHA nunca é guardada); com ela, Jogar pula o login
  const [hasSession, setHasSession] = useState(false)
  const [screen, setScreen] = useState<Screen>('tabs')
  const [tab, setTab] = useState<Tab>('home')
  const [matchSetup, setMatchSetup] = useState<MatchSetup | null>(null)
  const [muted, setMutedState] = useState<boolean>(() => {
    const stored = loadMuted()
    setMuted(stored)
    return stored
  })

  useEffect(() => {
    void currentSessionEmail().then((email) => setHasSession(email !== null))
  }, [gate])

  useEffect(() => {
    // link de recuperação inválido/expirado: volta ao login com aviso e limpa a URL
    const urlError = recoveryErrorMessage(window.location.hash)
    if (urlError) {
      setAuthNotice(urlError)
      setGate('auth')
      clearAuthFragment()
    }
    const client = getClient()
    if (!client) return
    // o client nasce no import e pode consumir o link antes do React montar:
    // getSession() só resolve depois disso, então é a hora certa de limpar
    // o token da URL (o gate já veio de isRecoveryUrl na primeira renderização)
    void client.auth.getSession().then(clearAuthFragment)
    // link aberto com o app já rodando: o SDK avisa por aqui
    const { data } = client.auth.onAuthStateChange((event) => {
      if (event !== 'PASSWORD_RECOVERY') return
      setGate('recovery')
      clearAuthFragment()
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const toggleMute = (): void => {
    const next = !muted
    setMutedState(next)
    setMuted(next)
    localStorage.setItem(MUTE_KEY, next ? '1' : '0')
  }

  const club = useMemo(() => {
    if (!save) return null
    const base = clubById(save.clubId)
    return base ? displayClub(save, base) : null
  }, [save])
  const nextOpponent = useMemo(() => {
    if (!save || isSeasonOver(save.season)) return null
    const base = clubById(playerOpponentId(save.season))
    return base ? displayClub(save, base) : null
  }, [save])

  const updateSave = (updated: PlayerSave): void => {
    persistSave(localStorage, updated)
    setSave(updated)
  }

  const startLeagueMatch = (): void => {
    if (!save || !club || !nextOpponent) return
    initAudio()
    const seed = Date.now() & 0xffffffff
    markPendingMatch(localStorage, { opponentId: nextOpponent.id, kind: 'liga', seed })
    setMatchSetup({ seed, kind: 'liga', club, opponent: nextOpponent })
    setScreen('match')
  }

  const startTournament = (kind: TournamentKind): void => {
    if (!save) return
    const tournament = createTournament(kind, save.nationalityId, Date.now() & 0xffffffff)
    updateSave(applyTournament(save, tournament))
  }

  const startTournamentMatch = (): void => {
    if (!save || !save.tournament) return
    const nation = nationById(save.nationalityId)
    const opponentId = playerTournamentOpponentId(save.tournament)
    const opponentNation = opponentId ? nationById(opponentId) : null
    if (!nation || !opponentNation) return
    initAudio()
    const seed = Date.now() & 0xffffffff
    const opponentClub = nationAsClub(opponentNation)
    markPendingMatch(localStorage, { opponentId: opponentClub.id, kind: 'torneio', seed })
    setMatchSetup({
      seed,
      kind: 'torneio',
      club: nationAsClub(nation),
      opponent: opponentClub,
    })
    setScreen('match')
  }

  const onMatchFinished = (record: MatchRecord): void => {
    clearPendingMatch(localStorage)
    if (save && matchSetup) {
      const updated = applyMatchOutcome(save, record, matchSetup.kind, matchSetup.seed)
      updateSave(updated)
      // ranking entre amigos: envio silencioso, nunca trava o fluxo local
      void submitLeagueMatch(updated, record).catch(() => undefined)
    }
    setMatchSetup(null)
    setScreen('tabs')
    setTab('matches')
  }

  const onNewSeason = (): void => {
    if (save) updateSave(startNewSeason(save))
    setTab('home')
  }

  const leaveToLanding = (): void => {
    // sessão do Supabase encerra em silêncio; o save local fica intacto
    void getClient()?.auth.signOut().catch(() => undefined)
    setScreen('tabs')
    setTab('home')
    setGate('landing')
    window.scrollTo({ top: 0 })
  }

  const eraseAccount = async (): Promise<string | null> => {
    const result = await deleteAccount()
    if (!result.ok) return result.message
    localStorage.removeItem('promessa.save')
    clearPendingMatch(localStorage)
    setSave(null)
    setScreen('tabs')
    setTab('home')
    setGate('landing')
    window.scrollTo({ top: 0 })
    return null
  }

  const resetCareer = (): void => {
    localStorage.removeItem('promessa.save')
    clearPendingMatch(localStorage)
    setSave(null)
    setScreen('tabs')
    setTab('home')
  }

  // convocação: forma na LIGA + vitrine — olheiro da seleção só olha Séries B e A
  const callUpAvailable = Boolean(
    save &&
      divisionOf(save.divisions, save.clubId) <= 1 &&
      !save.tournamentPlayed &&
      isSeasonOver(save.season) &&
      isCallUpEligible(
        save.history
          .filter((record) => record.competition === 'liga')
          .slice(-save.season.currentRound)
          .map((record) => record.rating),
      ),
  )

  if (gate === 'landing') {
    // logado (ou modo local) com carreira: entra direto, sem redigitar login
    const canSkipLogin = Boolean(save && club) && (hasSession || !isOnlineAvailable())
    return (
      <Landing
        hasSave={Boolean(save && club)}
        onPlay={() => setGate(canSkipLogin ? 'game' : 'auth')}
      />
    )
  }

  if (gate === 'auth') {
    return (
      <AuthGate
        hasSave={Boolean(save && club)}
        onEnter={() => {
          setAuthNotice(null)
          setGate('game')
        }}
        onSignup={() => {
          setAuthNotice(null)
          setGate('signup')
        }}
        onBack={() => {
          setAuthNotice(null)
          setGate('landing')
        }}
        initialNotice={authNotice ?? undefined}
      />
    )
  }

  if (gate === 'recovery') {
    return (
      <PasswordReset
        onDone={() => setGate('game')}
        onCancel={() => {
          setAuthNotice(null)
          setGate('auth')
        }}
      />
    )
  }

  if (gate === 'signup' || !save || !club) {
    return (
      <main className="shell">
        <MuteButton muted={muted} onToggle={toggleMute} />
        <header className="header">
          <p className="eyebrow">Promessa</p>
          <h1>Promessa</h1>
        </header>
        <CharacterCreate
          onCreated={(created) => {
            updateSave(created)
            setGate('game')
          }}
        />
        <footer className="footer">PROMESSA · em desenvolvimento</footer>
      </main>
    )
  }

  if (screen === 'match' && matchSetup) {
    return (
      <main className="shell">
        <MuteButton muted={muted} onToggle={toggleMute} />
        <header className="header">
          <p className="eyebrow">
            {matchSetup.kind === 'torneio'
              ? 'Jogo da seleção'
              : `Promessa · Rodada ${save.season.currentRound + 1}`}
          </p>
          <h1>Dia de jogo</h1>
        </header>
        <MatchScreen
          key={matchSetup.seed}
          seed={matchSetup.seed}
          playerName={save.playerName}
          club={matchSetup.club}
          opponent={matchSetup.opponent}
          competition={matchSetup.kind === 'torneio' ? 'selecao' : 'liga'}
          attributes={save.attributes}
          celebrationId={save.celebrationId}
          appearance={save.appearance}
          crestUrls={save.customClubCrests}
          formation={save.formation}
          playerPosition={save.playerPosition}
          careerYear={save.careerYear}
          playerNames={save.customPlayerNames}
          stadiumUrl={stadiumBackgroundUrl(
            stadiumTierFor(
              matchSetup.kind === 'torneio' ? null : divisionOf(save.divisions, save.clubId),
              matchSetup.kind === 'torneio' ? 'selecao' : 'liga',
            ),
          )}
          opponentDivision={matchSetup.kind === 'liga' ? divisionOf(save.divisions, matchSetup.opponent.id) : -1}
          lineup={matchSetup.kind === 'liga' ? save.lineup : undefined}
          signings={matchSetup.kind === 'liga' ? save.signings : undefined}
          onExit={onMatchFinished}
        />
        <footer className="footer">PROMESSA · em desenvolvimento</footer>
      </main>
    )
  }

  if (screen === 'training') {
    return (
      <main className="shell">
        <MuteButton muted={muted} onToggle={toggleMute} />
        <header className="header">
          <p className="eyebrow">Promessa · Treino</p>
          <h1>O Chute</h1>
        </header>
        <button className="btn btn-secondary btn-back" onClick={() => setScreen('tabs')}>← Voltar</button>
        <ShotStage attrs={save.attributes} celebrationId={save.celebrationId} appearance={save.appearance} />
        <footer className="footer">PROMESSA · em desenvolvimento</footer>
      </main>
    )
  }

  if (screen === 'gk-training') {
    return (
      <main className="shell">
        <MuteButton muted={muted} onToggle={toggleMute} />
        <header className="header">
          <p className="eyebrow">Promessa · Treino</p>
          <h1>O Paredão</h1>
        </header>
        <button className="btn btn-secondary btn-back" onClick={() => setScreen('tabs')}>← Voltar</button>
        <ShotStage
          shots={10}
          defense={{ skill: 0.3, kitColor: '#8A8F98' }}
          attrs={save.attributes}
        />
        <footer className="footer">PROMESSA · em desenvolvimento</footer>
      </main>
    )
  }

  return (
    <main className="shell shell-tabs">
        <MuteButton muted={muted} onToggle={toggleMute} />
      <header className="header">
        <p className="eyebrow">Promessa</p>
        <h1>{TAB_ITEMS.find((item) => item.id === tab)!.label}</h1>
      </header>

      {tab === 'home' && (
        <HomeTab
          save={save}
          club={club}
          nextOpponent={nextOpponent}
          callUpAvailable={callUpAvailable}
          onPlayMatch={startLeagueMatch}
          onStartTournament={startTournament}
          onPlayTournamentMatch={startTournamentMatch}
          onDismissTournament={() => save && updateSave(applyTournament(save, null))}
          onDismissMovement={() => save && updateSave({ ...save, divisionMovement: null })}
          onNewSeason={onNewSeason}
          onTraining={() => setScreen('training')}
          onGkTraining={() => setScreen('gk-training')}
        />
      )}
      {tab === 'matches' && <MatchesTab save={save} />}
      {tab === 'team' && <TeamTab save={save} club={club} onSaveChange={updateSave} />}
      {tab === 'market' && <MarketTab save={save} onSaveChange={updateSave} />}
      {tab === 'profile' && (
        <ProfileTab
          save={save}
          club={club}
          onSaveChange={updateSave}
          onResetCareer={resetCareer}
          onLogout={leaveToLanding}
          onDeleteAccount={eraseAccount}
        />
      )}

      <nav className="tabbar" aria-label="Navegação principal">
        {TAB_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`tabbar-item${tab === item.id ? ' tabbar-active' : ''}`}
            onClick={() => setTab(item.id)}
          >
            <item.icon size={20} strokeWidth={tab === item.id ? 2.4 : 1.8} aria-hidden="true" />
            {item.label}
          </button>
        ))}
      </nav>
    </main>
  )
}
