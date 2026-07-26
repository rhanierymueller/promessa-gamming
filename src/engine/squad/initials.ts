/**
 * Iniciais do jogador para quando não há retrato disponível: a moldura mostra
 * as letras em vez de abrir um buraco no layout.
 */

const MAX_INITIALS = 2

export const initialsOf = (name: string): string =>
  name
    .split(' ')
    .filter((part) => part.length > 0)
    .slice(0, MAX_INITIALS)
    .map((part) => part[0].toUpperCase())
    .join('')
