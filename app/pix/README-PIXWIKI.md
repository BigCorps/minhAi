# PixWiki — arquitetura e estado atual

Atualizado em: **23/08/2026**

O PixWiki é a camada de confirmação, histórico e automação de recebimentos Pix da BigCorps. Ele não é carteira, banco nem conta de pagamento: o dinheiro entra diretamente na conta do recebedor.

## Formas de confirmação

O PixWiki mantém duas opções lado a lado:

### Pix Grátis — recomendado

O QR Pix aponta para a chave do recebedor. O valor é mantido integralmente na situação normal. Quando existem cobranças simultâneas do mesmo valor na mesma conta Mercado Pago, o motor reserva um valor único com desconto de R$ 0,01 a R$ 0,10.

A confirmação é automática pelo motor compartilhado `pix-direct-reconcile`.

### Pix pelo Mercado Pago

A cobrança é criada pela API do Mercado Pago, com valor exato e identificação nativa do provedor. Podem existir tarifas/condições cobradas pelo Mercado Pago.

## Migração compatível

Clientes atuais não mudam de fluxo por deploy. Sem preferência explícita em `pix_payment_preferences`, o comportamento anterior permanece ativo. A nova forma só passa a valer depois de o proprietário/gerente salvar uma escolha.

## Pix Link

O recebedor continua usando `seunome.pix.wiki` e `seunome.pix.wiki/49.90`.

Na aba **Pagamentos**, ele escolhe a forma padrão e pode habilitar **Permitir que o pagador escolha**. O servidor só respeita uma escolha pública quando essa permissão está habilitada.

## Motor compartilhado

Os produtos `pixwiki`, `minhai` e `funcionaria` compartilham:

- `pix_direct_intents`;
- `pix_payment_preferences`;
- `pix_direct_reserve_intent`;
- `pix_direct_claim_provider_payment`;
- `pix-direct-reconcile`;
- `auto-confirmar-pix`.

A reserva usa `mpuser:<id>` como escopo. Assim, dois produtos que recebem na mesma conta Mercado Pago não podem reservar o mesmo valor simultaneamente.

Consulte `app/pix/PIX-GRATIS-ARQUITETURA.md` para a especificação completa.

## Infraestrutura PixWiki preservada

Continuam em uso:

- `pixwiki_mp_connections` e OAuth Mercado Pago;
- `pixwiki_payment_settings`;
- `mp_received_payments`;
- `pixwiki-sync-mp-receipts`;
- `pixwiki-refresh`;
- `pixwiki-notify` e canais de notificação;
- API/Webhooks PixWiki;
- Realtime do dashboard;
- proteção contra mudança de proprietário do recebimento.

As rotas `app/pix/[slug]` e `app/pix/[slug]/[valor]` continuam compartilhadas com a minhAi. Host PixWiki deve usar `PixWikiLinkPage`; hosts minhAi preservam o `PixLinkPage` legado/V2 compatível.
