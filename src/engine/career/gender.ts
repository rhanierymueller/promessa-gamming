import type { PlayerGender } from '../../state/save'

/**
 * Concordância dos textos com o gênero do atleta. Narração, notícias, olheiro
 * e falas de vestiário são escritos com marcadores ({ele}, {o}, {jogador}…) e
 * a substituição acontece na hora de montar a frase — assim o texto sai certo
 * numa carreira feminina sem precisar de dois catálogos de frases.
 */

export interface GenderWords {
  readonly ele: string
  readonly dele: string
  readonly nele: string
  /** Artigo definido: "o craque" / "a craque". */
  readonly o: string
  /** Contração com "de": do / da. */
  readonly do: string
  readonly jogador: string
  readonly artilheiro: string
  readonly cara: string
  readonly dono: string
  readonly garoto: string
  readonly herdeiro: string
}

const MASCULINO: GenderWords = {
  ele: 'ele',
  dele: 'dele',
  nele: 'nele',
  o: 'o',
  do: 'do',
  jogador: 'jogador',
  artilheiro: 'artilheiro',
  cara: 'cara',
  dono: 'dono',
  garoto: 'garoto',
  herdeiro: 'herdeiro',
}

const FEMININO: GenderWords = {
  ele: 'ela',
  dele: 'dela',
  nele: 'nela',
  o: 'a',
  do: 'da',
  jogador: 'jogadora',
  artilheiro: 'artilheira',
  cara: 'craque',
  dono: 'dona',
  garoto: 'garota',
  herdeiro: 'herdeira',
}

export const wordsFor = (gender: PlayerGender): GenderWords =>
  gender === 'feminino' ? FEMININO : MASCULINO

/** Troca os marcadores de gênero de um texto já montado. */
export const applyGender = (text: string, gender: PlayerGender): string => {
  const words = wordsFor(gender)
  let out = text
  for (const [key, value] of Object.entries(words)) {
    out = out.replaceAll(`{${key}}`, value)
    // versão capitalizada: {Ele} no começo da frase
    const capKey = key.charAt(0).toUpperCase() + key.slice(1)
    out = out.replaceAll(`{${capKey}}`, value.charAt(0).toUpperCase() + value.slice(1))
  }
  return out
}
