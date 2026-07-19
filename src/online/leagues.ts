import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { MatchRecord, PlayerSave } from '../state/save'
import { clubDisplayName } from '../state/save'
import { normalizeLeagueCode, weeklyPointsFor } from './points'

/**
 * Ligas entre amigos (Supabase): identidade anônima por dispositivo, liga por
 * código de convite, ranking semanal. Sem as variáveis de ambiente o módulo
 * fica inerte e o jogo segue 100% offline.
 */

export interface FriendLeague {
  readonly id: string
  readonly code: string
  readonly name: string
}

export interface RankingRow {
  readonly playerId: string
  readonly name: string
  readonly clubName: string
  readonly points: number
  readonly matches: number
  readonly isMe: boolean
}

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

const client: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null

export const isOnlineAvailable = (): boolean => client !== null

/** Client compartilhado com os outros módulos online (conta, etc.). */
export const getClient = (): SupabaseClient | null => client

/** Garante sessão anônima e perfil atualizado; retorna o id do jogador. */
const ensureSession = async (save: PlayerSave): Promise<string> => {
  if (!client) throw new Error('online indisponível')
  const { data: sessionData } = await client.auth.getSession()
  let userId = sessionData.session?.user.id
  if (!userId) {
    const { data, error } = await client.auth.signInAnonymously()
    if (error || !data.user) throw new Error(`login anônimo falhou: ${error?.message}`)
    userId = data.user.id
  }
  const { error: profileError } = await client.from('profiles').upsert({
    id: userId,
    name: save.playerName,
    club_name: clubDisplayName(save, save.clubId),
  })
  if (profileError) throw new Error(`perfil: ${profileError.message}`)
  return userId
}

export const createFriendLeague = async (save: PlayerSave, name: string): Promise<FriendLeague> => {
  if (!client) throw new Error('online indisponível')
  await ensureSession(save)
  const { data, error } = await client.rpc('create_league', { p_name: name.trim() })
  if (error) throw new Error(error.message)
  return { id: data.id, code: data.code, name: data.name }
}

export const joinFriendLeague = async (save: PlayerSave, code: string): Promise<FriendLeague> => {
  if (!client) throw new Error('online indisponível')
  await ensureSession(save)
  const { data, error } = await client.rpc('join_league', { p_code: normalizeLeagueCode(code) })
  if (error) throw new Error(error.message)
  return { id: data.id, code: data.code, name: data.name }
}

export const myLeagues = async (save: PlayerSave): Promise<readonly FriendLeague[]> => {
  if (!client) return []
  await ensureSession(save)
  const { data, error } = await client.from('leagues').select('id, code, name')
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => ({ id: row.id, code: row.code, name: row.name }))
}

/** Ranking da SEMANA corrente de uma liga (membros + pontos). */
export const leagueWeeklyRanking = async (
  save: PlayerSave,
  leagueId: string,
): Promise<readonly RankingRow[]> => {
  if (!client) return []
  const myId = await ensureSession(save)

  const { data: members, error: membersError } = await client
    .from('league_members')
    .select('player_id, profiles(name, club_name)')
    .eq('league_id', leagueId)
  if (membersError) throw new Error(membersError.message)

  const { data: week } = await client.rpc('current_week')
  const ids = (members ?? []).map((m) => m.player_id)
  const { data: scores, error: scoresError } = await client
    .from('weekly_scores')
    .select('player_id, points, matches')
    .eq('week', week as string)
    .in('player_id', ids)
  if (scoresError) throw new Error(scoresError.message)

  const scoreById = new Map((scores ?? []).map((s) => [s.player_id, s]))
  return (members ?? [])
    .map((member) => {
      const profile = member.profiles as unknown as { name: string; club_name: string } | null
      const score = scoreById.get(member.player_id)
      return {
        playerId: member.player_id,
        name: profile?.name ?? '???',
        clubName: profile?.club_name ?? '',
        points: score?.points ?? 0,
        matches: score?.matches ?? 0,
        isMe: member.player_id === myId,
      }
    })
    .sort((a, b) => b.points - a.points || b.matches - a.matches || a.name.localeCompare(b.name))
}

/** Envia os pontos da partida de liga para o ranking (silencioso se offline). */
export const submitLeagueMatch = async (save: PlayerSave, record: MatchRecord): Promise<void> => {
  if (!client || record.competition !== 'liga') return
  await ensureSession(save)
  const { error } = await client.rpc('add_weekly_points', {
    p_points: weeklyPointsFor(record),
    p_matches: 1,
  })
  if (error) throw new Error(error.message)
}
