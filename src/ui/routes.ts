export type Tab =
  | 'home'
  | 'calendar'
  | 'matches'
  | 'selecao'
  | 'libertados'
  | 'player'
  | 'team'
  | 'editor'
  | 'market'
  | 'profile'

export type Screen =
  | 'tabs'
  | 'match'
  | 'training'
  | 'gk-training'
  | 'freekick-training'
  | 'dice-training'

export type Gate = 'landing' | 'auth' | 'signup' | 'game' | 'recovery'

export interface NavigationState {
  readonly gate: Gate
  readonly screen: Screen
  readonly tab: Tab
}

const TAB_PATHS: Readonly<Record<Tab, string>> = {
  home: '/inicio',
  calendar: '/calendario',
  matches: '/liga',
  selecao: '/selecao',
  libertados: '/libertadores',
  player: '/meu-jogador',
  team: '/time',
  editor: '/editor',
  market: '/mercado',
  profile: '/perfil',
}

const SCREEN_PATHS: Readonly<Record<Exclude<Screen, 'tabs'>, string>> = {
  match: '/jogo',
  training: '/treino/chute',
  'gk-training': '/treino/goleiro',
  'freekick-training': '/treino/falta',
  'dice-training': '/treino/dados',
}

const DEFAULT_NAVIGATION: NavigationState = { gate: 'landing', screen: 'tabs', tab: 'home' }

const normalizedPath = (pathname: string): string => {
  const withoutTrailingSlash = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return withoutTrailingSlash.toLocaleLowerCase('pt-BR') || '/'
}

/** Converte uma URL acessada diretamente no estado de navegação do jogo. */
export const navigationForPath = (pathname: string): NavigationState => {
  const path = normalizedPath(pathname)
  if (path === '/') return DEFAULT_NAVIGATION
  if (path === '/entrar' || path === '/login') {
    return { ...DEFAULT_NAVIGATION, gate: 'auth' }
  }
  if (path === '/cadastro') return { ...DEFAULT_NAVIGATION, gate: 'signup' }
  if (path === '/recuperar-senha') return { ...DEFAULT_NAVIGATION, gate: 'recovery' }

  const tab = (Object.entries(TAB_PATHS) as [Tab, string][])
    .find(([, candidate]) => candidate === path)?.[0]
    ?? (path === '/libertados' ? 'libertados' : undefined)
  if (tab) return { gate: 'game', screen: 'tabs', tab }

  const screen = (Object.entries(SCREEN_PATHS) as [Exclude<Screen, 'tabs'>, string][])
    .find(([, candidate]) => candidate === path)?.[0]
  if (screen) return { gate: 'game', screen, tab: 'home' }

  return DEFAULT_NAVIGATION
}

/** URL canônica do estado que está realmente renderizado. */
export const pathForNavigation = ({ gate, screen, tab }: NavigationState): string => {
  if (gate === 'landing') return '/'
  if (gate === 'auth') return '/entrar'
  if (gate === 'signup') return '/cadastro'
  if (gate === 'recovery') return '/recuperar-senha'
  if (screen !== 'tabs') return SCREEN_PATHS[screen]
  return TAB_PATHS[tab]
}

export const pathForTab = (tab: Tab): string => TAB_PATHS[tab]

export const titleForNavigation = (navigation: NavigationState): string => {
  const path = pathForNavigation(navigation)
  const titleByPath: Readonly<Record<string, string>> = {
    '/': 'Promessa',
    '/entrar': 'Entrar · Promessa',
    '/cadastro': 'Criar carreira · Promessa',
    '/recuperar-senha': 'Recuperar senha · Promessa',
    '/inicio': 'Início · Promessa',
    '/calendario': 'Calendário · Promessa',
    '/liga': 'Liga · Promessa',
    '/selecao': 'Seleção · Promessa',
    '/libertadores': 'Libertadores · Promessa',
    '/meu-jogador': 'Meu jogador · Promessa',
    '/time': 'Time · Promessa',
    '/editor': 'Editor de clubes · Promessa',
    '/mercado': 'Mercado · Promessa',
    '/perfil': 'Perfil · Promessa',
    '/jogo': 'Dia de jogo · Promessa',
    '/treino/chute': 'Treino de chute · Promessa',
    '/treino/goleiro': 'Treino de goleiro · Promessa',
    '/treino/falta': 'Treino de falta · Promessa',
    '/treino/dados': 'Treino de dados · Promessa',
  }
  return titleByPath[path] ?? 'Promessa'
}
