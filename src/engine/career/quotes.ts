import { clubById } from '../../data/clubs'
import { squadPlayersFor, USER_PLAYER_ID, type SquadPlayer } from '../squad/players'
import { clubDisplayName, type PlayerSave } from '../../state/save'
import { applyGender } from './gender'
import type { PlayerGender } from '../../state/save'

/**
 * Zona mista: depois do jogo, um companheiro e um adversário falam. As falas
 * saem de jogadores REAIS dos dois elencos — por isso a foto do rosto bate
 * com quem está falando. Determinístico: a mesma partida rende a mesma
 * entrevista, sem sortear de novo a cada renderização.
 */

export interface QuoteSpeaker {
  readonly playerId: string
  readonly name: string
  readonly clubId: string
}

export interface MatchQuote {
  readonly id: string
  readonly speaker: QuoteSpeaker
  readonly headline: string
  readonly body: string
}

/** Escolhe uma variação de forma estável para a mesma semente. */
export const pickVariant = <T>(options: readonly T[], seed: number): T | null => {
  if (options.length === 0) return null
  let hash = (seed ^ 0x9e3779b9) >>> 0
  hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b) >>> 0
  hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35) >>> 0
  return options[(hash >>> 0) % options.length]
}

/** {craque} = seu jogador · {rival} = clube adversário · {time} = clube do falante */
const TEAMMATE_WIN = [
  'Jogo {do} {craque}. {Ele} puxou o time nas costas contra o {rival} e a gente só acompanhou.',
  'Falei com {ele} no vestiário: enquanto {o} {craque} estiver assim, o {time} não tem teto.',
  'O {rival} veio pra segurar {ele} e não conseguiu. É diferenciado mesmo, sem exagero.',
  'A gente treina isso a semana toda, mas quem resolve é {o} {craque}. Merecido demais.',
  'Ganhar do {rival} fora de casa é difícil. Com {o} {craque} nesse nível, fica mais fácil.',
]

const TEAMMATE_LOSS = [
  'Foi ruim pra todo mundo. {O} {craque} tentou puxar, mas o {rival} foi melhor e ponto.',
  'Ninguém aqui se esconde. A gente devia mais pro torcedor do {time} hoje.',
  'Perder assim dói. Segunda-feira já estamos em campo corrigindo — começando por mim.',
  'O {rival} mereceu. Falar o quê? A resposta é trabalho, não entrevista.',
  'Cabeça erguida. Se tem um {cara} que vai levantar esse grupo, é {o} {craque}.',
]

const TEAMMATE_DRAW = [
  'Empate ruim. Criamos com {o} {craque}, mas faltou o último passe contra o {rival}.',
  'Um ponto fora não é o fim, mas o {time} tinha jogo pra ganhar hoje.',
  'A gente sai incomodado. {O} {craque} fez a parte {dele}; o resto precisa acompanhar.',
  'O {rival} se fechou e a gente não teve paciência. Aprendizado.',
]

const OPPONENT_WIN = [
  'Estudamos {o} {craque} a semana toda. No fim, {ele} apareceu do mesmo jeito — parabéns pra {ele}.',
  'O {time} foi melhor, sem desculpa. Marcamos {o} {craque} e mesmo assim {ele} decidiu.',
  'Sabíamos do perigo que {o} {craque} oferece. Não conseguimos anular e pagamos caro.',
  'Time bom o {do} {craque}. Vamos reencontrar eles mais pra frente e a história pode mudar.',
]

const OPPONENT_LOSS = [
  'Viemos pra ganhar e ganhamos. {O} {craque} é bom, mas hoje o {time} foi mais time.',
  'Respeito {o} {craque}, joga muito. Só que a gente estudou e deu certo.',
  'Falaram tanto {do} {craque} que a gente entrou dobrando a marcação. Funcionou.',
  'Resultado justo. Quando o {time} joga assim, ninguém segura — nem {o} {craque}.',
]

const OPPONENT_DRAW = [
  'Empate justo. {O} {craque} é perigoso, seguramos o que dava e levamos um ponto.',
  'Viemos pra pontuar e pontuamos. Contra um time com {o} {craque}, não é pouco.',
  'Jogo duro. {O} {craque} apareceu, mas nossa defesa também mereceu o elogio.',
]

const HEADLINES_TEAMMATE = ['Na zona mista', 'Companheiro de vestiário', 'Fala do elenco']
const HEADLINES_OPPONENT = ['O outro lado', 'Do lado de lá', 'Adversário comenta']

const fill = (
  template: string,
  values: { craque: string; rival: string; time: string; gender: PlayerGender },
): string =>
  applyGender(
    template
      .replaceAll('{craque}', values.craque)
      .replaceAll('{rival}', values.rival)
      .replaceAll('{time}', values.time),
    values.gender,
  )

/** Um jogador do elenco que não seja o protagonista, escolhido de forma estável. */
const pickSpeaker = (squad: readonly SquadPlayer[], seed: number): SquadPlayer | null =>
  pickVariant(
    squad.filter((player) => player.id !== USER_PLAYER_ID),
    seed,
  )

const speakerOf = (player: SquadPlayer, clubId: string): QuoteSpeaker => ({
  playerId: player.id,
  name: player.name,
  clubId,
})

/**
 * As duas falas do pós-jogo: alguém do seu time e alguém do rival.
 * Vazio quando ainda não houve partida, ou quando o adversário é seleção
 * (o elenco de seleção não entra nesse recorte).
 */
export const matchQuotes = (save: PlayerSave): readonly MatchQuote[] => {
  const last = save.history[save.history.length - 1]
  if (!last) return []
  const myClub = clubById(save.clubId)
  const rivalClub = clubById(last.opponentId)
  if (!myClub || !rivalClub) return []

  const seed = (last.playedAt ^ Math.imul(save.season.currentRound + 1, 0x85ebca6b)) >>> 0
  const values = {
    craque: save.playerName,
    rival: clubDisplayName(save, rivalClub.id),
    time: clubDisplayName(save, myClub.id),
    gender: save.appearance.gender,
  }
  const won = last.teamGoals > last.opponentGoals
  const lost = last.teamGoals < last.opponentGoals

  const quotes: MatchQuote[] = []

  const mate = pickSpeaker(squadPlayersFor(myClub, save.careerYear, save.appearance.gender), seed)
  if (mate) {
    const pool = won ? TEAMMATE_WIN : lost ? TEAMMATE_LOSS : TEAMMATE_DRAW
    const body = pickVariant(pool, seed)
    if (body) {
      quotes.push({
        id: `fala-companheiro-${last.playedAt}`,
        speaker: speakerOf(mate, myClub.id),
        headline: pickVariant(HEADLINES_TEAMMATE, seed) ?? 'Na zona mista',
        body: fill(body, { ...values, time: values.time }),
      })
    }
  }

  const foe = pickSpeaker(squadPlayersFor(rivalClub, save.careerYear, save.appearance.gender), seed ^ 0x51ed2701)
  if (foe) {
    // do lado de lá, "time" é o clube DELE
    const pool = won ? OPPONENT_WIN : lost ? OPPONENT_LOSS : OPPONENT_DRAW
    const body = pickVariant(pool, seed ^ 0x51ed2701)
    if (body) {
      quotes.push({
        id: `fala-rival-${last.playedAt}`,
        speaker: speakerOf(foe, rivalClub.id),
        headline: pickVariant(HEADLINES_OPPONENT, seed) ?? 'O outro lado',
        body: fill(body, { ...values, time: won ? values.time : values.rival }),
      })
    }
  }

  return quotes
}
