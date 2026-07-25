import { describe, expect, test } from 'vitest'
import { CLUBS } from '../../data/clubs'
import { FORMATIONS, FORMATION_IDS, formationIdFor } from './formation'
import { squadPlayersFor } from './players'

describe('formationIdFor', () => {
  test('o mesmo clube joga sempre na mesma formação', () => {
    // Arrange
    const clubId = 'leoes-capital'

    // Act + Assert: entrar no elenco duas vezes não muda o esquema
    expect(formationIdFor(clubId)).toBe(formationIdFor(clubId))
  })

  test('devolve sempre uma formação existente', () => {
    for (const club of CLUBS) {
      expect(FORMATION_IDS).toContain(formationIdFor(club.id))
    }
  })

  test('a liga NÃO joga tudo no mesmo esquema', () => {
    // Act
    const used = new Set(CLUBS.map((club) => formationIdFor(club.id)))

    // Assert: as três formações aparecem entre os clubes
    expect(used.size).toBe(FORMATION_IDS.length)
  })

  test('nenhuma formação domina a liga inteira', () => {
    // Arrange
    const counts = new Map<string, number>()
    for (const club of CLUBS) {
      const id = formationIdFor(club.id)
      counts.set(id, (counts.get(id) ?? 0) + 1)
    }

    // Assert: a mais comum fica abaixo de 60% dos clubes
    const most = Math.max(...counts.values())
    expect(most).toBeLessThan(CLUBS.length * 0.6)
  })
})

describe('elenco montado para a formação do clube', () => {
  test('os 11 titulares nascem nas posições do esquema do clube', () => {
    for (const club of CLUBS.slice(0, 8)) {
      // Act
      const squad = squadPlayersFor(club)
      const slots = FORMATIONS[formationIdFor(club.id)].slots

      // Assert
      for (let i = 0; i < slots.length; i++) {
        expect(squad[i].position).toBe(slots[i])
      }
    }
  })

  test('todo clube tem exatamente um goleiro titular, no slot 0', () => {
    for (const club of CLUBS) {
      const squad = squadPlayersFor(club)
      const starters = squad.slice(0, 11)
      expect(starters[0].position).toBe('GOL')
      expect(starters.filter((player) => player.position === 'GOL')).toHaveLength(1)
    }
  })

  test('o slot do craque continua sendo de linha em qualquer esquema', () => {
    // O índice 9 é onde o SEU craque entra: não pode virar goleiro nunca.
    for (const id of FORMATION_IDS) {
      expect(FORMATIONS[id].slots[9]).not.toBe('GOL')
    }
  })
})
