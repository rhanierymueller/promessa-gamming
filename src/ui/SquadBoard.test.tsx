import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { CLUBS } from '../data/clubs'
import { formationIdFor } from '../engine/squad/formation'
import { squadPlayersFor, USER_SQUAD_INDEX } from '../engine/squad/players'
import { SquadBoard } from './SquadBoard'

describe('SquadBoard — vagas abertas por venda', () => {
  test('jogador vendido some da lista sem deslocar os índices internos', () => {
    const club = CLUBS[0]
    const squad = squadPlayersFor(club)
    const soldIndex = 11

    const html = renderToStaticMarkup(
      <SquadBoard
        squad={squad}
        formation={formationIdFor(club.id)}
        lineup={Array.from({ length: 11 }, (_, index) => index)}
        userIndex={USER_SQUAD_INDEX}
        gender="masculino"
        primaryColor={club.colors.primary}
        editable
        onSelect={() => undefined}
        hiddenSquadIndices={new Set([soldIndex])}
      />,
    )

    expect(html).not.toContain(squad[soldIndex].name)
    expect(html).toContain(squad[soldIndex + 1].name)
  })
})
