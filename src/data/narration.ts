import type { MatchMoment } from '../engine/match/types'
import type { PassRisk } from '../engine/pass/pass'
import type { ShotOutcomeKind } from '../engine/shot/types'

/**
 * Todo texto do jogo vive aqui, fora da engine — trocável sem tocar em lógica
 * (mesma regra da database de clubes/nomes; ver Stack e Arquitetura no vault).
 */

export const COMMENTARY_TEMPLATES: readonly string[] = [
  'O jogo esquenta no meio-campo. Ninguém dá um passo atrás.',
  'A torcida no alambrado não para de cantar.',
  'O juiz manda seguir depois de um carrinho duvidoso.',
  'Bola presa na lateral, jogo pegado como tem que ser.',
  'O técnico grita da beirada do campo. Ele quer mais de você.',
  'O sol vai baixando atrás da caixa d’água. Clima de decisão.',
  'O zagueiro deles avisa: aqui ninguém passa. Veremos.',
  'A criançada atrás do gol devolve a bola com estilo.',
]

export const TEAM_GOAL_TEMPLATES: readonly string[] = [
  'GOL DO TIME! O camisa 9 aproveitou o rebote e empurrou pra dentro!',
  'GOL! Cruzamento na área e o cabeceio no canto. É nosso!',
  'GOLAÇO do capitão! Chute de fora que morreu no ângulo!',
]

export const OPPONENT_GOAL_TEMPLATES: readonly string[] = [
  'Gol deles… contra-ataque rápido e não teve jeito.',
  'Gol do adversário. Falha na marcação e o castigo veio.',
  'Eles marcaram. Bola parada, desatenção geral. Bora reagir.',
]

export const PLAYER_SHOT_INTROS: readonly string[] = [
  'A bola sobra PRA VOCÊ na entrada da área!',
  'Você ganha do marcador e a chance aparece — é sua!',
  'Tabelinha no bico da área e a bola volta redonda. Chuta!',
  'O goleiro deu rebote e ela caiu nos seus pés!',
]

export const PLAYER_FREEKICK_INTROS: readonly string[] = [
  'FALTA PERIGOSA! A barreira se arruma na sua frente. É pra você bater!',
  'O juiz marca falta na entrada da área. A bola é sua — por cima ou por fora?',
  'Falta! O goleiro grita com a barreira. Você já escolheu o canto.',
  'A torcida pede gol de falta. Respira… e capricha na curva.',
]

export const WALL_BLOCK_LINE = 'NA BARREIRA! A bola explode nos marcadores e a chance morre ali.'

export const OPPONENT_FREEKICK_INTROS: readonly string[] = [
  'Falta perigosa PRA ELES… o camisa 10 deles ajeita a bola. Defende!',
  'O juiz marca falta na sua área. Agora é com o goleiro — e com você.',
  'Cobrança perigosa contra o seu gol. Leia o canto e mergulhe!',
  'Eles têm uma falta na entrada da área. A torcida prende a respiração.',
]

export const DEFENSE_RESULT_LINES = {
  saved: ['DEFESAÇA! O goleiro voa no ângulo e salva o time! O alambrado explode!'],
  conceded: ['Gol deles… a cobrança morreu no canto e não deu nem pra ver.'],
} as const

export const PLAYER_PASS_INTROS: readonly string[] = [
  'Você domina no meio e a marcação fecha rápido. Decide!',
  'Bola nos seus pés, três opções e um segundo pra pensar.',
  'Você recebe de costas e gira. O que fazer com ela?',
  'Contra-ataque! Você conduz e o time acompanha. Escolhe!',
]

export const PASS_OPTION_LABELS: Record<PassRisk, readonly string[]> = {
  safe: [
    'Recuo seguro pro volante',
    'Toque curto pro lateral',
    'Devolve pro capitão',
    'Segura e roda o jogo',
  ],
  bold: [
    'Enfiada entre os zagueiros',
    'Inversão longa de jogo',
    'Toque de primeira no atacante',
    'Lançamento nas costas da linha',
  ],
  audacious: [
    'Chapéu no marcador e enfiada',
    'Letra no meio de dois',
    'Lambreta e lançamento',
    'Caneta seca e bola no pivô',
  ],
}

export const SHOT_RESULT_LINES: Record<ShotOutcomeKind, readonly string[]> = {
  goal: ['GOOOL DE {name}! A rede balança e o alambrado sacode!'],
  save: ['O goleiro voou e tirou! Que defesa, que raiva.'],
  post: ['NA TRAVE! O ferro tremeu e a torcida gritou junto.'],
  miss: ['Pra fora… {name} olha pro chão e o zagueiro provoca.'],
}

export const GOLACO_LINE = 'GOLAÇO ABSURDO DE {name}! Isso vai rodar a cidade inteira!'

export const withName = (text: string, name: string): string =>
  text.replaceAll('{name}', name)

export const PASS_RESULT_LINES = {
  completed: ['Passe perfeito! O time cresce e a jogada segue viva.'],
  failed: ['A bola foi interceptada… você prometeu demais nessa.'],
  timeout: ['Você demorou e o marcador roubou. Pensa mais rápido!'],
} as const

const pick = (templates: readonly string[], templateId: number): string =>
  templates[templateId % templates.length]

export const narrationForMoment = (moment: MatchMoment): string => {
  switch (moment.kind) {
    case 'kickoff':
      return 'Bola rolando! O jogo começou.'
    case 'commentary':
      return pick(COMMENTARY_TEMPLATES, moment.templateId)
    case 'teamGoal':
      return pick(TEAM_GOAL_TEMPLATES, moment.templateId)
    case 'opponentGoal':
      return pick(OPPONENT_GOAL_TEMPLATES, moment.templateId)
    case 'playerShot':
      return pick(PLAYER_SHOT_INTROS, moment.templateId)
    case 'playerFreeKick':
      return pick(PLAYER_FREEKICK_INTROS, moment.templateId)
    case 'playerPass':
      return pick(PLAYER_PASS_INTROS, moment.templateId)
    case 'opponentFreeKick':
      return pick(OPPONENT_FREEKICK_INTROS, moment.templateId)
    case 'fulltime':
      return 'Apita o juiz: fim de jogo!'
  }
}

export const passOptionLabel = (risk: PassRisk, templateId: number): string =>
  pick(PASS_OPTION_LABELS[risk], templateId)
