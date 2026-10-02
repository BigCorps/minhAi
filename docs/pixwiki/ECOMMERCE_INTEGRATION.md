# PixWiki V2 — Integração com lojas virtuais

A integração recomendada é server-to-server. O navegador da loja nunca recebe a chave API.

## Fluxo

1. A loja cria/fecha o pedido no próprio sistema.
2. O backend da loja chama `POST /api/pixwiki/v1/checkouts`.
3. A PixWiki devolve `checkout_url`.
4. A loja redireciona o comprador para essa URL.
5. Depois do pagamento, a PixWiki confirma por webhook assinado e também permite consulta via API.
6. Se `redirect_url`/`success_url` foi enviado, o comprador pode voltar à loja após a confirmação.

## Payload amigável para e-commerce

```json
{
  "company_id": "UUID_DA_EMPRESA",
  "order_nsu": "PEDIDO-1042",
  "items": [
    { "quantity": 2, "price": 4990, "description": "Camiseta", "sku": "CAM-PRETA-M" }
  ],
  "customer": {
    "name": "João Silva",
    "email": "joao@example.com",
    "phone_number": "+5511999999999"
  },
  "address": {
    "cep": "01001000",
    "street": "Praça da Sé",
    "number": "1",
    "city": "São Paulo",
    "state": "SP"
  },
  "redirect_url": "https://loja.exemplo/pedido/1042/obrigado",
  "metadata": { "cart_id": "CART-88" }
}
```

Headers:

```text
Authorization: Bearer pw_live_...
Idempotency-Key: pedido-1042
Content-Type: application/json
```

`amount_cents` é opcional quando `items` foi enviado; a API soma `quantity * price`. Se ambos forem enviados, os totais precisam coincidir.

Aliases aceitos para facilitar migração de integrações:
- `order_nsu` ou `order_id` → `external_id`
- `redirect_url` → `success_url`
- `customer.phone_number` → `customer.phone`
- `comment` → `description`

## Resposta

A resposta inclui `id`, `checkout_url`, `status`, `external_id`, `order_nsu`, `items`, `customer`, `redirect_url`, timestamps e estado do pagamento.

## Conciliação

- Consulte `GET /api/pixwiki/v1/checkouts?external_id=PEDIDO-1042` (ou `order_nsu=PEDIDO-1042`).
- Ou consulte `GET /api/pixwiki/v1/checkouts/{checkout_id}`.
- O webhook `pix.received` devolve o `external_id` e preserva `metadata.items`/`metadata.address` no contexto do Checkout.

## Webhook

Configure o webhook uma única vez no Dashboard. A entrega usa HTTPS, assinatura HMAC SHA-256, `X-PixWiki-Event-Id`, timestamp e `Idempotency-Key`. Há retentativas automáticas.

A loja deve responder rapidamente com HTTP 2xx e processar o evento de forma idempotente usando o Event ID.

## Segurança

- Nunca exponha `pw_live_...` no frontend.
- Use uma `Idempotency-Key` estável por pedido.
- Grave `checkout_id` e `external_id/order_nsu`.
- Confirme o pedido pelo webhook ou pela API; não confie apenas no redirecionamento do navegador.
