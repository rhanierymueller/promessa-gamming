/**
 * Filtro de nomes ofensivos para tudo que o jogador digita (nome do time,
 * do craque, username, batismo de jogadores). Duas listas:
 * - WORD_TERMS: termos curtos checados por PALAVRA inteira (evita o efeito
 *   Scunthorpe — "Curitiba" contém "cu" e não pode ser bloqueada);
 * - ANYWHERE_TERMS: ofensas inequívocas bloqueadas mesmo coladas em outras
 *   palavras ("osfilhodaputa").
 * A normalização derruba disfarces: acentos, maiúsculas, leetspeak e pontos.
 */

const WORD_TERMS: readonly string[] = [
  'merda', 'bosta', 'porra', 'caralho', 'puta', 'puto', 'buceta', 'boceta',
  'cu', 'cuzao', 'foda', 'fodase', 'foder', 'piroca', 'rola', 'pinto',
  'xereca', 'xoxota', 'penis', 'vagina', 'anus', 'pqp', 'vsf', 'fdp',
  'shit', 'fuck', 'bitch', 'asshole', 'dick', 'pussy', 'whore', 'slut',
  'nazista', 'hitler', 'estupro', 'estuprador', 'pedofilo', 'pedofilia',
]

const ANYWHERE_TERMS: readonly string[] = [
  'filhodaputa', 'filhadaputa', 'vaitomarnocu', 'vagabunda', 'vagabundo',
  'arrombado', 'arrombada', 'viado', 'veado', 'sapatao', 'traveco',
  'macaco imundo', 'negro imundo', 'nigger', 'nigga', 'faggot', 'retardado',
  'mongoloide', 'aborto', 'suicidio', 'kukluxklan',
]

const LEET_MAP: Record<string, string> = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's',
}

/** Minúsculas, sem acentos, leetspeak desfeito. Mantém separadores. */
const normalize = (raw: string): string =>
  raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[013457@$]/g, (char) => LEET_MAP[char] ?? char)

/** Forma compacta: só letras (derruba "p.u.t.a" e "m-e-r-d-a"). */
const compact = (normalized: string): string => normalized.replace(/[^a-z]/g, '')

export const isOffensiveName = (raw: string): boolean => {
  const normalized = normalize(raw)
  const words = normalized.split(/[^a-z]+/).filter((word) => word.length > 0)
  const compacted = compact(normalized)

  // termos curtos: só por palavra inteira, na forma normal E na compacta
  // (a compacta pega "p.u.t.a", que vira a palavra única "puta")
  if (words.some((word) => WORD_TERMS.includes(word))) return true
  if (WORD_TERMS.includes(compacted)) return true

  // ofensas graves: em qualquer lugar da forma compacta
  const compactedAnywhere = ANYWHERE_TERMS.map((term) => compact(term))
  return compactedAnywhere.some((term) => compacted.includes(term))
}
