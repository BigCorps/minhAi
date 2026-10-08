# BigCorps — Fases 12 e 13: observabilidade e CI permanente

## Fase 12 — sinais operacionais sem dados sensíveis

Escopo: os fluxos públicos da FuncionarIA `/api/funcionaria/public-order` e `/api/funcionaria/storefront-payment`.

Eventos estruturados de **falha** (JSON nos Runtime Logs da Vercel) usam apenas: `area`, `category`, `severity`, `event`, `action`, `http_status` e `elapsed_ms`. Eles nunca devem carregar dados do cliente, identificadores de empresa/pedido, chaves Pix, tokens de checkout, corpo da requisição ou erros brutos do provedor.

Eventos disponíveis:
- `payment_edge_configuration_missing`: configuração interna ausente.
- `payment_edge_transport_failed`: erro de transporte entre Next e Edge. Retorna 502 controlado.
- `payment_edge_upstream_unavailable`: resposta HTTP 5xx da Edge.
- `order_checkout_preparation_failed`, `order_entitlement_failed`, `order_creation_failed`, `order_items_failed`: pontos de falha na criação de pedidos.

Sem alterar payload financeiro, valores, modos de pagamento, chamada ao provedor, autenticação ou política de retries.

**Leitura de linha de base em produção:** no projeto Vercel `gerente`, nas 24h consultadas em 08/10/2026, 4 erros de Runtime Logs ficaram agrupados em `/api/send-push`, sem erro agregado de rota financeira FuncionarIA. Isso NÃO prova ausência de falhas em outro intervalo e não implica diagnóstico da causa do push. Não se modificou a rota de push.

**Sugerir configurar em Vercel/observabilidade:** aviso se ocorrerem 3 eventos da família `payment_edge_*` em 15 min; alerta crítico com 5+ eventos em 15 min, ou 1 `payment_edge_configuration_missing`; aviso com 3 `order_*_failed` em 15 min. Filtrar pelo campo JSON `area=funcionaria`. Estes são **limiares propostos, não notificações ativas**: é necessário configurar destino/canal com revisão posterior, sem expor tokens. Se não houver notificações configuradas, o diagnóstico permanece visível somente nos Runtime Logs.

## Fase 13 — gates permanentes de baixo custo

Criado `.github/workflows/bigcorps-contract-gates.yml` para PRs destinados à `main`, pushes na `main` e acionamento manual. Workflow sem segredos, sem `npm ci`, sem `npm run build`, sem comandos Vercel, sem banco ou providers. Node 24, actions imutáveis por SHA, token GitHub com apenas `contents: read`, checkout sem credenciais persistidas, limite 10 minutos, cancelamento de execuções antigas.

Executa verificação estrutural de PixWiki, ConviteIA, FuncionarIA, pagamentos, crédito, saques, roteamento de 8 produtos e novos eventos financeiros; o compilador TypeScript e o build ficam no Vercel, **sem build duplicado**. Scripts `check:bigcorps-12` e `check:bigcorps-13` também incluídos no `prebuild`.

Não foi feita configuração de *branch protection* nem *required status check*: exigir aprovação de todas as equipes exige inspeção das regras reais e coordenação com os outros agentes do repositório compartilhado.

## Limites de validação

O build `READY` não substitui E2E em navegador autenticado, dispositivos móveis reais, pagamentos reais ou revisão de conciliação. A main é preservada; não mover branch nem alterar produção antes de combinar integração com outros agentes.
