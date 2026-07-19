import { DIVISION_NAMES, divisionOf } from '../pyramid/pyramid'
import { computeTable, recentForm, tablePosition } from '../season/season'
import { nationById } from '../../data/nations'
import { clubDisplayName, type PlayerSave } from '../../state/save'

/**
 * Central de notícias da Home: manchetes derivadas do que REALMENTE
 * aconteceu — resultado, sua nota, tabela, forma, acesso/queda e copa.
 * Determinístico: mesmo save, mesmas notícias.
 */

export type NewsSource = 'reporter' | 'olheiro' | 'agente' | 'comentarista' | 'clube' | 'jogador'

export interface NewsItem {
  readonly id: string
  readonly source: NewsSource
  /** Contexto visual da notícia, para clube e seleção não compartilharem escudo/nome. */
  readonly context: 'clube' | 'selecao'
  /** Chapéu da notícia (quem fala). */
  readonly kicker: string
  readonly headline: string
  readonly body: string
}

const KICKERS: Record<NewsSource, string> = {
  reporter: 'Plantão da rodada',
  olheiro: 'Caderno do olheiro',
  agente: 'Bastidores',
  comentarista: 'Mesa redonda',
  clube: 'Nota oficial',
  jogador: 'Craque em foco',
}

const MAX_NEWS = 5
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
          : `Três pontos na conta e clima leve no treino. O ${lastTeam} segue firme na temporada.`,
        lastContext))
    } else if (last.teamGoals < last.opponentGoals) {
      news.push(item('ultimo-derrota', 'reporter', `${rival} vence: ${lastTeam} cai por ${score}`,
        lastContext === 'selecao'
          ? 'Resultado ruim no torneio de seleções — a resposta precisa vir já no próximo jogo.'
          : 'Resultado ruim, mas campeonato é maratona — a resposta precisa vir já na próxima rodada.',
        lastContext))
    } else {
      news.push(item('ultimo-empate', 'reporter', `${lastTeam} ${score} ${rival}: sabor de pouco`,
        lastContext === 'selecao'
          ? 'Empate que mantém o torneio aberto, mas a torcida esperava mais da seleção.'
          : 'Um ponto que mantém a rodada viva, mas a arquibancada queria mais.',
        lastContext))
    }

    if (last.rating >= GREAT_RATING) {
      news.push(item('olheiro-elogio', 'olheiro', `Anotei o nome: ${save.playerName}`,
        `Nota ${last.rating.toFixed(1)} contra o ${rival}. Decide, aparece e não se esconde. Vale o ingresso.`,
        lastContext))
    }
    if (last.rating <= AWFUL_RATING) {
      news.push(item('comentarista-critica', 'comentarista', `${save.playerName} deve mais`,
        `Nota ${last.rating.toFixed(1)} não paga o talento que ele tem. Craque joga TODO dia, não quando quer.`,
        lastContext))
    }
    if (last.playerGoals >= STRIKER_GOALS) {
      news.push(item('artilheiro', 'jogador', `${last.playerGoals} gols: noite de artilheiro`,
        `${save.playerName} resolveu contra o ${rival} e a torcida já grita o nome dele no alambrado.`,
        lastContext))
    }
  } else {
    news.push(item('estreia', 'agente', `A promessa ${save.playerName} chega ao ${team}`,
      `Aos ${save.playerAge} anos, assina com o ${team} na ${division}. O plano: subir de divisão e vestir a camisa da seleção.`))
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

  return news.slice(0, MAX_NEWS)
}
