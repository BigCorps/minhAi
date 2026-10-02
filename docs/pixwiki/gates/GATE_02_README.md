# PixWiki V2 — Gate 2

## Motor universal de Pix Link / Checkout / API + fila dos 11 slots

Este ZIP é **incremental** e pressupõe que o **Gate 1 atualizado** já esteja aplicado.

### O que entra neste gate

- Entidade canônica `pixwiki_v2_checkout_sessions` para `pix_link`, `checkout` e `api`.
- O carrinho aberto **não reserva valor**.
- A reserva dos centavos acontece somente quando o pagador chega ao passo de gerar o Pix.
- Fila FIFO por **conta Mercado Pago + valor original** quando os 11 slots (`valor exato` até `-R$0,10`) estiverem ocupados.
- QR com reserva curta (`120 s` por padrão), renovável por nova passagem na fila.
- Retry seguro: a mesma sessão reaproveita o mesmo intent/transação enquanto eles ainda forem válidos.
- Confirmação integrada ao `pix_direct_reconcile` já existente.
- Ao confirmar, o Checkout vira `paid` e registra **no máximo 1 automação**, usando o ledger do Gate 1.
- Testes (`is_test=true`) deixam trilha no ledger, mas **não consomem franquia**.
- API V1 passa a aceitar:
  - `POST /checkouts`
  - `GET /checkouts/:id`
  - `POST /checkouts/:id/cancel`
- `Idempotency-Key` obrigatório ao criar Checkout via API.
- Rota bonita no Next.js: `https://pix.wiki/api/pixwiki/v1/checkouts`.

### O que NÃO muda ainda

- O Pix Link público atual continua usando o motor legado.
- `pix_link_v2_enabled` nasce como **false**.
- Não existe ainda página pública `/c/chk_...`; ela entra no Gate 3.
- Landing, onboarding, dashboard, Equipe e billing visual não mudam neste Gate.
- O catálogo/assinaturas legados não são migrados.

Isso permite aplicar e validar o backend V2 sem trocar a experiência que já está em produção.

---

## Arquivos do ZIP

```text
supabase/migrations/pixwiki_v2_gate2_payment_engine.sql
supabase/validation/pixwiki_v2_gate2_validate.sql
supabase/functions/pixwiki-v2-checkout/index.ts
supabase/functions/pixwiki-api/index.ts
app/api/pixwiki/v1/route.ts
app/api/pixwiki/v1/[...path]/route.ts
```

`pixwiki-api/index.ts` e `app/api/pixwiki/v1/route.ts` são **substituições** dos arquivos atuais.

---

## Ordem de aplicação futura

1. Aplicar o **Gate 1 atualizado**.
2. Subir este ZIP no repositório preservando os caminhos.
3. Executar:

```text
supabase/migrations/pixwiki_v2_gate2_payment_engine.sql
```

4. Fazer deploy da Edge Function nova:

```text
pixwiki-v2-checkout
```

Ela precisa ficar com `verify_jwt = false`, pois `status`, `prepare` e `confirm` são operações públicas protegidas pelo token opaco `chk_...`. As operações administrativas validam a sessão dentro da própria função.

5. Reimplantar a Edge Function existente:

```text
pixwiki-api
```

Ela também continua com `verify_jwt = false`, pois usa a API Key `pw_live_...` como autenticação própria.

6. Fazer o deploy normal do Next.js/Vercel para publicar as rotas `/api/pixwiki/v1/...`.
7. Rodar o SQL read-only:

```text
supabase/validation/pixwiki_v2_gate2_validate.sql
```

---

## Como a fila funciona

```text
Checkout criado
      ↓
nenhum slot reservado
      ↓
usuário pede o Pix
      ↓
entra na fila do mesmo MP + mesmo valor
      ↓
é o primeiro da fila?
 ┌────┴────┐
 não       sim
 ↓          ↓
aguarda    tenta valor original
           ↓
           -R$0,01 ... -R$0,10
           ↓
           encontrou slot → gera QR
           todos ocupados → continua na fila
```

A fila usa advisory lock somente durante a aquisição do slot. O banco **não mantém uma transação SQL aberta enquanto o usuário paga**.

### Por que isso é importante

Mil pessoas podem manter um Checkout aberto. Só quem efetivamente chega à geração do QR ocupa um dos 11 valores distinguíveis.

---

## Estados da sessão

```text
created
queued
slot_reserved
payment_ready
paid
cancelled
expired
failed
```

`slot_reserved` existe para recuperação de falha/retry entre a reserva no banco e a criação da `pix_transactions`.

---

## API V2 adicionada dentro da V1 pública

### Criar Checkout

```http
POST https://pix.wiki/api/pixwiki/v1/checkouts
Authorization: Bearer pw_live_...
Idempotency-Key: pedido-123-tentativa-1
Content-Type: application/json
```

```json
{
  "company_id": "UUID_DA_EMPRESA",
  "amount_cents": 14990,
  "description": "Pedido #123",
  "external_id": "PEDIDO-123",
  "customer": {
    "name": "Cliente",
    "email": "cliente@exemplo.com"
  },
  "metadata": {
    "pedido_id": "123",
    "origem": "erp"
  },
  "success_url": "https://sistema.exemplo.com/pedidos/123/pago",
  "expires_in_seconds": 86400
}
```

A resposta já contém `checkout_url`, mas a página `/c/...` só será publicada no Gate 3.

Repetir a mesma chamada com o mesmo `Idempotency-Key` devolve o mesmo Checkout.

### Consultar

```http
GET https://pix.wiki/api/pixwiki/v1/checkouts/<UUID>
Authorization: Bearer pw_live_...
```

### Cancelar

```http
POST https://pix.wiki/api/pixwiki/v1/checkouts/<UUID>/cancel
Authorization: Bearer pw_live_...
```

---

## Segurança

- A tabela de Checkout tem RLS.
- `anon` não recebe acesso direto à tabela.
- `authenticated` recebe apenas `SELECT` das empresas em que é owner/manager.
- `cashier` não lê Checkout nem metadata.
- Toda escrita do motor ocorre com `service_role` nas Edge Functions.
- RPCs de fila/reserva/cancelamento ficam sem `EXECUTE` para `anon` e `authenticated`.
- O token público usa 32 bytes aleatórios e não contém valor, empresa, pedido ou ID sequencial.
- Valor, `external_id` e `metadata` ficam server-side; a URL pública carrega somente `chk_...`.
- A API exige `Idempotency-Key` em toda criação de Checkout.

---

## Uso/franquia

A criação de sessão e a geração do QR não consomem franquia.

Só após `pix_direct_intents.status = confirmed` o trigger registra:

```text
1 pagamento automatizado = no máximo 1 automação
```

Mesmo com retries, a chave de uso é:

```text
pixwiki:v2:checkout:<checkout_id>
```

portanto não pode cobrar a mesma sessão duas vezes.

O desconto de R$0,01 a R$0,10 é salvo como `convenience_credit_cents` para ser absorvido pelo billing em gate posterior.

---

## Critérios para considerar o Gate 2 aprovado

- Migration roda sem erro depois do Gate 1.
- SQL de validação retorna todas as estruturas/funções esperadas.
- `pix_link_v2_enabled = false` após a migration.
- API antiga `GET /companies` continua respondendo com uma API Key válida.
- `POST /checkouts` exige `Idempotency-Key`.
- Repetir o mesmo `Idempotency-Key` retorna o mesmo Checkout.
- `anon`/`authenticated` não conseguem executar os RPCs internos da fila.
- Nenhuma mudança visual aparece na PixWiki atual.

O teste visual e o teste real da fila serão feitos no **Gate 3**, quando entra a página pública do Checkout e podemos abrir 12+ sessões do mesmo valor de forma controlada.
