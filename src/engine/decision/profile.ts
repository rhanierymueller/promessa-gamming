import type { Jogada } from './catalog'

/**
 * Como um jogador NÃO humano escolhe no menu de decisão.
 *
 * Serve a dois usos que precisam concordar: o "Simular até o fim" (o técnico
 * decide por você) e a sonda de calibragem, que mede o placar contra os três
 * jeitos plausíveis de jogar. Sem isso, a simulação resolveria a decisão por
 * uma moeda binária enquanto o jogo manual usa cinco desfechos — e simular ou
 * jogar daria placares de mundos diferentes.
 */
export type Perfil = 'cauteloso' | 'equilibrado' | 'ousado'

export const PERFIS: readonly Perfil[] = ['cauteloso', 'equilibrado', 'ousado']

/**
 * O menu chega ordenado do lance mais decisivo para o mais conservador
 * (`sortearJogadas`), então o perfil é uma posição nessa lista.
 */
export const escolhaDoPerfil = (opcoes: readonly Jogada[], perfil: Perfil): Jogada => {
  if (opcoes.length === 0) throw new Error('menu de decisão vazio')
  if (perfil === 'ousado') return opcoes[0]
  if (perfil === 'cauteloso') return opcoes[opcoes.length - 1]
  return opcoes[Math.floor(opcoes.length / 2)]
}
