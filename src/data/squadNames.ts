import { NATIONAL_NAMES } from './nationalNames'
import type { PlayerGender } from '../state/save'
/**
 * Elencos com nomes realistas — determinísticos por semente (mesmo clube +
 * mesma partida = mesmos nomes). Mistura "Nome Sobrenome" com apelidos de
 * boleiro clássicos, como em qualquer elenco brasileiro de verdade.
 */
export const FIRST_NAMES: readonly string[] = [
  'Rafael', 'Diego', 'Matheus', 'Lucas', 'Gabriel', 'Vitor', 'Caio', 'Thiago',
  'Bruno', 'Felipe', 'André', 'Éverton', 'Wesley', 'Renan', 'Igor', 'Jean',
  'Douglas', 'Alan', 'Márcio', 'Paulo', 'Pedro', 'João', 'Luiz', 'Carlos',
  'Rodrigo', 'Fábio', 'Léo', 'Davi', 'Samuel', 'Yuri', 'Nathan', 'Otávio',
  'Henrique', 'Vinícius', 'Emerson', 'Robson', 'Wallace', 'Jonas', 'Maicon',
  'Édson', 'Nilton', 'Valdir', 'Gilmar', 'Adriano',
]

/** Mesma quantidade da lista masculina — o mundo feminino tem o mesmo leque. */
export const FIRST_NAMES_F: readonly string[] = [
  'Ana', 'Bruna', 'Camila', 'Daniela', 'Fernanda', 'Gabriela', 'Helena', 'Isabela',
  'Juliana', 'Larissa', 'Mariana', 'Natália', 'Patrícia', 'Rafaela', 'Sabrina', 'Tainá',
  'Vitória', 'Yasmin', 'Amanda', 'Beatriz', 'Carolina', 'Débora', 'Eduarda', 'Flávia',
  'Giovana', 'Ingrid', 'Jéssica', 'Késia', 'Letícia', 'Michele', 'Nayara', 'Priscila',
  'Renata', 'Simone', 'Tatiane', 'Vanessa', 'Aline', 'Bianca', 'Cristiane', 'Denise',
  'Elaine', 'Franciele', 'Geísa', 'Luana',
]

const NICKNAMES_F: readonly string[] = [
  'Nena', 'Duda', 'Kika', 'Bel', 'Tita', 'Chica', 'Lelê', 'Bia',
  'Nina', 'Pepa', 'Zaza', 'Mila', 'Tami', 'Cacá', 'Formiga', 'Preta',
]

export const SURNAMES: readonly string[] = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Costa', 'Pereira', 'Almeida',
  'Nascimento', 'Lima', 'Araújo', 'Ribeiro', 'Carvalho', 'Gomes', 'Martins',
  'Rocha', 'Barbosa', 'Freitas', 'Moreira', 'Cardoso', 'Teixeira', 'Correia',
  'Dias', 'Castro', 'Campos', 'Duarte', 'Farias', 'Vieira', 'Monteiro',
  'Mendes', 'Ramos', 'Barros', 'Cunha', 'Sales', 'Peixoto', 'Machado',
  'Neves', 'Xavier', 'Tavares',
]

const NICKNAMES: readonly string[] = [
  'Zeca', 'Bira', 'Tonho', 'Russo', 'Galego', 'Xandão', 'Pingo', 'Café',
  'Serrote', 'Mineiro', 'Paraíba', 'Canhoto', 'Fumaça', 'Trovão', 'Bagre',
  'Pardal',
]

/** Fração do elenco que atende pelo apelido, como todo time brasileiro. */
const NICKNAME_SHARE = 0.25

const hashSeed = (input: string): number => {
  let hash = 2166136261
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

const nextRoll = (state: number): [number, number] => {
  const next = (Math.imul(state, 1664525) + 1013904223) >>> 0
  return [next / 4294967296, next]
}

/**
 * Sorteia `count` nomes únicos, determinístico pela semente. Primeiros nomes
 * não se repetem no elenco (o campo mostra só o primeiro nome).
 */
/**
 * Nomes de um elenco ESTRANGEIRO, da lista da própria nacionalidade. A
 * seleção da Austrália não escala Zeca nem Serrote — o gerador padrão é
 * brasileiro de propósito, para os clubes da liga.
 */
export const foreignSquadFor = (
  seedText: string,
  count: number,
  nationId: string,
  gender: PlayerGender = 'masculino',
): readonly string[] => {
  const named = NATIONAL_NAMES[nationId]
  if (!named) return squadFor(seedText, count, gender)
  const pool = { firsts: gender === 'feminino' ? named.firstsF : named.firsts, lasts: named.lasts }
  let state = hashSeed(seedText)
  let firsts = [...pool.firsts]
  const squad: string[] = []
  const usados = new Set<string>()
  let tentativas = 0
  // primeiro nome não se repete enquanto houver lista: o campo mostra só ele.
  // Esgotada, ela é reabastecida e o sobrenome passa a distinguir os xarás —
  // são 16 nomes para 18 vagas de elenco.
  while (squad.length < count && tentativas < count * 20) {
    tentativas++
    if (firsts.length === 0) firsts = [...pool.firsts]
    const [firstRoll, s1] = nextRoll(state)
    const [lastRoll, s2] = nextRoll(s1)
    state = s2
    const first = firsts.splice(Math.floor(firstRoll * firsts.length) % firsts.length, 1)[0]
    const last = pool.lasts[Math.floor(lastRoll * pool.lasts.length) % pool.lasts.length]
    const full = `${first} ${last}`
    if (usados.has(full)) continue
    usados.add(full)
    squad.push(full)
  }
  return squad
}

export const squadFor = (
  seedText: string,
  count: number,
  gender: PlayerGender = 'masculino',
): readonly string[] => {
  let state = hashSeed(seedText)
  const feminino = gender === 'feminino'
  const firsts = [...(feminino ? FIRST_NAMES_F : FIRST_NAMES)]
  const nicknames = [...(feminino ? NICKNAMES_F : NICKNAMES)]
  const squad: string[] = []
  while (squad.length < count && (firsts.length > 0 || nicknames.length > 0)) {
    const [kindRoll, s1] = nextRoll(state)
    const useNickname = kindRoll < NICKNAME_SHARE && nicknames.length > 0
    if (useNickname || firsts.length === 0) {
      const [roll, s2] = nextRoll(s1)
      state = s2
      squad.push(nicknames.splice(Math.floor(roll * nicknames.length) % nicknames.length, 1)[0])
    } else {
      const [firstRoll, s2] = nextRoll(s1)
      const [surnameRoll, s3] = nextRoll(s2)
      state = s3
      const first = firsts.splice(Math.floor(firstRoll * firsts.length) % firsts.length, 1)[0]
      const surname = SURNAMES[Math.floor(surnameRoll * SURNAMES.length) % SURNAMES.length]
      squad.push(`${first} ${surname}`)
    }
  }
  return squad
}

/** Nome de campo: primeiro nome ou apelido (cabe embaixo do jogador na mesa). */
export const fieldName = (fullName: string): string => fullName.split(' ')[0]
