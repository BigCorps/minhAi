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

- Dívida técnica: `max_runs` atualmente é compartilhado entre descoberta e enriquecimentos, incluindo probes e runs falhos; antes de ativar operação automática em escala, separar limites por tipo de operação.
- Buscar decisor Econodata consulta somente a primeira página de `/companies/{cnpj}/people`, com `papel=decisores` e `tamanho=5`. Reserva interna: 1000 unidades, sem representar cobrança real; o run registra `X-Tokens-Charged`, com zero importações/duplicados. A reconciliação continua manual. Salva nome no lead e atributos permitidos em `qualification.decision_maker`, sem emails, fotos, redes sociais ou payload bruto. A ação Localizar email usa depois o Hunter Email Finder (`GET /v2/email-finder`, `full_name` e preferencialmente `domain`; sem domínio válido, `company`), reservando uma unidade Hunter antes da chamada. Resultado vazio não é cobrado pelo Hunter e libera uma unidade atomicamente via `sdr_release_units`; email encontrado mantém a unidade consumida, inclusive se a verificação não for válida. Erros HTTP mantêm a reserva por cautela. O método usado é salvo em `qualification.email_enrichment.lookupMethod`, sem query completa. A migration `20261006183658_sdr_release_units.sql` deve estar aplicada antes de usar esse fluxo. Somente email com `verification.status=valid` é salvo como verificado; não dispara Discover, Domain Search, Email Verifier ou envio. Decisor selecionado é obrigatório; sem domínio válido, o nome real da empresa também é obrigatório.

- A reserva local de tokens/créditos é conservadora e não substitui o saldo do fornecedor. Erro/timeout não devolve reserva automaticamente, pois pode ter havido cobrança. Econodata reserva 5000 unidades internamente no piloto; Apollo/Hunter reservam por lote. Não misturar unidades entre APIs.
- Econodata é a fonte prioritária para descobrir empresas brasileiras. O piloto REST faz uma única chamada a `/companies/search_list`, enviando `filtros` e `incluir: ["cadastro"]`, sem contatos básicos, paginação ou `estimar`. O dry-run `estimar: true` pertence ao contrato da tool MCP e não é usado neste fluxo REST. Antes de qualquer chamada externa, `sdr_reserve_run` deve aprovar a reserva conservadora de 5000 unidades; orçamento desabilitado interrompe com `provider_budget`. Essa reserva não representa cobrança real. `credits_charged` usa somente o header oficial `X-Tokens-Charged` quando numérico, finito e não negativo, ou fica `null`.
- `sdr_release_units` devolve somente reservas comprovadamente não cobradas no Email Finder. Os fluxos Econodata ainda não reconciliam automaticamente a diferença entre reserva e cobrança. Manter a reserva e registrar o consumo real, sem atualização presumida do budget ou novo SQL; a reconciliação será manual via MCP durante o piloto.
- Importar no máximo cinco resultados básicos, preservando CNPJ e nome apenas quando disponível; sem nome, usar `CNPJ <cnpj>`. Email e telefone ficam nulos; encerrar o cursor após a resposta. Somente o bucket cadastro é solicitado; decisores e contatos não são consultados nesta etapa. A sequência posterior será empresa → CNPJ → qualificação → decisores/organograma Econodata → seleção do decisor → Hunter para email/verificação quando necessário.
- O pacote oficial inspecionado não confirma um campo de website/domínio no retorno de `cadastro`; nenhum campo foi inventado. A descoberta continua funcionando sem domínio.
- Código Apollo preservado, mas fallback bloqueado nesta etapa por indisponibilidade no plano Free. Sua implementação após Hunter `not_found` usa `POST /api/v1/people/bulk_match` com uma pessoa (`name` e `domain`). Personal emails, telefone e waterfall ficam desabilitados; não usa webhook nem dispara envio. Reserva 2 unidades Apollo antes da chamada; `credits_consumed` decimal entre 0 e 2 devolve atomicamente a diferença via `sdr_release_units`. Consumo ausente, inválido ou maior que 2 mantém a reserva e gera `apollo_accounting_invalid`. Só aceita nome compatível, domínio compatível quando retornado, confidence `high` quando presente e email `verified`. Registra tentativa preservando Hunter e impede repetição automática. Budget Apollo permanece desabilitado/zero até liberação manual; a migration de release precisa estar aplicada.
- Hunter gratuito usa a primeira página de Discover; não tenta contornar paginação paga. Após usar cinco empresas desse resultado, a busca fica concluída. Para ampliar cobertura, variar filtros de forma real e conferir limites do plano.
- No piloto Hunter, o Discover prioriza domínios com emails pessoais disponíveis e exclui empresas sem domínio ou com `emails_count.personal=0`, consultando no máximo cinco domínios. Cada Domain Search busca até dez contatos pessoais profissionais (`type=personal`), com status `valid`, nome completo e cargo presentes. O SDR escolhe localmente um contato por empresa, priorizando decision maker, seniority executivo, proprietário/fundador/liderança, direção/gerência, comercial/vendas/marketing e, por fim, confidence. Decision maker é preferência, não requisito; contatos sem essa classificação também podem ser selecionados. Empresa sem contato elegível é ignorada, sem nova consulta; a rodada pode importar menos de cinco leads. A evidência registra cargo, decision maker, seniority e confidence quando disponíveis, além dos filtros da campanha.
- Para Hunter, `credits_charged` registra o número de Domain Searches que retornaram pelo menos um email, independentemente da quantidade de emails ou da seleção/importação. A reserva permanece conservadora; unidades não usadas não são devolvidas automaticamente ao budget e a reconciliação continua separada durante o piloto.
- Estado `unknown`: não reenviar automaticamente. Conferir Gmail/Meta pelo horário e identificador; resultado ambíguo exige revisão técnica da fila. Uma queda após envio pode deixar esse estado mesmo com mensagem entregue.
- Uma busca interrompida por encerramento do processo pode ficar `running`. Conferir o extrato antes de marcá-la como falha; manter a reserva. Não reiniciar consumo às cegas.
- Deduplicação por domínio trata uma empresa como unidade comercial. Duas pessoas da mesma empresa podem virar um contato. Não mescla silenciosamente duas identidades conflitantes. Endereços alternativos não são enriquecidos automaticamente em um lead existente.
- Reembolso/cancelamento é refletido quando a fonte financeira mantém o evento com estado atualizado no recorte consultado. Exclusão física do registro, ajuste parcial ou eventos antigos precisam de conciliação administrativa. MonitorIA não remove atribuições apenas porque ficou indisponível.
- Não há webhook de confirmação de entrega/leitura/bounce específico do SDR, nem painel de conversa novo. A equipe usa Gmail/WhatsApp existentes. Bloqueios de fornecedor interrompem o envio, sem retry cego.
- Para parar: `SDR_LIVE_SEND=false`, desabilitar workflow e campanhas. Para rollback de código, reverter os arquivos do pacote. Preservar tabelas/eventos de opt-out. `ROLLBACK-MRR.sql` restaura a fórmula antiga **apenas se necessário**, pois pode trazer novamente o MRR de cortesias.

## Referências técnicas usadas

- Apollo: https://docs.apollo.io/reference/people-api-search e https://docs.apollo.io/reference/people-enrichment
- Hunter: https://hunter.io/api-documentation/v2
- Econodata: https://econodata-tecnologia.github.io/api-v4-docs/ (REST), https://econodata-tecnologia.github.io/api-v4-docs/mcp.html (contrato MCP separado) e https://help.econodata.com.br/pt/article/como-conectar-a-econodata-no-n8n-via-api-v4-15g5gfz/ (`X-Tokens-Charged`). Conferir consumo efetivo e saldo real no piloto antes de ampliar buscas.
- Meta: documentação oficial de WhatsApp Business Platform e aprovação de templates no próprio WABA.

Ver `VALIDACAO.md` para separar verificações locais concluídas dos gates de homologação ainda necessários.

## Pesquisa IA na web · piloto empresarial

- `web_research_contact` recebe somente o ID da oportunidade e usa dados do banco: empresa, CNPJ/domínio, representante e cargo conhecidos, produto. Não descobre empresas novas nem consumidores, noivos/noivas, familiares ou pessoas fora do vínculo empresarial. Leads manuais precisam de CNPJ; sem CNPJ, exigimos origem B2B conhecida e domínio empresarial. Não escolhe outro decisor.
- OpenAI Responses REST (`POST /v1/responses`), modelo `gpt-5.6-luna`, única ferramenta `web_search`, `tool_choice: required`, `max_tool_calls: 3`, `store: false`, JSON Schema estrito (`text.format`). O SDK instalado não tem Responses; nenhuma dependência foi atualizada. A chave existente `OPENAI_API_KEY` é lida só no servidor e não é salva/logada. Modelo e acesso à ferramenta precisam ser homologados na conta de produção; não há fallback para Astra/Codex.
- Aplicar `20261006200158_sdr_web_research.sql`: amplia somente o check do budget, cria `web_research` desabilitado com teto zero e a RPC `sdr_begin_web_research`. A RPC trava o lead e a oportunidade, reserva três unidades separadas e registra execução antes da API. Qualquer pesquisa anterior do mesmo lead bloqueia outra tentativa, inclusive em outro produto. Não altera budgets Hunter/Econodata/Apollo. Liberar manualmente teto e validade da nova fonte antes do piloto.
- `searchCount` conta chamadas `web_search_call` retornadas, incluindo operações de leitura da ferramenta, de forma conservadora. No máximo três por lead. Depois de resultado válido, libera a diferença pela RPC atômica existente; falha, timeout ou resposta inválida mantém a reserva. Execução interrompida pode ficar `running` e exige reconciliação manual, sem retry automático. Não estima custo monetário.
- JSON estruturado contém confirmação da empresa, domínio, representante/vínculo, email profissional publicado, contatos gerais, fontes, confiança e sinal de conflito. Quotes literais são transitórios para conferência, nunca persistidos. Schema também é validado localmente. URLs persistidas precisam ter vindo de `web_search_call.action.sources`; títulos vêm dessa ferramenta, não de raciocínio do modelo.
- Uma fonte é conferida no servidor via HTTPS público, DNS fixado, sem cookies/credenciais, redirects, execução, e com tamanho/tempo limitados. Páginas inacessíveis, dinâmicas sem texto, HTTP ou fontes não citadas não confirmam contatos. Isso pode reduzir a cobertura. Dados da página não são reenviados como instruções. A pesquisa orienta ignorar prompt injection; a única ferramenta disponível é busca, nunca envio ou execução.
- Email individual só é aceito com nome conhecido, vínculo profissional e empresa confirmados, domínio corporativo, confiança mínima 0,85 e quote literal associando nome/email presente na página. Nunca infere email por padrão; endereços pessoais/freemail e caixas gerais são rejeitados para o decisor. Conflitos impedem confirmação. Essas verificações conservadoras não substituem revisão humana da identidade/fontes.
- Persistência: merge em `qualification.web_research` com status/modelo/contagem/timestamp, confirmações, confiança, fontes e `companyContacts` gerais separados. Não salva resposta bruta, raciocínio, quotes, telefone, dados residenciais ou familiares. Não cria outro lead. Email profissional publicado usa `email_status=public_source`, já permitido pelo campo text; não finge verificação técnica. As regras de envio continuam exigindo `verified` e esta action nunca envia/enfileira nada.
- Apollo API enrichment indisponível no plano Free: botão removido e action de fallback bloqueada; código do provider preservado. Budget Apollo continua desabilitado. Sem novas tentativas Apollo nesta etapa.

- Validador Web Research v2 (`validatorVersion: 2`): confirma separadamente a identidade da página por CNPJ exato ou nome conhecido da empresa. Em domínio oficial conhecido, o conteúdo ainda precisa trazer o nome da empresa; hostname/título/snippet não bastam. O quote do decisor precisa de nome e cargo, mas não repetir o nome empresarial. Fonte e quote de email continuam conferidos; a associação inline rejeita nomes de terceiros entre a pessoa conhecida e o email. Diagnóstico `[SDR_WEB_RESEARCH_VALIDATION]` contém somente cinco booleanos, sem nomes, URLs, quotes ou outros dados pessoais. Havendo decisor conhecido e nenhum email publicado na primeira pesquisa, as instruções exigem segunda busca dirigida a nome completo + empresa + domínio; a terceira é opcional e o limite absoluto permanece três chamadas.

- Web Research considera o decisor com nome existente e `qualification.decision_maker.source = econodata` já identificado profissionalmente. Persiste `decisionMakerKnown`, `decisionMakerSource` e `decisionMakerWebCorroborated` separadamente; falta de corroboração web não invalida a identificação Econodata. `decisionMakerConfirmed` permanece como indicador legado de corroboração web. A confirmação web da empresa é metadata: não bloqueia concluir pesquisa de empresa Econodata com CNPJ.
- A primeira busca cobre empresa + decisor; sem email público, a segunda é dirigida ao nome completo + empresa + domínio + email/contato profissional. A terceira exige necessidade, mantendo o máximo de três pesquisas. Não se gastam buscas para provar novamente o vínculo Econodata.
- Email individual continua exigindo página acessível validada, fonte retornada pela ferramenta, associação explícita com o nome completo e domínio corporativo compatível; emails inferidos, pessoais, genéricos e de terceiros são rejeitados. Contatos gerais exigem sua própria fonte validada como pertencente à empresa.
- Resultado persistido: `professional_email_found`, `company_contact_found`, `no_public_contact_found` ou `validation_inconclusive`. Um contato proposto que não passe a conferência documental produz resultado inconclusivo; ausência de contato proposto, mesmo com página cadastral inacessível, produz `no_public_contact_found`. Nenhum resultado dispara envio.

- Contatos gerais corporativos podem ser aceitos sem releitura HTTP para empresas Econodata com CNPJ e domínio conhecido: a URL deve vir da ferramenta Web Search, ter hostname exatamente igual ao domínio ou subdomínio, e o email genérico deve pertencer exatamente ao domínio empresarial, sem evidência conflitante. Inclui `administrativo@`. São persistidos somente em `qualification.web_research.companyContacts`, nunca em `lead.email`. Fontes de terceiros continuam exigindo identidade empresarial e quote conferidos na página; emails individuais mantêm toda a validação documental.
- A empresa conhecida pela Econodata persiste `companyKnown`, `companySource` e `companyWebCorroborated` separadamente; confirmação web não é pré-requisito para reconhecer a empresa com CNPJ.
