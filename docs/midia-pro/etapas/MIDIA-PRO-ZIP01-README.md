# Midia.Pro — ZIP 01 / Fundação

Base preparada sobre o repositório `BigCorps/minhAi` no commit:

`d5e4df26283da19b345795313a086bfda547d5de` — 25/09/2026

Este ZIP é a **fundação real do produto**, não um mock. Ele deixa prontos: identidade da marca, landing, autenticação, dashboard inicial, slugs `slug.midia.pro`, cadastro de locais e telas, catálogo dos quatro modos comerciais, schema privado `midia`, bucket privado e base da tabela de dispositivos que será usada pelo player no ZIP 02.

## Importante antes de enviar ao GitHub

Os arquivos do ZIP estão **nos mesmos caminhos do repositório**. Basta extrair e enviar preservando as pastas.

Dois arquivos são substituições completas de arquivos compartilhados existentes e foram montados exatamente sobre o commit acima:

- `next.config.js`
- `lib/platform-products.ts`
- `components/CookieConsentBanner.tsx`

Se a `main` avançar antes de você subir este pacote, compare esses três arquivos com a versão nova antes de sobrescrever para não apagar uma correção feita depois de 25/09/2026. Os demais arquivos deste ZIP são novos.

## 1. Supabase — aplicar o SQL manualmente

No projeto **minhAi** do Supabase, abra **SQL Editor**, cole e execute:

`supabase/SQL-MIDIA-PRO-ZIP01.sql`

A migration é aditiva e cria o schema separado `midia`. Ela não altera tabelas do ConviteIA, FuncionarIA, PixWiki ou minhAi.

Ela cria:

- `midia.screen_plan_catalog`
- `midia.reserved_slugs`
- `midia.publishers`
- `midia.locations`
- `midia.screens`
- `midia.devices`
- bucket privado `midia-assets`

O schema fica sem acesso direto de `anon` e `authenticated`. As páginas autenticadas passam pelas rotas Next.js e somente o servidor usa `service_role`.

### Data API — passo necessário

Como o backend usa o client Supabase server-side com `db: { schema: 'midia' }`, depois de criar o schema adicione **`midia` aos Exposed schemas** em:

**Supabase → Project Settings / API (Data API) → Exposed schemas**

Isso **não torna as tabelas públicas**: o SQL revoga `USAGE`/tabelas de `anon` e `authenticated`, habilita RLS e não cria policies públicas. A exposição só permite que o PostgREST reconheça o schema quando a chamada autenticada do servidor chega com `service_role`.

Não adicione policies abertas para “resolver” eventual erro de acesso.

## 2. Supabase Auth — URL do Midia.Pro

Em **Authentication → URL Configuration → Redirect URLs**, adicione exatamente:

`https://midia.pro/auth/callback`

Não troque a **Site URL** principal do projeto, porque o mesmo Supabase atende os outros produtos da BigCorps.

Para preview da Vercel, mantenha as URLs de preview que o projeto já usa. Em produção, a URL exata acima é preferível a wildcard.

## 3. GitHub

Extraia o ZIP na raiz do repositório e envie as pastas preservando os caminhos.

Não é necessário instalar pacote NPM novo neste ZIP. Tudo usa dependências que já existem no `package.json` atual: Next.js, Supabase e Lucide.

## 4. Vercel / domínio

No mesmo projeto Vercel da minhAi, adicione:

- `midia.pro`
- `www.midia.pro`
- `*.midia.pro`

Depois configure o DNS exatamente com os registros que a Vercel mostrar para seu projeto. `www.midia.pro` já é redirecionado pelo código para `https://midia.pro`.

O wildcard é indispensável para endereços como:

`padariadoze.midia.pro`

## 5. O que já funciona neste ZIP

Depois do deploy e do SQL:

1. `https://midia.pro` abre a landing Midia.Pro usando o azul/vermelho do logo enviado.
2. `/login` permite criar conta ou entrar com e-mail, Google ou Facebook usando o Auth compartilhado.
3. `/dashboard` exige sessão.
4. No primeiro acesso, o usuário escolhe `seuslug.midia.pro`.
5. Pode cadastrar um ou vários locais.
6. Pode cadastrar uma ou várias telas.
7. Cada tela recebe `public_code` exclusivo, formato vertical 9:16 e um plano comercial.
8. `https://slug.midia.pro` abre a página pública inicial do parceiro.
9. Rotas indevidas no subdomínio são isoladas para não vazar páginas da minhAi em `slug.midia.pro`.
10. O rastreador interno BigCorps já reconhece Midia.Pro como produto próprio, e não como uso da minhAi.

## 6. Planos já gravados no catálogo

| Plano | Mensalidade | Rede Midia.Pro |
|---|---:|---:|
| Parceiro Midia.Pro | R$ 0,00 | 20% inicial |
| Uso Próprio | R$ 19,90/tela | 0% |
| Uso Próprio Pro | R$ 39,90/tela | 0% |
| Parceiro + Pro | R$ 19,90/tela | 20% inicial |

Neste ZIP, escolher um plano pago coloca a tela em `billing_status = pending_payment`. **Nenhuma cobrança é disparada ainda.** O checkout e a ativação financeira entram na etapa própria, para não termos cobrança pela metade.

Da mesma forma, telas nascem em `status = draft`. O ZIP 02 fará pareamento, player, heartbeat e ativação operacional.

## 7. Testes antes do domínio estar apontado

No domínio atual da aplicação / preview da Vercel, é possível conferir:

- `/midia`
- `/midia/login`
- `/midia/dashboard`

O código detecta quando está fora de `midia.pro` e mantém os links internos corretos para esse modo de teste.

O wildcard `slug.midia.pro` só deve ser testado depois que o domínio wildcard estiver configurado na Vercel/DNS.

## 8. Checklist de validação do ZIP 01

Depois que tudo estiver publicado:

- [ ] Landing abre sem erro e mostra o logo correto.
- [ ] Favicon/manifest usam a identidade Midia.Pro.
- [ ] Banner de cookies usa azul Midia.Pro, não o verde da minhAi.
- [ ] Criar conta por e-mail funciona.
- [ ] Login existente funciona.
- [ ] Login Google/Facebook volta para o dashboard Midia.Pro.
- [ ] Slug com acento/espaço é normalizado corretamente.
- [ ] Slug reservado é recusado.
- [ ] Slug duplicado é recusado.
- [ ] Local pode ser cadastrado.
- [ ] Tela pode ser cadastrada.
- [ ] Parceiro grátis nasce com 20% de inventário de rede.
- [ ] Uso Próprio nasce com 0% e `pending_payment`.
- [ ] Cada tela recebe código público diferente.
- [ ] `slug.midia.pro` abre a página do parceiro.
- [ ] `slug.midia.pro/dashboard` não mostra o dashboard da minhAi.
- [ ] O schema `midia` não é consultável diretamente com chave anon/authenticated.

## 9. Conferência SQL somente leitura

Após aplicar a migration, estas consultas são seguras para conferir a estrutura:

```sql
select table_name
from information_schema.tables
where table_schema = 'midia'
order by table_name;
```

```sql
select plan_key, monthly_price_cents, commercial_mode,
       default_network_inventory_percent
from midia.screen_plan_catalog
order by sort_order;
```

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'midia'
order by tablename;
```

Resultado esperado do catálogo:

- `partner_free` → 0 / partner / 20
- `private_basic` → 1990 / private / 0
- `private_pro` → 3990 / private / 0
- `partner_pro` → 1990 / partner / 20

## 10. O que propositalmente NÃO está neste ZIP

Para manter a implementação validável por etapas, ainda não estão aqui:

- upload de vídeos/imagens pelo proprietário;
- player 9:16;
- cache/offline;
- pareamento da tela;
- heartbeat;
- programação/playlist;
- Realtime Broadcast;
- marketplace de publicidade;
- preços de campanhas;
- PIX de anúncios;
- proof-of-play;
- saldo/saque do parceiro.

As tabelas e decisões desta fundação foram desenhadas para essas etapas entrarem sem quebrar os cadastros criados aqui.

## Segurança

- `SUPABASE_SERVICE_ROLE_KEY` permanece exclusivamente server-side.
- O navegador não consulta o schema `midia` diretamente.
- Toda rota de cadastro confirma `auth.getUser()` antes de usar o client administrativo.
- Local e endereço não são expostos automaticamente na página pública.
- `inventory_class` e `price_factor` ficam sob controle da plataforma; o parceiro não consegue se declarar “Premium” ou aumentar o próprio fator comercial.
- Planos e percentuais são copiados do catálogo server-side, não aceitos do browser como valores livres.

