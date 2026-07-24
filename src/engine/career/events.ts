import { createRng, nextFloat, nextInt } from '../rng'

/**
 * Eventos FORA de campo: entre rodadas, a vida de craque cobra decisões —
 * entrevista, festa, vestiário. Cada escolha mexe na MORAL, que entra em
 * campo com você (nota inicial da próxima partida).
 */

export type LifeEventTone = 'seguro' | 'ousado' | 'audacioso'

export interface LifeEventOption {
  readonly label: string
  readonly tone: LifeEventTone
  /** Chance de dar certo (a segura é 1). */
  readonly chance: number
  readonly moraleWin: number
  readonly moraleLose: number
  /** Pontos de treino extras quando dá certo (treino no dia de folga). */
  readonly pointsWin: number
  readonly textWin: string
  readonly textLose: string
}

export interface LifeEvent {
  readonly id: string
  readonly prompt: string
  readonly options: readonly [LifeEventOption, LifeEventOption, LifeEventOption]
}

const option = (
  label: string,
  tone: LifeEventTone,
  chance: number,
  moraleWin: number,
  moraleLose: number,
  textWin: string,
  textLose: string,
  pointsWin = 0,
): LifeEventOption => ({
  label,
  tone,
  chance,
  moraleWin,
  moraleLose,
  pointsWin,
  textWin,
  // opção segura nunca falha — o texto de derrota herda o de vitória
  textLose: textLose.length > 0 ? textLose : textWin,
})

export const LIFE_EVENTS: readonly LifeEvent[] = [
  {
    id: 'entrevista',
    prompt: 'Zona mista. O repórter provoca: "esse time depende só de você?"',
    options: [
      option('Elogiar o grupo', 'seguro', 1, 4, 0,
        'Resposta de capitão. O vestiário te abraça.', ''),
      option('Assumir o protagonismo', 'ousado', 0.6, 8, -6,
        'A manchete saiu: "O CRAQUE ASSUME". E você jogou a altura.', 'Soou arrogante. O grupo torceu o nariz.'),
      option('Cutucar o próximo rival', 'audacioso', 0.35, 12, -8,
        'A provocação virou combustível — o clima é elétrico.', 'Deu munição pro rival e dor de cabeça pro técnico.'),
    ],
  },
  {
    id: 'festa',
    prompt: 'Aniversário do capitão — e a festa cai na véspera do jogo.',
    options: [
      option('Parabenizar e voltar cedo', 'seguro', 1, 4, 0,
        'Presença certa, sono em dia. Profissional.', ''),
      option('Ficar até o bolo', 'ousado', 0.55, 8, -6,
        'Risada boa, laço com o grupo mais forte.', 'O bolo saiu 2h da manhã. As pernas cobraram.'),
      option('Fechar a pista de dança', 'audacioso', 0.3, 14, -10,
        'Virou lenda da festa E acordou voando. Inexplicável.', 'Foto na pista vazou. O técnico não riu.'),
    ],
  },
  {
    id: 'treino-extra',
    prompt: 'Dia de folga, mas o treinador deixou o campo aberto.',
    options: [
      option('Descansar o corpo', 'seguro', 1, 3, 0,
        'Recuperação também é treino. Corpo novo.', ''),
      option('Treinar finalização', 'ousado', 0.65, 6, -4,
        'Uma hora de bola parada — o pé calibrou.', 'Forçou demais e sentiu a coxa. Susto à toa.', 1),
      option('Dobrar o turno', 'audacioso', 0.4, 10, -8,
        'Dobradinha completa. Você saiu do campo OUTRO jogador.', 'O corpo apagou no meio do segundo turno.', 1),
    ],
  },
  {
    id: 'vestiario',
    prompt: 'Dois titulares discutem feio no vestiário. Todos olham pra você.',
    options: [
      option('Ficar de fora', 'seguro', 1, 2, 0,
        'Briga alheia. Você seguiu focado.', ''),
      option('Apartar com calma', 'ousado', 0.6, 8, -5,
        'Voz mansa, ânimos frios. O grupo respirou.', 'Sobrou pra você: "quem é você na fila do pão?"'),
      option('Botar ordem aos gritos', 'audacioso', 0.35, 12, -9,
        'O vestiário CALOU. Nasceu um líder.', 'Gritou com quem não devia. Clima péssimo.'),
    ],
  },
  {
    id: 'escolinha',
    prompt: 'A escolinha do bairro implorou por uma visita sua.',
    options: [
      option('Mandar camisas autografadas', 'seguro', 1, 4, 0,
        'A molecada amou. Coração quentinho.', ''),
      option('Aparecer de surpresa', 'ousado', 0.7, 8, -3,
        'O grito da criançada não te sai da cabeça. Que energia!', 'A visita virou tumulto e você saiu no sufoco.'),
      option('Prometer título no palco', 'audacioso', 0.4, 12, -8,
        'A promessa correu a cidade — e te deu asas.', 'A promessa virou cobrança em todo canto.'),
    ],
  },
  {
    id: 'patrocinio',
    prompt: 'O mercadinho da esquina ofereceu patrocínio pessoal.',
    options: [
      option('Agradecer e recusar', 'seguro', 1, 2, 0,
        'Educado e leve. Seguiu o baile.', ''),
      option('Aceitar e estampar a chuteira', 'ousado', 0.6, 7, -5,
        'A cidade inteira reparou na chuteira. Orgulho local.', 'O clube reclamou do contrato paralelo.'),
      option('Pedir o dobro', 'audacioso', 0.35, 10, -7,
        'Fechou pelo dobro! Faro de negócio.', 'O dono riu e cancelou a proposta.'),
    ],
  },
]

export const eventById = (id: string): LifeEvent | undefined =>
  LIFE_EVENTS.find((event) => event.id === id)

export const isEventId = (value: unknown): value is string =>
  typeof value === 'string' && LIFE_EVENTS.some((event) => event.id === value)

/** Chance de pintar um evento entre uma rodada e outra. */
const EVENT_CHANCE = 0.45

export interface PendingLifeEvent {
  readonly templateId: string
  /** Seed da resolução — garante replay idêntico do save. */
  readonly seed: number
}

/** Sorteio determinístico do evento pós-rodada (null = semana tranquila). */
export const maybeEventForRound = (seed: number): PendingLifeEvent | null => {
  const rng = createRng(seed)
  const roll = nextFloat(rng)
  if (roll.value >= EVENT_CHANCE) return null
  const pick = nextInt(roll.next, 0, LIFE_EVENTS.length - 1)
  const resolutionSeed = nextInt(pick.next, 0, 0x7fffffff)
  return { templateId: LIFE_EVENTS[pick.value].id, seed: resolutionSeed.value }
}

export interface LifeEventResult {
  readonly success: boolean
  readonly moraleDelta: number
  readonly trainingPoints: number
  readonly note: string
}

export const resolveLifeEvent = (
  templateId: string,
  optionIndex: number,
  seed: number,
): LifeEventResult => {
  const event = eventById(templateId) ?? LIFE_EVENTS[0]
  const chosen = event.options[optionIndex] ?? event.options[0]
  const roll = nextFloat(createRng(seed))
  const success = roll.value < chosen.chance
  return {
    success,
    moraleDelta: success ? chosen.moraleWin : chosen.moraleLose,
    trainingPoints: success ? chosen.pointsWin : 0,
    note: success ? chosen.textWin : chosen.textLose,
  }
}

export const MORALE_MIN = 0
export const MORALE_MAX = 100
export const DEFAULT_MORALE = 50

const DRIFT_FACTOR = 0.1
const WIN_MORALE = 6
const LOSS_MORALE = -6
/** Peso da moral na nota inicial: 100 de moral = +0.8, 0 de moral = −0.8. */
const RATING_BONUS_SPAN = 0.8

export const clampMorale = (value: number): number =>
  Math.round(Math.min(MORALE_MAX, Math.max(MORALE_MIN, value)))

/** Pós-jogo: a moral respira — puxa pro neutro e reage ao resultado. */
export const driftMorale = (morale: number, isWin: boolean, isLoss: boolean): number => {
  const drifted = morale + (DEFAULT_MORALE - morale) * DRIFT_FACTOR
  return clampMorale(drifted + (isWin ? WIN_MORALE : 0) + (isLoss ? LOSS_MORALE : 0))
}

/** Moral entra em campo: desloca a nota INICIAL da partida. */
export const moraleRatingBonus = (morale: number): number =>
  ((clampMorale(morale) - DEFAULT_MORALE) / (DEFAULT_MORALE - MORALE_MIN)) * RATING_BONUS_SPAN
