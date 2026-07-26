import { describe, expect, test } from 'vitest'
import type { SpriteHolder } from './assets'

/*
 * Regra que o ShotStage aplica antes de tingir o uniforme: a recoloração roda
 * UMA vez e não se repete, então precisa esperar TODAS as poses carregarem.
 * Com uma só, as que chegavam depois ficavam sem tingir e o rival trocava de
 * cor no meio da corrida para a bola.
 */
const todasCarregadas = (poses: readonly Partial<SpriteHolder>[]): boolean =>
  poses.every((holder) => holder.img)

const carregada = (): Partial<SpriteHolder> => ({ img: {} as HTMLImageElement })
const pendente = (): Partial<SpriteHolder> => ({ img: null })

describe('quando o uniforme pode ser tingido', () => {
  test('com todas as poses prontas, pode', () => {
    expect(todasCarregadas([carregada(), carregada(), carregada()])).toBe(true)
  })

  test('com UMA pose faltando, não pode — era o bug', () => {
    expect(todasCarregadas([carregada(), carregada(), pendente()])).toBe(false)
  })

  test('só a primeira pronta não basta', () => {
    expect(todasCarregadas([carregada(), pendente(), pendente()])).toBe(false)
  })

  test('nenhuma pronta, não pode', () => {
    expect(todasCarregadas([pendente()])).toBe(false)
  })
})
