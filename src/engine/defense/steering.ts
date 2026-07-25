/**
 * Goleiro dirigido pelo dedo: você segura e arrasta, ele acompanha em tempo
 * real. O limite de velocidade é a alma da mecânica — sem ele bastaria
 * esperar a bola quase entrar e colar o goleiro nela, e defesa nenhuma teria
 * mérito. Com ele, defender é LER o chute cedo e sair na hora certa.
 */

/**
 * Unidades lógicas por segundo. Calibrado pela distância que importa: do
 * CENTRO ao poste são 44 unidades. A 110/s isso levava 0,4s contra um voo de
 * ~0,68s — dava para reagir tarde e ainda alcançar qualquer canto. A 70/s
 * são ~0,63s: para chegar no ângulo é preciso sair quase junto com a bola.
 * Cobrir os dois postes (88) continua impossível num lance só.
 */
export const KEEPER_MAX_SPEED = 70

/** Limite lateral do goleiro, em unidades a partir do centro do gol. */
export const KEEPER_MAX_REACH = 44

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

/**
 * Nova posição do goleiro, deslocando-se de `current` rumo a `target` sem
 * passar da velocidade máxima nem sair do alcance do gol.
 */
export const steerKeeperX = (current: number, target: number, dt: number): number => {
  const wanted = clamp(target, -KEEPER_MAX_REACH, KEEPER_MAX_REACH)
  const step = KEEPER_MAX_SPEED * Math.max(0, dt)
  const delta = clamp(wanted - current, -step, step)
  return clamp(current + delta, -KEEPER_MAX_REACH, KEEPER_MAX_REACH)
}
