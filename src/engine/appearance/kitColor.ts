/**
 * Cor do uniforme em RGB a partir do hexadecimal do clube ou da seleção.
 *
 * Dentro de campo o uniforme é o do TIME que o jogador defende — a cor
 * escolhida em Configurações vale para o retrato e o menu, não para a partida:
 * ninguém entra na seleção de amarelo porque gosta de amarelo.
 */

const HEX = /^#?([0-9a-f]{6})$/i

export const rgbFromHex = (color: string): [number, number, number] | null => {
  const match = HEX.exec(color.trim())
  if (!match) return null
  const value = match[1]
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ]
}
