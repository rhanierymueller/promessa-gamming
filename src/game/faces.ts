import { faceIndexFor } from '../engine/squad/faceIndex'
import { USER_PLAYER_ID } from '../engine/squad/players'

/**
 * Banco de retratos das cartas. Os arquivos são descobertos sozinhos: basta
 * jogar novos .jpg em assets/faces que eles entram no sorteio — sem lista
 * para manter. Pasta vazia = carta sem foto, nada quebra.
 */

const modules = import.meta.glob('../assets/faces/*.{jpg,png,webp}', {
  eager: true,
  import: 'default',
}) as Record<string, string>

/** Ordem alfabética do caminho: o sorteio não depende da ordem do sistema de arquivos. */
export const FACE_URLS: readonly string[] = Object.keys(modules)
  .sort()
  .map((path) => modules[path])

/**
 * Retrato de um jogador do elenco. O SEU craque não entra aqui — o rosto
 * dele é o retrato configurável do Perfil, tratado por quem chama.
 */
export const faceUrlFor = (playerId: string): string | null => {
  if (playerId === USER_PLAYER_ID) return null
  const index = faceIndexFor(playerId, FACE_URLS.length)
  return index === null ? null : FACE_URLS[index]
}
