import type { JogadaId } from '../engine/decision/catalog'
import type { Desfecho } from '../engine/decision/outcomes'
import type { MatchMoment } from '../engine/match/types'
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

export const TACTIC_LINES = {
  theirGoalCancelled: 'A MURALHA SEGUROU! A postura recuada travou o ataque deles.',
  ourGoalCancelled: 'A chance veio, mas com o time fechado faltou gente na área. Desperdiçada.',
  extraTeamGoal: 'CONTRA-ATAQUE FULMINANTE! Três toques e GOL NOSSO na transição!',
  extraOpponentGoal: 'Vacilo na saída… eles roubam e marcam no contra-golpe.',
  changed: {
    equilibrado: 'O técnico equilibra as linhas. Jogo normal.',
    recuar: 'Ordem da beira do campo: TODO MUNDO ATRÁS DA LINHA DA BOLA!',
    'contra-ataque': 'O técnico manda baixar o bloco e sair em velocidade. Armadilha montada.',
  },
} as const

export const DEFENSE_RESULT_LINES = {
  saved: ['DEFESAÇA! O goleiro voa no ângulo e salva o time! O alambrado explode!'],
  conceded: ['Gol deles… a cobrança morreu no canto e não deu nem pra ver.'],
} as const

export const PLAYER_DECISION_INTROS: readonly string[] = [
  'Você domina no meio e a marcação fecha. O que faz?',
  'Bola nos seus pés e o campo aberto na sua frente.',
  'Você recebe de costas e gira. O que fazer com ela?',
  'Contra-ataque! Você conduz e o time acompanha. Escolhe!',
]

/** Nome de cada jogada do catálogo. A engine só conhece o id. */
export const JOGADA_LABELS: Record<JogadaId, string> = {
  'driblar-zaga': 'Driblar a zaga e chute colocado',
  'caneta-zagueiro': 'Caneta no zagueiro e entrar na área',
  'voleio-de-fora': 'Voleio de fora da área',
  'girar-e-finalizar': 'Girar em cima do marcador e finalizar',
  'tabela-e-infiltrar': 'Tabela com o meia e infiltrar',
  'toque-de-primeira': 'Toque de primeira no atacante',
  'lancamento-nas-costas': 'Lançamento nas costas da zaga',
  'cruzamento-rasteiro': 'Cruzamento rasteiro na pequena área',
  'chutar-de-fora': 'Chutar de fora da área',
  'segunda-trave': 'Cobrança na segunda trave',
  'devolver-capitao': 'Devolver pro capitão e reposicionar',
  'segurar-a-bola': 'Segurar a bola e esperar apoio',
  'cavar-a-falta': 'Cavar a falta na entrada da área',
  'recuar-pro-goleiro': 'Recuar pro goleiro e recomeçar',
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

/**
 * Narração com dois autores. O gol de assistência é o primeiro lance do jogo
 * que precisa nomear duas pessoas — quem inventou e quem finalizou — e até
 * aqui todo template tinha um marcador só.
 */
export const withAssist = (text: string, name: string, finalizador: string): string =>
  withName(text, name).replaceAll('{mate}', finalizador)

/** A dividida que a sorte resolve — abertura do lance de dados. */
export const DICE_DUEL_TEMPLATES: readonly string[] = [
  'Dividida na área! Ninguém quer sair de perto — isso aqui vai no grito.',
  'Bate-rebate na pequena área! É pura sorte agora.',
  'Confusão danada na área: sobra pra quem quiser mais.',
  'A bola fica solta no meio da zona! Quem tiver mais sangue leva.',
]

/**
 * Fecho de cada desfecho da decisão. `chance` tem duas saídas porque a jogada
 * boa depende do companheiro: criar e ver o time converter é assistência,
 * criar e ver o time perder é só nota.
 */
export const DECISION_RESULT_LINES: Record<Desfecho, string> = {
  gol: 'DEU CERTO E DEU GOL! {name} resolveu do jeito mais difícil!',
  chance: 'Jogada linda de {name}! A chance nasceu ali.',
  nada: 'A jogada não vingou, mas ninguém saiu no prejuízo.',
  perdeu: 'A bola foi interceptada… {name} prometeu demais nessa.',
  contra: 'PERDEU A BOLA E DEU CONTRA-ATAQUE! Eles não perdoaram.',
}

/** Assistência: nomeia quem passou e quem finalizou. */
export const DECISION_ASSIST_LINE = 'GOL! {mate} completa a jogada que {name} inventou — assistência!'
export const DECISION_CHANCE_WASTED_LINE =
  '{name} deixou na mão e o companheiro isolou. Que desperdício.'

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
    case 'diceDuel':
      return pick(DICE_DUEL_TEMPLATES, moment.templateId)
    case 'playerShot':
      return pick(PLAYER_SHOT_INTROS, moment.templateId)
    case 'playerFreeKick':
      return pick(PLAYER_FREEKICK_INTROS, moment.templateId)
    case 'playerDecision':
      return pick(PLAYER_DECISION_INTROS, moment.templateId)
    case 'opponentFreeKick':
      return pick(OPPONENT_FREEKICK_INTROS, moment.templateId)
    case 'fulltime':
      return 'Apita o juiz: fim de jogo!'
  }
}

export const jogadaLabel = (id: JogadaId): string => JOGADA_LABELS[id]

/** Linhas da simulação automática ("Simular até o final"). */
export const SIM_LINES = {
  start: 'Técnico manda tocar o jogo — simulando até o apito final.',
  shotGoal: 'GOL DE {name} na simulação! A torcida nem viu direito e já festeja.',
  shotMiss: '{name} finaliza, mas o goleiro fica com ela.',
  decisionGoal: 'GOL DE {name} na simulação! A decisão certa na hora certa.',
  decisionChance: 'Jogada de {name} deixa o companheiro na cara do gol.',
  decisionNothing: 'Jogada de {name} não vinga, mas nada se perde.',
  decisionLost: 'Bola de {name} interceptada no meio do caminho.',
  decisionCounter: 'Perda de bola de {name} e eles matam no contra-ataque.',
  defenseSave: 'DEFENDEU! {name} espalma a falta perigosa.',
  defenseConcede: 'Gol deles… a falta morreu no canto e {name} não alcançou.',
  planTeamGoal: 'GOL DO TIME! A jogada trabalhada termina na rede.',
  planOpponentGoal: 'Gol do adversário no lance armado. Jogo duro.',
} as const
