import { describe, expect, test } from 'vitest'
import { beginRound, createDefenseStage, steerDefenseByKeys, tick } from './stage'

/** Reproduz o loop do ShotStage: teclado antes do tick, 60fps. */
const jogarDefesa = (teclas: { left?: boolean; right?: boolean; high?: boolean }, quadros = 200) => {
  let s = beginRound(createDefenseStage(42, 0.5))
  let ativo = false
  const trilha: number[] = []
  for (let i = 0; i < quadros; i++) {
    if (s.phase === 'flying') {
      const { left = false, right = false, high = false } = teclas
      const pressed = left || right || high
      if (pressed || ativo) {
        const dir = left === right ? 0 : right ? 1 : -1
        s = steerDefenseByKeys(s, dir, high)
        ativo = pressed
      }
      trilha.push(s.keeperX)
    }
    const [next] = tick(s, 1 / 60)
    s = next
    if (s.phase === 'result' || s.phase === 'end') break
  }
  return { estado: s, trilha }
}

describe('defesa pelo teclado — loop completo', () => {
  test('segurando D o goleiro realmente se desloca para a direita', () => {
    const { trilha } = jogarDefesa({ right: true })
    expect(trilha.length).toBeGreaterThan(5)
    expect(trilha[trilha.length - 1]).toBeGreaterThan(10)
  })

  test('segurando A ele vai para a esquerda', () => {
    const { trilha } = jogarDefesa({ left: true })
    expect(trilha[trilha.length - 1]).toBeLessThan(-10)
  })

  test('sem tecla nenhuma ele fica parado no centro', () => {
    const { trilha } = jogarDefesa({})
    expect(Math.abs(trilha[trilha.length - 1])).toBeLessThan(1)
  })

  test('D + espaço marca alto E move para a direita', () => {
    const { estado, trilha } = jogarDefesa({ right: true, high: true })
    expect(estado.diveHigh).toBe(true)
    expect(trilha[trilha.length - 1]).toBeGreaterThan(10)
  })

  test('o lance chega ao fim e vira defesa ou gol (não trava)', () => {
    const { estado } = jogarDefesa({ right: true })
    expect(['result', 'end']).toContain(estado.phase)
    expect(estado.results.length).toBeGreaterThan(0)
  })
})

describe('pré-posicionamento e poses', () => {
  test('dá para posicionar o goleiro ANTES da bola sair (durante a corrida)', () => {
    // Arrange: estado logo após o briefing, ainda em ready/runup
    let s = beginRound(createDefenseStage(42, 0.5))
    let mexeuNaCorrida = false

    // Act: segura D desde o primeiro quadro
    for (let i = 0; i < 200; i++) {
      if (s.phase === 'runup') {
        s = steerDefenseByKeys(s, 1, false)
        const [next] = tick(s, 1 / 60)
        if (next.keeperX > s.keeperX) mexeuNaCorrida = true
        s = next
        continue
      }
      const [next] = tick(s, 1 / 60)
      s = next
      if (s.phase === 'flying') break
    }

    // Assert: quando a bola sai, ele JÁ está deslocado
    expect(mexeuNaCorrida).toBe(true)
    expect(s.keeperX).toBeGreaterThan(0)
  })

  test('quem se posiciona na corrida começa o voo na frente', () => {
    // Arrange: dois cenários — posiciona na corrida vs só reage no voo
    // posição NO INSTANTE em que a bola sai — é aí que a vantagem aparece
    const noChute = (comandarNaCorrida: boolean): number => {
      let s = beginRound(createDefenseStage(42, 0.5))
      for (let i = 0; i < 300; i++) {
        if (comandarNaCorrida && s.phase === 'runup') s = steerDefenseByKeys(s, 1, false)
        const [n] = tick(s, 1 / 60)
        s = n
        if (s.phase === 'flying') return s.keeperX
      }
      return s.keeperX
    }

    // Assert
    expect(noChute(true)).toBeGreaterThan(5)
    expect(noChute(false)).toBe(0)
  })
})

describe('quem controla o goleiro em cada modo', () => {
  test('sendo o goleiro, ele NÃO anda sozinho — fica onde você deixou', () => {
    // Arrange: nenhum comando, do início ao fim do lance
    let s = beginRound(createDefenseStage(42, 0.5))
    const posicoes: number[] = []

    // Act
    for (let i = 0; i < 200; i++) {
      posicoes.push(s.keeperX)
      const [next] = tick(s, 1 / 60)
      s = next
      if (s.phase === 'result' || s.phase === 'end') break
    }

    // Assert: parado no centro o tempo todo (o passinho é só do modo batedor)
    expect(Math.max(...posicoes.map(Math.abs))).toBe(0)
  })

  test('dá para posicionar já no "prepara", antes do rival correr', () => {
    // Arrange
    let s = beginRound(createDefenseStage(42, 0.5))
    expect(s.phase).toBe('ready')

    // Act: segura D durante a fase de preparação
    for (let i = 0; i < 30 && s.phase === 'ready'; i++) {
      s = steerDefenseByKeys(s, 1, false)
      const [next] = tick(s, 1 / 60)
      s = next
    }

    // Assert
    expect(s.keeperX).toBeGreaterThan(0)
  })
})

describe('ritmo do lance de defesa', () => {
  test('a bola fica no ar tempo suficiente para o lance ser legível', () => {
    // Arrange
    let s = beginRound(createDefenseStage(7, 0.5))
    for (let i = 0; i < 400 && s.phase !== 'flying'; i++) {
      const [n] = tick(s, 1 / 60)
      s = n
    }

    // Assert: entre meio segundo e um segundo — nem instantâneo, nem lento
    expect(s.sim!.flight.duration).toBeGreaterThan(0.7)
    expect(s.sim!.flight.duration).toBeLessThan(1)
  })

  test('o resultado dura o bastante para cair, levantar e reagir', () => {
    // Arrange: mergulha para o lado errado, garantindo o gol
    let s = beginRound(createDefenseStage(7, 0.5))
    for (let i = 0; i < 400; i++) {
      if (s.phase === 'flying') s = steerDefenseByKeys(s, -1, true)
      const [n] = tick(s, 1 / 60)
      s = n
      if (s.phase === 'result') break
    }

    // Act: mede quanto tempo o resultado permanece na tela
    let duracao = 0
    for (let i = 0; i < 300 && s.phase === 'result'; i++) {
      duracao = s.resultTimer
      const [n] = tick(s, 1 / 60)
      s = n
    }

    // Assert: cabe deitado (0,5s) + levantando (0,4s) com folga
    expect(duracao).toBeGreaterThan(0.9)
  })

  test('o mergulho completa o arco dentro do voo da bola', () => {
    // Arrange
    let s = beginRound(createDefenseStage(7, 0.5))
    let progressoNoFim = 0
    for (let i = 0; i < 400; i++) {
      if (s.phase === 'flying') s = steerDefenseByKeys(s, 1, true)
      const [n] = tick(s, 1 / 60)
      if (s.phase === 'flying' && n.phase === 'result') progressoNoFim = s.keeperDiveP
      s = n
      if (s.phase === 'result') break
    }

    // Assert: chegou ao chão antes do apito (arco fechado)
    expect(progressoNoFim).toBeGreaterThan(0.9)
  })
})
