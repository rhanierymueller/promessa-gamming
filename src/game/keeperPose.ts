import type { KeeperPose } from './assets'

/**
 * Pose do goleiro que VOCÊ pilota. A escolha olha para a INTENÇÃO (o lado
 * comandado), não só para o quanto ele já andou — senão, apertar D+espaço
 * mostrava o salto vertical durante quase todo o voo, porque o corpo ainda
 * não tinha percorrido distância suficiente para virar mergulho.
 */

/** A partir daqui o corpo está totalmente esticado. */
export const LONG_DIVE = 30
/** A partir daqui ele já saiu do agachamento. */
export const LEAN_START = 8

export interface DefensePose {
  readonly pose: KeeperPose
  readonly flip: boolean
  readonly airborne: boolean
}

/**
 * Altura do corpo no mergulho. É um ARCO (sobe e volta ao chão) — com altura
 * fixa o goleiro ficava boiando e nunca aterrissava. `progress` é 0→1 do
 * impulso à queda; em 1 os pés estão no gramado de novo.
 */
export const diveLift = (progress: number, offset: number, airborne: boolean): number => {
  if (!airborne) return 0
  const arc = Math.sin(Math.max(0, Math.min(1, progress)) * Math.PI)
  return arc * Math.min(10, 3 + Math.abs(offset) * 0.14)
}

const sign = (value: number): number => (value < 0 ? -1 : 1)

export const defenseKeeperPose = (
  /** Onde ele está, em unidades a partir do centro do gol. */
  offset: number,
  /** Para onde foi mandado ir (null = sem comando). */
  target: number | null,
  /** Espaço pressionado: cobre a bola alta. */
  high: boolean,
  /**
   * A bola já saiu? Antes disso ele se POSICIONA de pé — mergulhar com a bola
   * ainda no pé do cobrador deixava o corpo esticado deslizando pelo gramado.
   */
  inFlight = true,
): DefensePose => {
  const away = Math.abs(offset)
  const wanted = target ?? 0
  const travelling = target !== null && Math.abs(wanted - offset) > 1
  // para onde ele VAI; se já chegou, o lado que ocupa
  const heading = travelling ? sign(wanted - offset) : offset === 0 ? 0 : sign(offset)
  // há lado envolvido? Basta a intenção — não precisa ter percorrido tudo
  const lateral = away > LEAN_START || (travelling && Math.abs(wanted) > LEAN_START)

  // antes do chute ele só se desloca de pé — nada de corpo no ar
  if (!inFlight) {
    return travelling || away > LEAN_START
      ? { pose: 'takeoff', flip: heading < 0, airborne: false }
      : { pose: 'crouch', flip: false, airborne: false }
  }
  if (high) {
    // com direção, é voo PARA O LADO; sem direção, pulo reto no meio do gol
    return lateral
      ? { pose: 'fly', flip: heading < 0, airborne: true }
      : { pose: 'jump', flip: false, airborne: true }
  }
  if (away > LONG_DIVE) {
    return { pose: offset < 0 ? 'diveL' : 'diveR', flip: false, airborne: true }
  }
  if (lateral) {
    return { pose: 'takeoff', flip: heading < 0, airborne: false }
  }
  return { pose: 'crouch', flip: false, airborne: false }
}
