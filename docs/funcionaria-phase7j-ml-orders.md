# FuncionarIA — Fase 7J, lote B: pedidos pagos ML (somente leitura)

## Escopo e origem dos dados
- Painel de pedidos retorna exclusivamente dados da API oficial `GET /orders/search?seller={sellerId}&order.status=paid&sort=date_desc`, com limite máximo de 30 pedidos por consulta e paginação limitada.
- O `sellerId` vem de `ml_connections`, escopado pela empresa autenticada. Nunca vem do payload do navegador.
- Cada pedido é normalizado por uma função pura que exige `seller.id` idêntico ao vendedor OAuth, `status=paid` e `currency_id=BRL`. Ids repetidos são descartados.
- A resposta retorna somente id do pedido, status, moeda, valor bruto informado pelo ML, data e id/título de anúncios. Não carrega comprador, endereço, documento, e-mail, dados fiscais, shipping IDs, payment IDs ou meios de pagamento.
- A UI mostra "Pedidos pagos carregados", "Valor dos pedidos carregados" e "Total informado pela API"; jamais declara receita global, lucro, margem, taxa, vendas atribuídas à IA, ou conversão pergunta→pedido.
- Pedidos de Mercado Pago (`mp_orders`) e pedidos de checkout próprio (`pedidos`) não são correlacionados com o ML. Nenhuma gravação de pedidos é feita; não afeta estoque, ledger, pagamentos, notificações ou entrega.
- Dados carregados somente após ação explícita "Consultar pedidos"; páginas seguintes apenas por "Carregar mais". Não há polling, cron, webhook nem envio de respostas nesse recurso.
- `normalize-order.mjs` é módulo compartilhado por Edge e testes Node. Os cenários sintéticos cobrem status, vendedor, BRL, dados privados, deduplicação, valores inválidos e data inválida.
- Não alterar fluxo `funcionaria-ml-responder-pergunta`, `ml-responder-pergunta` ou `/api/ml/webhook` para implementar este lote.

## Gate de integração
1. Rodar `npm run check:funcionaria-ml-sync`, incluindo `scripts/test-funcionaria-ml-orders.mjs`, e assegurar Preview READY no único commit do lote.
2. Só após CI/Preview aprovados publicar a mesma Edge `funcionaria-ml-sync` de GitHub via Supabase MCP, com o arquivo `normalize-order.mjs` como dependência e `verify_jwt=true`.
3. Fazer read-back exato dos dois arquivos e do estado ACTIVE. Não implantar outras Edges nem migrations para pedidos.
4. Verificar `sync_enabled=0`, ausência de `FUNCIONARIA_ML_SYNC_CRON_ENABLED=true`, main em 7H e o backend 7I preservado.
5. Testes de autenticação/uma conta real e merge ficam para o gate de teste do usuário. Não ativar cron ou respostas.
6. Antes do merge, pausar agentes que editam `BigCorps/minhAi`, conferir ahead/behind e fazer fast-forward com compare-and-swap; nunca force-push.
7. Fase posterior de atribuição comercial requer vínculo explícito por vendedor/ordem/pergunta e janela temporal justificável. Sobreposição de anúncio nunca prova que a pergunta gerou a venda.

Referências de API: https://developers.mercadolivre.com.br/devcenter/gerenciamento-de-vendas e https://developers.mercadolivre.com.br/pt_br/pedidos-e-opinioes
