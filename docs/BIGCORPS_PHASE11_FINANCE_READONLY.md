# BigCorps — Fase 11 | Auditoria financeira somente leitura

**Executado em:** 08/10/2026. **Projeto Supabase:** `qyonozbroekuqlotqcbm`. Nenhum pagamento, saque, estorno, migração ou alteração de registro foi executado.

## Contas, comissões e créditos

- 7 contas `company_balance`; 0 saldos negativos ou saques acumulados superiores a recebimentos.
- 142 carteiras `user_credits`; 0 saldos negativos.
- 0 `withdrawal_requests` no fluxo novo (não exercitado).
- FuncionarIA: 0 checkouts, 0 faturas, 0 eventos de uso, 0 cobranças de cartão, 0 liquidações de comissão e 0 liquidações diretas. As contagens de inconsistências zeradas NÃO provam operação de pagamento real.
- As RPCs financeiras de liquidação e de consumo de créditos usam bloqueio/transações ou idempotência, protegidas por restrições. O saldo insuficiente da FuncionarIA é bloqueado na função `funcionaria_consume_usage`, e no SQL ativo de créditos.
- Todas as taxas ativas de uso da FuncionarIA verificadas são não negativas; uma taxa `whatsapp_message` está marcada `provisional`.
- Tabelas financeiras inspecionadas com RLS ativo. `funcionaria_invoices` possui grants gerais em nível de tabela, mas **nenhuma política efetiva de escrita para anon/authenticated** (apenas política SELECT autenticada). A redução dos grants, como defesa em profundidade, requer intervenção separada e revisão de compatibilidade.

## Histórico compartilhado (investigação, não correção)

Encontrados 57 lançamentos em `balance_transactions` sem reconciliação pelo cálculo simplificado `after=before+amount`.

- 33 saques legados: 1 casa com sinal negativo do saldo; 32 lançamentos `withdrawal` com snapshots 0→0 e valor positivo.
- 23 recebimentos Pix antigos com snapshots 0→0: ConviteIA convite (10), presentes (10), mensalidade (1) e ConsultaTec (2). Esses não são liquidações FuncionarIA.
- 1 `credit_purchase` usa valor/sinal compatível com débito do saldo.
- 592 lançamentos de crédito de valor zero são eventos `usage` de funções não cobradas; sem saldo posterior negativo.
- Uma carteira apresenta `total_used > total_purchased + 20`, mas saldo disponível positivo. Sua origem pode incluir bônus, créditos de plano ou migração; exigir rastreamento da origem antes de assumir falha contábil.

**Não tratar snapshots históricos 0→0 como erro comprovado; tampouco validar a conciliação financeira com base neles.** É necessária reconciliação específica com origem e regras do produto.

## Segurança e cobertura

As contas, saques e liquidações com dados atuais não mostram duplicação nem valores negativos. As tabelas `funcionaria_storefront_settlements`, `funcionaria_storefront_direct_settlements` são service-only com RLS. Índices exclusivos de pedido e provedor foram verificados. O RPC de consumo possui idempotência global por chave, mas o replay não compara todos os campos do evento: registrar melhoria isolada antes de escala, sem alterar SQL nesta fase.

A auditoria agregada reexecutável está em `scripts/bigcorps-phase11-readonly-finance.sql`, executada manualmente via `SELECT`. `npm run check:bigcorps-11` valida o caráter somente leitura do script e contratos financeiros do repositório; roda no prebuild sem consulta ao banco.

## Ainda pendente

Testes de pagamento real, retorno autenticado dos provedores, estorno, envio de saque e comparação com extrato financeiro não foram realizados. A Fase 11 estrutural e a auditoria histórica estão cobertas; não declarar conciliação real aprovada. A etapa seguinte segura é Fase 12: observabilidade e alertas de falha/anomalias sem alterações financeiras.
