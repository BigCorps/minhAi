# FuncionarIA — Fase 7I: sincronização Mercado Livre

## Escopo desta branch
- Catálogo único: `public.produtos_venda`.
- Somente **ML → FuncionarIA**, apenas anúncios já importados no 7H.
- `sync_enabled=false` no banco por padrão. Nenhum sync automático é ativado pela migration.
- `sync_source='local'` e `'bidirectional'` são bloqueados neste worker (não prometem sincronização bidirecional).
- A API nunca cria anúncios nem faz PUT/POST no Mercado Livre.
- A ligação manual (`linked_local`) permanece imutável.
- O importador 7H pula itens com sync 7I habilitado.
- Se um campo local tiver sido alterado desde o último snapshot, **todo o update é abortado** e a linha fica em conflito, preservando a edição do lojista.
- O primeiro sync só registra baseline se os campos gerenciados locais corresponderem ao estado lido do ML. Diferenças exigem revisão.
- Preços devem vir de `/items/{id}/prices` com valor standard válido; sem preço confiável, não altera o item.
- Estoque local é atualizado só quando `/user-products/{id}/stock` retorna quantidades verificadas. Quantidades referenciais são preservadas apenas para observabilidade, sem sobrescrever o saldo.
- Variações são observadas como metadados; *não* reconstroem automaticamente grupos/opções de produto. Opções com mudanças exigem revisão humana.
- Pausado/finalizado: status e `is_active=false` quando o preço standard é válido e não há conflito.
- Retentativas usam backoff e capturam somente códigos de erro sem tokens. Limite de 5 produtos por invocação.
- Reconciliação periódica lê filas de anúncios já importados, não varre novos anúncios. Novos anúncios continuam sob importação explícita do 7H.

## GATE — não publicar automaticamente
1. Confirmar latest `main`, `feature/funcionaria-7i-ml-sync`, comparação ahead/behind e Preview READY.
2. Checar migração `funcionaria_phase7i_ml_sync` **por nome e equivalência sem reaplicar**.
3. Aplicar SQL 7I se ainda ausente e revisar RLS/RPC/grants: `supabase/SQL-FUNCIONARIA-PHASE7I-ML-SYNC.sql`.
4. Implantar Edge `funcionaria-ml-sync` com `verify_jwt=true`, e implantar a versão 7I da Edge `funcionaria-ml-importar-produtos` (ela depende da coluna `sync_enabled`).
5. Garantir que `FUNCIONARIA_ML_SYNC_CRON_ENABLED` não está `true` no Vercel antes do merge.
6. Testar com **um produto controlado**, sem transação, saldo ou importação em massa: importar se seguro, ativar sync explicitamente, baseline, reconsulta, preço, estoque, conflito, duplicidade, retries, segurança JWT.
7. Com os outros agentes pausados, fazer fast-forward da `main` apenas se Preview/QA/DB/Edge válidos.
8. Acompanhar apenas o build automático Production. Sem redeploy manual.
9. Habilitar o cron somente após o usuário validar o primeiro produto e autorizar o agendamento; execução horária em `43 * * * *`.
10. Na falha, interromper o cron por env, não reverter dados financeiros nem eliminar metadados de sync.

## Pendências e limites
- Webhook de `items`, `user_products`, `stock-location` pode futuramente antecipar a reconciliação; não serve como fonte exclusiva.
- Novos User Products como anúncios separados exigem revisão de agrupamento de famílias e de opções antes de automatizar variantes.
- Sync reverso local → ML e bidirecional exigem trilhos específicos para evitar loops (fora desta entrega).
- Não importar todo o catálogo para testar.
- O esquema 7H registra `sync_source`; o worker não altera essa escolha automaticamente.
