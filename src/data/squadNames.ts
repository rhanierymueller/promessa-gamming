/**
 * Elencos com nomes realistas — determinísticos por semente (mesmo clube +
 * mesma partida = mesmos nomes). Mistura "Nome Sobrenome" com apelidos de
 * boleiro clássicos, como em qualquer elenco brasileiro de verdade.
 */
const FIRST_NAMES: readonly string[] = [
  'Rafael', 'Diego', 'Matheus', 'Lucas', 'Gabriel', 'Vitor', 'Caio', 'Thiago',
  'Bruno', 'Felipe', 'André', 'Éverton', 'Wesley', 'Renan', 'Igor', 'Jean',
  'Douglas', 'Alan', 'Márcio', 'Paulo', 'Pedro', 'João', 'Luiz', 'Carlos',
  'Rodrigo', 'Fábio', 'Léo', 'Davi', 'Samuel', 'Yuri', 'Nathan', 'Otávio',
  'Henrique', 'Vinícius', 'Emerson', 'Robson', 'Wallace', 'Jonas', 'Maicon',
  'Édson', 'Nilton', 'Valdir', 'Gilmar', 'Adriano',
]

const SURNAMES: readonly string[] = [
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
export const squadFor = (seedText: string, count: number): readonly string[] => {
  let state = hashSeed(seedText)
  const firsts = [...FIRST_NAMES]
  const nicknames = [...NICKNAMES]
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
