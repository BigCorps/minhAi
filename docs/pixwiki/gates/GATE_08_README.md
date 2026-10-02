# PixWiki V2 — Gate 8: Billing V2

Este ZIP é **somente o Gate 8** e deve ser aplicado **depois dos Gates 1 a 7**, na ordem.

## O que este Gate ativa

- `pixwiki_v2_billing_accounts` vira a fonte de verdade do billing PixWiki.
- Planos finais:
  - PIX GRÁTIS — 100 automações/mês — excedente R$ 0,79.
  - PIX LINK — 1.000/mês — R$ 490/mês ou R$ 4.900/ano — excedente R$ 0,49.
  - PIX PRO — 10.000/mês — R$ 2.900/mês ou R$ 29.000/ano — excedente R$ 0,29.
  - PIX VIP — 100.000/mês — R$ 19.000/mês ou R$ 190.000/ano — excedente R$ 0,19.
- Anual = 10 mensalidades. O desconto anual vale para a **base**.
- Excedente fecha por mês-calendário em `America/Sao_Paulo`.
- Proteção automática da faixa mais econômica no fechamento mensal.
- Limite de gasto de excedente opcional.
- Crédito de conveniência:
  1. reduz o excedente daquele mês;
  2. se sobrar, vira crédito interno PixWiki;
  3. o crédito restante reduz a próxima renovação;
  4. nunca vira saldo sacável.
- Renovação de base via Pix/Banco Inter.
- Excedente via fatura Pix separada.
- QR vencido pode ser regenerado para a **mesma fatura**, sem duplicar obrigação.
- Carência de 7 dias para obrigação vencida.
- Após a carência, apenas automações pagas ficam pausadas.
- Chave Pix, recebimentos, histórico, dashboard e Push continuam funcionando.

## Migração solicitada das contas atuais

Na auditoria feita antes deste Gate existiam **5 registros em `pixwiki_subscriptions`**: 2 Free e 3 Pro, todos ativos.

A migration do Gate 8 converte **todos os registros que já existirem em `pixwiki_subscriptions` no momento da execução** para:

- `PIX VIP`;
- `status = active`;
- `complimentary = true` na conta V2;
- excedente liberado;
- sem vencimento financeiro V2.

O espelho legado recebe vencimento distante (`2099-12-31`) apenas para evitar que rotinas antigas interpretem a cortesia como expirada. A fonte de verdade passa a ser a conta V2.

> Isso é proposital e atende à decisão de que as assinaturas existentes são do proprietário/testes e não precisam de grandfathering comercial.

## Proteção da faixa mais econômica

O Gate não muda o plano automaticamente no meio do mês. Ele muda **o valor do fechamento**.

Exemplo: usuário PIX LINK com volume suficiente para o PIX PRO ser mais barato:

- a base PIX LINK já foi paga;
- no fechamento, o sistema compara `LINK + excedente` com as outras faixas;
- se `PRO` for mais barato, a fatura de excedente cobra somente a diferença necessária para chegar ao custo protegido do PRO.

Isso mantém a promessa:

> A PixWiki sempre aplica automaticamente a faixa mais econômica para o seu volume.

No plano anual, a base anual continua com desconto. Para os degraus de volume, usa-se a base **mensal de referência**, evitando dar desconto anual também sobre excedente.

## Arquivos

```text
PIXWIKI_V2_GATE8_README.md
components/pix/PixWikiDashboardNav.tsx
app/pix/dashboard/planos/page.tsx
supabase/functions/pixwiki-plan/index.ts
supabase/functions/pixwiki-reconcile-subscriptions/index.ts
supabase/migrations/pixwiki_v2_gate8_billing.sql
supabase/validation/pixwiki_v2_gate8_validate.sql
MANIFEST.txt
```

## Ordem para validar futuramente

1. Aplicar os Gates 1 → 7.
2. Aplicar `supabase/migrations/pixwiki_v2_gate8_billing.sql`.
3. Implantar/substituir:
   - `pixwiki-plan`
   - `pixwiki-reconcile-subscriptions`
4. Subir os arquivos Next.js.
5. Rodar `supabase/validation/pixwiki_v2_gate8_validate.sql`.
6. Rodar os Security Advisors do Supabase.
7. Validar uma conta de teste não-cortesia:
   - selecionar LINK mensal;
   - gerar Pix;
   - pagar;
   - confirmar ativação;
   - habilitar excedente;
   - definir limite;
   - simular/gerar uso acima da franquia em ambiente de teste;
   - verificar fechamento e regeneração de QR.
8. Validar uma das contas migradas e confirmar `VIP CORTESIA`.

## Comportamento de renovação

O cron existente `pixwiki-reconcile-subscriptions` continua sendo usado. No V2 ele passa a:

- reconciliar faturas pagas;
- fechar períodos de uso já encerrados;
- gerar faturas de excedente idempotentes;
- preparar renovação até 3 dias antes do vencimento;
- marcar `grace` no vencimento;
- marcar `paused` após 7 dias sem pagamento;
- reativar após pagamento, desde que não exista outra obrigação vencida.

## Segurança

- `service_role` permanece apenas nas Edge Functions.
- A página `/dashboard/planos` usa somente token do usuário + Edge Function.
- Manager não recebe permissão de escrita no billing; alterações exigem ser proprietário de empresa PixWiki.
- Escrita direta nas tabelas de billing permanece revogada de `anon/authenticated`.
- As RPCs internas de fechamento/aplicação de fatura são `service_role` only.

## Não incluído neste Gate

- cartão salvo/recorrência automática em cartão;
- CRM de leads;
- página BigCorps Admin de leads;
- ajustes finais de landing/termos/documentação comercial.

Esses itens ficam para os próximos Gates.
