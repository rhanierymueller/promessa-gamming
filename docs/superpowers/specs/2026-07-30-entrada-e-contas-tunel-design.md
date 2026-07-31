# Entrada e contas: a direção "túnel do vestiário"

Data: 2026-07-30
Escopo: landing depois do hero + entrar + recuperar senha + nova senha

## O problema

O hero da landing é bom: a coreografia do chute controlada pelo scroll dá identidade ao jogo.
Tudo o que vem depois dele não dá. São quatro cartões arredondados iguais com um ícone Lucide
em cima, uma faixa com quatro números gigantes centralizados, um CTA e um rodapé — o layout que
qualquer landing de SaaS tem. As três telas de conta são piores: as três usam o mesmo
`.auth-card`, um retângulo `--card` centralizado com título dourado e `label` + `input`
empilhados. Nada nelas diz que o jogo é sobre futebol.

O pedido foi explícito: algo único e visualmente incrível, sem deixar de ser o mesmo jogo.

## Escopo

Dentro:

- O miolo da landing, isto é, tudo depois do hero: os quatro pilares, os números, o CTA final
  e o rodapé.
- `AuthGate` nas duas vistas (entrar e recuperar senha).
- `PasswordReset` (nova senha, aberta pelo link do e-mail), incluindo o estado de sucesso.

- `CharacterCreate` (a criação da promessa). **Entrou depois**, a pedido do dono do produto,
  ao ver o resultado das outras telas: era a única do fluxo de entrada que continuava parecendo
  formulário. Virou a ficha de inscrição no balcão da mesma portaria.

Fora:

- O hero da landing e a coreografia de chute controlada por scroll. Ficam intactos, linha por
  linha. Foi a parte que o dono do produto aprovou como está.
- Qualquer mudança de comportamento: autenticação, validação, cooldown, sincronização.

## A direção visual

Base escolhida entre quatro alternativas desenhadas como mockups reais: **túnel do vestiário,
noite de jogo**, com dois empréstimos pedidos pelo dono do produto.

### A regra da base

Cada tela é um lugar físico à noite. Um único facho de refletor desenha a composição e tudo
que a luz não toca desaparece no roxo quase preto. O conteúdo não é "conteúdo dentro de um
card": é objeto de verdade naquele lugar. O jogador entra pela portaria, atravessa o túnel e
sai no gramado — e a landing é literalmente essa caminhada.

Regras concretas, para poder aplicar em qualquer tela nova:

1. **Uma luz dominante por tela.** Uma fonte, uma direção, uma sombra projetada coerente. Nunca
   duas luzes brigando; nunca iluminação uniforme.
2. **O escuro é estrutura, não decoração.** O que está fora do facho fica no `#14101f` e não
   compete. Vinheta forte nas bordas de toda cena.
3. **O dourado `#ffd23f` continua sendo a cor do jogo** e fica reservado para a ação principal
   e o número que importa. Não é cor de texto corrido nem de moldura.
4. **Objeto antes de widget.** Antes de desenhar um componente, decidir o que ele é naquele
   lugar: crachá, ficha da portaria, etiqueta de armário, placa, figurinha colada. O componente
   herda a forma do objeto.
5. **Movimento é a luz e a poeira, não o layout.** Poeira suspensa no facho, oscilação lenta da
   lâmpada, o reveal ao entrar na tela. Elemento nenhum entra girando ou quicando. Todo
   movimento morre dentro de `prefers-reduced-motion: reduce`.
6. **Tipografia:** o monoespaçado continua sendo a voz do jogo — rótulo, número, campo
   preenchido, legenda técnica; a família atual (`--mono`) não muda. Ganha um par de contraste
   condensado e pesado para as manchetes ("PROMESSA", títulos de seção), que é o que hoje falta
   e é parte do que dá cara de template. Só fontes de sistema: a pilha das manchetes é
   `Impact, Haettenschweiler, 'Arial Narrow Bold', 'Arial Black', sans-serif`, registrada como
   variável nova `--display` junto dos outros tokens. Nada de `@font-face` nem fonte remota.
7. **Contraste é obrigatório.** Escuro é assinatura, ilegível é defeito. Todo texto de leitura
   passa com folga sobre o fundo em que está, inclusive no celular sob sol.
8. **Cores de apoio:** `#2f7d4f` (verde do gramado sob refletor, usado no que é "campo": estado
   pronto, saída para o jogo) e `#8fa7c4` (azul frio da luz, usado no que é "concreto e metal":
   legenda técnica, borda de objeto, texto secundário na cena).

### Os dois empréstimos

Do grafismo de transmissão: **os números do jogo viram um placar em LED**. 56 clubes, 4
divisões, 1000+ jogadores, 16 seleções aparecem em dígitos de matriz de pontos, dentro de uma
moldura de placar físico pendurado no escuro, iluminado por si mesmo, com lâmpada queimada e
brilho vazando no fundo. Abaixo dele corre um **ticker de resultados** — rodada fictícia das
quatro divisões, com clubes inventados. Isso resolve o problema do bloco de números sem cair na
faixa horizontal de números gigantes.

Do álbum de figurinhas: **os quatro pilares viram figurinhas coladas na parede do vestiário**.
Fita crepe nos cantos, borda serrilhada, número da figurinha, brilho holográfico, rotação
diferente em cada uma, sobreposição, uma marcada como repetida. Coladas por mão humana, não
distribuídas por `grid-template-columns`.

O que foi recusado: o acabamento seco de fliperama (cantos retos, sombra dura, sem blur). O ar
cinematográfico da base permanece.

O mockup aprovado fica versionado em
`docs/superpowers/specs/assets/2026-07-30-tunel-hibrido.html` e é a referência visual de
detalhe. Onde este documento e o mockup divergirem, este documento manda.

## Tela por tela

### Landing, depois do hero

Três blocos, na ordem em que o jogador rola:

1. **A parede do vestiário.** Os quatro pilares como figurinhas: "o chute é seu" (mira, força e
   altura na régua, habilidade real e não dado escondido), "você é o técnico" (formação, escalar
   os 11, batizar os jogadores), "carreira viva" (quatro divisões, acesso e queda, jovens que
   evoluem, veteranos que penduram as chuteiras aos 38) e "ligas com amigos" (liga por código de
   convite, ranking semanal). Cada figurinha revela ao entrar na tela, com atraso escalonado.
2. **O placar em LED e o ticker.** Os quatro números do mundo do jogo, mais a faixa de
   resultados rolando.
3. **A saída para o gramado.** O CTA final ("Começar a carreira" ou "Continuar carreira",
   conforme já existe hoje via `hasSave`), com o sprite de comemoração, e o rodapé
   ("PROMESSA · mundo 100% fictício · em desenvolvimento").

A navegação fixa do topo e o CTA dela continuam existindo com a mesma função; ganham o
acabamento da direção.

### Entrar

A cena é a **portaria**. O jogador está do lado de fora, no escuro, e a luz vem da guarita. O
formulário é a **credencial de atleta pendurada no cordão**: retrato pixel-art, e-mail e senha
como campos datilografados no crachá.

Elementos, todos já existentes hoje:

- e-mail e senha;
- "continuar como `<e-mail da sessão>`", quando há sessão e save (hoje `sessionEmail && hasSave`);
- "esqueci minha senha", só quando o servidor está configurado (`isOnlineAvailable()`);
- entrar, com estado "Entrando…";
- divisor "ou" e "criar conta e carreira";
- voltar para a landing;
- o aviso de modo local quando não há servidor configurado;
- erro ("Preencha e-mail e senha.", ou a mensagem devolvida pelo servidor) e aviso de queda de
  conexão ("Sem conexão com o servidor — seguindo no modo local.").

### Recuperar senha

A cena é o **balcão da portaria**: pedido de segunda via. Um campo de e-mail, o aviso neutro
("Se este e-mail tiver uma conta, o link de recuperação chega em instantes. Olhe também o
spam."), o botão de enviar com o estado de espera do cooldown ("Aguarde 42s para pedir outro") e
o caminho de volta ("Lembrei a senha — voltar ao login").

O aviso neutro é regra de segurança, não texto de enfeite: nunca revela se o e-mail tem conta.
Continua assim.

### Nova senha

Mesma cena da portaria, agora **emitindo a credencial nova**: nova senha, confirmar nova senha,
erros por campo vindos de `validateNewPassword`, botão salvar com "Salvando…", e o estado de
sucesso ("Senha atualizada!" e "Entrar no jogo").

## Arquitetura de código

CSS:

- `src/ui/index.css` tem 6.029 linhas e não vai crescer. Nascem `src/ui/styles/landing.css` e
  `src/ui/styles/auth.css`, importados pelos componentes que os usam.
- Os blocos `.landing-*` migram inteiros para `landing.css`: `Landing.tsx` é o único arquivo do
  projeto que usa essas classes.
- Os blocos de auth migram **seletivamente**, porque duas dessas classes são compartilhadas com
  telas fora do escopo:
  - `.auth-gate`, `.auth-card`, `.auth-continue`, `.auth-divider` e `.auth-link` são usadas só
    por `AuthGate` e `PasswordReset`. Somem do `index.css` e não reaparecem: a cena nova as
    substitui.
  - `.auth-back` e `.create-back` **ficam onde estão**, no `index.css`. Quem passa a depender
    delas sozinho é o `CharacterCreate` (`src/ui/CharacterCreate.tsx:130`), que está fora do
    escopo. As telas de conta não vão mais usá-las — o voltar passa a fazer parte da cena.
- As classes `.create-*` **permanecem** no `index.css`: além do `CharacterCreate`, elas são
  usadas por `PlayerCard`, `SquadBoard`, `FriendsLeagues`, `TeamTab` e `ProfileTab`. Mover
  qualquer uma delas está fora do escopo desta entrega. As telas de conta param de reaproveitar
  `.create-field`, `.create-input`, `.create-label`, `.create-error` e `.create-title` e passam
  a ter as suas próprias — sem apagar as originais.

Landing:

- `src/ui/Landing.tsx` mantém o hero e a coreografia de scroll, e passa a orquestrar três
  componentes novos em `src/ui/landing/`: `StickerWall.tsx`, `LedBoard.tsx` e `TunnelOutro.tsx`.
- O `IntersectionObserver` de reveal, hoje inline no `Landing`, sai para
  `src/ui/landing/useRevealOnScroll.ts`, porque os três componentes precisam dele.
- As frases do ticker ficam em `src/ui/landing/tickerLines.ts` como dados constantes.

Contas:

- `src/ui/auth/AuthScene.tsx` — a casca da cena (escuridão, facho, névoa, vinheta, tarja de
  lugar). Recebe título, subtítulo, conteúdo e rodapé. É o que garante que as três telas sejam
  reconhecidamente o mesmo lugar.
- `src/ui/auth/AuthField.tsx` — o campo de texto como objeto da cena, com rótulo, erro
  opcional e as props de acessibilidade e `autoComplete` que os campos já usam hoje.
- `AuthGate.tsx` e `PasswordReset.tsx` consomem os dois. Perdem JSX de casca; a lógica não é
  tocada.

Nenhum arquivo novo passa de 400 linhas.

## Comportamento preservado

Lista explícita do que precisa continuar idêntico depois da mudança:

- `signInAccount`, `requestPasswordReset`, `updatePassword` chamados nos mesmos pontos, com os
  mesmos argumentos.
- `validateNewPassword` e as mensagens de erro por campo.
- O cooldown de novo pedido de link: `resetCooldownRemaining` e `markResetRequested`, com o
  contador de um segundo e o botão desabilitado enquanto espera.
- A resposta neutra do "esqueci minha senha".
- O caminho offline: sem servidor configurado, o jogo continua local e avisa.
- `hasSave`, `sessionEmail`, `initialNotice` e os quatro callbacks (`onEnter`, `onSignup`,
  `onBack`, `onDone`, `onCancel`) com a mesma semântica.
- Enter no último campo submete, como hoje.

## Acessibilidade, movimento e desempenho

- `role="alert"` nos erros e `role="status"` nos avisos continuam.
- Todo campo tem rótulo associado e foco visível; o foco não pode desaparecer no escuro.
- `autoComplete` preservado em cada campo (`email`, `current-password`, `new-password`).
- Todo movimento fica dentro de `prefers-reduced-motion: no-preference` ou é desligado no bloco
  `reduce`, como o `index.css` já faz para o hero.
- Custo em celular: no máximo um elemento com `filter: blur` por cena. Facho e névoa saem de
  gradiente. Sem `backdrop-filter` em área grande.

## Verificação

- `npm run build` (`tsc -b` incluído) sem erro.
- `npm test` com a suíte atual passando sem alteração — nenhum teste existente deveria precisar
  de ajuste, porque nenhuma lógica muda. Se algum precisar, é sinal de que o escopo foi furado.
- Rodar o app e percorrer: landing rolando até o fim, entrar com erro de campo vazio, entrar com
  sessão existente, esqueci a senha com cooldown ativo, e nova senha com senhas divergentes.
- Conferir as três telas de conta em largura de celular e em desktop, e com
  `prefers-reduced-motion` ligado.

Este projeto não cobre UI por teste automatizado: o vitest roda em `environment: 'node'`, sem
jsdom, e o limite de 80% do coverage mede apenas `engine/`, `state/` e `online/`
(`vite.config.ts`). Como esta entrega não introduz regra de negócio, ela não muda esse número.
Se aparecer lógica pura no caminho, ela vai para um módulo em `src/state/` com teste próprio, e
não escondida dentro de um componente.

## Riscos

- **A regra "uma luz só" não escala para telas densas.** Já sabido e aceito: tabela de liga,
  elenco e mercado não entram neste escopo e continuam com a linguagem atual. Se a direção for
  estendida para elas depois, a regra da luz precisará ser reformulada — não é decisão desta
  entrega.
- **Colagem.** Trazer placar em LED e figurinhas para dentro do túnel pode virar colagem de três
  estéticas. O critério de aceite é: cada elemento emprestado tem de existir como objeto físico
  naquele lugar (o placar está pendurado no escuro, a figurinha está colada numa parede real).
  Se parecer um site de transmissão com filtro escuro por cima, está errado.
- **Escuro demais.** O maior risco prático de execução. Mitigado pela regra de contraste e pela
  passagem de verificação em celular.
