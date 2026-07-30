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

/**
 * Correção horizontal medida nos rostos dos PNGs 256×256. Os lotes originais
 * vieram com pequenas sobras diferentes nas laterais; por isso centralizar o
 * canvas não centralizava necessariamente o atleta. Valor positivo move a
 * imagem para a direita. Um retrato novo, sem entrada aqui, usa 0%.
 */
const FACE_SHIFT_X_PERCENT: Readonly<Record<string, number>> = {
  'm/jogador-01.png': -0.8,
  'm/jogador-02.png': 0.4,
  'm/jogador-03.png': 1.8,
  'm/jogador-04.png': -1,
  'm/jogador-05.png': 0.6,
  'm/jogador-06.png': 2,
  'm/jogador-07.png': -0.6,
  'm/jogador-08.png': 0.6,
  'm/jogador-09.png': 2,
  'm/jogador2-01.png': -1.8,
  'm/jogador2-02.png': 0.4,
  'm/jogador2-03.png': 3.1,
  'm/jogador2-04.png': -2.1,
  'm/jogador2-05.png': 0.4,
  'm/jogador2-06.png': 3.5,
  'm/jogador2-07.png': -1.8,
  'm/jogador2-08.png': 2,
  'm/jogador2-09.png': 3.3,
  'm/jogador3-01.png': -2,
  'm/jogador3-02.png': 1,
  'm/jogador3-03.png': 6.4,
  'm/jogador3-04.png': -2.5,
  'm/jogador3-05.png': 1.2,
  'm/jogador3-06.png': 6.4,
  'm/jogador3-07.png': -1.6,
  'm/jogador3-08.png': 1,
  'm/jogador3-09.png': 6.3,
  'f/jogadora-01.png': -0.8,
  'f/jogadora-02.png': 2.7,
  'f/jogadora-03.png': 2.5,
  'f/jogadora-04.png': -3.7,
  'f/jogadora-05.png': 1.2,
  'f/jogadora-06.png': 4.1,
  'f/jogadora-07.png': -0.6,
  'f/jogadora-08.png': 0.2,
  'f/jogadora-09.png': 4.3,
  'f/jogadora2-01.png': -1.6,
  'f/jogadora2-02.png': 0.6,
  'f/jogadora2-03.png': 3.5,
  'f/jogadora2-04.png': -1.8,
  'f/jogadora2-05.png': 2,
  'f/jogadora2-06.png': 5.9,
  'f/jogadora2-07.png': -0.8,
  'f/jogadora2-08.png': 1,
  'f/jogadora2-09.png': 5.5,
  'f/jogadora3-01.png': 1.6,
  'f/jogadora3-02.png': 0.8,
  'f/jogadora3-03.png': 7.6,
  'f/jogadora3-04.png': -1.2,
  'f/jogadora3-05.png': 1.6,
  'f/jogadora3-06.png': 3.3,
  'f/jogadora3-07.png': 0.6,
  'f/jogadora3-08.png': 2.9,
  'f/jogadora3-09.png': 3.3,
}

/** Faixas claras residuais no topo de seis recortes do segundo lote masculino. */
const FACE_TOP_CROP_PERCENT: Readonly<Record<string, number>> = {
  'm/jogador2-04.png': 1.2,
  'm/jogador2-05.png': 1.2,
  'm/jogador2-06.png': 1.2,
  'm/jogador3-04.png': 1.6,
  'm/jogador3-05.png': 1.6,
  'm/jogador3-06.png': 1.6,
}

export interface FacePresentation {
  readonly url: string
  /** Deslocamento relativo à largura do próprio retrato. */
  readonly xShiftPercent: number
  /** Pequena faixa superior que deve ficar fora da moldura. */
  readonly topCropPercent: number
}

const assetKeyOf = (path: string): string => path.replace(/^.*\/faces\//, '')

/** Ordem alfabética do caminho: o sorteio não depende da ordem do sistema de arquivos. */
const presentationsOf = (modules: Record<string, string>): readonly FacePresentation[] =>
  Object.keys(modules).sort().map((path) => {
    const key = assetKeyOf(path)
    return {
      url: modules[path],
      xShiftPercent: FACE_SHIFT_X_PERCENT[key] ?? 0,
      topCropPercent: FACE_TOP_CROP_PERCENT[key] ?? 0,
    }
  })

const MALE_FACES = presentationsOf(maleModules)
const FEMALE_FACES = presentationsOf(femaleModules)


const facesFor = (gender: PlayerGender): readonly FacePresentation[] =>
  gender === 'feminino' ? FEMALE_FACES : MALE_FACES

/**
 * Retrato de um jogador do elenco. O SEU craque não entra aqui — o rosto
 * dele é o retrato configurável do Perfil, tratado por quem chama.
 */
export const facePresentationFor = (
  playerId: string,
  gender: PlayerGender = 'masculino',
): FacePresentation | null => {
  if (playerId === USER_PLAYER_ID) return null
  const faces = facesFor(gender)
  const index = faceIndexFor(playerId, faces.length)
  return index === null ? null : faces[index]
}

export const faceUrlFor = (
  playerId: string,
  gender: PlayerGender = 'masculino',
): string | null => facePresentationFor(playerId, gender)?.url ?? null
