/**
 * Apelidos de várzea para os elencos da mesa ao vivo — determinísticos por
 * semente (mesmo clube + mesma partida = mesmos nomes).
 */
const NICKNAME_POOL: readonly string[] = [
  'Zeca', 'Bira', 'Tonho', 'Careca', 'Pité', 'Russo', 'Formiga', 'Cabeça',
  'Peixe', 'Galego', 'Sabiá', 'Xandão', 'Pingo', 'Café', 'Bidu', 'Maranhão',
  'Índio', 'Neguinho', 'Paçoca', 'Cebola', 'Grilo', 'Foguinho', 'Tico',
  'Bagre', 'Cigano', 'Doca', 'Pardal', 'Serrote', 'Mineiro', 'Paraíba',
  'Canhoto', 'Gordo', 'Magrelo', 'Fumaça', 'Trovão', 'Jacaré', 'Piolho', 'Buiú',
]

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

/** Sorteia `count` apelidos únicos, determinístico pela semente. */
export const squadFor = (seedText: string, count: number): readonly string[] => {
  let state = hashSeed(seedText)
  const pool = [...NICKNAME_POOL]
  const squad: string[] = []
  while (squad.length < count && pool.length > 0) {
    const [roll, next] = nextRoll(state)
    state = next
    squad.push(pool.splice(Math.floor(roll * pool.length) % pool.length, 1)[0])
  }
  return squad
}
