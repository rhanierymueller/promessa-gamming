/**
 * Quem é goleiro no campo ao vivo. Os 22 jogadores ficam num vetor único:
 * 0-10 é o time da casa e 11-21 o visitante, com o goleiro abrindo cada
 * bloco (slot GOL das formações).
 *
 * Existe como módulo próprio porque a regra vivia espalhada em índices soltos
 * no meio do loop de animação — e onde ela faltou, o goleiro conduzia a bola
 * para fora do gol e não voltava mais.
 */

export const SIDE_SIZE = 11
export const PITCH_SIZE = SIDE_SIZE * 2

export const KEEPER_INDEXES: readonly number[] = [0, SIDE_SIZE]

export const isKeeperIndex = (index: number): boolean => KEEPER_INDEXES.includes(index)

/** Goleiro não é opção de passe: a bola sai jogada, não recuada. */
export const canReceivePass = (index: number): boolean => !isKeeperIndex(index)

/**
 * Goleiro não conduz. A condução desloca a posição de referência do jogador,
 * e para o goleiro isso significava abandonar a meta de vez.
 */
export const canDribble = (index: number): boolean => !isKeeperIndex(index)
