import { blockbusterOfTheYear } from '../market/aiTransfers'
import { formatMoney } from '../market/market'
import { DIVISION_NAMES, divisionOf } from '../pyramid/pyramid'
import { computeTable, recentForm, tablePosition } from '../season/season'
import { nationById } from '../../data/nations'
import { clubDisplayName, type PlayerSave } from '../../state/save'
import { matchQuotes, pickVariant, type QuoteSpeaker } from './quotes'
import { applyGender } from './gender'
import type { PlayerGender } from '../../state/save'

/**
 * Central de notícias da Home: manchetes derivadas do que REALMENTE
 * aconteceu — resultado, sua nota, tabela, forma, acesso/queda e copa.
 * Determinístico: mesmo save, mesmas notícias.
 */

export type NewsSource =
  | 'reporter'
  | 'olheiro'
  | 'agente'
  | 'comentarista'
  | 'clube'
  | 'jogador'
  | 'declaracao'

export interface NewsItem {
  readonly id: string
  readonly source: NewsSource
  /** Contexto visual da notícia, para clube e seleção não compartilharem escudo/nome. */
  readonly context: 'clube' | 'selecao'
  /** Chapéu da notícia (quem fala). */
  readonly kicker: string
  readonly headline: string
  readonly body: string
  /** Quem falou, quando a notícia é entrevista — a foto vem do id dele. */
  readonly speaker?: QuoteSpeaker
}

const KICKERS: Record<NewsSource, string> = {
  reporter: 'Plantão da rodada',
  olheiro: 'Caderno do olheiro',
  agente: 'Bastidores',
  comentarista: 'Mesa redonda',
  clube: 'Nota oficial',
  jogador: 'Craque em foco',
  declaracao: 'Zona mista',
}

// o feed comporta mais manchetes agora que existem entrevistas do pós-jogo
export const MAX_NEWS = 8

/** Passa título e corpo pela concordância de gênero. */
const withGender = (items: readonly NewsItem[], gender: PlayerGender): readonly NewsItem[] =>
  items.map((item) => ({
    ...item,
    headline: applyGender(item.headline, gender),
    body: applyGender(item.body, gender),
  }))
const GREAT_RATING = 8
const AWFUL_RATING = 4.5
const STRIKER_GOALS = 2
const STREAK = 3
const ROUT_MARGIN = 3

const item = (
  id: string,
  source: NewsSource,
  headline: string,
  body: string,
  context: NewsItem['context'] = 'clube',
): NewsItem => ({
  id,
  source,
  context,
  kicker: KICKERS[source],
  headline,
  body,
})

/** Nome do rival — clube da liga OU seleção (ids `nation-*`). */
const rivalName = (save: PlayerSave, opponentId: string): string =>
  opponentId.startsWith('nation-')
    ? nationById(opponentId.slice('nation-'.length))?.name ?? 'Seleção rival'
    : clubDisplayName(save, opponentId)

export const newsFor = (save: PlayerSave): readonly NewsItem[] => {
  const news: NewsItem[] = []
  // semente estável da rodada: as falas variam entre jogos, não a cada render
  const lastMatch = save.history[save.history.length - 1]
  const seed =
    ((lastMatch?.playedAt ?? 0) ^ Math.imul(save.season.currentRound + 1, 0x9e3779b9)) >>> 0
  const team = clubDisplayName(save, save.clubId)
  const division = DIVISION_NAMES[divisionOf(save.divisions, save.clubId)] ?? 'Série D'

  if (save.divisionMovement === 'up') {
    news.push(item('acesso', 'clube', `ACESSO! ${team} está na ${division}`,
      `A diretoria confirma: campanha histórica e festa na cidade. A ${division} que se prepare.`))
  }
  if (save.divisionMovement === 'down') {
    news.push(item('queda', 'reporter', `${team} cai para a ${division}`,
      'Vestiário em silêncio e torcida cobrando resposta. A reconstrução começa agora.'))
  }

  const last = save.history[save.history.length - 1]
  if (last) {
    const lastContext = last.competition === 'selecao' ? 'selecao' : 'clube'
    const lastTeam =
      lastContext === 'selecao'
        ? nationById(save.nationalityId)?.name ?? 'Seleção'
        : team
    const rival = rivalName(save, last.opponentId)
    const score = `${last.teamGoals}×${last.opponentGoals}`
    if (last.teamGoals > last.opponentGoals) {
      news.push(item('ultimo-vitoria', 'clube', `VITÓRIA! ${lastTeam} ${score} ${rival}`,
        lastContext === 'selecao'
          ? `Vitória do ${lastTeam} e festa no país. A seleção segue firme no torneio.`
          : pickVariant([
              `Três pontos na conta e clima leve no treino. O ${lastTeam} segue firme na temporada.`,
              `Arquibancada cantando até o fim. O ${lastTeam} não deu chance ao ${rival}.`,
              `Vitória construída com posse e paciência. O ${lastTeam} mostrou personalidade.`,
              `O ${rival} veio pressionar e voltou pra casa sem resposta. Noite redonda.`,
            ], seed) ?? '',
        lastContext))
    } else if (last.teamGoals < last.opponentGoals) {
      news.push(item('ultimo-derrota', 'reporter', `${rival} vence: ${lastTeam} cai por ${score}`,
        lastContext === 'selecao'
          ? 'Resultado ruim no torneio de seleções — a resposta precisa vir já no próximo jogo.'
          : pickVariant([
              'Resultado ruim, mas campeonato é maratona — a resposta precisa vir já na próxima rodada.',
              `Saída de campo sob vaias. O ${lastTeam} sabia o peso do jogo e não entregou.`,
              `O ${rival} soube sofrer e matou no contra-ataque. Lição cara pro ${lastTeam}.`,
              'Semana longa pela frente: o professor prometeu conversa franca no CT.',
            ], seed) ?? '',
        lastContext))
    } else {
      news.push(item('ultimo-empate', 'reporter', `${lastTeam} ${score} ${rival}: sabor de pouco`,
        lastContext === 'selecao'
          ? 'Empate que mantém o torneio aberto, mas a torcida esperava mais da seleção.'
          : 'Um ponto que mantém a rodada viva, mas a arquibancada queria mais.',
        lastContext))
    }

    const nota = last.rating.toFixed(1)
    if (last.rating >= GREAT_RATING) {
      news.push(item('olheiro-elogio', 'olheiro',
        pickVariant([
          `Anotei o nome: ${save.playerName}`,
          `Relatório entregue: ${save.playerName}`,
          `Fui ver o jogo por causa {dele}`,
          `${save.playerName} entrou no meu caderno`,
        ], seed) ?? `Anotei o nome: ${save.playerName}`,
        pickVariant([
          `Nota ${nota} contra o ${rival}. Decide, aparece e não se esconde. Vale o ingresso.`,
          `Nota ${nota}. Rodei três estados este mês e não vi ninguém dessa idade jogar assim.`,
          `Contra o ${rival} {ele} pediu a bola quando o jogo pesou. Isso não se ensina.`,
          `Nota ${nota} e uma leitura de jogo que assusta. Já liguei pro clube grande.`,
          `Não é só o talento: é a cabeça. Contra o ${rival} {ele} nunca sumiu.`,
        ], seed) ?? '',
        lastContext))
    }
    if (last.rating <= AWFUL_RATING) {
      news.push(item('comentarista-critica', 'comentarista',
        pickVariant([
          `${save.playerName} deve mais`,
          `Cadê o ${save.playerName}?`,
          `Noite de apagão de ${save.playerName}`,
        ], seed) ?? `${save.playerName} deve mais`,
        pickVariant([
          `Nota ${nota} não paga o talento que {ele} tem. Craque joga TODO dia, não quando quer.`,
          `Nota ${nota} contra o ${rival}. Sumiu do jogo e ninguém sentiu falta — isso é grave.`,
          `Talento não é desculpa pra jogo fraco. Nota ${nota} é pouco pra quem quer ser referência.`,
        ], seed) ?? '',
        lastContext))
    }
    if (last.playerGoals >= STRIKER_GOALS) {
      news.push(item('artilheiro', 'jogador',
        pickVariant([
          `${last.playerGoals} gols: noite de {artilheiro}`,
          `${save.playerName} faz ${last.playerGoals} e cala o ${rival}`,
          `Show de ${last.playerGoals}: a bola era {dele}`,
        ], seed) ?? `${last.playerGoals} gols: noite de {artilheiro}`,
        pickVariant([
          `${save.playerName} resolveu contra o ${rival} e a torcida já grita o nome {dele} no alambrado.`,
          `Faltou combinar com ${save.playerName}: o ${rival} montou o plano e ele fez ${last.playerGoals} assim mesmo.`,
          `Bola parada, jogada trabalhada, sobra na área — ${save.playerName} fez de tudo contra o ${rival}.`,
        ], seed) ?? '',
        lastContext))
    }
    // zona mista: companheiro e adversário comentam, com o rosto de cada um
    for (const quote of matchQuotes(save)) {
      news.push({
        id: quote.id,
        source: 'declaracao',
        context: lastContext,
        kicker: quote.headline,
        headline: `${quote.speaker.name} · ${clubDisplayName(save, quote.speaker.clubId)}`,
        body: quote.body,
        speaker: quote.speaker,
      })
    }
  } else {
    news.push(item('estreia', 'agente', `A promessa ${save.playerName} chega ao ${team}`,
      `Aos ${save.playerAge} anos, assina com o ${team} na ${division}. O plano: subir de divisão e vestir a camisa da seleção.`))
  }

  // mercado dos grandes: quando um rival de A/B anuncia um craque 80+, é manchete
  const bomb = blockbusterOfTheYear(save.divisions, save.careerYear, save.clubId)
  if (bomb) {
    news.push(item('mercado-bomba', 'agente', `BOMBA: ${clubDisplayName(save, bomb.clubId)} anuncia ${bomb.signing.name}`,
      `${bomb.signing.baseAge} anos, overall ${bomb.overallAtSigning}, por ${formatMoney(bomb.signing.price)}. O mercado parou para olhar.`))
  }

  if (save.season.currentRound > 0) {
    // a liga não gira só em volta de você: o destaque da rodada dos OUTROS
    const round = save.season.currentRound - 1
    const others = save.season.results.filter(
      (result) =>
        result.round === round && result.homeId !== save.clubId && result.awayId !== save.clubId,
    )
    if (others.length > 0) {
      const featured = [...others].sort(
        (a, b) =>
          Math.abs(b.homeGoals - b.awayGoals) - Math.abs(a.homeGoals - a.awayGoals) ||
          b.homeGoals + b.awayGoals - (a.homeGoals + a.awayGoals),
      )[0]
      const home = clubDisplayName(save, featured.homeId)
      const away = clubDisplayName(save, featured.awayId)
      const score = `${featured.homeGoals}×${featured.awayGoals}`
      const margin = Math.abs(featured.homeGoals - featured.awayGoals)
      const winner = featured.homeGoals >= featured.awayGoals ? home : away
      const loser = winner === home ? away : home
      if (margin >= ROUT_MARGIN) {
        news.push(item('rodada-destaque', 'reporter', `${winner} ATROPELA: ${score} no ${loser}`,
          `A goleada da rodada na ${division} assustou a concorrência. Alguém segura esse time?`))
      } else if (margin === 0 && featured.homeGoals + featured.awayGoals >= 4) {
        news.push(item('rodada-destaque', 'reporter', `Chuva de gols: ${home} ${score} ${away}`,
          `Empate maluco na ${division} — defesas passaram longe do combinado.`))
      } else {
        news.push(item('rodada-destaque', 'reporter', `Pela rodada: ${home} ${score} ${away}`,
          `O resultado mexe com a tabela da ${division}. Todo ponto vai fazer falta lá na frente.`))
      }
    }

    const leader = computeTable(save.season)[0]
    if (leader && leader.clubId !== save.clubId) {
      news.push(item('lider-rival', 'olheiro', `${clubDisplayName(save, leader.clubId)} lidera a ${division}`,
        `${leader.points} pontos e pouca conversa. É o time a ser batido — e alguém precisa avisar que o ${team} está chegando.`))
    }

    const position = tablePosition(save.season, save.clubId)
    if (position === 1) {
      news.push(item('lider', 'clube', `${team} é o LÍDER da ${division}`,
        `Rodada ${save.season.currentRound} e ninguém acima. Agora é segurar a cabeça no lugar.`))
    } else if (position >= 11) {
      news.push(item('alerta-z4', 'comentarista', `${team} flerta com o perigo`,
        `${position}º lugar não dá. Tem que somar ponto JÁ, ou a conversa vira rebaixamento.`))
    }

    const form = recentForm(save.season, save.clubId, STREAK)
    if (form.length === STREAK && form.every((result) => result === 'V')) {
      news.push(item('embalo', 'clube', `${STREAK} vitórias seguidas: ${team} embalou`,
        'Sequência de dar inveja — o vestiário canta e o professor não quer saber de relaxamento.'))
    }
    if (form.length === STREAK && form.every((result) => result === 'D')) {
      news.push(item('crise', 'reporter', `${STREAK} derrotas: crise no ${team}?`,
        'A palavra proibida já ronda o clube. Só um resultado cala a mesa redonda.'))
    }
  }

  if (save.tournament?.stage === 'champion') {
    news.push(item('copa-campeao', 'jogador', `${save.playerName} CAMPEÃO pela seleção!`,
      'O país inteiro parou. A promessa virou realidade no palco mais alto.'))
  }
  if (save.tournament?.stage === 'eliminated') {
    news.push(item('copa-fim', 'reporter', 'Fim de linha na copa de seleções',
      'A seleção volta pra casa mais cedo — e o clube recebe o craque de volta.'))
  }

  // concordância com o gênero do atleta, feita na saída
  return withGender(news.slice(0, MAX_NEWS), save.appearance.gender)
}
