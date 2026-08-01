# Copa Libertados — design

**Data:** 2026-08-01
**Branch:** feat/decisoes-da-partida

## O que é

Uma competição continental de **clubes**, disputada em paralelo com a Série A. Os
quatro primeiros do Brasileirão de uma temporada ganham vaga na edição do ano
seguinte, onde enfrentam clubes de toda a América do Sul: fase de grupos e
mata-mata, sempre em ida e volta, de abril a setembro.

Hoje o jogo tem duas competições e elas nunca se cruzam: a liga acaba em abril e
a copa de seleções acontece num domingo isolado de dezembro. A Libertados é a
primeira competição que divide a temporada com outra — e é por isso que o
calendário muda junto com ela.

## Decisões tomadas

| Decisão | Escolha |
|---|---|
| Formato | 32 clubes, 8 grupos de 4 |
| Ida e volta | grupos **e** mata-mata inteiro, incluindo a final |
| Ritmo | quinzenal (uma quarta sim, outra não) |
| Início | sempre abril |
| Liga em ano de Libertados | sábados quinzenais em vez de 2 jogos por semana |
| Sorteio | quatro potes por força, visível na cerimônia de entrada |
| Edição sem o jogador | roda simulada, campeão vira notícia |

## 1. Catálogo de clubes

Novo arquivo `src/data/continentalClubs.ts`.

```ts
export interface ContinentalClub extends Club {
  /** País do clube — id de NATIONS. */
  readonly nationId: string
}
```

`ContinentalClub` estende o `Club` de [clubs.ts](../../../src/data/clubs.ts) sem
alterá-lo, então escudo, cores e o motor de partida funcionam sem adaptação.
`division` é sempre `0` (todos são clubes de primeira divisão do país deles) e
nunca entram na pirâmide brasileira — `initialDivisions`, `randomOpponent` e o
mercado continuam lendo só `CLUBS`.

**36 clubes, 4 por país**, em nove países: Argentina, Uruguai, Paraguai, Chile,
Colômbia, Equador, Peru, Bolívia e Venezuela. Cada edição sorteia 28 deles, então
o continente nunca aparece igual duas vezes.

Nomes ancorados em geografia, cultura e economia de cada país — nunca em clube
real, seguindo a mesma decisão jurídica dos clubes brasileiros. Exemplos:
*Atlético del Riachuelo* (Buenos Aires), *Club Charrúa* (Montevidéu),
*Deportivo Ñandutí* (Assunção), *Cordillera FC* (Santiago), *Deportivo Cafetero*
(Medellín), *Mitad del Mundo* (Quito), *Club Inti* (Lima), *Altiplano FC* (La
Paz), *Deportivo Orinoco* (Ciudad Guayana).

Força distribuída para o sorteio render potes cheios: 8 clubes força 5, 10 força
4, 10 força 3 e 8 força 2 — Argentina e Uruguai concentram os mais fortes,
Bolívia e Venezuela os mais fracos, como na competição real.

### Busca por id

`clubById` passa a procurar nos dois catálogos (pirâmide brasileira primeiro,
continental depois). É o que faz `ClubCrest`, `SeasonCalendar`, `MatchScreen` e o
histórico de partidas funcionarem com adversário estrangeiro sem mudança. Os ids
continentais levam prefixo `sa-` para nunca colidirem com os brasileiros.

### Nomes de jogadores

O gerador de elencos já sabe montar time estrangeiro — `foreignSquadFor` lê
[nationalNames.ts](../../../src/data/nationalNames.ts) — mas hoje só reconhece
**seleções**, pelo prefixo `nation-` do id. Sem ajuste, o Club Charrúa escalaria
"Zeca" e "Serrote". Duas mudanças:

1. `nationalityOf`, em [players.ts](../../../src/engine/squad/players.ts), passa
   a consultar o país no catálogo continental além do prefixo.
2. Entram três bancos de nomes — **Peru, Bolívia e Venezuela** — no mesmo
   formato dos existentes (16 nomes masculinos, 16 femininos, 16 sobrenomes).
   Os outros seis países já têm banco.

## 2. Escudos

Os escudos continuam gerados em SVG por
[ClubCrest.tsx](../../../src/ui/ClubCrest.tsx) a partir da direção de arte
declarada em [clubCrestIdentity.ts](../../../src/ui/clubCrestIdentity.ts):
`shield` + `pattern` + `emblem` + `plate`.

Os 44 emblemas atuais são todos brasileiros (mandacaru, cacau, babaçu, garoa).
Entram **oito novos**, desenhados no mesmo traço dos existentes:

| Emblema | Onde aparece |
|---|---|
| `condor` | Chile, Peru, Bolívia, Equador |
| `jaguar` | Paraguai, Venezuela |
| `volcano` | Equador, Chile |
| `harp` | Paraguai (a harpa é o símbolo nacional) |
| `llama` | Bolívia, Peru |
| `orchid` | Colômbia, Venezuela |
| `maize` | Peru, Bolívia |
| `cordillera` | Argentina, Chile |

Os 36 clubes recebem identidade **declarada** em `CLUB_CREST_IDENTITIES` — nenhum
cai no fallback por hash. Emblemas existentes que já servem ao continente
(`sun`, `anchor`, `wave`, `coffee`, `crystal`, `peak`, `bird`) são reaproveitados
onde couberem, para o traço do jogo continuar coeso.

## 3. Motor do torneio

Módulo novo em `src/engine/libertados/`. O
[tournament.ts](../../../src/engine/tournament/tournament.ts) das seleções não é
tocado: turno único e jogo único não se misturam com ida e volta sem virar um
emaranhado de condicionais. O que se compartilha são as duas funções puras que já
são genéricas: `roundRobinFixtures` e `computeStandings`.

### Estado

```ts
export type LibertadosStage =
  | 'groups' | 'r16' | 'quarter' | 'semi' | 'final' | 'champion' | 'eliminated'

export type LibertadosKnockoutStage = Extract<
  LibertadosStage, 'r16' | 'quarter' | 'semi' | 'final'
>

export interface LibertadosMatch {
  readonly stage: 'groups' | LibertadosKnockoutStage
  /** Grupos: 0-5. Mata-mata: 0 = ida, 1 = volta. */
  readonly round: number
  readonly homeId: string
  readonly awayId: string
  readonly homeGoals: number
  readonly awayGoals: number
  /** Só na volta: quem levou nos pênaltis com o AGREGADO empatado. */
  readonly penaltyWinnerId?: string
}

export interface LibertadosState {
  readonly seed: number
  readonly year: number
  /** null = edição simulada, sem clube do jogador. */
  readonly playerClubId: string | null
  /** 8 grupos de 4, na ordem A-H. O jogador abre o grupo A. */
  readonly groups: readonly (readonly string[])[]
  readonly stage: LibertadosStage
  readonly round: number
  readonly results: readonly LibertadosMatch[]
  readonly championId: string | null
}
```

### Sorteio

`createLibertados(seed, year, playerClubId, brazilianIds)`:

1. Junta os 4 brasileiros classificados com 28 continentais sorteados do
   catálogo.
2. Ordena os 32 por força (desempate determinístico pela seed) e fatia em
   **quatro potes de 8**.
3. Para cada grupo, tira um clube de cada pote, **recusando** um clube cujo país
   já esteja no grupo — se o pote esgotar sem candidato válido, aceita o primeiro
   disponível, para o sorteio nunca travar.
4. O clube do jogador vai para o grupo A, na posição do pote dele.

Determinístico: mesma seed, mesmo sorteio. A seed é nova a cada edição.

### Fase de grupos

6 rodadas. As três primeiras vêm de `roundRobinFixtures(group, round)`; as três
últimas são as mesmas com o mando invertido:

```ts
groupFixtures(group, round) =
  round < 3
    ? roundRobinFixtures(group, round)
    : roundRobinFixtures(group, round - 3).map(swapVenue)
```

Classificação por `computeStandings` (pontos > saldo > gols pró). Passam os dois
primeiros de cada grupo: 16 clubes.

### Mata-mata

Chaveamento pelo mesmo cruzamento do torneio de seleções (`seededQualifiers`): o
1º de um grupo pega o 2º do grupo vizinho, com os confrontos de cima e de baixo
separados, para que dois clubes do mesmo grupo só possam se reencontrar na final.

Cada confronto é um par `[cabeça, desafiante]`. Cabeça é quem ocupa a posição de
cima da chave — nas oitavas, o primeiro colocado do grupo; nas fases seguintes, o
vencedor que veio da metade de cima. O cabeça **decide em casa**:

- **ida** (`round: 0`): casa do desafiante
- **volta** (`round: 1`): casa do cabeça

Avança quem tiver o maior **agregado** dos dois jogos. Não existe gol fora — a
regra foi abolida na competição real e mantê-la só confundiria. Agregado
empatado vai aos pênaltis: no jogo do jogador quem decide é o duelo de dados que
já existe (`shootoutFor`, o mesmo caminho do mata-mata de seleção); nos jogos
simulados, o RNG.

### Avanço

```ts
advanceLibertados(
  state, playerGoalsFor, playerGoalsAgainst, rng, playerShootoutWon?
): RngResult<{ state: LibertadosState; playerPenaltyWon: boolean | null }>
```

Mesma forma de `advanceTournament`: fecha o jogo real do jogador, simula todos os
outros jogos daquela data e devolve o estado seguinte. Gols simulados saem da
força do clube, como em `simulateTeamGoals`.

`simulateEdition(state, rng)` roda uma edição inteira sem jogador e devolve o
campeão — é o que faz o continente existir nos anos em que você não se
classificou.

### Índice do jogo no calendário

```ts
libertadosMatchIndex(stage, round): number
// groups 0-5 | r16 6-7 | quarter 8-9 | semi 10-11 | final 12-13
```

14 jogos por edição. É a ponte entre o estado do torneio e a data no calendário.

## 4. Calendário

[calendar.ts](../../../src/engine/career/calendar.ts) muda de forma:

|  | ano COM Libertados | ano sem |
|---|---|---|
| **Série A** | sábados quinzenais, 7/mar → 22/ago | sábados semanais, 7/mar → 30/mai |
| **Libertados** | quartas quinzenais, 1/abr → 30/set | — |

(datas do ano 1 = 2026)

O dia alterna por temporada, como o `MATCH_DAY_PATTERNS` de hoje: a liga alterna
sábado/domingo e a copa alterna quarta/quinta, então nem todo ano tem a mesma
cara.

```ts
roundDate(careerYear, round, inLibertados = false)  // espaçamento 7 ou 14 dias
libertadosDate(careerYear, matchIndex)              // 1ª quarta/quinta de abril + 14n
```

`MATCH_DAY_PATTERNS` (pares de dias) sai; entram `LEAGUE_WEEKDAYS` e
`CUP_WEEKDAYS`, cada um com dois dias que alternam por ano de carreira.

Nada de data é persistido no save — tudo é derivado de `careerYear` — então a
mudança não quebra carreira em andamento, só reposiciona o que o calendário
mostra.

### Qual jogo vem primeiro

Com duas competições abertas, "próxima rodada" deixa de ser suficiente. Entra uma
função pura:

```ts
nextFixture(save): { kind: 'liga' | 'libertados'; date: CalendarDate } | null
```

Compara a data da próxima rodada da liga com a do próximo jogo do torneio e
devolve o que vier antes. A Home mostra o card desse jogo; é ele que o botão
"Jogar" abre.

## 5. Vaga, prêmio e o mundo sem você

**Classificação:** terminar entre os 4 primeiros da Série A dá vaga na edição do
ano seguinte. Como a carreira começa na Série D, a primeira Libertados chega
depois de subir a pirâmide inteira e brigar em cima — é o topo da carreira, não
um evento de rotina.

**Prêmio:** o título paga mais que o da Série A (R$ 4,5 mi), à altura do que a
competição representa: **R$ 10 mi** e a taça na estante. Concedidos no momento em
que a final é vencida, dentro de `withLibertadosState` — o mesmo padrão de
`withTournamentState`, para o prêmio não depender de o jogador não dispensar o
card de fim de torneio.

**Sem você:** na virada do ano, se o jogador não disputou a edição, ela é
simulada inteira e o campeão entra em `continentalChampions` (histórico limitado
a 10 anos) e vira manchete no feed de [news.ts](../../../src/engine/career/news.ts).

## 6. Save

`SAVE_VERSION` 19 → 20. Campos novos em `PlayerSave`:

```ts
/** Edição em andamento — null fora do período do torneio. */
readonly libertados: LibertadosState | null
/** Vaga conquistada na temporada passada, para a edição deste ano. */
readonly libertadosQualified: boolean
/** Campeões continentais recentes, com ou sem você. */
readonly continentalChampions: readonly { readonly year: number; readonly clubId: string }[]
```

`TrophyKind` ganha `'libertados'`; `Competition` (do `MatchRecord`) ganha
`'libertados'`, para o histórico e as estatísticas separarem o que foi liga, copa
continental e seleção.

A migração é tolerante como as anteriores: `parseCurrent` dá default aos campos
ausentes, então um save v19 carrega normalmente — só sem Libertados até a próxima
classificação.

## 7. Cerimônia de entrada

`src/ui/LibertadosIntro.tsx`, na mesma linguagem do
[CallUpIntro](../../../src/ui/CallUpIntro.tsx): escurece até o preto, revela a
tela, pulável a qualquer toque, encadeada em tempos diferentes para não ser 15
segundos de tela parada.

A sequência:

1. O troféu entra em cena, subindo com brilho.
2. "COPA LIBERTADOS" e o ano.
3. Os quatro potes aparecem; o escudo do seu clube cai no grupo A.
4. Os três adversários são revelados um a um — escudo, nome e bandeira do país.
5. Frase de fecho com o nome do jogador.

Aparece uma vez, quando a edição começa em abril.

## 8. Telas

- **Aba Libertados** (`src/ui/tabs/LibertadosTab.tsx`): entra na barra só durante
  o torneio, como a da Seleção. Mostra a tabela do seu grupo, os outros sete
  grupos, a chave do mata-mata e o agregado dos confrontos.
- **Home**: card do próximo compromisso (liga ou Libertados, o que vier antes) e
  card de fim de torneio — campeão ou eliminado.
- **Calendário**: os jogos da Libertados aparecem nas quartas com escudo do
  adversário e marcação própria, ao lado das rodadas de sábado.
- **Sala de troféus**: `libertados_trofeu.png` copiado de
  `src/assets/images/art-source/objetos/` para `src/assets/trophies/`, com rótulo
  "Copa Libertados".

## 9. Testes

Padrão do repo: vitest, arquivo `.test.ts` ao lado do módulo.

- `libertados.test.ts` — sorteio determinístico; 8 grupos de 4; nenhum grupo com
  dois clubes do mesmo país; jogador sempre no grupo A; grupos de 6 rodadas com
  mando invertido no returno; agregado decide o mata-mata; agregado empatado vai
  aos pênaltis; vencer a final dá `champion`; perder dá `eliminated` com o
  adversário campeão; `simulateEdition` sempre produz um campeão.
- `calendar.test.ts` — liga semanal sem Libertados e quinzenal com; primeiro jogo
  do torneio na primeira quarta de abril; espaçamento de 14 dias entre jogos;
  alternância de dia por ano; `nextFixture` escolhe a data mais próxima.
- `continentalClubs.test.ts` — ids únicos e prefixados; nove países com 4 clubes
  cada; toda `nationId` existe em `NATIONS`; todo clube tem identidade de escudo
  declarada; distribuição de força suficiente para quatro potes de 8.
- `clubs.test.ts` — `clubById` acha clube continental sem quebrar os brasileiros.
- `save.test.ts` — save v19 carrega em v20 com `libertados: null`; título
  continental dá taça e prêmio uma vez só.

## Fora de escopo

- **Simular partida** (pular jogos de grupo). Uma temporada de Libertados passa
  de 13 para 27 partidas jogadas lance a lance; se isso pesar na prática, vira
  trabalho próprio.
- **Mundial de clubes** e outras competições continentais.
- **Editor de clubes continentais** pelo usuário (renomear, trocar escudo) — hoje
  isso existe só para os clubes da pirâmide brasileira.
