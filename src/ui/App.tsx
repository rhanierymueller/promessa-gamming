import { BadgeDollarSign, CalendarDays, House, Shield, Trophy, User, Volume1, Volume2, VolumeX, type LucideIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { clubById, type Club } from '../data/clubs'
import { nationAsClub, nationById } from '../data/nations'
import { isCallUpEligible } from '../engine/career/callup'
import { stadiumTierFor } from '../engine/career/stadium'
import { divisionOf } from '../engine/pyramid/pyramid'
import { createRng } from '../engine/rng'
import { advanceSeason, isSeasonOver, playerOpponentId } from '../engine/season/season'
import { shootoutFor } from '../engine/tournament/shootout'
import {
  advanceTournament,
  TOURNAMENT_NAMES,
  createTournament,
  playerTournamentOpponentId,
  type TournamentKind,
} from '../engine/tournament/tournament'
import { initAudio, setVolume, startAmbience, stopMatchAudio } from '../game/audio'
import { setMusicVolume } from '../game/music'
import {
  DEFAULT_VOLUME,
  isMuted,
  MAX_VOLUME,
  parseStoredVolume,
  VOLUME_STEP,
  volumeLabel,
} from '../engine/audio/volume'
import { stadiumBackgroundUrl } from '../game/assets'
import { submitLeagueMatch } from '../online/leagues'
import { MatchScreen } from '../game/MatchScreen'
import { ShotStage } from '../game/ShotStage'
import { DiceDuelStage } from '../game/DiceDuelStage'
import {
  applySeason,
  applyTournament,
  currentPlayerAge,
  choosePerk,
  dismissEventNote,
  displayClub,
  loadSave,
  persistSave,
  recordMatch,
  resolvePendingEvent,
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
import { deleteCloudSave, pushSave, syncSave } from '../online/cloudSave'
import { clearAllLocalData, clearCareerData } from '../state/localData'
import { MatchesTab } from './tabs/MatchesTab'
import { CallUpIntro } from './CallUpIntro'
import { NationalTab } from './tabs/NationalTab'
import { isTournamentRunning } from '../engine/career/seasonEnd'
import { ProfileTab } from './tabs/ProfileTab'
import { TeamTab } from './tabs/TeamTab'
import './styles/home.css'

type Tab = 'home' | 'matches' | 'selecao' | 'team' | 'market' | 'profile'
type Screen = 'tabs' | 'match' | 'training' | 'gk-training' | 'freekick-training' | 'dice-training'

/** Telas com gramado na tela — são as que ligam a torcida. */
const PITCH_SCREENS: readonly Screen[] = ['match', 'training', 'gk-training', 'freekick-training']

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
      // só entra se a partida escapar empatada de um mata-mata
      shootoutFor(seed).playerWon,
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

const VOLUME_KEY = 'promessa.volume'
/** Chave do botão antigo (mudo/não-mudo) — ainda lida para não perder a escolha. */
const LEGACY_MUTE_KEY = 'promessa.muted'

const loadVolume = (): number =>
  parseStoredVolume(localStorage.getItem(VOLUME_KEY), localStorage.getItem(LEGACY_MUTE_KEY))

/**
 * Tira o token da barra de endereços. No fluxo implícito o SDK deixa
 * access_token/refresh_token no fragmento da URL — some do histórico,
 * de prints e de link copiado sem perder a sessão (já está no storage).
 */
const clearAuthFragment = (): void => {
  if (window.location.hash.length === 0) return
  history.replaceState(null, '', window.location.pathname + window.location.search)
}

/** Metade do controle já é volume alto para este jogo. */
const LOUD_FROM = MAX_VOLUME / 2

const volumeIcon = (volume: number): LucideIcon => {
  if (isMuted(volume)) return VolumeX
  return volume < LOUD_FROM ? Volume1 : Volume2
}

interface VolumeControlProps {
  readonly volume: number
  readonly onChange: (value: number) => void
  readonly onToggleMute: () => void
}

/**
 * Som da aplicação: o ícone liga/desliga e a barra ao lado ajusta o quanto
 * quiser. A barra só aparece quando o controle recebe atenção — no canto da
 * tela ela ficaria no caminho o tempo todo.
 */
const VolumeControl = ({ volume, onChange, onToggleMute }: VolumeControlProps) => {
  const Icon = volumeIcon(volume)
  return (
    <div className="volume-control">
      <button
        className="mute-btn"
        onClick={onToggleMute}
        aria-label={isMuted(volume) ? 'Ligar o som' : 'Desligar o som'}
        title={volumeLabel(volume)}
      >
        <Icon size={18} />
      </button>
      <input
        className="volume-slider"
        type="range"
        min={0}
        max={MAX_VOLUME}
        step={VOLUME_STEP}
        value={volume}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label="Volume"
        title={volumeLabel(volume)}
      />
    </div>
  )
}

const TAB_ITEMS: readonly { id: Tab; icon: LucideIcon; label: string }[] = [
  { id: 'home', icon: House, label: 'Início' },
  { id: 'matches', icon: CalendarDays, label: 'Liga' },
  // a aba da seleção só entra na barra quando há convocação em andamento
  { id: 'selecao', icon: Trophy, label: 'Seleção' },
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
  // semente do duelo de dados no treino: muda a cada lance resolvido
  const [diceSeed, setDiceSeed] = useState(() => Date.now() & 0xffffffff)
  const [volume, setVolumeState] = useState<number>(() => {
    const stored = loadVolume()
    setVolume(stored)
    setMusicVolume(stored)
    return stored
  })

  useEffect(() => {
    void currentSessionEmail().then((email) => setHasSession(email !== null))
  }, [gate])

  /*
   * Entrou na conta: junta o que está no aparelho com o que está na nuvem.
   * Vence o mais recente; nuvem vazia recebe a carreira local, que é o caso de
   * quem já jogava antes de a sincronização existir.
   */
  useEffect(() => {
    if (!hasSession) return
    let ativo = true
    void syncSave(loadSave(localStorage)).then((result) => {
      if (!ativo || result.winner !== 'cloud' || !result.save) return
      persistSave(localStorage, result.save, result.save.savedAt)
      setSave(result.save)
    })
    return () => { ativo = false }
  }, [hasSession])

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

  useEffect(() => {
    // a torcida só existe com o gramado na tela. Fica no App (e não no
    // ShotStage) porque o ShotStage remonta a cada cobrança — ali o som
    // reiniciaria a todo lance e cortaria o grito do gol.
    if (!PITCH_SCREENS.includes(screen)) return
    startAmbience()
    return stopMatchAudio
  }, [screen])

  const applyVolume = (next: number): void => {
    setVolumeState(next)
    setVolume(next)
    setMusicVolume(next)
    localStorage.setItem(VOLUME_KEY, String(next))
  }

  /** Guarda o volume de antes do mudo para o som voltar como estava. */
  const lastAudibleRef = useRef(volume > 0 ? volume : DEFAULT_VOLUME)

  const toggleMute = (): void => {
    if (isMuted(volume)) {
      applyVolume(lastAudibleRef.current)
      return
    }
    lastAudibleRef.current = volume
    applyVolume(0)
  }

  // a Seleção só ocupa lugar na barra durante a convocação
  const visibleTabs = useMemo(
    () => TAB_ITEMS.filter((item) => item.id !== 'selecao' || save?.tournament),
    [save?.tournament],
  )

  const club = useMemo(() => {
    if (!save) return null
    const base = clubById(save.clubId)
    return base ? displayClub(save, base) : null
  }, [save])
  // o treino acontece no estádio da divisão atual — subir de série muda o palco
  const homeStadiumUrl = useMemo(
    () =>
      save
        ? stadiumBackgroundUrl(stadiumTierFor(divisionOf(save.divisions, save.clubId), 'liga'))
        : undefined,
    [save],
  )
  const nextOpponent = useMemo(() => {
    if (!save || isSeasonOver(save.season)) return null
    const base = clubById(playerOpponentId(save.season))
    return base ? displayClub(save, base) : null
  }, [save])

  const updateSave = (updated: PlayerSave): void => {
    // persistSave carimba o savedAt: é ele que decide quem jogou por último
    const stamped = persistSave(localStorage, updated)
    setSave(stamped)
    // a nuvem é comodidade: se falhar, a carreira local segue valendo
    void pushSave(stamped)
  }

  const startLeagueMatch = (): void => {
    if (!save || !club || !nextOpponent) return
    initAudio()
    const seed = Date.now() & 0xffffffff
    markPendingMatch(localStorage, { opponentId: nextOpponent.id, kind: 'liga', seed })
    setMatchSetup({ seed, kind: 'liga', club, opponent: nextOpponent })
    setScreen('match')
  }

  /* a convocação passa pela cerimônia antes de o torneio existir */
  const [callUpCeremony, setCallUpCeremony] = useState<TournamentKind | null>(null)

  const startTournament = (kind: TournamentKind): void => {
    if (!save) return
    setCallUpCeremony(kind)
  }

  const finishCallUp = (): void => {
    const kind = callUpCeremony
    setCallUpCeremony(null)
    if (!save || !kind) return
    updateSave(applyTournament(save, createTournament(kind, save.nationalityId, Date.now() & 0xffffffff)))
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
    /*
     * Sair da conta limpa o progresso deste aparelho: a carreira está na
     * nuvem e volta no próximo login. Sem isso, o save ficaria visível para a
     * próxima pessoa que abrisse o navegador.
     */
    void getClient()?.auth.signOut().catch(() => undefined)
    clearCareerData(localStorage)
    setSave(null)
    setHasSession(false)
    setScreen('tabs')
    setTab('home')
    setGate('landing')
    window.scrollTo({ top: 0 })
  }

  const eraseAccount = async (): Promise<string | null> => {
    // a carreira da nuvem sai primeiro: o cascade cobriria, mas depender só
    // dele deixaria o dado de pé se a remoção do usuário falhar no meio
    await deleteCloudSave()
    const result = await deleteAccount()
    if (!result.ok) return result.message
    clearAllLocalData(localStorage)
    setSave(null)
    setHasSession(false)
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

  // a ficha de inscrição é tela cheia como a portaria: sem shell, sem cabeçalho repetido
  if (gate === 'signup' || !save || !club) {
    return (
      <>
        <VolumeControl volume={volume} onChange={applyVolume} onToggleMute={toggleMute} />
        <CharacterCreate
          onCreated={(created) => {
            updateSave(created)
            setGate('game')
          }}
          onBack={() => setGate('auth')}
        />
      </>
    )
  }

  if (screen === 'match' && matchSetup) {
    return (
      <main className="shell">
        <VolumeControl volume={volume} onChange={applyVolume} onToggleMute={toggleMute} />
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
          /* mata-mata não aceita empate: o lance dos dados decide a vaga */
          decisive={
            matchSetup.kind === 'torneio' &&
            save.tournament !== null &&
            save.tournament.stage !== 'groups' &&
            isTournamentRunning(save.tournament.stage)
          }
          attributes={save.attributes}
          perks={save.perks}
          morale={save.morale}
          celebrationId={save.celebrationId}
          appearance={save.appearance}
          crestUrls={save.customClubCrests}
          formation={save.formation}
          playerPosition={save.playerPosition}
          careerYear={save.careerYear}
          playerAge={currentPlayerAge(save)}
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
        <VolumeControl volume={volume} onChange={applyVolume} onToggleMute={toggleMute} />
        <header className="header">
          <p className="eyebrow">Promessa · Treino</p>
          <h1>O Chute</h1>
        </header>
        <button className="btn btn-secondary btn-back" onClick={() => setScreen('tabs')}>← Voltar</button>
        <ShotStage
          backgroundUrl={homeStadiumUrl}
          attrs={save.attributes}
          celebrationId={save.celebrationId}
          appearance={save.appearance}
        />
        <footer className="footer">PROMESSA · em desenvolvimento</footer>
      </main>
    )
  }

  if (screen === 'freekick-training') {
    return (
      <main className="shell">
        <VolumeControl volume={volume} onChange={applyVolume} onToggleMute={toggleMute} />
        <header className="header">
          <p className="eyebrow">Promessa · Treino</p>
          <h1>Na Barreira</h1>
        </header>
        <button className="btn btn-secondary btn-back" onClick={() => setScreen('tabs')}>← Voltar</button>
        <ShotStage
          backgroundUrl={homeStadiumUrl}
          freeKick
          /* a barreira veste o próximo rival: o treino já ensaia o jogo que vem */
          wallColor={nextOpponent?.colors.primary}
          attrs={save.attributes}
          celebrationId={save.celebrationId}
          appearance={save.appearance}
          perks={save.perks}
        />
        <footer className="footer">PROMESSA · em desenvolvimento</footer>
      </main>
    )
  }

  if (screen === 'dice-training') {
    return (
      <main className="shell">
        <VolumeControl volume={volume} onChange={applyVolume} onToggleMute={toggleMute} />
        <header className="header">
          <p className="eyebrow">Promessa · Treino</p>
          <h1>Lance decisivo</h1>
        </header>
        <button className="btn btn-secondary btn-back" onClick={() => setScreen('tabs')}>← Voltar</button>
        <div className="card card-wide">
          <span className="card-label">Duelo de dados · melhor soma leva o gol</span>
          <DiceDuelStage
            key={diceSeed}
            seed={diceSeed}
            teamName={club.name}
            opponentName={nextOpponent?.name ?? 'Rival'}
            onResolved={() => setDiceSeed(Date.now() & 0xffffffff)}
          />
          <p className="muted table-note">
            Três dados para cada lado. Empatou, vai para a morte súbita. No fim
            do duelo, um novo lance começa sozinho.
          </p>
        </div>
        <footer className="footer">PROMESSA · em desenvolvimento</footer>
      </main>
    )
  }

  if (screen === 'gk-training') {
    return (
      <main className="shell">
        <VolumeControl volume={volume} onChange={applyVolume} onToggleMute={toggleMute} />
        <header className="header">
          <p className="eyebrow">Promessa · Treino</p>
          <h1>O Paredão</h1>
        </header>
        <button className="btn btn-secondary btn-back" onClick={() => setScreen('tabs')}>← Voltar</button>
        <ShotStage
          backgroundUrl={homeStadiumUrl}
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
        <VolumeControl volume={volume} onChange={applyVolume} onToggleMute={toggleMute} />
      <header className="tabs-head">
        <span className="tabs-brand">Promessa</span>
        <h1 className="tabs-title">{TAB_ITEMS.find((item) => item.id === tab)!.label}</h1>
      </header>

      {callUpCeremony && nationById(save.nationalityId) && (
        <CallUpIntro
          nation={nationById(save.nationalityId)!}
          playerName={save.playerName}
          competition={TOURNAMENT_NAMES[callUpCeremony]}
          portraitUrl={null}
          onDone={finishCallUp}
        />
      )}

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
          onFreeKickTraining={() => setScreen('freekick-training')}
          onDiceTraining={() => setScreen('dice-training')}
          onChoosePerk={(perkId) => save && updateSave(choosePerk(save, perkId))}
          onResolveEvent={(optionIndex) => save && updateSave(resolvePendingEvent(save, optionIndex))}
          onDismissEventNote={() => save && updateSave(dismissEventNote(save))}
        />
      )}
      {tab === 'matches' && <MatchesTab save={save} />}
      {tab === 'selecao' && save.tournament && (
        <NationalTab save={save} onSaveChange={updateSave} />
      )}
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
        {visibleTabs.map((item) => (
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
