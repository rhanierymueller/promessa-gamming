import type { JogadaId } from '../engine/decision/catalog'
import type { Desfecho } from '../engine/decision/outcomes'
import type { MatchMoment } from '../engine/match/types'
import type { ShotOutcomeKind } from '../engine/shot/types'

/**
 * Todo texto do jogo vive aqui, fora da engine — trocável sem tocar em lógica
 * (mesma regra da database de clubes/nomes; ver Stack e Arquitetura no vault).
 */

export const COMMENTARY_TEMPLATES: readonly string[] = [
  '{name} volta para buscar e gira o jogo. O time tenta encontrar espaço.',
  '{mate} recebe aberto, levanta a cabeça e prefere o passe por dentro.',
  '{rival} chega atrasado em {name}. O juiz olha de perto e manda seguir.',
  'A bola fica presa na lateral. {mate} se aproxima para dar opção.',
  '{name} aperta a saída e obriga o adversário a rifar a bola.',
  '{rival} tenta acelerar pelo meio, mas a marcação fecha a porta.',
  '{mate} ganha a segunda bola e o time volta a ocupar o campo de ataque.',
  'O jogo perde velocidade por alguns segundos. {name} pede calma.',
]

export const TEAM_GOAL_TEMPLATES: readonly string[] = [
  'GOOOOL! {mate} acompanha o rebote e manda para a rede!',
  'GOL DO TIME! {mate} sobe entre os zagueiros e cabeceia no canto!',
  'QUE GOLAÇO! {mate} pega de fora da área e acerta o ângulo!',
]

export const OPPONENT_GOAL_TEMPLATES: readonly string[] = [
  'Gol deles. {rival} dispara no contra-ataque e bate na saída do goleiro.',
  '{rival} aparece livre entre os zagueiros e abre o placar para o adversário.',
  'Gol do adversário. Na bola parada, {rival} ganha no alto e não perdoa.',
]

export const PLAYER_SHOT_INTROS: readonly string[] = [
  'A sobra fica com {name} na entrada da área. É a chance!',
  '{name} ganha do marcador e invade o espaço. Pode bater!',
  '{name} tabela no bico da área e recebe de frente para o gol!',
  'O goleiro dá rebote e a bola cai no pé de {name}!',
]

export const PLAYER_FREEKICK_INTROS: readonly string[] = [
  'Falta perigosa! {name} coloca a bola no chão enquanto a barreira se arruma.',
  'O juiz marca na entrada da área. {name} já mede a distância.',
  'Falta! O goleiro organiza a barreira e {name} escolhe o canto.',
  'A torcida aumenta o volume. {name} respira fundo para a cobrança.',
]

export const WALL_BLOCK_LINE = 'NA BARREIRA! A bola explode nos marcadores e a chance morre ali.'

export const OPPONENT_FREEKICK_INTROS: readonly string[] = [
  'Falta perigosa para eles. {rival} ajeita a bola e olha para o gol.',
  'O juiz marca falta na sua área. Agora é com o goleiro — e com você.',
  '{rival} toma distância para a cobrança. Leia o canto e mergulhe!',
  'Eles têm uma falta na entrada da área. {rival} vai para a bola.',
]

export const TACTIC_LINES = {
  theirGoalCancelled: 'A MURALHA SEGUROU! A postura recuada travou o ataque deles.',
  ourGoalCancelled: 'A chance veio, mas com o time fechado faltou gente na área. Desperdiçada.',
  extraTeamGoal: 'Contra-ataque rápido! {mate} recebe na frente e faz o gol!',
  extraOpponentGoal: 'Perda na saída. {rival} rouba, avança e marca para eles.',
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
  '{name} domina no meio e a marcação fecha. O que fazer?',
  'Bola no pé de {name}, com campo aberto pela frente.',
  '{name} recebe de costas, gira e procura a melhor jogada.',
  'Contra-ataque! {name} conduz e o time acompanha.',
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
 * Narração com mais de um autor.
 *
 * Até a decisão existir, todo template do jogo tinha um marcador só. Um lance
 * de decisão nomeia até três pessoas: quem inventou (`{name}`), quem finalizou
 * (`{mate}`) e quem castigou no contra-ataque (`{rival}`). Narração de futebol
 * é feita de nomes — sem eles o texto vira legenda.
 */
export const withCast = (
  text: string,
  cast: { readonly name: string; readonly mate?: string; readonly rival?: string },
): string =>
  withName(text, cast.name)
    .replaceAll('{mate}', cast.mate ?? 'o companheiro')
    .replaceAll('{rival}', cast.rival ?? 'o camisa 9 deles')

/** A dividida que a sorte resolve — abertura do lance de dados. */
export const DICE_DUEL_TEMPLATES: readonly string[] = [
  'Dividida na área! Ninguém quer sair de perto — isso aqui vai no grito.',
  'Bate-rebate na pequena área! É pura sorte agora.',
  'Confusão danada na área: sobra pra quem quiser mais.',
  'A bola fica solta no meio da zona! Quem tiver mais sangue leva.',
]

/**
 * A narração da decisão vem em DUAS batidas.
 *
 * A primeira é o lance: o que o campo mostra no instante em que você escolhe.
 * A segunda, quando existe, é o gol — e essa espera a bola entrar na rede de
 * verdade, junto com a coreografia da mesa tática.
 *
 * Sem a primeira batida, um contra-ataque sofrido virava não-sequência: você
 * clicava, não lia nada, e segundos depois aparecia um gol adversário no mapa
 * sem explicação nenhuma. Agora o texto arma o lance antes de o campo cobrar.
 */

type AcaoDaJogada = {
  /** A jogada saiu como você queria. */
  readonly bem: string
  /** Saiu, mas não deu em nada. */
  readonly neutro: string
  /** Perdeu a bola. */
  readonly mal: string
}

export const JOGADA_ACOES: Record<JogadaId, AcaoDaJogada> = {
  'driblar-zaga': {
    bem: '{name} encara o zagueiro, passa por dentro e a área abre!',
    neutro: '{name} tenta o drible, a zaga fecha e a bola sai pela linha de fundo.',
    mal: 'O zagueiro adivinhou o drible e tirou o pé de {name}. Bola deles.',
  },
  'caneta-zagueiro': {
    bem: 'CANETA! {name} passa a bola entre as pernas do marcador e entra na área!',
    neutro: 'A caneta de {name} bate na canela do zagueiro e a sobra fica com o goleiro.',
    mal: 'A caneta não passou. O zagueiro roubou e saiu jogando.',
  },
  'voleio-de-fora': {
    bem: '{name} não deixa a bola cair e pega de voleio — saiu FORTE!',
    neutro: '{name} pega de voleio e manda por cima do travessão. Quase.',
    mal: '{name} erra o tempo do voleio, chuta o ar e a bola passa direto.',
  },
  'girar-e-finalizar': {
    bem: '{name} gira em cima do marcador e já sai batendo!',
    neutro: '{name} gira, bate torto e a bola vai pra arquibancada.',
    mal: '{name} demorou no giro e o volante deles chegou junto. Perdeu.',
  },
  'tabela-e-infiltrar': {
    bem: '{name} tabela de primeira com {mate} e aparece livre por dentro!',
    neutro: 'A tabela sai, mas {name} chega atrasado e o goleiro abafa.',
    mal: 'A tabela não voltou — interceptaram no meio do caminho.',
  },
  'toque-de-primeira': {
    bem: '{name} toca de primeira para {mate}, no tempo exato. Jogada armada!',
    neutro: '{name} toca de primeira, mas a bola sai forte e ninguém alcança.',
    mal: 'O toque de {name} saiu fraco e o marcador chegou primeiro.',
  },
  'lancamento-nas-costas': {
    bem: '{name} vê o buraco e lança nas costas da zaga. {mate} dispara!',
    neutro: 'O lançamento de {name} passa longo e morre no tiro de meta.',
    mal: 'O zagueiro leu o lançamento de {name} e cortou de cabeça.',
  },
  'cruzamento-rasteiro': {
    bem: '{name} cruza rasteiro. A bola passa pela pequena área e chega em {mate}!',
    neutro: 'A bola de {name} atravessa a área inteira e ninguém apareceu.',
    mal: 'O cruzamento de {name} bate no primeiro marcador e volta.',
  },
  'chutar-de-fora': {
    bem: '{name} arruma o corpo e mete de fora — vai com veneno!',
    neutro: '{name} chuta de longe e a bola sobe demais. Tiro de meta.',
    mal: 'A perna de {name} foi travada na hora do chute e a bola sobrou pra eles.',
  },
  'segunda-trave': {
    bem: '{name} cobra na segunda trave e encontra {mate} livre!',
    neutro: 'A cobrança de {name} passa por todo mundo e sai do outro lado.',
    mal: '{name} bate mal e a defesa afasta com folga.',
  },
  'devolver-capitao': {
    bem: '{name} devolve pro capitão e já sobe pra receber de novo.',
    neutro: '{name} devolve, o time recompõe e o jogo recomeça de trás.',
    mal: 'A devolução de {name} saiu curta e deu pressão em cima.',
  },
  'segurar-a-bola': {
    bem: '{name} segura a bola, espera o apoio e o time chega junto.',
    neutro: '{name} protege a bola de costas e o juiz manda seguir.',
    mal: '{name} segurou demais e levou o carrinho por trás.',
  },
  'cavar-a-falta': {
    bem: '{name} entra na frente do zagueiro e GANHA a falta! Bola parada boa.',
    neutro: '{name} procura o contato, o juiz manda seguir e o lance morre.',
    mal: 'O juiz não comprou: {name} caiu sozinho e a bola é deles.',
  },
  'recuar-pro-goleiro': {
    bem: '{name} recua pro goleiro sem pressa. O time inteiro respira.',
    neutro: 'Bola no goleiro, jogo reiniciado lá de trás.',
    mal: 'O recuo de {name} saiu no meio da área! Que sufoco.',
  },
}

/** Segunda batida: entra junto com a bola na rede. */
export const DECISION_GOAL_LINES: readonly string[] = [
  'GOOOOL DE {name}! A finalização sai cruzada e morre no canto!',
  'É GOL! {name} bate firme, sem qualquer chance para o goleiro!',
  'GOL DE {name}! A bola toca na trave antes de entrar!',
  '{name} manda para a rede! O goleiro ainda toca nela, mas não evita o gol!',
]

export const DECISION_ASSIST_LINES: readonly string[] = [
  'GOOOOL! {mate} só completa. O passe de {name} desmontou a defesa!',
  '{mate} bate de primeira e marca! Assistência de {name}!',
  'GOL DO TIME! {name} encontra {mate} livre dentro da área!',
  '{mate} manda para a rede! A jogada e a assistência são de {name}!',
]

export const DECISION_COUNTER_LINES: readonly string[] = [
  'Gol deles. {rival} recebe no contra-ataque e bate na saída do goleiro.',
  'O castigo vem em três passes. {rival} completa para a rede.',
  '{rival} aparece sozinho na área e transforma a perda de bola em gol.',
  'Contra-ataque fatal. {rival} avança sem marcação e marca.',
]

export const DECISION_CHANCE_WASTED_LINES: readonly string[] = [
  'Que chance! {mate} recebe de frente para o gol e manda por cima.',
  '{name} deixa {mate} livre, mas a finalização sai para fora.',
  'O passe de {name} encontra {mate}, e o goleiro salva o adversário.',
]

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

/**
 * Primeira batida da decisão: o lance em si.
 *
 * `gol` e `chance` contam a mesma ação — do ponto de vista do campo a jogada
 * saiu igual, e o que muda é quem terminou. `perdeu` e `contra` também: a bola
 * é perdida do mesmo jeito, e só depois se sabe se virou castigo.
 */
export const acaoDaJogada = (id: JogadaId, desfecho: Desfecho): string => {
  const acoes = JOGADA_ACOES[id]
  if (desfecho === 'gol' || desfecho === 'chance') return acoes.bem
  if (desfecho === 'nada') return acoes.neutro
  return acoes.mal
}

/** Segunda batida: o gol, a assistência, o castigo ou a chance jogada fora. */
export const fechoDaDecisao = (
  desfecho: Desfecho,
  convertida: boolean,
  variacao: number,
): string | null => {
  if (desfecho === 'gol') return pick(DECISION_GOAL_LINES, variacao)
  if (desfecho === 'contra') return pick(DECISION_COUNTER_LINES, variacao)
  if (desfecho === 'chance') {
    return convertida
      ? pick(DECISION_ASSIST_LINES, variacao)
      : pick(DECISION_CHANCE_WASTED_LINES, variacao)
  }
  return null
}

/** Linhas da simulação automática ("Simular até o final"). */
export const SIM_LINES = {
  start: 'Técnico manda tocar o jogo — simulando até o apito final.',
  shotGoal: 'GOL DE {name} na simulação! A torcida nem viu direito e já festeja.',
  shotMiss: '{name} finaliza, mas o goleiro fica com ela.',
  decisionGoal: 'GOL DE {name} na simulação! A decisão certa na hora certa.',
  decisionChance: 'Jogada de {name} deixa {mate} na cara do gol.',
  decisionNothing: 'Jogada de {name} não vinga, mas nada se perde.',
  decisionLost: 'Bola de {name} interceptada no meio do caminho.',
  decisionCounter: 'Perda de bola de {name}, e {rival} marca no contra-ataque.',
  defenseSave: 'DEFENDEU! {name} espalma a falta perigosa.',
  defenseConcede: 'Gol deles… a falta morreu no canto e {name} não alcançou.',
  planTeamGoal: 'GOL DO TIME! {mate} completa a jogada trabalhada.',
  planOpponentGoal: 'Gol do adversário. {rival} aparece livre no lance armado.',
} as const
