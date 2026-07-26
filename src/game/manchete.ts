/**
 * Manchete do dia seguinte ao treino: a imprensa comenta o seu desempenho.
 * Cada modo tem o próprio vocabulário — quem treina falta quer ouvir falar de
 * barreira e ângulo, não de finalização.
 */

export type MancheteMode = 'finalizacao' | 'goleiro' | 'falta'

/** Faixas em ordem decrescente: a busca pega a primeira que o placar alcança. */
type MancheteFaixa = readonly [minScore: number, texto: string]

const FINALIZACAO: readonly MancheteFaixa[] = [
  [9, 'FENÔMENO! O olheiro já ligou pro seu empresário.'],
  [7, 'CRAQUE! A promessa é real, diz a mesa-redonda.'],
  [5, 'Promete, mas oscila. O debate segue quente.'],
  [3, 'A torcida pede paciência… muita paciência.'],
  [0, 'Volta pra várzea, menino.'],
]

const GOLEIRO: readonly MancheteFaixa[] = [
  [9, 'PAREDÃO! Fecharam o gol com você dentro.'],
  [7, 'Seguríssimo! A defesa dorme em paz.'],
  [5, 'Boas defesas, mas ainda sai frango no meio.'],
  [3, 'A zaga já olha torto pro gol.'],
  [0, 'Peneira. A bola passou o dia inteiro.'],
]

const FALTA: readonly MancheteFaixa[] = [
  [9, 'PÉ DE ANJO! A bola fez a curva e morreu no ângulo.'],
  [7, 'NA GAVETA! Barreira pulou, e a bola passou por cima.'],
  [5, 'Acerta o alvo, mas a barreira ainda leva metade.'],
  [3, 'A barreira agradece — muita bola no meio dela.'],
  [0, 'Nem a arquibancada alcançou. Volta pro cone.'],
]

const FAIXAS: Readonly<Record<MancheteMode, readonly MancheteFaixa[]>> = {
  finalizacao: FINALIZACAO,
  goleiro: GOLEIRO,
  falta: FALTA,
}

export const mancheteFor = (score: number, mode: MancheteMode): string => {
  const faixas = FAIXAS[mode]
  // a última faixa é o piso (0), então placar negativo também encontra texto
  return (faixas.find(([min]) => score >= min) ?? faixas[faixas.length - 1])[1]
}
