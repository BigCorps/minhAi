# FuncionarIA — Fase 7J, lote A (preview somente)

## Escopo
- Continuidade 7I: autenticação do cron com secret API key moderna da Vercel e validação local na Edge via SUPABASE_SECRET_KEYS; JWT de usuário permanece para status/configure/run.
- O cron continua com `FUNCIONARIA_ML_SYNC_CRON_ENABLED !== 'true'`, portanto **desligado por padrão**, mesmo após merge.
- Funil comercial somente leitura reutiliza `ml_questions` com RLS existente e a Edge `funcionaria-ml-sync`; não altera o roteador de webhook, a Edge de respostas, o saldo ou o mecanismo de IA paga.
- `questions_preview` consulta até 50 perguntas por vez no endpoint oficial `/questions/search` com `seller_id` da conta ativa, `api_version=4` e autorização pela empresa. Não salva dados do comprador, não responde e não faz alterações no ML.
- Interface mostra perguntas únicas e status, sinaliza pendências, classifica tema por regra determinística e distingue claramente **interesse** de **pedido confirmado**.
- Status vindo do Mercado Livre prevalece sobre status desatualizado do registro local.
- A métrica de pedidos ML confirmados é `Não integrado`. `mp_orders`/pedidos locais não possuem ligação provada com questions/order_ids ML; nunca computar como conversão atribuída.
- Histórico local limitado aos 250 registros mais recentes e consulta remota paginada limit=50. Não apresentar totalização global como total de contas.
- Nenhum canal de envio foi criado e nenhuma resposta de cliente é disparada por esta branch.

## Validação e gates
1. Conferir diff 7I+7J, run do `check:funcionaria-ml-sync`, e Preview READY, preferencialmente um único build para o lote.
2. Somente após QA, atualizar Edge `funcionaria-ml-sync` para a versão que contém `questions_preview` e suporte de secrets modernos, com `verify_jwt=true`.
3. Teste autenticado: usuário de empresa A não vê perguntas de B; chamada `due` com user JWT, publishable key ou sem key é negada; chave secreta de backend é aceita apenas para rotina `due`.
4. Teste limitado com empresa de controle em leitura, sem postar resposta nem importar catálogo completo.
5. Merge `main` somente depois de outros agentes pausarem, fast-forward e commit esperado; não force-push.
6. Cron habilitado **somente** em gate separado após validação de produto 7I e autenticação, alterando env conscientemente.
7. Etapa futura: API de pedidos Mercado Livre com vínculo confirmado (seller/order/item/question) e deduplicação. Não estimar conversão com status de pergunta.
