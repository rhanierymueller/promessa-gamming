import { CalendarDays, House, Shield, User, type LucideIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { clubById, type Club } from '../data/clubs'
import { nationAsClub, nationById } from '../data/nations'
import { isCallUpEligible } from '../engine/career/callup'
import { createRng } from '../engine/rng'
import { advanceSeason, isSeasonOver, playerOpponentId } from '../engine/season/season'
import {
  advanceTournament,
  createTournament,
  playerTournamentOpponentId,
  type TournamentKind,
} from '../engine/tournament/tournament'
import { initAudio } from '../game/audio'
import { MatchScreen } from '../game/MatchScreen'
import { ShotStage } from '../game/ShotStage'
import {
  applySeason,
  applyTournament,
  loadSave,
  persistSave,
  recordMatch,
  startNewSeason,
  type MatchRecord,
  type PlayerSave,
} from '../state/save'
import { CharacterCreate } from './CharacterCreate'
import { HomeTab } from './tabs/HomeTab'
import { MatchesTab } from './tabs/MatchesTab'
import { ProfileTab } from './tabs/ProfileTab'
import { TeamTab } from './tabs/TeamTab'

type Tab = 'home' | 'matches' | 'team' | 'profile'
type Screen = 'tabs' | 'match' | 'training'

interface MatchSetup {
  readonly seed: number
  readonly kind: 'liga' | 'torneio'
  readonly club: Club
  readonly opponent: Club
}

const TAB_ITEMS: readonly { id: Tab; icon: LucideIcon; label: string }[] = [
  { id: 'home', icon: House, label: 'Início' },
  { id: 'matches', icon: CalendarDays, label: 'Liga' },
  { id: 'team', icon: Shield, label: 'Time' },
  { id: 'profile', icon: User, label: 'Perfil' },
]

export const App = () => {
  const [save, setSave] = useState<PlayerSave | null>(() => loadSave(localStorage))
  const [screen, setScreen] = useState<Screen>('tabs')
  const [tab, setTab] = useState<Tab>('home')
  const [matchSetup, setMatchSetup] = useState<MatchSetup | null>(null)

  const club = useMemo(() => (save ? clubById(save.clubId) : null), [save])
  const nextOpponent = useMemo(() => {
    if (!save || isSeasonOver(save.season)) return null
    return clubById(playerOpponentId(save.season))
  }, [save])

  const updateSave = (updated: PlayerSave): void => {
    persistSave(localStorage, updated)
    setSave(updated)
  }

  const startLeagueMatch = (): void => {
    if (!save || !club || !nextOpponent) return
    initAudio()
    setMatchSetup({ seed: Date.now() & 0xffffffff, kind: 'liga', club, opponent: nextOpponent })
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
    setMatchSetup({
      seed: Date.now() & 0xffffffff,
      kind: 'torneio',
      club: nationAsClub(nation),
      opponent: nationAsClub(opponentNation),
    })
    setScreen('match')
  }

  const onMatchFinished = (record: MatchRecord): void => {
    if (save && matchSetup) {
      let updated = recordMatch(save, record)
      if (matchSetup.kind === 'liga') {
        const simulated = advanceSeason(
          updated.season,
          record.teamGoals,
          record.opponentGoals,
          createRng((matchSetup.seed ^ 0x9e3779b9) >>> 0),
        )
        updated = applySeason(updated, simulated.value)
      } else if (updated.tournament) {
        const advanced = advanceTournament(
          updated.tournament,
          record.teamGoals,
          record.opponentGoals,
          createRng((matchSetup.seed ^ 0x51ed2701) >>> 0),
        )
        updated = { ...updated, tournament: advanced.value.state }
      }
      updateSave(updated)
    }
    setMatchSetup(null)
    setScreen('tabs')
    setTab('matches')
  }

  const onNewSeason = (): void => {
    if (save) updateSave(startNewSeason(save))
    setTab('home')
  }

  const resetCareer = (): void => {
    localStorage.removeItem('promessa.save')
    setSave(null)
    setScreen('tabs')
    setTab('home')
  }

  // convocação: só a forma na LIGA desta temporada conta, e só na janela de dezembro
  const callUpAvailable = Boolean(
    save &&
      !save.tournamentPlayed &&
      isSeasonOver(save.season) &&
      isCallUpEligible(
        save.history
          .filter((record) => record.competition === 'liga')
          .slice(-save.season.currentRound)
          .map((record) => record.rating),
      ),
  )

  if (!save || !club) {
    return (
      <main className="shell">
        <header className="header">
          <p className="eyebrow">Promessa</p>
          <h1>Promessa</h1>
        </header>
        <CharacterCreate onCreated={updateSave} />
        <footer className="footer">PROMESSA · em desenvolvimento</footer>
      </main>
    )
  }

  if (screen === 'match' && matchSetup) {
    return (
      <main className="shell">
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
          onExit={onMatchFinished}
        />
        <footer className="footer">PROMESSA · em desenvolvimento</footer>
      </main>
    )
  }

  if (screen === 'training') {
    return (
      <main className="shell">
        <header className="header">
          <p className="eyebrow">Promessa · Treino</p>
          <h1>O Chute</h1>
        </header>
        <ShotStage />
        <button className="btn btn-secondary" onClick={() => setScreen('tabs')}>← Voltar</button>
        <footer className="footer">PROMESSA · em desenvolvimento</footer>
      </main>
    )
  }

  return (
    <main className="shell shell-tabs">
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
          onNewSeason={onNewSeason}
          onTraining={() => setScreen('training')}
        />
      )}
      {tab === 'matches' && <MatchesTab save={save} />}
      {tab === 'team' && <TeamTab save={save} club={club} />}
      {tab === 'profile' && (
        <ProfileTab save={save} club={club} onSaveChange={updateSave} onResetCareer={resetCareer} />
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
