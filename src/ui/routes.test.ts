import { describe, expect, test } from 'vitest'
import { navigationForPath, pathForNavigation, pathForTab } from './routes'

describe('rotas da aplicação', () => {
  test.each([
    ['/inicio', 'home'],
    ['/calendario', 'calendar'],
    ['/liga', 'matches'],
    ['/selecao', 'selecao'],
    ['/libertadores', 'libertados'],
    ['/time', 'team'],
    ['/mercado', 'market'],
    ['/perfil', 'profile'],
  ] as const)('%s abre a aba %s', (path, tab) => {
    expect(navigationForPath(path)).toEqual({ gate: 'game', screen: 'tabs', tab })
    expect(pathForTab(tab)).toBe(path)
  })

  test.each([
    ['/treino/chute', 'training'],
    ['/treino/goleiro', 'gk-training'],
    ['/treino/falta', 'freekick-training'],
    ['/treino/dados', 'dice-training'],
    ['/jogo', 'match'],
  ] as const)('%s abre a tela %s', (path, screen) => {
    expect(navigationForPath(path)).toEqual({ gate: 'game', screen, tab: 'home' })
  })

  test('normaliza maiúsculas, barra final e o alias antigo da Libertadores', () => {
    expect(navigationForPath('/Inicio/').tab).toBe('home')
    expect(navigationForPath('/libertados').tab).toBe('libertados')
  })

  test('rotas públicas e caminho desconhecido têm fallback seguro', () => {
    expect(navigationForPath('/').gate).toBe('landing')
    expect(navigationForPath('/entrar').gate).toBe('auth')
    expect(navigationForPath('/cadastro').gate).toBe('signup')
    expect(navigationForPath('/recuperar-senha').gate).toBe('recovery')
    expect(navigationForPath('/nao-existe')).toEqual({ gate: 'landing', screen: 'tabs', tab: 'home' })
  })

  test('estado volta para a URL canônica', () => {
    expect(pathForNavigation({ gate: 'game', screen: 'tabs', tab: 'matches' })).toBe('/liga')
    expect(pathForNavigation({ gate: 'game', screen: 'training', tab: 'home' })).toBe('/treino/chute')
  })
})
