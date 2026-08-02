# Pix Wiki

**Seu link de cobrança PIX, com confirmação automática — sem mensalidade, sem maquininha, sem comprovante falso.**

Domínio: `pix.wiki`
Empresa operadora: BigCorps Tecnologia Ltda (CNPJ 14.282.244/0001-19)
Tecnologia: plataforma minhAi (mesma stack, mesmo backend, conta compartilhada)

---

## 1. O que é

O Pix Wiki é um produto de **entrada** (lead magnet) dentro do ecossistema minhAi: um link curto e gratuito de cobrança PIX (`pix.wiki/nome-do-negocio`) para autônomos, MEIs e pequenos comércios que só precisam de uma coisa — receber PIX com confirmação automática, sem depender de comprovante enviado pelo cliente (que pode ser falsificado) e sem contratar maquininha.

Ao mesmo tempo, é a porta de entrada para a minhAi: toda conta criada no Pix Wiki já nasce sobre a mesma infraestrutura de usuário/crédito da minhAi, e o dashboard mostra ao cliente que ele já tem, de graça, um assistente com ativação por voz — abrindo caminho pro upsell dos recursos completos da plataforma.

## 2. Para quem é

- Autônomos e prestadores de serviço (ex: cabeleireiro, eletricista, personal trainer)
- Pequenos comércios sem sistema de cobrança formal (ex: lojinha de bairro, food truck)
- Qualquer pessoa cansada de aceitar comprovante de PIX por WhatsApp e não ter certeza se o pagamento realmente caiu

## 3. Proposta de valor (para divulgação)

Frase-âncora usada na landing: **"Nunca mais perca uma venda por comprovante falso."**

Pilares de mensagem:
- **Confirmação automática** — o sistema identifica o pagamento direto no banco (Banco Inter), sem depender do que o cliente manda.
- **Sem maquininha** — não tem taxa de cartão, não tem aluguel de equipamento.
- **Zero comprovante falso** — elimina o golpe mais comum contra pequenos comerciantes.
- **Grátis para começar** — criar o link e receber não tem custo; só o saque tem uma taxa de serviço (1%).
- **Brinde: assistente com ativação por voz** — todo cadastro já ativa, sem configuração extra, um assistente da minhAi que também gera PIX por comando de voz.

## 4. Arquitetura técnica

### 4.1 Onde o código mora
O Pix Wiki **não é um projeto separado**. Ele vive dentro do repositório principal da minhAi (mesmo projeto Next.js, mesmo deploy na Vercel), e é servido no domínio `pix.wiki` através de detecção de host no `middleware.ts`:

```
middleware.ts
 └─ hostname === 'pix.wiki' | 'www.pix.wiki'
     └─ reescreve internamente para /pix/* (App Router)
```

Isso significa: qualquer alteração no repositório principal da minhAi pode, em teoria, afetar o Pix Wiki — e vice-versa. O padrão de isolamento usado é `lib/brand.ts` (`getBrandByHost`) + checagens de `segment_key = 'pix_wiki'` no banco, nunca duplicação de projeto.

### 4.2 Rotas

| Rota | Função |
|---|---|
| `/pix` | Landing/onboarding. Se o visitante já está logado com conta Pix Wiki, mostra atalhos (cobrar agora / acessar dashboard) em vez do formulário de cadastro. |
| `/pix/login` | Login para quem já tem conta (e-mail/senha ou Google). |
| `/pix/dashboard` | Área logada: saldo, link de cobrança, recebimentos, saque, configurações. |
| `/pix/[slug]` | Página pública de cobrança de um cliente (ex: `pix.wiki/joao-eletricista`) — formulário de valor. |
| `/pix/[slug]/[valor]` | Mesma página, com o valor já pré-preenchido (para links diretos de cobrança). |
| `/auth/callback` | Rota compartilhada de callback OAuth (mesma usada por minhAi e ArteFinal). |

### 4.3 Backend (Supabase — projeto `qyonozbroekuqlotqcbm`, compartilhado com minhAi)

- **Autenticação**: Supabase Auth (e-mail/senha + Google OAuth), mesma base de usuários da minhAi.
- **Criação de conta**: RPC `ensure_my_pix_wiki_company` — idempotente, evita duplicidade em caso de retry, autopreenche funções do assistente e marca onboarding como concluído.
- **Segmento**: toda empresa Pix Wiki é marcada com `companies.segment_key = 'pix_wiki'` — é o identificador único que diferencia essas contas das demais empresas minhAi no mesmo banco.
- **Geração de PIX**: edge function `gerar-pix-assistente` (via Banco Inter), mesma usada pela minhAi. Empresas Pix Wiki recebem o QR code **sem logo genérico** (parâmetro `logo_url` explícito apontando pro ícone da marca, evitando o fallback padrão da minhAi/ArteFinal).
- **Confirmação de PIX**: edge function `confirmar-pix-assistente`, com polling automático no front após 30s.
- **Saque**: edge function `request-withdrawal`, taxa de 1%, mínimo R$ 1,00. *Atenção: essa função valida contra o saldo somado de todas as empresas do usuário — hoje não é um problema porque cada usuário Pix Wiki só tem uma empresa, mas se o mesmo usuário também tiver uma empresa minhAi Smart no futuro, isso precisa ser revisitado.*
- **Créditos**: não existe sistema de créditos próprio do Pix Wiki — ele usa o mesmo `user_credits` da minhAi, por `user_id`. Isso é intencional (é o mecanismo que sustenta o funil de upsell).

### 4.4 Segurança / RLS
Todas as tabelas relevantes (`companies`, `company_balance`, `balance_transactions`, `pix_transactions`, `user_profiles`) têm RLS ativado, filtrando por `user_id = auth.uid()` (direto ou via join em `companies`). O client browser consulta essas tabelas diretamente, sem necessidade de rota de API intermediária.

## 5. Funcionalidades implementadas

**Onboarding e conta**
- Cadastro com escolha de link (`slug`) customizado, checagem de disponibilidade em tempo real
- Slugs reservados protegidos (`login`, `conta`, `dashboard`, `suporte`, `termos`, etc.)
- Login/cadastro por e-mail+senha ou Google
- Vínculo/desvínculo de conta Google a qualquer momento, dentro do dashboard
- Detecção de sessão ativa na landing (evita mostrar o formulário de lead pra quem já é cliente)

**Cobrança**
- Link simples (`pix.wiki/slug`) — cliente digita o valor
- Link com valor fixo (`pix.wiki/slug/valor`) — cliente só confirma
- Pré-visualização da experiência de pagamento antes de criar a conta (usando uma empresa de demonstração dedicada, sem gerar cobrança real na conta do usuário)
- QR code + código copia-e-cola, com verificação automática de pagamento

**Dashboard**
- Saldo disponível e total recebido
- Histórico de recebimentos com filtro por status (Confirmados / Cancelados / Todos) e agrupamento por dia com soma diária
- Solicitação de saque com cálculo de taxa em tempo real
- Card de link de cobrança compartilhável (com e sem valor fixo), com botão de copiar
- Configurações expansíveis: edição de nome/logo/WhatsApp/e-mail/documento, dados fixos (chave PIX e link, não editáveis por segurança), login e segurança
- Card "Seu Assistente" — divulgação do recurso de ativação por voz da minhAi, com link rastreado (`utm_source=pixwiki`) para conversão

**Visual**
- Tema claro/escuro com persistência entre páginas (`localStorage`)
- Paleta própria (fundo `#020617` no escuro / `#ffffff` no claro), consistente entre landing, dashboard e páginas de pagamento
- Layout responsivo: uma coluna no mobile, duas colunas no desktop (dashboard)
- Progressive Web App (manifest próprio, ícones dedicados)

## 6. Identidade visual

- **Logo**: `public/brands/pix/pixwiki.png` (retangular, para uso ao lado de outro logo) e `web-app-manifest-512x512.png` / `-192x192.png` (quadrados, para ícone de app/QR code)
- **Cor de fundo**: `#020617` (escuro) / `#ffffff` (claro)
- **Cor de destaque**: verde (`#22c55e` / green-500) — usado em CTAs, confirmações e status positivos
- **Tom de voz**: direto, sem jargão técnico, focado no medo real do lojista (calote/comprovante falso) e não em características técnicas de PIX

## 7. Status do projeto (nesta data)

### ✅ Concluído
- Todo o produto web (landing, login, dashboard, páginas de cobrança) funcional em produção
- Autenticação (e-mail/senha e Google) funcionando de ponta a ponta
- Geração e confirmação de PIX real, saque, histórico com filtros
- PWA instalável via navegador (manifest pronto)

### 🔲 Pendente — Fase 4 (App na Play Store)
Bloqueado em 3 decisões:
1. Nome do pacote Android (formato reverso de domínio — definitivo, não muda após publicação)
2. Nome de exibição do app na Play Store
3. Nome do repositório novo (será separado do repo principal — a keystore de assinatura do app não pode compartilhar repositório com um projeto de deploy contínuo)

Depois dessas decisões, faltam:
- Páginas legais próprias (`/pix/termos`, `/pix/aviso`, `/pix/exclusao`) — obrigatórias pro formulário de Segurança dos Dados da Play Store, já que o produto coleta CPF/CNPJ, chave PIX e WhatsApp
- Confirmar se os ícones maskable (`web-app-manifest-*.png`) realmente têm a margem de segurança necessária (teste rápido em maskable.app/editor)
- Criar o repositório Bubblewrap, gerar keystore (com backup imediato), publicar `assetlinks.json`, gerar e testar o `.aab`

## 8. Para a ficha da Play Store (rascunho, ajustar conforme decisões acima)

**Categoria sugerida**: Finanças
**Dados coletados** (para o formulário de Segurança dos Dados): nome, e-mail, telefone/WhatsApp, CPF ou CNPJ, chave PIX. Nenhum dado de cartão de crédito é coletado (não há função de cartão no Pix Wiki).

**Descrição curta (sugestão, até 80 caracteres)**
> Receba PIX com confirmação automática. Sem maquininha, sem comprovante falso.

**Descrição longa (sugestão, editar livremente)**
> O Pix Wiki é o link de cobrança PIX mais simples do Brasil. Crie seu link gratuito, envie pro cliente e receba a confirmação automática assim que o pagamento cair — direto no painel, por e-mail e no WhatsApp. Chega de golpe do comprovante falso.
>
> ✓ Link e QR code personalizados com o nome do seu negócio
> ✓ Confirmação automática, sem depender do que o cliente te manda
> ✓ Histórico completo de recebimentos, com saque quando quiser
> ✓ Sem mensalidade — você só paga uma pequena taxa quando sacar
> ✓ Brinde: assistente com ativação por voz da minhAi já incluso

## 9. Lições técnicas (para o próximo agente/dev que mexer aqui)

Registro de armadilhas reais já enfrentadas neste projeto, para não serem repetidas:

- **`companies.user_id` não tem foreign key para `auth.users`.** Apagar um usuário no Supabase Auth não apaga a empresa associada — ela fica órfã. A RPC `ensure_my_pix_wiki_company` já lida com isso (sufixo automático em caso de colisão de slug), mas vale lembrar ao depurar duplicidades.
- **`companies.segment_key` tem foreign key para `assistant_segments.segment_key`.** Nunca atribuir um `segment_key` que não exista nessa tabela — quebra o insert com violação de FK.
- **O middleware do `pix.wiki` reescreve qualquer caminho não tratado com prefixo `/pix`.** Rotas compartilhadas fora desse namespace (como `/auth/callback`) precisam de passthrough explícito no `middleware.ts`, senão a requisição é reescrita para um caminho inexistente e falha silenciosamente.
- **O Service Worker gerado dinamicamente (`/sw.js`) tem prioridade sobre o `public/sw.js` estático.** Um `fetch(event.request)` ingênuo dentro do Service Worker quebra qualquer navegação que envolva redirect do servidor (como o próprio `/auth/callback`). A correção aplicada foi ignorar requisições com `mode: 'navigate'` no Service Worker.
- **Ao adicionar `next=` customizado no fluxo de OAuth, use caminhos sem o prefixo `/pix`** (ex: `/dashboard`, não `/pix/dashboard`) — o próprio middleware adiciona esse prefixo internamente; incluir os dois causa um redirect duplo desnecessário.
- **`balance_transactions` só registra dinheiro que efetivamente entrou** — não serve para mostrar PIX cancelados/expirados. Para isso, usar `pix_transactions` (tem `status`: `pending`, `confirmed`, `cancelled`, `expired`, `transferred`).
- **O fallback padrão de logo no QR code (`/api/qrcode`) é fixo no logo do ArteFinal**, não da minhAi — é assim de propósito, para todo o ecossistema, não só o Pix Wiki. Empresas sem `logo_url` própria devem passar explicitamente `no_logo=1` ou `logo_url=` na URL do QR code para evitar herdar essa marca por engano.

---

*Última atualização: gerado a partir do histórico de desenvolvimento do produto. Manter este documento atualizado conforme a Fase 4 avançar.*
