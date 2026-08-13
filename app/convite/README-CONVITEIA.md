# Convite IA

> **Crie seu convite com IA!** Plataforma de convites digitais para casamento, aniversário,
> debutante, happy hour e vaquinha. O usuário monta o convite num assistente passo a passo,
> vê o resultado em tempo real, escolhe um endereço próprio (`nome.conviteia.com`) e publica.
> Inclui confirmação de presença, lista de presentes com PIX e mural de recados.

---

## Sumário

- [O que é](#o-que-é)
- [Diferencial](#diferencial)
- [Arquitetura](#arquitetura)
- [Fluxo do usuário](#fluxo-do-usuário)
- [Recursos do convite](#recursos-do-convite)
- [Onde a IA entra](#onde-a-ia-entra)
- [Modelo comercial](#modelo-comercial)
- [Stack](#stack)
- [Domínios e repositórios](#domínios-e-repositórios)
- [Modelo de dados](#modelo-de-dados)
- [Convenções e regras do código](#convenções-e-regras-do-código)
- [App Android (TWA)](#app-android-twa)
- [Textos para a Play Store](#textos-para-a-play-store)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Pendências](#pendências)

---

## O que é

Convite IA é uma **superfície whitelabel construída sobre a plataforma minhAi**. Compartilha o
mesmo código-base (Next.js), o mesmo banco (Supabase) e o mesmo projeto de deploy (Vercel) da
minhAi, mas se apresenta com marca, domínio e produto próprios.

O usuário responde a um assistente de 10 etapas — tipo de evento, cores, nomes, data, local,
fontes, mídia, seções, presentes — vendo o convite se montar ao lado em tempo real. No fim,
escolhe um endereço personalizado, paga e publica. O convite fica no ar para sempre.

- **Empresa:** BigCorps Tecnologia Ltda — CNPJ 14.282.244/0001-19
- **Plataforma-base:** minhAi (`minhai.app`)
- **Público:** noivos, aniversariantes, mães de debutante, organizadores de eventos,
  e revendedores de arte digital (plano mensal).

---

## Diferencial

O mercado brasileiro de convite digital se divide em dois grupos, e nenhum resolve o problema
inteiro:

1. **Conviteiras artesanais** entregam um convite bonito, feito à mão, mas sem gestão: a
   confirmação de presença vira mensagem solta no WhatsApp e a lista de presentes é um link
   externo.
2. **Plataformas de gestão** organizam RSVP e lista, mas o convite em si é um formulário
   com foto.

Convite IA entrega os dois:

- **Convite como objeto emocional** — capa em envelope que abre com lacre de cera, monograma
  dos noivos, música, contagem regressiva, calendário, ornamentos florais, 10 temas de cor e
  10 pares tipográficos.
- **Gestão real** — confirmação de presença com painel, mural de recados moderado, e lista de
  presentes que **recebe PIX de verdade**, com saldo e saque para os anfitriões.
- **Endereço próprio** — `miriam-e-ithiel.conviteia.com`, não um link genérico com código.
- **IA aplicada onde ajuda** — sugere frase, convocação, cores e fontes a partir de uma
  descrição em texto livre.

O convite publicado **nunca sai do ar**, mesmo que o plano mensal seja cancelado. Quem tem o
link é o convidado, não o cliente.

---

## Arquitetura

Topologia whitelabel: o Convite IA vive dentro do repositório da minhAi, com marca e domínio
próprios resolvidos por host.

```
conviteia.com          ─────────────►  minhAi (rota /convite)
www.conviteia.com                      landing + assistente + painel

<slug>.conviteia.com   ─────────────►  minhAi (rota /convite/[slug])
                                       o convite publicado de cada cliente

conviteia.com.br       ─────────────►  redirect 301 para conviteia.com
www.conviteia.com.br                   (âncora de confiança, não hospeda)
```

- O host é reconhecido no `middleware.ts` (bloco `0.6 CONVITEIA`) e a marca é resolvida em
  `lib/brand.ts` (`getBrandByHost` → `'conviteia'`).
- A raiz reescreve para `/convite`. Os subdomínios reescrevem para `/convite/[slug]`.
- `/.well-known/` e `/favicon.ico` têm passthrough próprio no bloco do middleware — sem isso,
  o favicon da minhAi vaza para o Convite IA e o `assetlinks.json` do TWA não é servido.
- Wildcard DNS `*.conviteia.com` na Vercel, com certificado wildcard.

---

## Fluxo do usuário

```
/convite                 landing
/convite/criar           assistente (10 etapas, prévia ao vivo)
/convite/entrar          cadastro e login (só no fim, antes de pagar)
/convite/pagar           PIX do convite (plano avulso)
/convite/painel          meus convites
/convite/editar/[id]     edição pós-publicação
<slug>.conviteia.com     o convite publicado
```

O rascunho é salvo **antes de existir conta**, com token no navegador (tabela `rascunhos`,
TTL de 7 dias). A pessoa monta o convite inteiro, vê pronto, e só então cria login. É o modelo
"grátis até publicar": o custo psicológico de abandonar já foi pago quando o preço aparece.

---

## Recursos do convite

**Tipos de evento (11, em 5 grupos):** Casamento, Bodas de Prata, Bodas de Ouro, Noivado,
Chá de Panela, Debutante, Aniversário, Aniversário Infantil, Happy Hour, Confraternização,
Vaquinha.

**Seções (15, ligáveis e reordenáveis):** foto, frase/versículo, música, nomes, data, contagem
regressiva, calendário, localização com mapa, confirmação de presença, lista de presentes,
recados, padrinhos, dress code, galeria, despedida.

**Temas de cor (10):** Rosê, Convite IA, Sage & Creme, Terracota, Azul Sereno, Borgonha,
Dourado & Marfim, Lavanda, Menta, Noite.

**Pares tipográficos (10):** Clássico, Romântico, Moderno Suave, Delicado, Editorial,
Contemporâneo, Leve, Autoral, Urbano, Impacto.

Todos os temas foram validados em **contraste WCAG**: cada um traz uma cor de acento para
título grande (mínimo 3:1) e outra para texto pequeno (mínimo 4,5:1). O tom do bloco de data
foi escurecido em 8 dos 10 temas para atingir 4,5:1 — sem isso as linhas pequenas ficavam
ilegíveis no celular sob sol.

---

## Onde a IA entra

Três pontos, todos opcionais dentro do fluxo. Rota única: `app/api/conviteria/sugerir`.

| Etapa | O que faz |
|---|---|
| Cores | O usuário descreve o clima ("casamento de dia no campo, rústico") e a IA escolhe tema **e** par tipográfico, explicando a escolha |
| Nomes e data | Sugere a frase ou versículo (3 opções, com autor quando for citação real) |
| Nomes e data | Sugere a convocação sob os nomes (3 opções) |

**Regras de segurança do prompt:**

- A IA escolhe de **catálogo fechado**: recebe a lista de ids de temas e fontes e devolve um id.
  O servidor valida contra `TEMAS` e `FONTES` — id inventado vira 422, não quebra a prévia.
- **Não inventa autor.** O prompt é explícito: `autor` só quando for citação real e conhecida.
  Versículo com referência errada num convite de casamento gera reclamação.
- **Falha de IA nunca trava o wizard.** Sem `OPENAI_API_KEY` o produto funciona inteiro; só os
  botões de sugestão param de responder.
- **Limite de 30 sugestões por IP por hora.** É o único ponto do produto com custo por chamada.

---

## Modelo comercial

| Plano | Preço | O que dá |
|---|---|---|
| **Um convite** | R$ 29,90 (uma vez) | Um convite, publicado para sempre |
| **Convites à vontade** | R$ 149,90/mês | Convites ilimitados enquanto o plano estiver ativo |

**Taxa sobre presentes: 1%** do valor recebido via PIX (`TAXA_PRESENTE` em
`lib/conviteria/precos.ts`). O restante fica disponível para saque pelos anfitriões.

**Regra que não pode ser quebrada:** plano mensal vencido bloqueia **criar** convite novo.
Nunca derruba convite publicado. A página pública lê `publicado_em`, jamais o status da
assinatura. Um revendedor que cancela em setembro não pode apagar o casamento de outubro de um
cliente cujos convidados já têm o link.

---

## Stack

- **Next.js 16** (App Router) — build com `--webpack` (o projeto tem config de webpack que o
  Turbopack ignoraria).
- **Supabase** — schema `conviteria` dedicado, isolado do `public` da minhAi.
- **Vercel** — mesmo projeto da minhAi, roteado por host.
- **OpenAI** `gpt-4o-mini` — sugestões do assistente.
- **opentype.js** — monograma do lacre convertido em contorno vetorial no servidor.
- **Banco Inter** (via minhAi) — PIX de convites e presentes.

---

## Domínios e repositórios

| Host | Destino |
|---|---|
| `conviteia.com` | rota `/convite` (canônico) |
| `www.conviteia.com` | redirect 301 → `conviteia.com` |
| `<slug>.conviteia.com` | rota `/convite/[slug]` |
| `conviteia.com.br` | redirect 301 → `conviteia.com` |
| `www.conviteia.com.br` | redirect 301 → `conviteia.com` |

Registradores: `.com` na GoDaddy, `.com.br` no Registro.br — ambos com nameservers delegados
à Vercel.

**Atenção:** nunca acrescentar regra de redirect para `*.conviteia.com` no `next.config.js`.
Redirect roda antes do middleware e mataria todos os convites publicados.

---

## Modelo de dados

Schema `conviteria` no projeto Supabase da minhAi (`qyonozbroekuqlotqcbm`).

| Tabela | Função |
|---|---|
| `contas` | 1:1 com `auth.users`, guarda o plano |
| `rascunhos` | wizard antes de existir conta (token, TTL 7 dias) |
| `eventos` | o convite: slug, tema, fonte, config jsonb, `publicado_em` |
| `evento_secoes` | seções ativas e ordem |
| `evento_midia` | foto, música, vídeo |
| `convidados` | confirmações de presença |
| `recados` | mural, com moderação (`aprovado` default false) |
| `presentes` | cotas do evento |
| `catalogo_presentes` | 60 itens padrão, por grupo de evento |
| `recebedores` | **contém CPF** — tabela separada, sem policy de anônimo |
| `presente_pagamentos` | PIX de cada presente, com taxa e líquido |
| `evento_saldo` | saldo **por evento**, não por conta |
| `repasses` | saque para os anfitriões |
| `slugs_reservados` | bloqueio dinâmico, sem deploy |

---

## Convenções e regras do código

**Namespace interno é `conviteria`, a marca é `Convite IA`.** As pastas `lib/conviteria/` e
`components/conviteria/` mantêm o nome antigo do projeto; a rota pública é `app/convite/`.
É invisível ao usuário — renomear centenas de imports só adicionaria risco.

**O domínio mora só em `lib/conviteria/marca.ts`.** `MARCA`, `DOMINIO`, `SUFIXO_SLUG` e
`urlDoConvite()`. Nunca escrever `conviteia.com` direto em componente ou rota.

**Tokens de tema entram como `style` inline na raiz do convite**, nunca em `:root`. O cartão é
renderizado dentro do painel, que tem CSS próprio; variável em `:root` tem a mesma
especificidade de uma classe no `<html>` e o vencedor dependeria da ordem de injeção do CSS.

**Fonte de display nunca recebe caixa alta nem `letter-spacing`.** Cursiva com letra espaçada
perde as ligaduras. O `.cv-papel` tem um reset defensivo `:where(h1,h2,p,...)` para o CSS do
painel não vazar para dentro do cartão.

**O monograma do lacre é contorno vetorial, não `<text>`.** Gerado no servidor com opentype.js
e centralizado pelo *bounding box da tinta* — `text-anchor="middle"` centraliza pela largura de
avanço, e o "M" do Pinyon Script tem entrada fina à esquerda enquanto o "I" tem floreio pesado
à direita. Assim qualquer par de iniciais sai centralizado, e o convite publicado não depende
da fonte carregar no navegador de quem abre.

**Cliente Supabase sempre dentro do handler, nunca no escopo do módulo.** No escopo do módulo,
o construtor roda durante "collecting page data" do build, quando as variáveis de ambiente não
existem.

**Campo livre usado em JSX precisa ser declarado em `tipos.ts`.** O index signature
`[chave: string]: unknown` faz campo não declarado virar `unknown`, e `unknown` não é um
`ReactNode`.

**Escrita pública não tem policy de RLS.** RSVP, recado e presente passam por rota com
`service_role`, Turnstile, limite por `ip_hash` (hash com sal, nunca IP em claro) e verificação
de que o evento existe e está publicado.

**Valor do presente vem do banco, nunca do corpo da requisição.** Aceitar do cliente deixaria
qualquer um "presentear" R$ 0,01 e marcar a cota como vendida.

**Webhook de PIX é idempotente.** Publicar usa `is('publicado_em', null)`; presente usa
`eq('status','pendente')`. Reentrega não credita duas vezes. A coluna
`pix_transactions.conviteia_notificado_at` deixa falha de webhook visível e reenviável.

---

## App Android (TWA)

O app da Play Store é um **TWA/Bubblewrap** que embrulha `conviteia.com` — não há código
Android próprio, é uma casca sobre o PWA.

**Estado atual dos assets** (em `public/brands/convite/`):

| Arquivo | Uso |
|---|---|
| `manifest.webmanifest` | manifest do PWA (name, ícones, cores) |
| `icone-192.png`, `icone-512.png` | ícones PWA |
| `icone-maskable-512.png` | ícone adaptativo Android |
| `ic-launcher-{48,72,96,144,192,512}.png` | densidades para o Bubblewrap |
| `ic-launcher-foreground-432.png` | camada de frente do ícone adaptativo |
| `apple-icon.png`, `favicon.png`, `icon.png` | iOS e navegador |

**Configuração do manifest** (já pronta):

```
name:             Convite IA - Crie seu convite com IA!
short_name:       Convite IA
description:      Crie seu convite com IA!
start_url:        /
scope:            /
display:          standalone
background_color: #fdf0f3
theme_color:      #c06078
```

**⚠️ PENDENTE — `assetlinks.json` não existe ainda.** Precisa ser servido em
`https://conviteia.com/.well-known/assetlinks.json`, pelo projeto minhAi em
`public/.well-known/`, com o fingerprint SHA-256 do app. O middleware já tem passthrough para
`/.well-known/` no bloco do Conviteia, então basta criar o arquivo.

Formato:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.bigcorps.conviteia",
    "sha256_cert_fingerprints": ["<FINGERPRINT SHA-256 DA CHAVE DE ASSINATURA>"]
  }
}]
```

**Requisito Google Play (31/08/2026):** novas submissões/atualizações devem segmentar
**Android 16 (API 36)**. Configurar `targetSdkVersion: 36` no `twa-manifest.json` desde a
primeira publicação.

**Atenção ao `scope`:** o manifest usa `scope: "/"` no host `conviteia.com`. Os convites
publicados ficam em **subdomínios** (`<slug>.conviteia.com`), que estão **fora do escopo** do
TWA. Se o app precisar abrir convites publicados sem sair para o navegador, será necessário
`additionalTrustedOrigins` no `twa-manifest.json` — mesma solução já usada no ArteFinal para
navegação cross-origin.

---

## Textos para a Play Store

**Nome do app:** Convite IA

**Descrição curta (até 80 caracteres):**
> Crie convites digitais para casamento, aniversário e festas com ajuda de IA.

**Descrição completa:**

> **Convite IA — Crie seu convite com IA!**
>
> Monte um convite digital bonito em minutos, direto do celular, e envie por WhatsApp para
> todos os seus convidados.
>
> **Para todo tipo de evento**
> Casamento, bodas, noivado, chá de panela, debutante, aniversário, aniversário infantil,
> happy hour, confraternização e vaquinha.
>
> **Um assistente que monta com você**
> Escolha o tipo de evento, as cores e as fontes, preencha os dados e veja o convite se montar
> na tela em tempo real. Se travar na hora de escrever, a IA sugere a frase, o versículo e as
> combinações de cor e tipografia a partir da sua descrição.
>
> **Endereço só seu**
> Seu convite ganha um endereço próprio, como seunome.conviteia.com. É esse link que você
> manda no WhatsApp.
>
> **Muito além do convite**
> • Confirmação de presença com painel de quem vai
> • Lista de presentes que recebe PIX de verdade, com saque para você
> • Mural de recados dos convidados
> • Contagem regressiva, calendário e mapa do local
> • Música ou vídeo no convite
> • Galeria de fotos e página de padrinhos
>
> **Seu convite fica no ar para sempre**
> Depois de publicado, o convite não sai do ar. Você pode editar quando quiser.
>
> **Preço justo**
> R$ 29,90 por convite, pagamento único. Para quem cria muitos convites, plano mensal com
> convites ilimitados.
>
> Feito no Brasil pela BigCorps Tecnologia.

**Categoria sugerida:** Estilo de vida (alternativa: Eventos)

**Classificação de conteúdo:** Livre para todos.

**Declarações do questionário da Play Store — atenção:**

- **Coleta de dados:** o app coleta nome, e-mail e telefone de convidados (confirmação de
  presença) e do titular da conta. Declarar em "Segurança dos dados".
- **Compras no app:** o pagamento é feito por **PIX no navegador**, não pelo Google Play
  Billing. Como o produto é um serviço consumido fora do app (o convite publicado é uma página
  web pública), a política do Google normalmente admite pagamento externo — **mas confirmar a
  política vigente antes de submeter**, porque essa regra muda com frequência e é a causa mais
  comum de reprovação em apps desse tipo.
- **Conteúdo gerado por usuário:** há mural de recados. O mural entra **moderado por padrão**
  (`aprovado = false`), com aprovação pelo dono do convite — declarar o mecanismo de moderação.
- **Política de privacidade:** obrigatória, com URL pública. Verificar se já existe página de
  privacidade no domínio do Convite IA.

---

## Variáveis de ambiente

| Variável | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do Supabase (cliente e servidor) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anon |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service-role (**sem** `NEXT_PUBLIC_`; só servidor) |
| `OPENAI_API_KEY` | Sugestões por IA no assistente |
| `CONVITERIA_SAL_IP` | Sal do hash de IP (anti-flood). **Nunca mudar** — invalidaria todos os `ip_hash` gravados |
| `CONVITERIA_WEBHOOK_SEGREDO` | Segredo do webhook de PIX (mesmo valor nas secrets da edge function) |

Nas **edge functions do Supabase**, além do segredo acima:

| Variável | Uso |
|---|---|
| `CONVITERIA_COMPANY_ID` | Empresa da plataforma que recebe os PIX |
| `CONVITERIA_WEBHOOK_URL` | `https://conviteia.com/api/conviteria/webhook-pix` |

---

## Pendências

- **`assetlinks.json`** em `public/.well-known/` — bloqueia a publicação do TWA.
- Definir `additionalTrustedOrigins` no `twa-manifest.json` se o app precisar abrir convites
  publicados (`*.conviteia.com`) dentro do TWA.
- Página de **política de privacidade** no domínio do Convite IA (exigência da Play Store).
- Confirmar a política vigente do Google sobre **pagamento externo** antes de submeter.
- Dashboard do dono: saldo e saque dos presentes (o fluxo de saque do minhAi é reaproveitável).
- Rebuild para **API 36** antes de 31/08/2026 (mesma pendência dos outros apps).

---

*Powered by minhAi.app — BigCorps Tecnologia Ltda.*
