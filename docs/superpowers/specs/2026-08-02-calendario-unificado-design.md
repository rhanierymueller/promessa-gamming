# Calendário unificado — design

**Data:** 2026-08-02
**Branch:** feat/decisoes-da-partida

## O que é

Uma aba própria na barra inferior onde o jogador vê **todos os compromissos da
temporada**, de todas as competições, num lugar só: liga, Copa Libertados e a
copa de seleções da vez (Copa América, Copa do Mundo ou Liga das Nações). Cada
competição chega com identidade visual própria, para que a Libertados não se
confunda com uma rodada qualquer de sábado.

Hoje o calendário é uma sub-aba dentro de Liga e mostra pouco: a grade mensal
marca os jogos da liga, os dias da Libertados e **um único dia** para a copa de
seleções inteira — porque `tournamentDate` devolve uma data só, o primeiro
domingo de dezembro, para o torneio completo.

### Etapa 1 de 2

Este spec cobre só o **motor de compromissos e a tela**. A segunda etapa — o
relógio da carreira, com o botão de passar os dias e a animação estilo FIFA —
depende do motor daqui e ganha o próprio spec depois desta entrega.

O ponto de contato entre as duas é único e está marcado abaixo: hoje "o próximo
jogo" é o primeiro compromisso sem resultado; com o relógio, passa a ser o
primeiro depois da data corrente.

## Decisões tomadas

| Decisão | Escolha |
|---|---|
| Formato da tela | agenda cronológica no topo + grade do mês embaixo |
| Copa de seleções | data por jogo, como a Libertados — não mais um dia só |
| Identidade | faixa lateral colorida + taça + fundo suave, por competição |
| Sub-aba Calendário da Liga | removida; Liga fica com Tabela / Jogos / Amigos |
| Escopo temporal | a temporada corrente (é o que existe no save) |
| Ritmo da Libertados | quinzenal — já é assim, nada muda |

## 1. Motor: `engine/career/schedule.ts`

O cálculo de "quando é cada jogo" hoje está espalhado por três lugares que se
repetem: [SeasonCalendar.tsx](../../../src/ui/SeasonCalendar.tsx) monta a liga
num mapa, a Libertados noutro e a copa num terceiro caminho, e
[nextFixture.ts](../../../src/engine/career/nextFixture.ts) refaz parte da mesma
conta para a Home. Um módulo novo passa a ser a fonte única.

```ts
export type CompetitionId =
  | 'liga'
  | 'libertados'
  | 'copa-america'
  | 'copa-mundo'
  | 'liga-nacoes'

export interface ScheduledMatch {
  readonly competition: CompetitionId
  readonly date: CalendarDate
  /** "Rodada 3", "Fase de grupos", "Semifinal" — o que situa o jogo. */
  readonly stageLabel: string
  /** null enquanto o adversário não foi sorteado (copa antes do sorteio). */
  readonly opponentId: string | null
  readonly isHome: boolean
  /** Preenchido = já jogado. */
  readonly result: { readonly teamGoals: number; readonly opponentGoals: number } | null
}

/** Todos os compromissos da temporada, em ordem cronológica. */
export const seasonSchedule = (save: PlayerSave): readonly ScheduledMatch[]
```

Sem React e sem estado — recebe o save, devolve a lista ordenada por
`compareDates`. É onde vive toda a regra de "que jogos existem e quando".

### `nextFixture` passa a derivar daqui

```ts
export const nextFixture = (save: PlayerSave): ScheduledMatch | null =>
  seasonSchedule(save).find((match) => match.result === null) ?? null
```

Duas coisas se resolvem juntas: some a segunda implementação do mesmo cálculo, e
a Home passa a enxergar a copa de seleções — que hoje ela trata por um caminho
separado, fora de `nextFixture`.

O tipo de retorno muda de `NextFixture` (que só tem `kind` e `date`) para
`ScheduledMatch`, então os consumidores — `HomeTab` e o card de próximo jogo em
`App.tsx` — precisam acompanhar. O campo `kind: 'liga' | 'libertados'` vira
`competition`, com três valores a mais; quem hoje decide o visual do card por
`kind` passa a ler `COMPETITION_STYLES`. Ganho de tabela: o card grande da Home
ganha a identidade das copas de graça.

**Este é o ponto que a etapa 2 vai tocar.** Quando o save tiver data corrente, o
`find` troca de critério (primeiro compromisso a partir de hoje) e nada mais no
sistema precisa mudar.

## 2. Datas por jogo da copa de seleções

Hoje, em [calendar.ts](../../../src/engine/career/calendar.ts):

```ts
/** Data real do torneio de seleções (dezembro). */
export const tournamentDate = (careerYear: number): CalendarDate =>
  firstSundayOf(seasonYearFor(careerYear), 11)
```

Uma data para o torneio inteiro. A Libertados já resolveu esse problema com
`libertadosDate(careerYear, matchIndex)`; a copa de seleções ganha o par:

```ts
/** Dia do jogo `matchIndex` da copa de seleções: dezembro, de três em três dias. */
export const tournamentMatchDate = (careerYear: number, matchIndex: number): CalendarDate
```

Âncora no primeiro domingo de dezembro e passo de 3 dias. O pior caso cabe no
mês: primeiro domingo no dia 7, sete jogos, último no dia 25.

`tournamentDate` **continua existindo** como a data de abertura (`matchIndex` 0).
O teste "a edição da Libertados fecha antes do torneio de seleções" em
[calendar.test.ts](../../../src/engine/career/calendar.test.ts) segue valendo sem
alteração.

### Quantos jogos são

Depende do formato, porque `firstKnockoutStage` escolhe a primeira fase pelo
número de classificados:

| Competição | Grupos | Mata-mata | Total |
|---|---|---|---|
| Copa do Mundo | 3 rodadas | oitavas, quartas, semi, final | 7 |
| Copa América | 3 rodadas | semi, final | 5 |
| Liga das Nações | 3 rodadas | semi, final | 5 |

O mata-mata das seleções é **jogo único** (`knockoutPairs` monta pares diretos),
diferente da Libertados, que é ida e volta.

Em vez de uma fórmula de índice que precise saber o formato — a armadilha seria
copiar `libertadosMatchIndex`, que assume ida e volta —, o módulo monta a
sequência de fases daquele torneio e usa a posição nela:

```ts
/** Um compromisso da sequência: a fase e, nos grupos, qual das três rodadas. */
interface TournamentSlot {
  readonly stage: TournamentStage
  readonly round: number
}

/** Fases daquele torneio em ordem: as três rodadas de grupo e, depois, o
 *  mata-mata a partir de `firstKnockoutStage(state)`. */
const tournamentSlots = (state: TournamentState): readonly TournamentSlot[]
```

O índice do jogo é a posição na sequência. Formato novo ou mudança no número de
grupos não exige tocar na aritmética.

## 3. Navegação

Nova entrada em `TAB_ITEMS`, [App.tsx:210](../../../src/ui/App.tsx#L210), logo
depois de Início:

```ts
{ id: 'calendar', icon: CalendarDays, label: 'Calendário' }
```

A aba Liga cede o `CalendarDays` (agora é do Calendário) e fica com um ícone de
tabela. Suas sub-abas passam a ser **Tabela / Jogos / Amigos** —
`LeagueSection` em [MatchesTab.tsx:29](../../../src/ui/tabs/MatchesTab.tsx#L29)
perde `'calendario'`.

**Risco assumido:** a barra vai a 7 itens, e a 8 quando Seleção e Libertados
estão ativas ao mesmo tempo. Fica apertado. Não mexo nisso agora; se incomodar,
o caminho é as abas condicionais virarem atalhos dentro do Calendário — decisão
para depois da etapa 2, quando o Calendário já for a tela onde o tempo anda.

## 4. Componentes

O `SeasonCalendar` atual tem 229 linhas e mistura três responsabilidades: sabe
as datas, decide as cores e desenha a grade. Ele se dissolve:

| Arquivo | Papel | Depende de |
|---|---|---|
| `ui/tabs/CalendarTab.tsx` | monta agenda + grade | `seasonSchedule` |
| `ui/calendar/ScheduleAgenda.tsx` | a lista cronológica | `ScheduledMatch[]` |
| `ui/calendar/MonthGrid.tsx` | a grade do mês | `ScheduledMatch[]` |
| `ui/calendar/competitionStyle.ts` | identidade por competição | nada |

Nenhum deles recalcula data: todos recebem `ScheduledMatch[]` pronto. A grade
some do `MatchesTab` junto com a sub-aba.

## 5. Identidade por competição

```ts
interface CompetitionStyle {
  readonly name: string
  /** Faixa lateral e cor do rótulo. */
  readonly accent: string
  /** Fundo suave do card. */
  readonly tint: string
  readonly icon: LucideIcon
}

export const COMPETITION_STYLES: Record<CompetitionId, CompetitionStyle>
```

| Competição | Tratamento |
|---|---|
| Liga | neutro — é a maioria dos jogos, destacar cansa |
| Libertados | dourado `#f2c230` sobre verde escuro (a identidade que já existe em [libertados.css](../../../src/ui/styles/libertados.css#L41)) |
| Copa América | azul |
| Copa do Mundo | roxo e ouro |
| Liga das Nações | verde-azulado |

Agenda e grade leem a mesma tabela, então nunca divergem. **Criar um torneio
novo depois custa uma linha aqui.**

## 6. Comportamento da agenda

- Agrupada por mês, em ordem cronológica.
- Jogo já disputado: apagado, com o placar colorido pelas classes
  `fixture-win` / `fixture-draw` / `fixture-loss`, que já existem.
- Próximo jogo: destacado.
- Jogo futuro: escudo do adversário e "casa" ou "fora".
- Copa antes do sorteio (`opponentId === null`): a taça e a fase no lugar do
  adversário — "Copa América · 1ª rodada".

## 7. Testes

O grosso fica no motor, que é onde está a regra:

**`schedule.test.ts`**
- devolve os compromissos em ordem cronológica
- jogo passado vem com resultado; futuro, sem
- `opponentId` é `null` antes do sorteio da copa
- as três competições aparecem quando todas estão em jogo
- `nextFixture` é o primeiro sem resultado

**`calendar.test.ts`** (acrescentar)
- os jogos da copa de seleções caem todos em dezembro
- nenhum deles colide com data da Libertados
- `tournamentDate` continua sendo a data do primeiro jogo

**Tela**, no padrão de
[FormationBoard.test.tsx](../../../src/ui/FormationBoard.test.tsx)
(`renderToStaticMarkup`):
- cada jogo sai marcado com a competição certa
- jogo passado mostra placar; futuro mostra casa/fora
- jogo de copa sem sorteio mostra a fase, não um adversário vazio

## Fora de escopo

- O relógio da carreira, o botão de passar os dias e a animação (etapa 2).
- Compromissos de temporadas futuras: o save só tem a temporada corrente.
- Dias sem jogo com conteúdo próprio (treino, notícia, evento de vida) — isso é
  matéria da etapa 2.
- Reorganizar a barra de navegação.
