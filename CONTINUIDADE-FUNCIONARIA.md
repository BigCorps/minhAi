# CONTINUIDADE — FuncionarIA / minhAi

Atualizado em 14/09/2026 após 4D3 ser versionada.

## Base atual confirmada

`b3a2a0458ffca19b1b2c9881e5615d20469f1f46`

Commit:
`Harden PixWiki receipt trigger access`

Deploy Vercel:
`dpl_96U9ipArTf6Man7xYwMhh2EAdxxg`

Estado:
`READY`, production, SHA exato.

## Bloco 4D concluído

### `pix_transactions`
- browser sem DML direto;
- anon/authenticated: SELECT somente;
- service_role: DML preservado;
- policies públicas de escrita removidas.

### `mp_received_payments`
- anon/authenticated: SELECT somente;
- grants DML/DDL-like removidos;
- service_role preservado;
- trigger PixWiki preservada e habilitada.

### Trigger function PixWiki
`pixwiki_confirm_link_from_received_payment()`
- SECURITY DEFINER preservada;
- anon/authenticated sem EXECUTE;
- service_role com EXECUTE.

## Correção do pacote 4E (v2)

Antes de executar o preflight, foi corrigido o classificador estático: arquivos em `lib/` que importam `@/lib/supabase-browser` agora são tratados como browser. Isso evita classificar incorretamente `lib/produtos-venda.ts` e `lib/groq-intent-classifier.ts` como server/edge. O script v2 também lista consumidores de `criarPedido()` e `atualizarStatusPedido()`.

## Fase atual — 4E preflight `pedidos` / `pedido_itens`

Não fazer blanket revoke.

Motivo:
- existe criação pública legítima de pedidos;
- existe endpoint server-side FuncionarIA:
  `/api/funcionaria/public-order`;
- esse endpoint usa `createAdminClient()`, valida empresa/skills/produtos,
  recalcula preços no servidor e cria `pedidos` + `pedido_itens`;
- porém o fluxo legado de `SaleModeModal/CheckoutFlow` ainda chama
  `criarPedido()` da biblioteca `lib/produtos-venda.ts`;
- essa biblioteca usa `supabase-browser` e grava diretamente:
  - `pedidos` INSERT/UPDATE;
  - `pedido_itens` INSERT.

Portanto a estratégia provável será semelhante à 4D:
1. mapear todos os DML browser;
2. mapear SELECT browser que precisam continuar;
3. entender grants/RLS/policies atuais;
4. reutilizar/adaptar endpoints server-side existentes;
5. migrar writes antes de revogar grants;
6. só então fechar DML público/autenticado no banco.

## Pacote atual

Rodar:
`node scripts/verify-funcionaria-phase4e-pedidos-preflight.mjs`

Executar no SQL Editor:
`supabase/migrations-manual/20260914_funcionaria_phase4e_pedidos_preflight.sql`

Enviar:
- saída completa do script;
- JSON `phase4e_pedidos_preflight`.

## O preflight deve mostrar

### Código
- cada browser INSERT/UPDATE/DELETE em `pedidos` e `pedido_itens`;
- cada SELECT browser;
- DML server/Edge;
- consumidores de `criarPedido()` / `atualizarStatusPedido()`;
- endpoint FuncionarIA server-side já disponível.

### Banco
- grants de `pedidos` e `pedido_itens`;
- policies RLS;
- colunas/constraints;
- triggers;
- functions que tocam essas tabelas e seus EXECUTEs;
- distribuição de pedidos por status/platform.

## Próximos residuais depois de pedidos

### `produtos_venda`
Preservar leitura pública do catálogo.
Migrar mutações para auth/server-side.

### `fila_senhas`
Há realtime/painel público; contrato específico antes de mexer em grants.

### `get_is_paid_plan(uuid)`
Ainda há consumidor em `/api/qrcode`; migrar antes de fechar EXECUTE.

## Macroetapas seguintes

1. concluir hardening residual;
2. consolidar créditos/IA/canais;
3. idempotência e zero-cost;
4. telefone/Pipecat;
5. QA final desktop/mobile;
6. regressão BigCorps;
7. pagamentos;
8. créditos/saldo insuficiente;
9. logs/advisories;
10. CI permanente.

## Dívidas conhecidas

- `next.config.js` ainda usa `typescript.ignoreBuildErrors: true`;
- histórico de `/dashboard` com `user.id` nulo.

## Convenções

- ZIP com caminhos relativos.
- incluir este markdown em todo ZIP futuro.
- nunca `git add .`.
- scripts/preflights temporários não entram em commits funcionais.
- migrations definitivas entram após validação.
- proteger sempre os arquivos do avatar.

## Resultado do preflight 4E — 14/09/2026

Preflight estático: PASS.

Foram encontrados 12 DML browser em `pedidos` / `pedido_itens`, incluindo:
- `CheckoutFlow` / `lib/produtos-venda.ts`;
- `lib/groq-intent-classifier.ts`;
- `RegistrarVendaDisplay`;
- `RelatorioVendasDisplay`;
- `pixHandlers`;
- `FuncionarIAOrdersPanel`.

Banco:
- RLS está habilitado em `pedidos` e `pedido_itens`;
- anon/authenticated ainda possuem grants amplos, inclusive DML/DDL-like;
- existem policies públicas permissivas de INSERT/SELECT/UPDATE;
- service_role mantém DML;
- `pedidos`: 49 linhas no preflight (20 pago, 8 aberto, 21 aguardando_pagamento);
- `pedido_itens`: 33 linhas;
- todos os 49 pedidos estavam com `platform` nulo no preflight.

Conclusão: NÃO revogar grants/policies ainda. Migrar todos os writers browser primeiro.

## Fase 4E1 — preparada

Escopo mínimo:
- migrar somente `FuncionarIAOrdersPanel.markDelivered()`;
- preservar SELECT browser;
- criar `POST /api/funcionaria/orders/mark-delivered`;
- autenticar bearer token server-side;
- autorizar dono ou membro de `company_admins`;
- permitir somente `pago -> entregue`;
- nenhuma migration SQL;
- nenhum revoke.

Após validar 4E1, continuar os writers restantes em subetapas separadas.

## Decisão de execução — 4E consolidada

Após a 4E1 passar no verificador local, ficou definido que os testes funcionais desta fase serão automáticos no Codespace, sem exigir repetição manual de fluxos já validados na minhAi.

A partir daqui, o pacote agrupa o máximo seguro de mudanças:

- 4E1: `FuncionarIAOrdersPanel` — `pago -> entregue` server-side (já validada estaticamente);
- 4E2: `CheckoutFlow` / `lib/produtos-venda.ts` — criação de pedido/itens, delivery e status deixam o browser;
- 4E3: `RegistrarVendaDisplay` — venda manual deixa o browser;
- 4E4: `RelatorioVendasDisplay` — venda manual deixa o browser;
- 4E5: `lib/groq-intent-classifier.ts` — criação de pedido por valor deixa o browser;
- 4E6: `pixHandlers` — consulta/vínculo pós-PIX deixa o browser;
- 4E7: verificador global exige zero INSERT/UPDATE/DELETE browser em `pedidos`/`pedido_itens` e pode executar `npm run build`;
- 4E8: hardening DML do banco, incluído no mesmo ZIP, mas só deve ser executado após 4E7 + build PASS.

O hardening de SELECT ficou explicitamente fora da 4E8. Policies de leitura amplas, inclusive `anon_read_own_pedido` com `OR true`, serão tratadas em fase separada porque existem diversos consumidores browser de leitura.

### Comandos do pacote consolidado

1. Aplicar os patches de código:
   `node scripts/apply-funcionaria-phase4e-browser-writes.mjs`

2. Validar código + build automaticamente:
   `node scripts/verify-funcionaria-phase4e-browser-writes.mjs --build`

3. Conferir estado:
   `git -c core.whitespace=cr-at-eol diff --check`
   `git status`

4. Somente se tudo acima terminar em PASS, executar no SQL Editor:
   `supabase/migrations-manual/20260914_funcionaria_phase4e8_pedidos_dml_hardening.sql`

5. Enviar a saída completa do verificador e o JSON `phase4e_orders_dml_hardening_result`.

Não fazer commit antes da revisão desse resultado.

## Atualização 16/09/2026 — Fase 7: Loja grátis + Mercado Livre + entrega local

<!-- PHASE7_STOREFRONT_ROADMAP_20260916 -->

A Fase 6 (idempotência / zero-cost) foi implementada, validada estruturalmente e teve o residual final de propagação de `paid_lookup_reserved` fechado no caminho `ferramentas-consultas -> meta-consultas -> meta-message-router -> funcionaria-meta-process`. Consultas FuncionarIA só propagam o marcador após retorno `success` do worker que reserva/idempotentiza antes do provedor; prompts locais e erros permanecem sem o marcador. A **Fase 7** segue antes de Telefone/Pipecat.

Decisões:
- storefront básico passa a fazer parte da base;
- grátis = recebimento BigCorps + 5% por venda confirmada;
- mensal = recebimento direto na conta própria, sem 5%;
- online = loja + widget; ambos = alternância loja/atendimento; presencial = fluxo atual, loja opcional;
- Mercado Livre ganha importação e sincronização ML -> FuncionarIA;
- entrega local Lalamove entra no storefront com markup default de 50%, separado da comissão de 5%;
- criação de entrega real só ocorre após pagamento confirmado no servidor;
- `produtos_venda` permanece catálogo único;
- primeiro pacote 7A/7B formaliza a especificação e adiciona o badge da Play Store;
- Pipecat passa para Fase 8.

Fonte detalhada: `docs/FUNCIONARIA_PHASE7_LOJA_GRATIS_MERCADOLIVRE.md`.
