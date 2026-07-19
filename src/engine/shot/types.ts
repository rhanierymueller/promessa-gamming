export interface Vec2 {
  readonly x: number
  readonly y: number
}

export interface GoalGeometry {
  readonly left: number
  readonly right: number
  readonly barHeight: number
  readonly floorY: number
  readonly postWidth: number
}

/** Intenção lida do gesto do jogador (antes da dispersão aleatória). */
export interface ShotCommand {
  readonly power: number
  readonly targetX: number
  readonly targetHeight: number
  readonly curve: number
}

/** Parâmetros imutáveis da trajetória de um chute. */
export interface FlightParams {
  readonly startX: number
  readonly startY: number
  readonly targetX: number
  readonly targetHeight: number
  readonly curve: number
  readonly power: number
  readonly arc: number
  readonly duration: number
}

/** Plano do goleiro decidido no instante do chute. */
export interface KeeperPlan {
  readonly reactT: number
  readonly diveX: number
}

export type ShotOutcomeKind = 'goal' | 'save' | 'post' | 'miss'

export interface ShotOutcome {
  readonly kind: ShotOutcomeKind
  readonly finalX: number
  readonly isGolaco: boolean
  /** Gol que entrou batendo na trave. */
  readonly offPost?: boolean
  /** Defesa espalmada — a bola rebate em jogo em vez de morrer na luva. */
  readonly deflected?: boolean
}

export interface ShotConfig {
  readonly goal: GoalGeometry
  readonly ballStartY: number
  /** Gesto */
  readonly minDragLength: number
  readonly minUpwardDrag: number
  readonly powerDragLength: number
  readonly minPower: number
  readonly aimScale: number
  readonly curveScale: number
  readonly maxCurve: number
  readonly heightDeadzone: number
  readonly heightDragRange: number
  readonly heightScale: number
  readonly maxTargetHeight: number
  /** Dispersão e chute fraco */
  readonly dispersionThreshold: number
  readonly dispersionX: number
  readonly dispersionHeight: number
  readonly weakShotPower: number
  readonly weakShotMaxHeight: number
  /** Voo */
  readonly baseDuration: number
  readonly durationPowerFactor: number
  readonly arcHeightFactor: number
  readonly arcPowerFactor: number
  /** Goleiro */
  readonly keeperBaseSkill: number
  readonly keeperSkillPerShot: number
  readonly reactTMin: number
  readonly reactTBase: number
  readonly reactTSkillFactor: number
  readonly reactTNoise: number
  readonly guessSampleDt: number
  readonly guessNoise: number
  readonly maxDiveBase: number
  readonly maxDiveSkillFactor: number
  readonly reachBase: number
  readonly reachSkillFactor: number
  readonly highBallHeight: number
  readonly highBallReachFactor: number
  readonly tameShotPower: number
  readonly tameShotCenterRange: number
  /** Bola no meio com goleiro parado perto do centro = defesa de corpo. */
  readonly keeperStandingZone: number
  /** Altura máxima que o goleiro EM PÉ agarra (braços esticados, < travessão). */
  readonly standingCatchHeight: number
  /** Chance base de o goleiro cravar o canto ERRADO (cai com a habilidade). */
  readonly wrongSideBase: number
  /** Quanto da curva o goleiro consegue ler (multiplicado pela habilidade). */
  readonly curveReadFactor: number
  /** Chance de a bola que bate na trave ENTRAR. */
  readonly postInChance: number
  /** Espalmada: fração do alcance a partir da qual a defesa vira rebote. */
  readonly deflectEdgeFrac: number
  /** Espalmada: acima desta força, nem bola no corpo é agarrada. */
  readonly deflectPower: number
  /** Espalmada: bola acima desta altura é sempre espalmada. */
  readonly deflectHighBall: number
  /** Barra de chute: régua vertical dita força e altura no instante do toque. */
  readonly barPowerMin: number
  readonly barPowerRange: number
  readonly barMaxHeight: number
  /** Golaço */
  readonly golacoCurve: number
  readonly golacoHeight: number
  readonly golacoPower: number
}
