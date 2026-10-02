# PixWiki V2 — Gate 4

## Escopo

Este Gate depende de **Gate 1 + Gate 2 + Gate 3** e contém apenas o delta de **API V2 + Webhooks enriquecidos**.

Não inclui onboarding novo, dashboard de uso, equipe/caixa visual nem billing V2 final.

> Observação: a tela visual atual de **API & Webhooks** ainda pode exibir o gate legado de Pix Pro. Este Gate remove o bloqueio no backend; a tela será alinhada no Gate visual/onboarding posterior, evitando misturar escopos.

## O que muda

### API

- mantém `GET /companies`, `GET /summary`, `GET /receipts` e `GET /receipts/:id`;
- mantém `POST /checkouts`, `GET /checkouts/:id` e `POST /checkouts/:id/cancel`;
- adiciona `GET /checkouts` com filtros/paginação;
- `receipts` passa a entender `pix_key`, `pix_link`, `checkout` e `api`;
- `summary` agrega direto no Postgres, sem limite em memória de 100 mil linhas;
- respostas incluem `api_version=2026-10-01` e `request_id`;
- Checkout retorna `external_id`, cliente, metadata, referências do pagamento e `checkout_url`;
- API continua com 120 requisições/minuto por chave;
- criação de Checkout continua exigindo `Idempotency-Key`.

### API Keys / Webhooks

- remove o feature gate legado de Pix Pro;
- API e Webhooks podem existir em qualquer plano V2;
- limite operacional: 10 API Keys ativas e 10 Webhooks por usuário;
- segredos continuam exibidos uma única vez.

### Webhook `pix.received`

- contrato versionado `2026-10-01`;
- HMAC SHA-256 continua sobre `<timestamp>.<raw_body>`;
- header novo `X-PixWiki-Version`;
- mantém campos antigos em `data`;
- adiciona `context` com:
  - `checkout_id`;
  - `checkout_url`;
  - `external_id`;
  - `description`;
  - `customer`;
  - `metadata`;
- `source` passa a ser canônico: `pix_key | pix_link | checkout | api`;
- 5 tentativas, preservando o mesmo Event ID/Idempotency-Key.

## Regra de uso

- Checkout/API já pagos reutilizam a automação registrada no Gate 2;
- Webhook não cobra uma segunda unidade;
- Pix direto pela chave só consome uma automação se houver Webhook ativo e disponível para envio;
- a chave idempotente de Pix direto é `pixwiki:v2:receipt:<receipt_id>`;
- isso prepara Gate posterior de E-mail/WhatsApp para compartilhar a mesma unidade.

## Arquivos

- `supabase/migrations/pixwiki_v2_gate4_api_webhooks.sql`
- `supabase/functions/pixwiki-api/index.ts`
- `supabase/functions/pixwiki-api-admin/index.ts`
- `supabase/functions/pixwiki-webhook-dispatch/index.ts`
- `app/api/pixwiki/v1/route.ts`
- `app/api/pixwiki/v1/[...path]/route.ts`
- `docs/pixwiki/API-V2.md`
- `supabase/validation/pixwiki_v2_gate4_validate.sql`

## Ordem futura de aplicação

Quando chegar a hora de subir os Gates:

1. Gate 1 atualizado;
2. Gate 2;
3. Gate 3;
4. aplicar `pixwiki_v2_gate4_api_webhooks.sql`;
5. publicar as três Edge Functions deste Gate;
6. subir os dois Route Handlers Next.js;
7. executar `pixwiki_v2_gate4_validate.sql`;
8. testar API Key, Checkout e um endpoint HTTPS de Webhook.

## Testes sugeridos

### API

1. Criar API Key.
2. `GET /companies`.
3. Criar Checkout com `Idempotency-Key`.
4. Repetir a mesma requisição e confirmar `idempotent_replay=true`.
5. Consultar `GET /checkouts?external_id=...`.
6. Consultar `GET /checkouts/:id`.
7. Consultar `GET /receipts` depois de pagar.
8. Verificar `source=api` e `checkout.external_id`.

### Webhook

1. Criar Webhook HTTPS.
2. Copiar o `whsec_...` exibido uma vez.
3. Usar “Testar Webhook”.
4. Confirmar headers de assinatura e `api_version`.
5. Criar/pagar Checkout API.
6. Confirmar que o receiver recebe `pix.received` com o mesmo `external_id` e metadata.
7. Responder HTTP 500 propositalmente e verificar retentativa.
8. Processar por Event ID e confirmar idempotência.

## Rollback operacional

Se houver problema somente nos Webhooks, desative os Webhooks pelo Admin/API Admin sem tocar nos pagamentos.

As mudanças deste Gate não alteram a confirmação financeira nem a fila de slots dos Gates 2/3.
