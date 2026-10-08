# FuncionarIA — 7K · QA financeiro e operacional (sem transações reais)

## Objetivo e limites
Esta fase adiciona um gate local de pré-build para pagamentos, cancelamento PIX,
idempotência, separação de provedores/taxas, estoque, frete e despacho.
**Nenhum teste chama APIs de pagamento ou delivery, dispara webhook, usa cartões,
altera saldos, cria pedidos ou modifica tabelas.** O teste de cenários é uma
simulação determinística de contratos esperados; não executa os RPCs Postgres reais.
O checker de contrato verifica texto SQL/Edge/route versionado. A auditoria SQL
em produção é somente leitura e verifica permissões, índices e anomalias agregadas.

## Artefatos
- `scripts/test-funcionaria-7k-scenarios.mjs`: modelos sintéticos com repetição
  de liquidação, rejeição de evidência inválida, valor em centavos, 5% sobre
  mercadoria, taxas do provedor separadas, pagamento direto sem comissão/saldo,
  cancelamento PIX e despacho único/estado incerto.
- `scripts/check-funcionaria-7k.mjs`: contratos das rotas, Edges e RPCs SQL,
  bloqueios por snapshot, autoridade do provedor, estoque, idempotência,
  devolução do frete e índices únicos versionados.
- `scripts/funcionaria-7k-readonly-audit.sql`: verificação agregada no Supabase;
  não é migration. Executar apenas com conexão de leitura confiável.
- `npm run check:funcionaria-7k`: integrado ao prebuild sem adicionar uma
  dependência Node nem criar um segundo pipeline de deploy.

## Resultado da inspeção read-only de 2026-10-07/08
Projeto `qyonozbroekuqlotqcbm`:
- `storefront_orders=0`, `storefront_checkouts=0`
- `commission_settlements=0`, `direct_settlements=0`
- `ledger_entries=0`: ausência de operações ainda não prova fluxo real
- `rpc_acl.checked=6`, `rpc_acl.restricted=6` (service_role)
- `unique_order_indexes=4`
- Anomalias observadas entre registros atuais: nenhuma nas seis categorias do script
- `real_payment_coverage='not_exercised'`

## Riscos para análise posterior
1. **Correção de auditoria 7L:** o SQL histórico 7F.1 admitia o retorno de
   `duplicate=true` sem comparação explícita. Entretanto, a versão 7F.2
   **já substituiu essa função em produção**: compara `provider` e
   `provider_reference` e gera `settlement_evidence_conflict` antes de
   retornar `duplicate=true`. O banco foi verificado por
   `pg_get_functiondef` em modo somente leitura. **Não é necessária uma
   migration adicional para esse ponto.** O checker 7K agora valida a função
   autoritativa 7F.2, não confunde o SQL legado com o código ativo.
2. Pedido local `funcionaria_web` sem checkout/settlement real significa
   ausência de histórico para testar concorrência, estorno efetivo e estoque.
3. A fase de entrega não valida falhas reais do provedor Lalamove; só verifica
   fluxos/contratos e estados sintéticos.
4. Manter cron Mercado Livre desligado e 7I/7J sem merge até QA controlado.

## Gates para próxima aprovação
- Preview Vercel READY no HEAD da branch de QA; tests PASS no mesmo build.
- Conferir se `main` não foi alterada por outros agentes.
- Teste controlado com conta e pedido de teste da empresa: confirmação única,
  tentativa idempotente, evidência divergente rejeitada, estoque 1x, cancelamento
  de pendência e despacho Lalamove em sandbox; sem movimentos reais arbitrários.
- Apenas depois de revisão pedir pausa dos agentes `BigCorps/minhAi` para
  fast-forward, nunca force.
