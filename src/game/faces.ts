import { faceIndexFor } from '../engine/squad/faceIndex'
import { USER_PLAYER_ID } from '../engine/squad/players'
import type { PlayerGender } from '../state/save'

/**
 * Banco de retratos das cartas, separado por gênero: numa carreira feminina
 * as jogadoras do elenco precisam de rosto de jogadora. Os arquivos são
 * descobertos sozinhos — basta jogar novos .png em assets/faces/m ou
 * assets/faces/f que eles entram no sorteio, sem lista para manter. Pasta
 * vazia = carta sem foto, nada quebra.
 */

const maleModules = import.meta.glob('../assets/faces/m/*.{jpg,png,webp}', {
  eager: true,
  import: 'default',
}) as Record<string, string>

const femaleModules = import.meta.glob('../assets/faces/f/*.{jpg,png,webp}', {
  eager: true,
  import: 'default',
}) as Record<string, string>

/** Ordem alfabética do caminho: o sorteio não depende da ordem do sistema de arquivos. */
const urlsOf = (modules: Record<string, string>): readonly string[] =>
  Object.keys(modules).sort().map((path) => modules[path])

export const FACE_URLS: readonly string[] = urlsOf(maleModules)
export const FACE_URLS_F: readonly string[] = urlsOf(femaleModules)

const facesFor = (gender: PlayerGender): readonly string[] =>
  gender === 'feminino' ? FACE_URLS_F : FACE_URLS

/**
 * Retrato de um jogador do elenco. O SEU craque não entra aqui — o rosto
 * dele é o retrato configurável do Perfil, tratado por quem chama.
 */
export const faceUrlFor = (
  playerId: string,
  gender: PlayerGender = 'masculino',
): string | null => {
  if (playerId === USER_PLAYER_ID) return null
  const faces = facesFor(gender)
  const index = faceIndexFor(playerId, faces.length)
  return index === null ? null : faces[index]
}
