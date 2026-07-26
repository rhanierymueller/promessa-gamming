import type { Formation } from './formation'
import { overallAt, type SquadPlayer } from './players'

/**
 * A escalação que o técnico da IA colocaria em campo.
 *
 * Antes o time entrava com os 11 primeiros do elenco, na ordem em que foram
 * gerados — e sobrava craque no banco enquanto um reserva pior era titular.
 * Um clube pode ter elenco bom ou ruim, mas nenhum técnico deixa o melhor
 * volante de fora por descuido.
 *
 * O critério é o overall EFETIVO na vaga (overallAt), que já penaliza quem
 * joga fora de posição — assim um zagueiro de 85 não vira ponta só por ter
 * número alto.
 */

interface Candidate {
  readonly slot: number
  readonly player: number
  readonly value: number
}

export const bestLineup = (
  squad: readonly SquadPlayer[],
  formation: Formation,
): readonly number[] => {
  const slots = formation.slots
  const candidates: Candidate[] = []
  slots.forEach((position, slot) => {
    squad.forEach((player, index) => {
      candidates.push({ slot, player: index, value: overallAt(player, position) })
    })
  })

  /*
   * Guloso pelo melhor par (vaga, jogador) disponível. Não garante o ótimo
   * absoluto, mas resolve o caso que importa — craque no banco — sem o custo
   * de um algoritmo de atribuição completo rodando a cada render.
   * O desempate por índice mantém o resultado determinístico.
   */
  candidates.sort((a, b) => b.value - a.value || a.slot - b.slot || a.player - b.player)

  const lineup = new Array<number>(slots.length).fill(-1)
  const used = new Set<number>()
  for (const { slot, player } of candidates) {
    if (lineup[slot] >= 0 || used.has(player)) continue
    lineup[slot] = player
    used.add(player)
    if (used.size === slots.length) break
  }

  // elenco menor que a formação: completa com quem sobrou, sem repetir
  let next = 0
  for (let slot = 0; slot < lineup.length; slot++) {
    while (lineup[slot] < 0 && next < squad.length) {
      if (!used.has(next)) {
        lineup[slot] = next
        used.add(next)
      }
      next++
    }
  }
  return lineup
}
