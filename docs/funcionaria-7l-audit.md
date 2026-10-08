# FuncionarIA 7L — auditoria efetiva 7F.2 e regressão compartilhada

## Correção importante no diagnóstico
Na fase 7K foi levantado um possível erro de idempotência na função
`funcionaria_settle_storefront_commission` ao ler a definição **histórica 7F.1**.
A versão **7F.2 substitui** essa RPC (mesma assinatura) e já está em produção.
O `pg_get_functiondef` comprovou: compara `v_existing.provider` e
`v_existing.provider_reference`, rejeita diferenças com
`settlement_evidence_conflict` e só depois permite
`duplicate=true`. É um falso positivo do diagnóstico anterior, **não uma
pendência de correção financeira**.

O checker `check:funcionaria-7k` passa a usar 7F.2 como versão autoritativa
para testar a comissão, preservando 7F.1 apenas como referência histórica.

## Auditoria de produção, 2026-10-07 (somente leitura)
- Função em produção: teste de divergência de referência e provedor **presente**,
  antes de aceitar replay; 7F.2 ativo.
- Taxas do cartão checadas, referência de estoque presente.
- Acesso: somente `service_role`; `anon` e `authenticated` sem EXECUTE.
- Liquidações existentes: **zero**. Sem cobertura de pagamentos reais.
- `scripts/funcionaria-7l-effective-finance-audit.sql` reproduz a checagem
  usando apenas catálogos PostgreSQL e contagem de registros. Não é migration.
- Não há alteração de SQL financeiro, RLS, saldos, Edge Functions ou webhooks.

## Regressão entre produtos no repositório BigCorps/minhAi
- `scripts/check-funcionaria-7l-shared.mjs` adiciona um smoke test estático
  de pontos compartilhados: 3 crons da ConviteIA, cron FuncionarIA desligado
  por padrão, proteção `CRON_SECRET`, páginas essenciais de ConviteIA e PixWiki,
  API central de capacidades de pagamento e guardas de PIX/saques existentes.
- O teste verifica contratos de código, **não prova os fluxos end-to-end**
  de ConviteIA, PixWiki ou Vercel.
- `npm run check:funcionaria-7l` integra o pré-build já existente. Não cria
  nova Edge, projeto Vercel, migration, agendamento ou build manual adicional.
- Integrar na `main` somente com pausa coordenada de outros agentes,
  fast-forward e revalidação dos guardas. O Preview não substitui a aprovação
  de teste por empresa real dos lotes 7I/7J.
