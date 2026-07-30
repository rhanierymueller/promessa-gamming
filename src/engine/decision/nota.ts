import type { Desfecho, Faixa } from './outcomes'

/**
 * Nota por desfecho, escalada pela faixa de variância da jogada.
 *
 * Esta tabela é o que substitui a pressão do cronômetro. Sem relógio, a decisão
 * viraria planilha: o jogador calcularia o melhor saldo de gol e clicaria. O que
 * cria tensão é a nota NÃO acompanhar o placar:
 *
 *     a jogada segura ganha a partida — a jogada ousada faz a carreira
 *
 * Nota vira ponto de treino (`trainingPointsForRating`), então jogar seguro a
 * temporada inteira entrega títulos e um craque que não evolui. A pressão sai
 * do reflexo e vai para a escolha.
 *
 * A jogada de faixa baixa pontua no desfecho `nada` porque manter a posse não é
 * fracasso. Mas pontua pouco: é segura, não é construtiva.
 */
export const NOTA_POR_FAIXA: Record<Faixa, Record<Desfecho, number>> = {
  alta: { gol: 1.2, chance: 0.7, nada: -0.1, perdeu: -0.6, contra: -1 },
  media: { gol: 0.8, chance: 0.5, nada: 0, perdeu: -0.4, contra: -0.8 },
  baixa: { gol: 0.5, chance: 0.3, nada: 0.05, perdeu: -0.2, contra: -0.6 },
}

export const notaDe = (faixa: Faixa, desfecho: Desfecho): number =>
  NOTA_POR_FAIXA[faixa][desfecho]
