import type { ShotConfig } from './types'

/**
 * Parâmetros validados no protótipo (balance v14, 2026-07-12).
 * Meta de balanceamento: jogador casual faz 4-6 gols em 10 chutes.
 * Coordenadas em espaço lógico 180×320 (ver Game Design no vault).
 */
export const DEFAULT_SHOT_CONFIG: ShotConfig = {
  goal: { left: 22, right: 158, barHeight: 47, floorY: 134, postWidth: 3 },
  ballStartY: 256,

  minDragLength: 18,
  minUpwardDrag: 10,
  powerDragLength: 115,
  minPower: 0.25,
  aimScale: 1.25,
  curveScale: 1.05,
  maxCurve: 24,
  heightDeadzone: 14,
  heightDragRange: 125,
  heightScale: 46,
  maxTargetHeight: 52,

  dispersionThreshold: 0.78,
  dispersionX: 45,
  dispersionHeight: 12,
  weakShotPower: 0.42,
  weakShotMaxHeight: 10,

  baseDuration: 0.72,
  durationPowerFactor: 0.24,
  arcHeightFactor: 0.45,
  arcPowerFactor: 8,

  keeperBaseSkill: 0.22,
  keeperSkillPerShot: 0.06,
  reactTMin: 0.14,
  reactTBase: 0.42,
  reactTSkillFactor: 0.22,
  reactTNoise: 0.06,
  guessSampleDt: 0.08,
  guessNoise: 14,
  maxDiveBase: 28,
  maxDiveSkillFactor: 20,
  reachBase: 7,
  reachSkillFactor: 5,
  highBallHeight: 28,
  highBallReachFactor: 0.5,
  tameShotPower: 0.38,
  tameShotCenterRange: 14,
  keeperStandingZone: 14,
  standingCatchHeight: 38,
  wrongSideBase: 0.2,
  curveReadFactor: 0.9,

  // margem do goleiro: o que transforma o alcance em curva em vez de degrau
  diveExtentMin: 0.86,
  fumbleChance: 0.45,
  stretchWindow: 0.25,
  stretchChance: 0.45,

  postInChance: 0.22,
  deflectEdgeFrac: 0.55,
  deflectPower: 0.9,
  deflectHighBall: 34,

  barPowerMin: 0.72,
  barPowerRange: 0.2,
  barMaxHeight: 48,

  golacoCurve: 12,
  golacoHeight: 32,
  golacoPower: 0.86,
}

export const goalCenter = (config: ShotConfig): number =>
  (config.goal.left + config.goal.right) / 2

const MAX_KEEPER_SKILL = 0.95

/**
 * Habilidade do goleiro no chute: qualidade do contexto (treino/liga/copa)
 * escalando levemente a cada chute da rodada, com teto humano.
 */
export const keeperSkillForShot = (
  config: ShotConfig,
  shotIndex: number,
  quality: number = config.keeperBaseSkill,
): number =>
  Math.min(MAX_KEEPER_SKILL, quality + config.keeperSkillPerShot * shotIndex)
