# E-mails do Supabase com a cara do Promessa

Os templates HTML deste diretório substituem os e-mails padrão do Supabase Auth.
Eles não são lidos automaticamente: precisam ser colados no painel.

## Como aplicar

1. Painel do Supabase → **Authentication** → **Emails** → aba **Templates**
2. Escolher o template e colar o HTML do arquivo correspondente:

| Template no painel | Arquivo |
|---|---|
| Reset Password | [reset-password.html](reset-password.html) |
| Confirm signup | [confirm-signup.html](confirm-signup.html) |

3. Ajustar o **Subject** de cada um (o painel tem um campo próprio):
   - Reset Password: `Promessa · nova senha`
   - Confirm signup: `Promessa · confirme seu e-mail`
4. Salvar. Vale na hora, sem deploy.

## Pré-requisito: SMTP próprio

**O botão `Source` do editor fica travado enquanto o projeto usa o SMTP padrão
do Supabase** — a mensagem é "Set up custom SMTP to edit the source", e só o
Preview funciona. Sem SMTP configurado não há como colar o HTML.

Então a ordem é esta, e não dá para pular etapa:

1. domínio comprado
2. conta num serviço de envio (Resend, Brevo, Mailgun — todos com tier grátis)
3. registros DNS do provedor verificados
4. SMTP preenchido no Supabase
5. **aí** os templates deste diretório podem ser colados

O plano free permite tudo isso; o que ele não permite é editar o HTML sem passo 4.

### Preenchendo o SMTP (exemplo com Resend)

Resend → **Domains** → adicionar o domínio → colar os registros SPF, DKIM e
DMARC no painel de DNS → esperar verificar → **API Keys** → criar uma chave.

Com isso em mãos, em Authentication → Emails → **SMTP Settings**:

| Campo | Valor |
|---|---|
| Sender email address | `noreply@joguepromessa.com` |
| Sender name | `Promessa` |
| Host | `smtp.resend.com` |
| Port number | `465` |
| Username | `resend` |
| Password | a API key do Resend |

**Cuidado com o toggle.** Salvar com "Enable custom SMTP" ligado e campos
errados derruba o envio inteiro: nem o servidor do Supabase nem o seu mandam
e-mail, e ninguém consegue redefinir senha até corrigir.

### Por que isso vale a pena de qualquer jeito

O SMTP padrão do Supabase é limitado a poucos e-mails por hora e existe para
desenvolvimento. Em produção, com gente se cadastrando, ele engasga e o e-mail
simplesmente não chega — então essa configuração seria necessária antes de
divulgar o jogo, com ou sem a trava do editor.

## Por que o HTML é feito assim

E-mail não é web. As regras que valem aqui:

- **Layout em tabela**, não flex nem grid — o Outlook não suporta nenhum dos dois.
- **CSS inline em cada elemento** — o Gmail descarta boa parte do que está em `<style>`.
- **Sem imagem externa** — cliente de e-mail bloqueia imagem por padrão, e um logo
  quebrado é pior que nenhum. A marca aqui é tipografia e cor.
- **600px de largura** — o padrão seguro do formato.

As cores saem do tema do jogo: fundo `#100c1a`, dourado `#ffd23f`, texto
`#9c93b3`.

## Variáveis disponíveis

O Supabase substitui na hora do envio:

| Variável | O que é |
|---|---|
| `{{ .ConfirmationURL }}` | o link de ação (usado nos dois templates) |
| `{{ .Token }}` | código de 6 dígitos, se preferir OTP em vez de link |
| `{{ .SiteURL }}` | a URL configurada em Authentication → URL Configuration |
| `{{ .Email }}` | o e-mail do destinatário |

## Domínios: o que precisa estar cadastrado

O link do e-mail volta para `window.location.origin`
([account.ts](../../src/online/account.ts)), então o código se adapta sozinho a
qualquer domínio. O que NÃO se adapta é a allowlist do Supabase: domínio fora
dela tem o redirecionamento recusado, e o jogador cai numa tela de erro depois
de clicar no e-mail.

Painel → **Authentication** → **URL Configuration** → **Redirect URLs**:

```
https://promessa-one.vercel.app/**
https://joguepromessa.com/**
https://www.joguepromessa.com/**
```

Os três ficam cadastrados ao mesmo tempo. O Supabase só compara strings — dá
para cadastrar `joguepromessa.com` antes de o domínio existir, e é o que evita
descobrir o problema justamente no dia da virada.

O `/**` é curinga de caminho.

### No dia em que o domínio entrar no ar

Trocar o **Site URL** de `https://promessa-one.vercel.app` para
`https://joguepromessa.com`. Esse campo é o fallback de quando o link não traz
`redirectTo`, e é o que preenche `{{ .SiteURL }}` nos templates.
