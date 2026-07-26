import { describe, expect, test } from 'vitest'
import {
  EMPTY_REVEAL,
  hiddenGoals,
  queueGoal,
  revealAll,
  revealUpTo,
  visibleScore,
} from './goalReveal'
import type { LogLine } from './logLine'

const line = (text: string): LogLine => ({ minute: 12, text, tone: 'bad' })

describe('visibleScore', () => {
  test('mostra o placar da engine quando nada está pendente', () => {
    // Arrange
    const score = { team: 2, opponent: 1 }

    // Act
    const shown = visibleScore(score, EMPTY_REVEAL)

    // Assert
    expect(shown).toEqual({ team: 2, opponent: 1 })
  })

  test('esconde do jogador o gol que ainda não entrou em campo', () => {
    // Arrange: a engine já somou 2×2, mas a bola ainda está a caminho da rede
    const state = queueGoal(EMPTY_REVEAL, { directiveId: 7, side: 'opponent', line: line('gol deles') })

    // Act
    const shown = visibleScore({ team: 2, opponent: 2 }, state)

    // Assert
    expect(shown).toEqual({ team: 2, opponent: 1 })
  })

  test('esconde gols dos dois lados simultaneamente', () => {
    // Arrange
    const state = queueGoal(
      queueGoal(EMPTY_REVEAL, { directiveId: 1, side: 'team', line: line('nosso') }),
      { directiveId: 2, side: 'opponent', line: line('deles') },
    )

    // Act
    const shown = visibleScore({ team: 3, opponent: 1 }, state)

    // Assert
    expect(shown).toEqual({ team: 2, opponent: 0 })
  })

  test('nunca exibe placar negativo mesmo com estado inconsistente', () => {
    // Arrange: mais pendências do que gols na engine (não deve acontecer, mas não pode quebrar a tela)
    const state = queueGoal(EMPTY_REVEAL, { directiveId: 1, side: 'team', line: line('nosso') })

    // Act
    const shown = visibleScore({ team: 0, opponent: 0 }, state)

    // Assert
    expect(shown).toEqual({ team: 0, opponent: 0 })
  })
})

describe('hiddenGoals', () => {
  test('conta por lado quantos gols a engine somou e o campo ainda não mostrou', () => {
    // Arrange
    const state = queueGoal(
      queueGoal(EMPTY_REVEAL, { directiveId: 1, side: 'opponent', line: line('a') }),
      { directiveId: 2, side: 'opponent', line: line('b') },
    )

    // Act
    const hidden = hiddenGoals(state)

    // Assert
    expect(hidden).toEqual({ team: 0, opponent: 2 })
  })
})

describe('revealUpTo', () => {
  test('revela o gol da diretiva concluída e devolve sua narração', () => {
    // Arrange
    const state = queueGoal(EMPTY_REVEAL, { directiveId: 7, side: 'opponent', line: line('gol deles') })

    // Act
    const reveal = revealUpTo(state, 7)

    // Assert
    expect(reveal.lines.map((l) => l.text)).toEqual(['gol deles'])
    expect(visibleScore({ team: 2, opponent: 2 }, reveal.state)).toEqual({ team: 2, opponent: 2 })
  })

  test('revela também os gols anteriores, cujas diretivas foram substituídas em campo', () => {
    // Arrange: a diretiva 1 nunca vai reportar conclusão — foi trocada pela 2
    const state = queueGoal(
      queueGoal(EMPTY_REVEAL, { directiveId: 1, side: 'team', line: line('antigo') }),
      { directiveId: 2, side: 'opponent', line: line('novo') },
    )

    // Act
    const reveal = revealUpTo(state, 2)

    // Assert
    expect(reveal.lines.map((l) => l.text)).toEqual(['antigo', 'novo'])
    expect(reveal.state.pending).toEqual([])
  })

  test('não revela gols posteriores ao id concluído', () => {
    // Arrange
    const state = queueGoal(
      queueGoal(EMPTY_REVEAL, { directiveId: 1, side: 'team', line: line('antigo') }),
      { directiveId: 5, side: 'opponent', line: line('ainda a caminho') },
    )

    // Act
    const reveal = revealUpTo(state, 1)

    // Assert
    expect(reveal.lines.map((l) => l.text)).toEqual(['antigo'])
    expect(reveal.state.pending.map((p) => p.directiveId)).toEqual([5])
  })

  test('id desconhecido de uma diretiva que não é gol não revela nada', () => {
    // Arrange: a diretiva 3 é uma entrega, e o gol pendente é o 5
    const state = queueGoal(EMPTY_REVEAL, { directiveId: 5, side: 'team', line: line('pendente') })

    // Act
    const reveal = revealUpTo(state, 3)

    // Assert
    expect(reveal.lines).toEqual([])
    expect(reveal.state.pending.map((p) => p.directiveId)).toEqual([5])
  })

  test('não muta o estado original', () => {
    // Arrange
    const state = queueGoal(EMPTY_REVEAL, { directiveId: 1, side: 'team', line: line('nosso') })

    // Act
    revealUpTo(state, 1)

    // Assert
    expect(state.pending).toHaveLength(1)
  })
})

describe('revealAll', () => {
  test('desiste da espera e revela tudo na ordem em que foi enfileirado', () => {
    // Arrange
    const state = queueGoal(
      queueGoal(EMPTY_REVEAL, { directiveId: 1, side: 'team', line: line('primeiro') }),
      { directiveId: 2, side: 'opponent', line: line('segundo') },
    )

    // Act
    const reveal = revealAll(state)

    // Assert
    expect(reveal.lines.map((l) => l.text)).toEqual(['primeiro', 'segundo'])
    expect(reveal.state).toEqual(EMPTY_REVEAL)
  })

  test('é inócuo quando não há nada pendente', () => {
    // Act
    const reveal = revealAll(EMPTY_REVEAL)

    // Assert
    expect(reveal.lines).toEqual([])
    expect(reveal.state).toEqual(EMPTY_REVEAL)
  })
})
