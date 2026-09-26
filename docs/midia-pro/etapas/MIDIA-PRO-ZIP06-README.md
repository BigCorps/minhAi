# Midia.Pro — ZIP 06 / Lançamento + Rede + Administração

Base de desenvolvimento: `BigCorps/minhAi` — commit `d5e4df26283da19b345795313a086bfda547d5de`.

Este é o sexto estágio do MVP. Ele deve ser sobreposto aos ZIPs 01, 02, 03, 04 e 05. Quando o mesmo caminho existir em mais de um pacote, **a versão do ZIP mais alto prevalece**.

## O que esta etapa fecha

- painel operacional Midia.Pro dentro do Admin BigCorps já existente;
- moderação de campanhas pagas pela plataforma;
- gestão de saques dos parceiros, mantendo o PIX manual como no ConviteIA;
- classificação comercial das telas (`Standard`, `Movimento`, `Premium`, `LED/Destaque`) e fator de preço;
- horário operacional e percentual de inventário destinado à rede;
- campanhas institucionais/fillers BigCorps com upload privado e distribuição Realtime;
- recuperação de ocorrências pagas que venceram sem proof-of-play;
- cartaz A4 e placa A5 em PDF, com QR individual da tela;
- cobrança mensal por PIX dos planos de tela pagos, inclusive Uso Próprio de R$ 19,90;
- bloqueio do player quando a mensalidade paga vence;
- receita administrativa de 30 dias passa a somar campanhas + mensalidades de telas.

## Ordem de implantação

1. Não aplique nada isoladamente. Este SQL pressupõe que os SQLs dos ZIPs 01–05 já existam.
2. No Supabase Dashboard, abra o SQL Editor e execute `supabase/SQL-MIDIA-PRO-ZIP06.sql`.
3. No GitHub, sobreponha os arquivos deste ZIP aos caminhos correspondentes do repositório `minhAi`.
4. Quando reunir os seis pacotes, a prioridade é: `ZIP06 > ZIP05 > ZIP04 > ZIP03 > ZIP02 > ZIP01`.
5. Faça o deploy normal da Vercel apenas depois de todos os arquivos estarem juntos.

Não há nova Edge Function obrigatória e não há nova chave secreta obrigatória nesta etapa. A mensalidade das telas reutiliza a mesma faixa de PIX retido BigCorps/Banco Inter já adotada no ZIP04.

## Cobrança do Uso Próprio / planos pagos

O ponto que faltava para o lançamento foi fechado aqui. Telas em planos com `monthly_price_cents > 0` passam a ter cobrança real.

Fluxo:

`Tela paga -> Gerar PIX -> pix_transactions -> confirmação existente -> midia.finalize_screen_plan_payment() -> billing_status=active -> player liberado`

A confirmação estende o período da tela por **1 mês**. Uma renovação feita antes do vencimento começa no fim do período já pago, portanto o usuário não perde dias.

A tabela nova é `midia.screen_plan_payments`. A própria tela guarda:

- `billing_current_period_start`;
- `billing_current_period_end`;
- `billing_last_payment_id`.

O player também verifica a data do período, e não apenas o texto `billing_status`. Assim uma tela paga vencida não continua reproduzindo indefinidamente caso o status ainda não tenha sido atualizado por uma visita ao dashboard.

### Compatibilidade do PIX

Assim como no ZIP04, o request para `gerar-pix-assistente` usa temporariamente `origem: conviteria` para aproveitar a faixa de recebimento retido que já usa o `CONVITERIA_COMPANY_ID`, força Banco Inter/BigCorps e silencia notificações da empresa-plataforma.

A identidade financeira real é `purpose = midia_screen_plan`. O SQL adiciona esse purpose à constraint de `pix_transactions`, e o valor **não é creditado em `company_balance`**.

A fonte de verdade da mensalidade é `midia.screen_plan_payments`. Isso permite tornar `origem = midia` nativo em uma evolução futura sem mudar contratos, telas ou histórico financeiro.

## Admin BigCorps

O Midia.Pro usa a autenticação administrativa já existente em `public.platform_admins`. Não foi criado login administrativo paralelo.

A nova página fica em:

- `https://admin.minhai.app/midia`
- fallback no domínio principal: `/admin/midia`

O arquivo `components/admin/AdminHeader.tsx` deste ZIP **substitui o arquivo já existente no repositório**, apenas acrescentando a seção Midia.Pro à navegação administrativa.

O Admin permite:

- aprovar ou devolver campanhas para ajuste;
- conferir telas online/offline e proofs pendentes;
- alterar classe comercial, fator de preço, inventário da rede e horário de funcionamento;
- visualizar titular/chave PIX de saques em andamento;
- marcar saque como processando, pago ou rejeitado;
- publicar/pausar/remover fillers;
- executar a recuperação de ocorrências vencidas;
- acompanhar receita, saldo de parceiros e percentual agregado de entrega.

Todas as ações sensíveis são registradas em `midia.admin_audit_log`.

### Regra de saque

O botão **PIX pago** não envia dinheiro automaticamente. Use-o somente depois de realizar o PIX ao beneficiário fora do sistema.

- `processing`: somente registra que a operação começou;
- `paid`: move o valor de `withdrawal_pending` para `withdrawn`;
- `rejected`: devolve o valor reservado para o saldo disponível do parceiro.

Essa escolha mantém o mesmo desenho operacional já utilizado no ConviteIA.

## Fillers / campanhas BigCorps

A tabela `midia.house_creatives` guarda imagens e vídeos institucionais. O arquivo continua privado no bucket `midia-assets`; o navegador recebe apenas URL assinada.

Regras do player:

1. campanha paga vencendo tem prioridade absoluta;
2. conteúdo próprio continua sendo a programação principal;
3. se a tela participa da rede e não existe campanha paga naquele momento, fillers podem ocupar a fração `network_inventory_percent`;
4. filler **não gera proof financeiro, settlement ou saldo do parceiro**;
5. quando o catálogo de fillers muda, `midia-house` envia somente um Broadcast de atualização — nenhuma mídia trafega pelo Realtime.

O player mantém cache local dos fillers do mesmo modo que já faz com as outras mídias.

## Recuperação de publicidade não entregue

`midia.recover_missed_occurrences()` procura ocorrências cujo prazo venceu sem proof válido.

A ocorrência original vira `missed` e é criada uma reposição futura na mesma tela, respeitando o horário operacional. Há no máximo **3 tentativas de reposição por cadeia**.

Importante: a reposição não altera `campaign_settlements.total_occurrences`, não aumenta o valor contratado e não cria receita extra. Ela apenas substitui uma entrega que faltou.

O player do ZIP06 envia primeiro qualquer fila offline de proof-of-play e **só depois** busca o novo manifesto. Isso evita que uma exibição legítima feita sem internet seja marcada como perdida antes de conseguir sincronizar.

## Material impresso

Para telas Parceiro/Híbrido o dashboard passa a oferecer:

- QR puro;
- **Placa A5** em PDF;
- **Cartaz A4** em PDF.

O PDF usa a identidade Midia.Pro e leva diretamente para:

`https://slug.midia.pro/anuncie/CODIGO`

com a chamada “ANUNCIE NESTA TELA — A partir de R$ 4,90”.

## Arquivos principais

- `supabase/SQL-MIDIA-PRO-ZIP06.sql`
- `app/admin/midia/page.tsx`
- `components/admin/AdminMidiaPanel.tsx`
- `components/admin/AdminHeader.tsx`
- `app/api/admin/midia/**`
- `app/api/midia/billing/route.ts`
- `app/api/midia/screens/material/route.ts`
- `app/api/midia/player/manifest/route.ts`
- `components/midia/MidiaPlayer.tsx`
- `components/midia/MidiaDashboard.tsx`
- `lib/midia/admin.ts`
- `lib/midia/server.ts`
- `next.config.js`

## Checklist funcional depois do deploy final

1. Criar uma conta Midia.Pro e um local.
2. Criar uma tela `Parceiro grátis`; confirmar que não exige mensalidade.
3. Criar uma tela `Uso Próprio`; gerar PIX de R$ 19,90 e confirmar que o player só libera após pagamento.
4. Parear uma tela e confirmar heartbeat/online.
5. Subir mídia própria e testar cache offline.
6. Baixar QR, placa A5 e cartaz A4.
7. Pelo QR, criar uma campanha de R$ 4,90 e pagar.
8. No Admin Midia.Pro, aprovar a campanha.
9. Confirmar que ela entra no manifesto/player e gera proof-of-play.
10. Confirmar que o saldo do parceiro é liberado somente após proof válido.
11. Solicitar saque de pelo menos R$ 50 e processá-lo pelo Admin.
12. Publicar um filler BigCorps e confirmar que ele entra apenas no espaço da rede.
13. Simular uma ocorrência vencida e executar “Recuperar exibições”.
14. Desligar a internet durante uma exibição paga, religar e confirmar que o proof offline sincroniza antes da recuperação.

## Validações realizadas na montagem

O pacote foi validado sobre a sobreposição dos ZIPs 01–06:

- `next.config.js` passou no parser do Node;
- todos os arquivos `.ts/.tsx` passaram pela análise sintática do TypeScript 5.8.3;
- não foram incluídos tokens, chaves privadas ou secrets literais;
- o código preserva o isolamento server-only do schema `midia`;
- o ZIP final da etapa é verificado com teste de integridade antes da entrega.

A validação integrada em produção deve ser feita somente depois de aplicar os seis SQLs e subir os seis conjuntos de arquivos na ordem indicada.
