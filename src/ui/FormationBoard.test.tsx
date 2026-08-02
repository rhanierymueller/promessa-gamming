import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test, vi } from 'vitest'
import { FORMATIONS } from '../engine/squad/formation'
import { USER_PLAYER_ID, type SquadPlayer } from '../engine/squad/players'
import { FormationBoard } from './FormationBoard'

const player = (id: string, name: string, position: SquadPlayer['position']): SquadPlayer => ({
  id,
  name,
  position,
  altPositions: [],
  age: 24,
  peakAge: 27,
  potential: 'medio',
  shirt: 1,
  attrs: { pac: 76, fin: 68, pas: 71, dri: 73, def: 74, fis: 72 },
  overall: 73,
})

describe('FormationBoard', () => {
  test('mostra o rosto do elenco e preserva o overall como selo', () => {
    const players: (SquadPlayer | undefined)[] = Array(11).fill(undefined)
    players[0] = player('clube-goleiro-1', 'Douglas Xavier', 'GOL')

    const markup = renderToStaticMarkup(
      <FormationBoard
        formation={FORMATIONS['4-3-3']}
        players={players}
        userSlot={-1}
        gender="masculino"
        primaryColor="#2365a0"
        onSelect={vi.fn()}
      />,
    )

    expect(markup).toContain('class="board-player-face"')
    expect(markup).toContain('class="board-player-token"')
    expect(markup).toContain('class="board-player-overall"')
    expect(markup).toContain('overall 73')
    expect(markup).toContain('tabindex="0"')
  })

  test('usa o retrato personalizado e o destaque do craque', () => {
    const players: (SquadPlayer | undefined)[] = Array(11).fill(undefined)
    players[9] = player(USER_PLAYER_ID, 'Rhaniery Mueller', 'ATA')
    const portrait = 'data:image/png;base64,dGVzdGU='

    const markup = renderToStaticMarkup(
      <FormationBoard
        formation={FORMATIONS['4-3-3']}
        players={players}
        userSlot={9}
        gender="masculino"
        userFaceUrl={portrait}
        primaryColor="#2365a0"
        onSelect={vi.fn()}
      />,
    )

    expect(markup).toContain(portrait)
    expect(markup).toContain('board-player-user')
    expect(markup).toContain('board-player-face-user')
  })
})
