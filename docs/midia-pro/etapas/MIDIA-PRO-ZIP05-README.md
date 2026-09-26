# Midia.Pro — ZIP 05: Financeiro + Proof-of-Play

Base de referência do repositório: `BigCorps/minhAi` em `d5e4df26283da19b345795313a086bfda547d5de`.

Este ZIP deve ser aplicado **depois dos ZIPs 01, 02, 03 e 04**. Quando o mesmo caminho existir em mais de um pacote, use sempre a versão do ZIP de número maior.

## O que fecha nesta etapa

O ZIP05 transforma a exibição do player em um evento financeiro auditável:

1. a campanha paga é aprovada e sua agenda concreta é criada;
2. o banco fotografa o settlement daquela campanha;
3. a participação do parceiro entra como **pendente de exibição**;
4. o manifesto entrega ao player um token HMAC específico para cada ocorrência e device pareado;
5. o player reproduz a peça e registra duração usando relógio monotônico do navegador;
6. ao atingir pelo menos 80% da duração contratada, grava o proof-of-play localmente;
7. online, envia imediatamente; offline, guarda uma fila persistente e envia quando a conexão voltar;
8. o servidor valida device, tela, assinatura, janela e duração;
9. somente então aquela fração da participação sai de `pendente` e entra em `disponível`;
10. o parceiro pode solicitar saque PIX quando atingir o mínimo de **R$ 50,00**.

O valor não é liberado porque o anúncio foi comprado. Ele é liberado proporcionalmente às **exibições comprovadas**.

## Divisão financeira fotografada

A regra fica gravada no settlement na aprovação da campanha, para mudanças futuras não alterarem vendas antigas:

- `screen_qr` — venda iniciada pelo QR/URL da própria tela do parceiro: **80% parceiro / 20% Midia.Pro**;
- `direct` — venda captada diretamente pela Midia.Pro: **50% parceiro / 50% Midia.Pro**;
- `network` — venda de rede Midia.Pro: **50% parceiro / 50% Midia.Pro**.

A divisão é aplicada sobre o valor líquido:

`líquido = bruto pago - custo do provedor de pagamento`

Neste MVP, `provider_fee_cents` nasce em zero porque a infraestrutura atual não fornece um custo por transação diretamente para o Midia.Pro. Se existir uma taxa a atribuir, ela deve ser gravada no pagamento **antes da aprovação**, pois o settlement fotografa o valor nesse momento.

## Tabelas novas

`supabase/SQL-MIDIA-PRO-ZIP05.sql` cria:

- `midia.publisher_wallets` — pendente, disponível, em saque e já repassado;
- `midia.campaign_settlements` — fotografia financeira da campanha;
- `midia.play_events` — proof-of-play aceito pelo servidor;
- `midia.publisher_ledger` — trilha auditável de todos os movimentos;
- `midia.payout_profiles` — dados privados do titular e chave PIX;
- `midia.withdrawals` — solicitações de saque.

Também adiciona os campos de proof em `campaign_occurrences` e `provider_fee_cents` em `campaign_payments`.

Todas permanecem server-only: `anon` e `authenticated` não recebem acesso direto.

## Proof-of-Play

Cada ocorrência paga presente no manifesto recebe uma assinatura calculada com:

- occurrence ID;
- screen ID;
- device ID;
- duração contratada.

A assinatura não contém a chave secreta e só é válida para aquele player/tela/ocorrência. Reaproveitar o token em outra ocorrência ou outro device falha.

O endpoint `/api/midia/player/proof` ainda confere:

- token válido do player;
- device ativo e pareado;
- device pertencente à mesma tela da ocorrência;
- ocorrência ainda agendada;
- início dentro da janela contratada, com tolerância operacional de 15 minutos;
- pelo menos 80% do tempo contratado reproduzido;
- `client_event_id` e occurrence idempotentes.

Uma ocorrência nunca remunera duas vezes, mesmo se a fila offline for reenviada várias vezes.

**Importante:** proof-of-play significa prova técnica de que o player autorizado executou a mídia. Não significa prova de que uma pessoa olhou para a tela. Métrica de audiência/presença exigiria sensores ou outra fonte de dados e não faz parte deste MVP.

## Funcionamento offline

O ZIP02 já mantinha mídia em cache. Agora o ZIP05 também guarda os proofs pendentes no armazenamento local do player.

Se a internet cair durante uma exibição já sincronizada:

- a mídia continua tocando pelo cache;
- o player registra o proof localmente;
- a ocorrência não é repetida naquele player;
- o heartbeat mostra quantos proofs estão esperando sincronização;
- quando a conexão volta, os eventos são enviados em lotes de até 100.

O dashboard mostra um aviso quando um player online/offline possui proofs pendentes conhecidos pelo último heartbeat.

## Carteira

A carteira usa quatro saldos separados:

- **Aguardando exibição** (`pending_cents`) — parte do parceiro já contratada, mas ainda não comprovada;
- **Disponível** (`available_cents`) — proof-of-play aceito e liberado para saque;
- **Em saque** (`withdrawal_pending_cents`) — valor já reservado por solicitação aberta;
- **Já repassado** (`withdrawn_cents`) — total concluído via PIX.

`total_earned_cents` é o acumulado histórico que já foi liberado por proof-of-play.

O cálculo por ocorrência é cumulativo. Isso evita perder centavos em divisões com muitas exibições: quando a última ocorrência for entregue, o valor liberado chega exatamente ao total fotografado do parceiro.

## Saque PIX

O comportamento segue o padrão operacional do ConviteIA:

- mínimo: **R$ 50,00**;
- exige nome/razão social, CPF ou CNPJ, e-mail e chave PIX válidos;
- o documento completo fica apenas no schema privado;
- o dashboard devolve somente os quatro últimos dígitos do documento;
- uma solicitação `pending`/`processing` bloqueia outra simultânea;
- ao solicitar, o valor sai imediatamente de `disponível` e fica reservado em `em saque`;
- se o saque for rejeitado/cancelado, o valor volta ao disponível;
- quando marcado como pago, passa para `já repassado`.

O ZIP05 **não realiza PIX automaticamente**. Ele cria a solicitação segura e reserva o saldo. A tela administrativa para conferir o titular, executar o PIX e marcar `processing / paid / rejected` entra no ZIP06. A função server-only `midia.set_withdrawal_status()` já fica pronta para essa etapa.

## Segurança da chave de proof

Nenhuma configuração adicional é obrigatória: o servidor usa `SUPABASE_SERVICE_ROLE_KEY` como material HMAC server-only caso `MIDIA_PROOF_SECRET` não exista.

Para produção madura, é recomendado criar depois um segredo dedicado `MIDIA_PROOF_SECRET`, longo e aleatório. Se ele for trocado, proofs offline assinados com o segredo antigo deixam de validar; portanto rotação deve ser planejada.

## Ordem para aplicar

### 1. GitHub

Suba todos os arquivos deste ZIP preservando exatamente seus caminhos.

### 2. Supabase SQL

Depois dos SQLs 01–04, execute no SQL Editor:

`supabase/SQL-MIDIA-PRO-ZIP05.sql`

Não é necessário criar bucket, policy pública, cron ou Edge Function nova.

### 3. Não executar `set_withdrawal_status` manualmente no teste comum

Ela é a operação administrativa de conclusão/reversão de saque. O ZIP06 vai encapsulá-la em uma tela protegida. Até lá, basta testar a criação da solicitação.

## Backfill

Se você já tiver testado o ZIP04 antes de aplicar este SQL, o final do script procura campanhas pagas que já estejam `scheduled`, `running` ou `completed` e cria o settlement correspondente.

Isso é apenas uma ponte de teste entre etapas. Campanhas novas passam pelo fluxo normal de aprovação.

## Teste recomendado quando os ZIPs 01–05 estiverem unidos

1. cadastrar parceiro, local e tela;
2. parear o player e deixá-lo online;
3. criar uma campanha pelo QR daquela tela;
4. pagar o PIX e esperar `under_review`;
5. aprovar a campanha;
6. confirmar que o Financeiro passa a mostrar valor em **Aguardando exibição**;
7. esperar a ocorrência entrar na janela e tocar no player;
8. confirmar que o contador da campanha muda de `0 / N` para `1 / N`;
9. confirmar que a fração correspondente sai de **Aguardando exibição** e entra em **Disponível**;
10. desligar a internet do player antes de outra ocorrência, deixá-la tocar e observar `proof-of-play aguardando sincronização` no ciclo seguinte;
11. religar a internet e confirmar a sincronização e a liberação da receita;
12. ao acumular pelo menos R$ 50,00, cadastrar o recebedor e solicitar saque;
13. confirmar que o valor migra de **Disponível** para **Em saque** e que um segundo saque é bloqueado.

Para validar 80/20 de forma simples, numa campanha de R$ 100,00 via QR e custo de provedor zero, o settlement deve fotografar R$ 80,00 para o parceiro e R$ 20,00 para Midia.Pro. Para `direct`/`network`, R$ 50,00 / R$ 50,00.

## Pontos deliberadamente deixados para o ZIP06

- painel administrativo de saques;
- conclusão/rejeição operacional do PIX;
- recuperação/make-good de ocorrências que venceram sem proof;
- cancelamentos/estornos de campanhas após aprovação;
- campanhas BigCorps/house e fillers;
- rede com múltiplas telas na mesma compra;
- filtros/localização/classificação comercial;
- materiais finais de lançamento e controles de operação.

A estrutura financeira desta etapa já foi desenhada para essas funções sem precisar refazer wallet, ledger ou proof-of-play.
