# Decisões da partida: do passe binário ao catálogo de jogadas

**Data:** 2026-07-29
**Estado:** design aprovado (Parte 1 e Parte 2)

## 1. O problema

O mini-game de decisão da partida (`playerPass`) tem três defeitos que se somam:

**Ele não toca no placar.** [`applyPassResult`](../../../src/engine/match/match.ts) mexe em `rating` e `stats` e nada mais. A decisão é decorativa: acertar ou errar um passe nunca mudou quem ganhou o jogo.

**A opção segura vira grátis.** `boostedPassChance` soma direto na probabilidade base de 92%. Com `passe` treinado e o perk `maestro`, a opção segura chega a 97% — não existe escolha, existe uma opção dominante.

**O cronômetro cobra reflexo, não decisão.** A pressão de tempo transforma uma decisão tática em um teste de velocidade de leitura.

E há um defeito maior por trás: **o placar da partida é quase todo sorteio que o jogador não toca.**

## 2. O baseline medido

Medição sobre o motor atual: 40.000 partidas simuladas via `simulateToEnd`, matchup neutro, tática equilibrado, craque com atributos no nível 3 (o padrão inicial).

| | Total/jogo | Do pé do jogador | RNG que ele não toca |
|---|---|---|---|
| Gols meus | **2.418** | 1.024 (chute) | 1.242 — plano 0.800 + lance corrido 0.442 |
| Gols deles | **1.866** | 0 | 1.866 — corrido 0.447 + plano/falta/dado 1.419 |

- V/E/D: **50.9% / 21.9% / 27.2%**
- Craque nível 10: 3.040 × 1.585, V/E/D 71.3% / 15.9% / 12.9%
- Por partida: **2.00 decisões** e 3.00 chutes

Conclusões que dirigem o design:

1. **58% dos gols do jogador e 100% dos gols do adversário são sorteio.** O jogador só influencia o placar do adversário pela falta que defende no gol.
2. **A partida já está inflacionada em 4.28 gols/jogo** (futebol real: ~2.7). Decisões que *somem* gol em cima disso tornariam 5-3 um placar corriqueiro.

## 3. Decisões de design

| Decisão | Escolha |
|---|---|
| Número de opções | 5 |
| Cronômetro | removido |
| Formato das opções | catálogo de jogadas concretas, **fora de um eixo único de risco** |
| Informação exibida | chance de gol, chance de criar, **risco de tomar gol** |
| Calibragem | as decisões **absorvem** gols do RNG; a média de gols não muda |
| Desfecho "deu certo sem gol seu" | vira **assistência**, com rolagem contra o ataque do elenco |

## 4. O modelo matemático

### 4.1 Os cinco desfechos

Toda jogada resolve em exatamente um destes, num único sorteio:

| Desfecho | Placar | Stats |
|---|---|---|
| `gol` | +1 seu | gol |
| `chance` | rolagem contra o ataque do elenco → se entra, +1 do **time** | assistência |
| `nada` | — | — |
| `perdeu` | — | — |
| `contra` | +1 **do adversário** | — |

### 4.2 Pesos multiplicativos, normalizados

Cada jogada declara **pesos base**, não probabilidades. Os modificadores multiplicam pesos; a probabilidade nasce só na normalização:

```
P(desfecho_i) = (w_i · m_i) / Σ_j (w_j · m_j)
```

Com `f = (nível − 1) / 9`, faixa 0..1, do atributo que **aquela jogada** declara:

| Alvo | Multiplicador |
|---|---|
| `gol`, `chance` | `1 + f · 0.80` |
| `perdeu`, `contra` | `1 − f · 0.45` |
| `gol` | `× (1 + edges.attack · 0.35)` |
| `contra` | `× (1 − edges.defense · 0.35)` |
| `gol`, `contra` | `× (1 − tightness · 0.25)` |
| `contra` | `× {recuar: 0.70, equilibrado: 1.00, contra-ataque: 1.25}` |
| `gol` | `× (1 + momentum · 0.10)` |
| `contra` | `× (1 − momentum · 0.15)` |
| `gol`, `chance` | `× 1.10` se o craque tem o perk `maestro` |
| `contra` | `× 0.75` se o craque tem o perk `frieza` |
| `nada` | **nenhum** — é a âncora |

`nada` ficar sem multiplicador é deliberado. É o que impede a distribuição de derivar: sem uma âncora, multiplicar todos os pesos por um fator comum não mudaria nada depois da normalização, e os modificadores perderiam efeito.

`tightness` entrar aqui fecha um buraco: os gols automáticos já são segurados por jogo travado (`travado` em `difficulty.ts`). Sem isso, a decisão seria a brecha que ignora uma defesa excelente.

### 4.3 Invariantes

Validados numericamente na sonda de modelo antes de aprovar o design:

- **A soma é sempre 1.** Verificado em 25 casos (5 jogadas × 5 níveis): `1.000000` em todos.
- **Nada é certo nem impossível.** Peso zero não existe no catálogo; nenhum atributo, perk ou tática zera o risco nem garante o gol.
- **Monotonicidade.** Subir o atributo governante nunca reduz `P(gol)` nem aumenta `P(contra)`.
- **Honestidade.** A tela e o sorteio consomem a mesma função de distribuição. Não existe caminho onde a porcentagem exibida difira da real.

### 4.4 A propriedade central: a resposta ótima muda com o personagem

Medido na sonda, comparando o saldo esperado (`P(gol) − P(contra)`) de "driblar a zaga" (faixa alta) com "toque de primeira no atacante" (faixa média):

```
              driblar a zaga   toque de primeira   melhor escolha
nível  1          +4.00%             +7.00%          toque
nível  3          +9.49%             +9.72%          toque
nível  4         +12.15%            +10.99%          DRIBLAR      ← cruzamento
nível  7         +19.78%            +14.47%          DRIBLAR
nível 10         +26.94%            +17.54%          DRIBLAR
```

**Driblar a zaga é matematicamente uma burrice para o novato e a jogada certa para o craque.** O cruzamento não é programado: cai da normalização, porque o multiplicador de atributo age proporcionalmente sobre pesos maiores. Nenhum caso especial no código.

E o desvio-padrão do saldo confirma o outro lado: 0.614 para driblar contra 0.197 para cavar a falta. **Ousadia compra variância, não gol grátis.**

### 4.5 A rolagem da assistência

```
P(converte) = clamp(0.42 + edges.attack · 0.25, 0.22, 0.62)
```

Neutro converte 42%; na faixa realista de confronto de setores, entre ~30% e ~55%. É o que dá ao camisa 10 um meio de decidir a partida sem chutar, e faz a qualidade do elenco importar na estatística pessoal do jogador.

## 5. O catálogo

```ts
interface Jogada {
  readonly id: JogadaId
  readonly atributo: AttributeKey          // finalizacao | passe | cobranca
  readonly faixa: Faixa                    // alta | media | baixa
  readonly pesos: Record<Desfecho, number>
}
```

**Cada jogada declara o atributo que a governa.** "Chutar de fora" lê `finalizacao`, "lançamento" lê `passe`, "cavar a falta" lê `cobranca`. O mesmo menu premia jogadas diferentes para um matador e para um maestro — é o catálogo lendo a build do jogador.

Os textos ficam em `narration.ts`. A engine não conhece texto, só conteúdo — padrão já estabelecido no projeto.

### 5.1 As 14 jogadas

Pesos na ordem `gol / chance / nada / perdeu / contra`:

| Jogada | Atr. | Faixa | Pesos |
|---|---|---|---|
| Driblar a zaga e chute colocado | FIN | alta | 22 / 15 / 20 / 25 / 18 |
| Caneta no zagueiro e entrar na área | FIN | alta | 20 / 12 / 18 / 29 / 21 |
| Voleio de fora da área | FIN | alta | 16 / 6 / 40 / 24 / 14 |
| Girar em cima do marcador e finalizar | FIN | média | 17 / 10 / 45 / 19 / 9 |
| Tabela com o meia e infiltrar | PAS | média | 15 / 20 / 38 / 18 / 9 |
| Toque de primeira no atacante | PAS | média | 14 / 25 / 40 / 14 / 7 |
| Lançamento nas costas da zaga | PAS | média | 12 / 24 / 42 / 15 / 7 |
| Chutar de fora da área | FIN | média | 11 / 8 / 62 / 15 / 4 |
| Cruzamento rasteiro na pequena área | PAS | média | 10 / 26 / 45 / 13 / 6 |
| Cobrança na segunda trave | COB | baixa | 6 / 28 / 58 / 7 / 1 |
| Devolver pro capitão e reposicionar | PAS | baixa | 4 / 20 / 70 / 5 / 1 |
| Segurar a bola e esperar apoio | PAS | baixa | 3 / 18 / 73 / 5 / 1 |
| Cavar a falta na entrada da área | COB | baixa | 2 / 30 / 55 / 11 / 2 |
| Recuar pro goleiro e recomeçar | PAS | baixa | 1 / 12 / 82 / 4 / 1 |

Distribuição: 3 de alta, 6 de média, 5 de baixa.

### 5.2 O sorteio das 5

Não é uniforme. **Garante pelo menos uma jogada de cada faixa** e preenche as duas restantes livremente, sem repetir. Sem essa regra, um sorteio pode servir cinco opções seguras e a decisão perde a graça.

### 5.3 Nota por desfecho

A nota escala com a faixa de variância — e é isso que substitui a pressão do cronômetro (§7):

| Faixa | `gol` | `chance` | `nada` | `perdeu` | `contra` |
|---|---|---|---|---|---|
| alta | +1.2 | +0.7 | −0.10 | −0.6 | −1.0 |
| média | +0.8 | +0.5 | 0 | −0.4 | −0.8 |
| baixa | +0.5 | +0.3 | +0.05 | −0.2 | −0.6 |

A jogada segura dá nota positiva em `nada` porque manter a posse não é fracasso. Mas dá pouco: é segura, não é construtiva.

## 6. Integração com o placar

### 6.1 Absorção do RNG

Com 2 decisões por partida, o catálogo entrega entre **+0.30 e +0.66** gols do jogador e **+0.02 e +0.32** do adversário, dependendo de quão ousado ele joga (piso = sempre a jogada mais segura, teto = sempre a mais ousada). Calibrando pelo perfil equilibrado:

| Canal | Hoje | Proposto |
|---|---|---|
| `teamGoalChance` | 0.40 | ~0.245 |
| `microOurGoal` | 0.012 | ~0.0074 |
| `opponentGoalChance` | 0.35 | ~0.298 |
| `microTheirGoal` | 0.012 | ~0.0102 |

O corte é **proporcional nos dois canais**, não concentrado em um. Tirar tudo do `teamGoalChance` o levaria a ~0.13 e os gols automáticos do time praticamente desapareceriam da narração — a partida perderia a sensação de que existe um jogo em volta do jogador. Espalhar mantém os dois canais vivos, só menores.

**Resultado:** os 2.418 × 1.866 ficam onde estão, o histórico de carreira segue comparável, mas a fatia do placar que sai do pé do jogador sobe de **42% para ~62%** — e, pela primeira vez, ele influencia o placar do adversário fora da falta que defende.

Os valores exatos saem da sonda de calibragem (§10), que fica no repo como teste permanente.

### 6.2 Onde o gol entra

Um único `applyDecisionResult` em `match.ts` resolve o momento inteiro: incrementa o placar do lado certo, avança o cursor, aplica a nota com `clampRating` e atualiza os stats.

- `gol` incrementa `score.team`; `contra` incrementa `score.opponent`; `chance` que converte incrementa `score.team` e soma uma assistência.
- Ele **não** chama `applyExtraGoal`. Aquele existe para o lance corrido, que acontece fora do plano e não avança cursor nem nota — semânticas diferentes. O que se reaproveita é a evidência de que gol fora dos momentos planejados já é um conceito suportado pelo motor, não a função.

## 7. O que substitui a pressão do cronômetro

Tirar o relógio tira a tensão. Se nada ocupar esse lugar, a decisão vira planilha: o jogador calcula o melhor saldo e clica. O substituto é um **conflito real entre placar e progressão**:

> A jogada segura ganha a partida. A jogada ousada faz a carreira.

Nota vira ponto de treino (`trainingPointsForRating`: nota 8+ rende 3 pontos, nota 5–6.5 rende 1). Como a nota escala com a faixa de variância (§5.3), jogar seguro a temporada inteira entrega títulos e um craque que não evolui; jogar ousado custa jogos e acelera o personagem.

A pressão sai do reflexo e vai para a escolha — uma tensão que o cronômetro nunca criou.

## 8. A tela

Cinco linhas, sem barra de tempo, três números por jogada:

```
Você recebe de costas e gira. O que fazer com ela?

 Driblar a zaga e chute colocado      FIN   GOL 25%   CRIA 17%   ⚠ 16%
 Toque de primeira no atacante        PAS   GOL 16%   CRIA 28%   ⚠  6%
 Chutar de fora da área               FIN   GOL 13%   CRIA  9%   ⚠  3%
 Cavar a falta na entrada             COB   GOL  2%   CRIA 34%   ⚠  2%
 Devolver pro capitão e reposicionar  PAS   GOL  5%   CRIA 23%   ⚠  1%
```

Os números do exemplo são os valores reais do catálogo (§5.1) no nível 3 — o padrão inicial.

Três decisões de leitura:

- **`CRIA` tem que aparecer.** Sem ela, "cavar a falta" mostra GOL 2% e parece lixo; ninguém escolheria e as jogadas de armação morreriam no catálogo. É o número que torna a build de camisa 10 legível.
- **O atributo governante aparece na linha.** É o que ensina o jogador a ler a própria ficha: ele percebe sozinho que as jogadas de `FIN` estão melhores porque foi ali que gastou treino.
- **O resto dos 100% fica implícito.** `nada` e `perdeu` não ganham número — são a massa neutra e poluiriam a linha sem mudar decisão.

Acessibilidade: cada número carrega rótulo textual, não só cor. O risco leva glifo além da cor, seguindo o padrão de `aria-hidden` já usado no projeto para ícones decorativos.

## 9. O que muda no que já existe

### 9.1 Perks e atributos

- **`frieza` é reaproveitado.** Hoje dá +50% de tempo para decidir; sem cronômetro, fica sem efeito. Passa a multiplicar o peso de `contra` por 0.75. Sangue-frio = não entregar a bola na pressão.
- **`maestro` muda de forma.** De +5% somado na chance para ×1.10 no peso de `gol` e `chance`.
- **`passe` perde metade da função.** Hoje estica o cronômetro via `decisionSecondsFor` e soma chance via `boostedPassChance`. Passa a governar só as jogadas que o declaram.

### 9.2 A simulação tem que convergir

[`autoplay.ts`](../../../src/engine/match/autoplay.ts) resolve o passe como moeda binária com `passComplete`. Se a decisão passa a marcar e sofrer gol, simular e jogar produziriam placares de mundos diferentes.

A simulação escolhe uma jogada por perfil ("o técnico decide") e resolve pela **mesma função de distribuição**. Convergência entre os dois caminhos vira teste.

### 9.3 Remoções

`PASS_DECISION_SECONDS`, `decisionSecondsFor`, `timeoutPass`, `perkDecisionSeconds`, `boostedPassChance`, `passBonus`, o tipo `PassRisk` e o estado de cronômetro de `PassChallenge.tsx`. O CSS de `pass-timebar` e as variantes `pass-safe`/`pass-bold`/`pass-audacious` saem com eles.

### 9.4 Renomeações e dados

O momento `playerPass` vira `playerDecision`. É seguro: [`pendingMatch.ts`](../../../src/state/pendingMatch.ts) persiste apenas `{opponentId, kind, seed}` e o plano é reconstruído do seed — sem migração.

Efeito colateral aceito: uma partida pendente em andamento no momento do deploy resume com um plano diferente. Não é corrupção de dados, é outra partida.

`passesCompleted` em `PlayerStats` perde sentido como "passe completado" e é redefinido como decisões resolvidas em desfecho positivo (`gol` ou `chance`). `assists` é campo novo.

## 10. Arquivos

`src/engine/pass/` sai. Entra `src/engine/decision/`, em arquivos pequenos e focados como o resto do projeto:

| Arquivo | Responsabilidade | ~linhas |
|---|---|---|
| `outcomes.ts` | tipo `Desfecho`, `Faixa` e contratos | 40 |
| `catalog.ts` | as 14 jogadas | 130 |
| `weights.ts` | multiplicadores e normalização | 80 |
| `draw.ts` | sorteio das 5 com espalhamento garantido | 60 |
| `resolve.ts` | sorteio único sobre a cumulativa | 60 |
| `assist.ts` | rolagem da chance contra o ataque do elenco | 40 |

Mais `src/game/DecisionChallenge.tsx` no lugar de `PassChallenge.tsx`, e os textos em `narration.ts`.

## 11. Testes

| O que garante | Como |
|---|---|
| Soma sempre 1 | varredura: 14 jogadas × níveis 1–10 × 3 táticas |
| Nada é 0% nem 100% | idem |
| Monotonicidade | subir o atributo nunca reduz `gol` nem aumenta `contra` |
| **Honestidade** | tela e sorteio chamam a mesma função de distribuição |
| Catálogo íntegro | todo peso > 0, todo atributo válido, as 3 faixas povoadas |
| Espalhamento do sorteio | 5 jogadas sempre cobrem as 3 faixas, sem repetição |
| Determinismo | mesmo seed → mesma jogada e mesmo desfecho |
| **Calibragem** | 40.000 partidas × 3 perfis (cauteloso/equilibrado/ousado); falha se a média de gols sair da faixa |
| Convergência | simular e jogar produzem a mesma média de gols |

O teste de calibragem é o que protege o balanceamento a longo prazo: mexer num peso do catálogo no futuro sem desregular o placar em silêncio.

## 12. Fora de escopo

- Novos modos de marcar gol (pênalti, cabeceio, rebote, 1x1 com o goleiro) — discutidos e postergados.
- Mudar a posição do craque para filtrar quais lances ele recebe.
- Puxar o total de gols da partida para o realismo (~3.3/jogo). Este design mantém a média atual de propósito, para não invalidar histórico de carreira.
