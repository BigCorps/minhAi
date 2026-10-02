# PixWiki API V2 — contrato 2026-10-01

Base pública:

`https://pix.wiki/api/pixwiki/v1`

Autenticação:

`Authorization: Bearer pw_live_...`

Todas as respostas V2 incluem `api_version` e `request_id`. Os mesmos valores também aparecem nos headers `X-PixWiki-Version` e `X-Request-Id`.

## Endpoints

### Empresas

`GET /companies`

Retorna empresas PixWiki da conta da API Key e informa se o Mercado Pago está conectado.

### Resumo

`GET /summary?company_id=<uuid>&source=all&from=<iso>&to=<iso>`

`source` aceita:

- `all`
- `pix_key`
- `pix_link`
- `checkout`
- `api`

A agregação é executada no Postgres e não carrega dezenas de milhares de receipts na Edge Function.

### Recebimentos

`GET /receipts?company_id=<uuid>&source=all&status=all&limit=50&offset=0`

`GET /receipts/:id`

Quando o recebimento pertence a Checkout/API, a resposta inclui:

```json
{
  "checkout": {
    "id": "...",
    "external_id": "PEDIDO-123",
    "description": "Pedido 123",
    "customer": {
      "name": "Maria",
      "email": "maria@example.com",
      "phone": null
    },
    "metadata": {
      "erp_order_id": 123
    },
    "is_test": false
  }
}
```

### Listar Checkouts

`GET /checkouts`

Filtros opcionais:

- `company_id`
- `status`
- `origin=all|pix_link|checkout|api`
- `external_id`
- `limit` (máximo 100)
- `offset`

### Criar Checkout

`POST /checkouts`

Header obrigatório:

`Idempotency-Key: <chave única de 8 a 200 caracteres>`

Exemplo:

```json
{
  "company_id": "00000000-0000-0000-0000-000000000000",
  "amount_cents": 14990,
  "description": "Pedido 123",
  "external_id": "PEDIDO-123",
  "customer": {
    "name": "Maria",
    "email": "maria@example.com",
    "phone": "5511999999999"
  },
  "metadata": {
    "erp_order_id": 123,
    "seller": "loja-centro"
  },
  "success_url": "https://empresa.com.br/pedido/123/sucesso",
  "expires_in_seconds": 86400
}
```

A resposta contém `checkout_url`, por exemplo:

`https://pix.wiki/c/chk_...`

Repetir a mesma requisição com a mesma `Idempotency-Key` devolve o mesmo Checkout.

Para testes de integração sem consumir franquia, enviar `"test": true`.

### Consultar Checkout

`GET /checkouts/:id`

Retorna status, valor, cliente, metadata, `external_id` e referências do pagamento.

### Cancelar Checkout

`POST /checkouts/:id/cancel`

Só cancela sessões ainda canceláveis. Pagamento já confirmado nunca é desfeito por este endpoint.

---

# Webhooks V2

Evento atual:

`pix.received`

Versão:

`2026-10-01`

Headers enviados:

- `X-PixWiki-Event`
- `X-PixWiki-Event-Id`
- `X-PixWiki-Timestamp`
- `X-PixWiki-Version`
- `X-PixWiki-Signature`
- `Idempotency-Key`

A assinatura continua sendo HMAC SHA-256 sobre:

`<timestamp>.<raw_body>`

O header de assinatura possui o formato:

`X-PixWiki-Signature: v1=<hex>`

O consumidor deve validar a assinatura usando o **corpo bruto recebido**, antes de parsear/re-serializar o JSON.

## Payload

```json
{
  "id": "uuid-do-evento",
  "event": "pix.received",
  "type": "pix.received",
  "api_version": "2026-10-01",
  "created_at": "2026-10-01T20:00:00.000Z",
  "livemode": true,
  "test": false,
  "data": {
    "receipt_id": "uuid",
    "company": {
      "id": "uuid",
      "name": "Minha Loja",
      "slug": "minha-loja"
    },
    "mp_payment_id": "123456789",
    "source": "api",
    "provider_source": "pix_key",
    "amount_cents": 14990,
    "original_amount_cents": 15000,
    "discount_cents": 10,
    "fee_amount_cents": 0,
    "net_amount_cents": 14990,
    "currency": "BRL",
    "status": "approved",
    "received_at": "2026-10-01T19:59:58.000Z",
    "context": {
      "checkout_id": "uuid",
      "checkout_url": "https://pix.wiki/c/chk_...",
      "external_id": "PEDIDO-123",
      "description": "Pedido 123",
      "customer": {
        "name": "Maria",
        "email": "maria@example.com",
        "phone": "5511999999999"
      },
      "metadata": {
        "erp_order_id": 123
      }
    }
  }
}
```

Para Pix recebido diretamente pela chave, `source` é `pix_key` e `context` pode ser `null`.

## Idempotência

O `id` do evento e o header `Idempotency-Key` são iguais em todas as tentativas do mesmo evento. O sistema receptor deve persistir esse ID e ignorar uma segunda execução já processada.

## Retentativas

O PixWiki tenta novamente em aproximadamente:

1. 1 minuto
2. 5 minutos
3. 30 minutos
4. 120 minutos

Após a quinta tentativa malsucedida, a entrega é marcada como falha.

## Cobrança de automação

Webhook de um Checkout/API já pago **não cria uma segunda unidade de uso**.

Para Pix direto pela chave, um webhook enviado pode consumir uma automação. O ledger usa uma chave idempotente por receipt, permitindo que futuros canais (e-mail/WhatsApp) compartilhem a mesma unidade em vez de cobrar novamente.
