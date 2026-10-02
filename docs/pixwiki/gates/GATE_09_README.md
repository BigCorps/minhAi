# PixWiki V2 — Gate 9

## Calculadora comercial + Lead Scoring + Leads PixWiki no Admin BigCorps

Este pacote é **somente o delta do Gate 9** e depende da aplicação prévia dos **Gates 1 a 8**, nesta ordem.

Nenhuma alteração deste Gate foi aplicada automaticamente ao Supabase, GitHub ou Vercel.

## O que entra neste Gate

### 1. Calculadora pública

Nova rota:

- `pix.wiki/calculadora`

Ela pede:

- quantidade de Pix por mês;
- ticket médio;
- modelo da taxa atual: percentual, fixa, gratuita ou desconhecida;
- valor da taxa, quando aplicável.

O cálculo usa o catálogo V2 e a RPC de cotação criada no Gate 1. A página mostra:

- volume Pix mensal aproximado;
- faixa mensal PixWiki mais econômica;
- custo mensal PixWiki;
- custo atual informado pelo prospect;
- economia mensal estimada quando a taxa atual é conhecida;
- cenário de 12 meses considerando os preços anuais disponíveis e excedentes mensais.

Quando o prospect apenas calcula, **nenhum lead é gravado no banco**. A simulação fica em `localStorage` por no máximo 30 dias. Se a pessoa realmente criar a conta, o onboarding importa a simulação e a associa ao usuário autenticado.

Isso evita transformar visitantes anônimos em leads falsos.

### 2. Landing PixWiki

A landing do Gate 5 é atualizada apenas para acrescentar CTAs para a calculadora:

- `Calcular minha economia` no hero;
- `Comparar com a taxa que pago hoje` na seção de planos.

O cadastro e o onboarding continuam seguindo o fluxo do Gate 5.

### 3. Importação da calculadora no onboarding

`app/pix/onboarding/page.tsx` passa a:

- importar `pixWikiCalculatorLead` depois que a empresa autenticada é criada/recuperada;
- validar que a simulação tem menos de 30 dias;
- persistir os dados através de `pixwiki_v2_onboarding_save_estimate(...)`;
- apagar o rascunho local somente depois de salvar com sucesso;
- pré-preencher a calculadora interna do onboarding com os dados já salvos.

### 4. Score comercial oficial

O score passa a seguir exatamente a regra combinada:

| Marco | Pontos |
|---|---:|
| Conta criada | +5 |
| Mercado Pago conectado | +15 |
| Primeiro Pix detectado | +20 |
| Push ativado | +5 |
| Pix Link testado | +10 |
| Checkout testado | +15 |
| API testada | +20 |
| Webhook testado | +20 |
| Volume declarado >= 10.000 Pix/mês | +30 |
| Pricing/calculadora visualizada | +5 |
| Iniciou compra | +40 |

E-mail, WhatsApp ou simplesmente escolher um plano na calculadora **não aumentam o score** por si só.

### 5. Detecção real de “iniciou compra”

A migration adiciona `purchase_started_at` ao `pixwiki_v2_onboarding_state`.

O marco não depende de um clique do frontend. Um trigger em `pixwiki_invoices` marca o lead quando existe uma fatura real de base para `LINK`, `PRO` ou `VIP`, com valor maior que zero e status `pending` ou `paid`.

Faturas V2 anteriores elegíveis são backfilled durante a migration.

### 6. Admin BigCorps — Leads PixWiki

Nova seção administrativa:

- `/admin/pixwiki-leads`
- em `admin.minhai.app`: `/pixwiki-leads`

O Admin mostra:

- total de leads;
- quantos já receberam o primeiro Pix;
- quantos visualizaram calculadora/pricing;
- quantos iniciaram compra;
- quantos declararam 10 mil+ Pix/mês;
- quantos têm score 80+;
- score médio;
- soma da economia mensal positiva declarada.

A lista permite filtrar por:

- busca por empresa, e-mail, slug ou telefone;
- estágio;
- plano de interesse;
- score mínimo;
- ordenação por score, atividade recente, volume ou economia.

Cada lead mostra:

- empresa/e-mail/slug;
- score;
- estágio;
- Pix/mês e ticket;
- taxa atual declarada;
- custo atual;
- custo PixWiki;
- economia estimada;
- plano indicado/interessado;
- plano de billing atual;
- última atividade.

### 7. Segurança

A RPC `admin_pixwiki_v2_leads_page(...)`:

- é `SECURITY DEFINER` porque precisa consolidar `auth.users` e dados internos;
- tem `EXECUTE` explicitamente revogado de `PUBLIC`, `anon` e `authenticated`;
- é executável apenas por `service_role`;
- é chamada somente pelo Route Handler server-side do Admin;
- o Route Handler usa o mesmo `getPlatformAdminAccess()` do Admin atual, incluindo a exigência Google-only.

Nenhum `service_role` vai para o navegador.

A calculadora pública só acessa objetos que os Gates anteriores já expõem explicitamente para leitura/cotação (`pixwiki_v2_plan_catalog` e `pixwiki_v2_quote_monthly_usage`).

## Arquivos

```text
PIXWIKI_V2_GATE9_README.md
app/
  admin/
    pixwiki-leads/
      page.tsx
  api/
    admin/
      pixwiki-leads/
        route.ts
  pix/
    calculadora/
      page.tsx
    onboarding/
      page.tsx
    page.tsx
components/
  admin/
    AdminHeader.tsx
    AdminPixWikiLeads.tsx
supabase/
  migrations/
    pixwiki_v2_gate9_leads_calculator.sql
  validation/
    pixwiki_v2_gate9_validate.sql
```

## Ordem de aplicação futura

1. Aplicar Gates 1 → 8.
2. Copiar os arquivos deste ZIP para o repositório, preservando os caminhos.
3. Aplicar `supabase/migrations/pixwiki_v2_gate9_leads_calculator.sql`.
4. Executar `supabase/validation/pixwiki_v2_gate9_validate.sql`.
5. Fazer deploy da aplicação/Edge Functions dos Gates anteriores e deste Gate conforme o fluxo normal do projeto.
6. Rodar os Advisors de segurança/performance do Supabase depois da DDL.

## Testes manuais recomendados

### Calculadora sem cadastro

1. Abrir `/calculadora`.
2. Informar volume, ticket e taxa.
3. Confirmar faixa/custo/economia.
4. Recarregar a página principal: ainda não deve existir lead novo no banco apenas por calcular.

### Calculadora → cadastro

1. Fazer uma simulação.
2. Clicar `Criar conta grátis e testar com um Pix real`.
3. Criar a conta normalmente.
4. Entrar no onboarding.
5. Confirmar no Admin que volume, ticket, taxa, economia e plano sugerido foram associados ao lead.

### Score

Testar progressivamente:

- conta: 5;
- + MP: 20;
- + primeiro Pix: 40;
- + Push: 45;
- + Link: 55;
- + Checkout: 70;
- + API: 90;
- + webhook: 110;
- + 10k Pix/mês: 140;
- + pricing: 145;
- + início de compra: 185.

### Início de compra

Ao gerar uma fatura real de plano pago no Gate 8:

- `purchase_started_at` deve ser preenchido;
- score deve ganhar +40;
- o estágio no Admin deve virar `Iniciou compra`;
- retries/regeneração de QR da mesma obrigação não devem multiplicar o score.

## Observação sobre Supabase em 2026

O Gate 1 já usa `GRANT` explícito nos objetos públicos necessários. Isso é importante porque o Supabase está encerrando a exposição automática de novas tabelas ao Data API; este Gate não depende de exposição implícita.
