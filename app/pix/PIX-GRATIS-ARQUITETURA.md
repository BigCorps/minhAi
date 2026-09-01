# Pix Grátis inteligente — arquitetura oficial

Atualizado em: 23/08/2026

## Objetivo

Um único motor atende `minhai`, `pixwiki` e `funcionaria` com duas formas permanentes de confirmação:

- `free`: Pix direto para a chave do recebedor; valor exato sempre que possível. Só reduz de R$ 0,01 a R$ 0,10 quando outra intenção pendente da mesma conta Mercado Pago já reservou aquele valor.
- `mercadopago`: cobrança Pix criada pela API do Mercado Pago, sem ajuste no valor.

A ausência de uma linha em `pix_payment_preferences` significa **comportamento anterior/legado**. Nenhuma empresa é migrada automaticamente.

## Reserva dos centavos

A RPC `pix_direct_reserve_intent` resolve a conta financeira real para `connection_scope = mpuser:<id>` e usa `pg_advisory_xact_lock`. O índice único parcial de intenções pendentes impede duas reservas iguais mesmo sob concorrência.

A sequência é 0, 1, 2 ... 10 centavos de desconto. Se os 11 slots estiverem ocupados, a criação falha com `pix_direct_slots_unavailable`; não existe associação probabilística.

## Reconciliação compartilhada

`pix-direct-reconcile` é a única implementação de busca de recebimentos Pix diretos. Ela:

1. carrega a intenção e sua janela temporal;
2. resolve a conexão Mercado Pago que corresponde ao `mpuser` da intenção;
3. consulta pagamentos aprovados;
4. exige Pix `PSP_TRANSFER`, valor exato e horário dentro da janela;
5. rejeita IDs já usados por outra intenção;
6. se houver mais de um candidato, retorna `ambiguous_direct_payment` e não confirma nada;
7. faz o claim idempotente pelo `provider_payment_id`.

Depois disso, cada produto executa apenas seus efeitos de negócio:

- minhAi: `confirmar-pix-assistente-v2` delega ao confirmador legado para preservar pedido, estoque, comissão, e-mail, WhatsApp e push;
- PixWiki: `pixwiki-confirm-payment` confirma a transação e executa a sincronização/histórico/notificações do PixWiki;
- FuncionarIA: `funcionaria_finalizar_pix` conclui checkout, pedido e baixa de estoque.

## Automação

O cron existente continua chamando `auto-confirmar-pix`. A Edge agora funciona como roteador:

- PixWiki -> `pixwiki-confirm-payment`;
- minhAi `pix_direct` -> `confirmar-pix-assistente-v2`;
- FuncionarIA `pix_direct` -> reconciliador + `funcionaria_finalizar_pix`;
- Mercado Pago/legados -> caminhos já existentes.

Não foi criado um segundo cron concorrente.

## Configuração e migração

`pix_payment_mode_settings` consulta modo e pré-requisitos da própria empresa.

`pix_payment_mode_set` exige owner/manager e valida:

- Pix Grátis: chave Pix + Mercado Pago conectado;
- Mercado Pago: Mercado Pago conectado.

No PixWiki existe também `allow_payer_choice`. Quando habilitado, a página pública oferece os dois modos. A Edge ignora `payment_mode` enviado pelo pagador se a empresa não tiver liberado essa escolha.

## Regra de interface

Sem colisão:

- Total: R$ 59,90
- Pagar: R$ 59,90

Com colisão:

- Total: R$ 59,90
- Desconto Pix: R$ 0,02
- Pagar: R$ 59,88

O desconto só é mencionado quando `discount_cents > 0`.

## Segurança

- `pix_direct_intents` não é operada diretamente pelo navegador.
- RPCs de reserva/match/claim são exclusivas de `service_role`.
- A Edge `pix-direct-reconcile` é publicada sem JWT obrigatório apenas porque funções internas do projeto a chamam; ela verifica explicitamente o token `service_role` no corpo da implementação.
- A página pública do PixWiki recebe somente disponibilidade/modo; nunca chave, access token ou refresh token.
- Ambiguidade nunca é resolvida escolhendo arbitrariamente um pagamento.
