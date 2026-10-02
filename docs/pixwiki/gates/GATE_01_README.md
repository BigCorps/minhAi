# PixWiki V2 — Gate 1

## Escopo deste Gate

Este Gate cria somente a **fundação V2** da PixWiki. Ele foi desenhado para ser aplicado sem mudar o comportamento atual do produto.

Incluído:

- catálogo V2 com PIX GRÁTIS / PIX LINK / PIX PRO / PIX VIP;
- franquia e excedente por automação;
- ledger idempotente de uso;
- períodos mensais de uso;
- cotação da faixa mensal mais econômica;
- estrutura do futuro onboarding e funil comercial;
- papel `cashier` em `company_admins`;
- RPC mínimo e seguro para a futura tela de funcionário;
- Push permitido para owner/manager/cashier;
- RLS para gestores e isolamento do caixa;
- a mudança de `pixwiki_receipts` para `security_invoker` fica **adiada ao Gate 10**, junto da migração dos consumidores da view;
- revogação de RPCs internos que não precisam ficar expostos a `anon/authenticated`.

## O que NÃO muda neste Gate

- o catálogo atual `pixwiki_plan_catalog`;
- as assinaturas atuais `pixwiki_subscriptions`;
- os preços mostrados hoje no dashboard;
- Pix Link atual;
- API/Webhooks atuais;
- fluxo Mercado Pago atual;
- onboarding atual;
- nenhuma assinatura é migrada para VIP ainda.

A migração das suas assinaturas para VIP ficará no Gate de billing/ativação V2, quando a interface nova já existir.

## Arquivos

- `supabase/migrations/pixwiki_v2_gate1_foundation.sql`
  - migration do Gate 1.
- `supabase/validation/pixwiki_v2_gate1_validate.sql`
  - consultas somente leitura para validar o resultado.

## Ordem para testar

1. Suba os arquivos deste ZIP no repositório, preservando os caminhos.
2. Aplique `supabase/migrations/pixwiki_v2_gate1_foundation.sql` no Supabase.
3. Rode `supabase/validation/pixwiki_v2_gate1_validate.sql`.
4. Verifique que os quatro planos V2 aparecem com estes valores:

| Plano | Incluído/mês | Mensal | Anual | Excedente |
|---|---:|---:|---:|---:|
| PIX GRÁTIS | 100 | R$ 0 | — | R$ 0,79 |
| PIX LINK | 1.000 | R$ 490 | R$ 4.900 | R$ 0,49 |
| PIX PRO | 10.000 | R$ 2.900 | R$ 29.000 | R$ 0,29 |
| PIX VIP | 100.000 | R$ 19.000 | R$ 190.000 | R$ 0,19 |

5. Confirme que a PixWiki atual continua abrindo e recebendo Pix normalmente.

## Critério para aprovar o Gate

O Gate está aprovado se:

- migration roda sem erro;
- validação encontra as 5 tabelas V2;
- `company_admins_role_check` contém `cashier`;
- `pixwiki_receipts` permanece compatível com os consumidores legados neste Gate; o hardening para `security_invoker` é validado no Gate 10;
- o catálogo legado continua intacto;
- dashboard atual, Pix Link e recebimentos atuais continuam funcionando.

## Observação importante

`pixwiki_v2_record_usage` existe neste Gate, mas **nenhum fluxo atual chama essa função ainda**. Portanto a tabela de uso deve permanecer vazia até o Gate 2. Isso é intencional.
