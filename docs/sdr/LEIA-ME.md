> Atualização: para bases que já aplicaram o primeiro pacote, siga `ATUALIZACAO-02.md`. Não reaplique a migração inicial.

# Admin minhAi — piloto comercial, MonitorIA e MRR

Pacote cumulativo de 05/10/2026. Sobrepor os arquivos de `minhai/` ao repositório minhAi e os de `monitoria/` ao repositório MonitorIA. Aplicar somente este pacote, seguindo os gates abaixo. Não substituir o repositório inteiro por estas pastas: são arquivos novos/alterados, não um clone completo.

Base conferida: minhAi `1455cd19c9cf3d37a4893fc3a49597f72f687b29`; MonitorIA `9ce0b38ac3917276f25778e46a1a0999605702b3`. Havendo alterações posteriores nos mesmos arquivos, integrar o diff antes de sobrescrever, principalmente `app/layout.tsx`, `next.config.js` e componentes do Admin. O ZIP contém MANIFEST-SHA256.txt e um patch de referência.

## O que fica pronto

- Nova aba **Comercial** em `admin.minhai.app/comercial`, com campanhas, contatos, qualificação, mensagens, MonitorIA e resultados.
- Conectores Econodata, Apollo e Hunter; importação manual; deduplicação global por email, telefone, CNPJ ou domínio; limites e validade de trial. A API encontra aderência empresarial potencial, não comprova necessidade individual.
- Qualificação guiada em três etapas, pontuação e encaminhamento para o produto. Não usa API de LLM nesta versão.
- Abordagem por email/Gmail ou WhatsApp oficial. Oito apresentações de marketing prontas para submissão à Meta. Contato do WhatsApp exige opt-in documentado, além do template aprovado.
- Pausa após resposta, descadastro, pagamento ou atendimento humano. Fila com reserva e proteção contra reenvio quando o resultado do envio é incerto.
- Conciliação de pagamentos já existentes e identificação de conta pelo link comercial. Fechamento significa **pagamento confirmado + ativação**; reunião, clique ou proposta não vira venda.
- MonitorIA padrão e VIP no Financeiro e no Comercial, mantendo o segundo Supabase separado. Não traz vídeos nem conteúdo dos eventos das câmeras.
- Correção do MRR: cortesias deixam os indicadores financeiros, mantendo todos os acessos. Receita efetivamente recebida da ConviteIA não foi alterada.

**Limite do piloto:** é um SDR de prospecção e qualificação guiada, com negociação humana após resposta. Não é um vendedor conversacional autônomo. Não gera propostas comerciais personalizadas, não decide descontos, não paga comissões e não contrata/cancela planos das APIs. Trials e envios não foram iniciados durante a construção.

## Frentes preservadas

| Frente | Produtos | Responsável |
| --- | --- | --- |
| SDR próprio · alto ticket | PixWiki alto ticket/anual; MonitorIA VIP | API selecionável / fechamento humano |
| API 1 | ConviteIA; MelhorIA | SDR minhAi |
| API 2 | Mídia.Pro; ArteFinal | SDR minhAi |
| API 3 | ConsultaTec; FuncionarIA | SDR minhAi |

As frentes não fixam um fornecedor: escolher Econodata/Apollo/Hunter em cada campanha após configurar as chaves. Para o primeiro comparativo, usar um fornecedor por frente e manter isso registrado. Depois cruzar fornecedores em públicos equivalentes: comparar produtos diferentes não isola a qualidade da API. PixWiki e MonitorIA VIP usam o SDR próprio, com fornecedor configurável por campanha e os mesmos limites e controles das demais frentes.

## Gate 1 — banco minhAi e MRR

1. Criar branch/backup do código e guardar a definição atual de `platform_active_subscriptions()`.
2. No Supabase **minhAi** (`qyonozbroekuqlotqcbm`), executar `supabase/migrations/20261004213715_sdr_commercial_foundation.sql`. Não executar esse arquivo na MonitorIA. Pode ser executado pelo SQL Editor; quem controla migrations deve registrar a aplicação em seu fluxo normal para não reaplicar migrações antigas.
3. Executar `docs/sdr/VALIDAR-MINHAI.sql`, que contém apenas consultas.
4. Conferir Financeiro/Visão Geral. Na conferência de 05/10, o cálculo novo resultou em **MRR R$ 0,00**; o anterior somava cortesias. Não é uma meta fixa: um novo pagamento recorrente legítimo deve mudar esse valor. Os **R$ 4,48 da ConviteIA** continuam na receita do mês; a função de eventos financeiros não foi substituída.

O SQL cria 12 tabelas privadas, funções e gatilhos de interrupção. RLS ativada e nenhuma permissão direta de leitura/escrita para anon/authenticated; acesso comercial passa pelas rotas com a autorização de Admin existente. O script é transacional. Não apaga contas, créditos, assinaturas nem benefícios de cortesia.

O MRR considera recorrência com evidência de pagamento; PixWiki usa o cadastro financeiro v2 e respeita `complimentary`; anuais PixWiki/MonitorIA VIP são divididos por 12. Receita no mês é caixa recebido, diferente de MRR. Assinaturas padrão MonitorIA são normalizadas pela duração de serviço em meses de 30 dias, arredondados, e excluem câmeras já cobertas por VIP ativo.

## Gate 2 — MonitorIA e configuração

No Supabase **MonitorIA** (`xwejfayeackbrilipgrj`), executar `monitoria/docs/sdr/01-admin-snapshot.sql`. Testar `select public.bigcorps_admin_snapshot();`. A função só tem permissão para o servidor. Não é preciso migrar usuários ou juntar bancos.

Configurar no servidor do projeto minhAi, mantendo as variáveis atuais:

| Variável | Valor / finalidade |
| --- | --- |
| `MONITORIA_SUPABASE_URL` | URL do projeto MonitorIA |
| `MONITORIA_SUPABASE_SECRET_KEY` | Chave de servidor MonitorIA; nunca `NEXT_PUBLIC_` |
| `SDR_PUBLIC_URL` | `https://minhai.app` — não usar o subdomínio Admin |
| `SDR_TOKEN_SECRET` | Segredo aleatório próprio, pelo menos 32 bytes |
| `SDR_WORKER_SECRET` | Outro segredo aleatório, pelo menos 32 bytes |
| `SDR_LIVE_SEND` | `false` durante instalação e conferência |
| `ECONODATA_API_KEY` | Chave com acesso à API v4 |
| `APOLLO_API_KEY` | Acesso a people search e people match |
| `HUNTER_API_KEY` | Discover, Domain Search e Email Verifier |
| `SDR_GOOGLE_ACCOUNT_ID` | UUID da conta Gmail conectada em `google_accounts` |
| `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` | Credenciais da integração Google já usada |
| `SDR_WHATSAPP_NUMBER_ID` | Phone Number ID conectado em `meta_connections`; não é o telefone em texto |
| `META_GRAPH_VERSION` | Versão aprovada para a integração; padrão do código `v23.0` |

As chaves são configuradas nas variáveis do servidor, não em campos do navegador ou arquivos versionados. Nunca copiar credenciais para o ZIP. Consultas aos dois Supabases foram somente leitura durante a construção; nenhum SQL deste pacote foi aplicado em produção.

Sem MonitorIA configurada ou se a leitura falhar, o painel exibe indisponibilidade e os totais continuam apenas com minhAi. Não simula receita zero do projeto externo. A métrica de clientes únicos fica identificada como base minhAi: UUIDs dos dois projetos não podem ser somados como pessoas únicas. Margem, custos, presença e usuários operacionais ainda cobrem a base minhAi; receita/MRR e visão comercial incluem MonitorIA. A listagem VIP mostra os 100 registros mais recentes; a conciliação remota usa esse mesmo recorte e deve ser ampliada antes de ultrapassar 100 contratos.

## Gate 3 — publicação e canais

1. Subir o overlay `minhai/` pela rotina GitHub → Vercel. O repositório auditado exige Node **24.x** no package.json; esse requisito existente não foi alterado.
2. Conferir login Admin Google e `/comercial`. Conta comum não deve acessar `/api/admin/comercial`.
3. Publicar as duas Edge Functions do diretório `supabase/functions`: `enviar-whatsapp` e `reativar-janelas-whatsapp`, **somente depois do SQL minhAi**. A janela de 24h passa a usar mensagem recebida no mesmo número da Meta. Envio de template/alteração de `updated_at` não renova a janela.
4. A função de reativação exige JWT de usuário dono da empresa ou credencial de servidor; conferir os chamadores existentes. Chamador usando apenas anon key passa a ser recusado. O template utilitário existente dessa função não foi transformado em template comercial.
5. Na aba Mensagens, “Preparar oito templates”, depois enviar cada um para aprovação e consultar o estado. Submeter não envia mensagens aos contatos. O envio do SDR consulta a aprovação e o conteúdo antes de enviar.
6. Gmail precisa de `gmail.send`; os follow-ups e a detecção de resposta também exigem `gmail.readonly`, `gmail.modify` ou escopo completo equivalente. A integração só examina threads que o SDR enviou. O remetente é a conta Google configurada.

Se a política de envio ou o escopo da conta não estiver correto, parar no gate. Aprovação de template não substitui autorização da pessoa. Um telefone retornado pela API não é opt-in. Os oito textos estão no catálogo de código e têm nome/versionamento próprio; mudar texto exige nova versão/aprovação.

## Gate 4 — primeiro teste efetivo

1. Deixar `SDR_LIVE_SEND=false`. Usar primeiro um contato de teste seu, com email confirmado e telefone que você controla.
2. Configurar orçamento local, data final e filtros de cada campanha. Não começar o trial antes de concluir banco, deploy e canais.
3. Fazer uma busca de até cinco contatos por frente; verificar o extrato do fornecedor imediatamente. Importação não coloca ninguém na fila automaticamente.
4. Revisar aderência e origem de cada empresa. Validar email (usa Hunter) quando necessário. Evitar contatos pessoais e inferência de condições de saúde na MelhorIA.
5. Abrir a prévia e a página de qualificação. Para WhatsApp registrar a evidência de opt-in do número/produto correto. O formulário também permite autorização explícita, com os quatro últimos dígitos do número.
6. Ativar somente a campanha de teste, com **1 toque e limite diário 1**. Enfileirar a abordagem escolhida.
7. Configurar GitHub Actions: variável `SDR_WORKER_URL=https://minhai.app`, secret `SDR_WORKER_SECRET` igual ao servidor e variável `SDR_WORKER_ENABLED=true`. O workflow está em `.github/workflows/sdr-worker.yml` e também pode ser iniciado manualmente.
8. Alterar `SDR_LIVE_SEND=true` e fazer redeploy. Rodar em dia útil, **9h–18h de Brasília**. O worker não envia fora desse horário. O agendamento ocorre a cada 15 min, sujeito à disponibilidade do GitHub Actions.
9. Verificar chegada real, clicar o link, responder/qualificar e confirmar a pausa. Testar descadastro com outro contato de teste. Não confundir `sent` (aceitação pela API) com entregue/lido.
10. Só depois aumentar para até cinco envios por dia/campanha e liberar os contatos revisados. Novos resultados das APIs sempre aguardam revisão e enfileiramento; não há disparo automático para toda lista encontrada.

Cada campanha tem prazo, teto de buscas, limite diário e máximo de toques. WhatsApp tem uma apresentação; somente email pode ter até três toques, separados por três dias, com verificação de respostas antes do follow-up. Para o piloto manter um toque até confirmar o comportamento real do Gmail. Respostas e negociações precisam de atendimento humano no canal existente.

## Gate 5 — resultado e fechamento

- API retorna oportunidade → revisão → mensagem → resposta/formulário → qualificação → humano negocia → cliente acessa produto → pagamento confirmado → ativação verificada.
- O link `bc_ref` vincula a oportunidade à conta autenticada apenas se o email confirmado for igual ao lead. O token tem validade de 30 dias. A sessão e o email importam: trocar de dispositivo/conta pode impedir a atribuição automática.
- A conciliação lê os eventos financeiros existentes dos últimos 90 dias. Só atribui pagamento do mesmo usuário, produto e posterior ao vínculo. Taxas de presentes de convidados da ConviteIA não são aquisição de cliente. Créditos compartilhados sem produto identificável não são atribuídos artificialmente ao ArteFinal/ConsultaTec/outro produto.
- Produtos que usam compras compartilhadas podem ter venda real sem atribuição automática neste piloto. Conciliar esses casos manualmente no relatório comercial; não declarar uma API vencedora só pelo contador de vendas do painel. MelhorIA com pacote identificado e demais eventos com produto explícito podem conciliar normalmente.
- Fora da MonitorIA VIP, a ativação é confirmada pelo Admin com evidência após o pagamento. Na MonitorIA VIP, vincular o projeto correto à oportunidade; conciliação usa a fatura efetivamente paga e a ativação do contrato. Sem vínculo do projeto não existe atribuição à oportunidade.
- O Admin continua restrito a você e aos administradores autorizados. O fechamento permanece humano após a qualificação.
- Avaliar custo por contato válido, resposta, qualificado e **pago/ativado**. Informar no custo da campanha gastos de API, canal e comissão; o campo é manual e cumulativo, não importa faturas de terceiros.
- Desabilitar fornecedores perdedores e campanhas ao terminar; cancelar eventual renovação diretamente no fornecedor. O software não cancela planos externos nem garante que um trial ofereça todos os endpoints.

## Limites e recuperação

- A reserva local de tokens/créditos é conservadora e não substitui o saldo do fornecedor. Erro/timeout não devolve reserva automaticamente, pois pode ter havido cobrança. Econodata usa estimativa antes da consulta; Apollo/Hunter reservam por lote. Não misturar unidades entre APIs.
- Hunter gratuito usa a primeira página de Discover; não tenta contornar paginação paga. Após usar cinco empresas desse resultado, a busca fica concluída. Para ampliar cobertura, variar filtros de forma real e conferir limites do plano.
- Estado `unknown`: não reenviar automaticamente. Conferir Gmail/Meta pelo horário e identificador; resultado ambíguo exige revisão técnica da fila. Uma queda após envio pode deixar esse estado mesmo com mensagem entregue.
- Uma busca interrompida por encerramento do processo pode ficar `running`. Conferir o extrato antes de marcá-la como falha; manter a reserva. Não reiniciar consumo às cegas.
- Deduplicação por domínio trata uma empresa como unidade comercial. Duas pessoas da mesma empresa podem virar um contato. Não mescla silenciosamente duas identidades conflitantes. Endereços alternativos não são enriquecidos automaticamente em um lead existente.
- Reembolso/cancelamento é refletido quando a fonte financeira mantém o evento com estado atualizado no recorte consultado. Exclusão física do registro, ajuste parcial ou eventos antigos precisam de conciliação administrativa. MonitorIA não remove atribuições apenas porque ficou indisponível.
- Não há webhook de confirmação de entrega/leitura/bounce específico do SDR, nem painel de conversa novo. A equipe usa Gmail/WhatsApp existentes. Bloqueios de fornecedor interrompem o envio, sem retry cego.
- Para parar: `SDR_LIVE_SEND=false`, desabilitar workflow e campanhas. Para rollback de código, reverter os arquivos do pacote. Preservar tabelas/eventos de opt-out. `ROLLBACK-MRR.sql` restaura a fórmula antiga **apenas se necessário**, pois pode trazer novamente o MRR de cortesias.

## Referências técnicas usadas

- Apollo: https://docs.apollo.io/reference/people-api-search e https://docs.apollo.io/reference/people-enrichment
- Hunter: https://hunter.io/api-documentation/v2
- Econodata: documentação oficial API v4 disponibilizada no portal do fornecedor. Confirmar payload/estimativa com a chave do trial antes de ampliar buscas.
- Meta: documentação oficial de WhatsApp Business Platform e aprovação de templates no próprio WABA.

Ver `VALIDACAO.md` para separar verificações locais concluídas dos gates de homologação ainda necessários.
