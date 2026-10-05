# Atualização 02 — MonitorIA no Admin e SDR próprio

Pacote incremental de 05/10/2026. Requer a instalação do primeiro pacote já concluída.
Bases: minhAi `e0d972afef65404f97f23e7f3cdf4abb63329618`; MonitorIA `dcc77db7428ace354f1de1cf7681b2c49888a4b6`.

## O que muda

- Visão Geral: total de contas minhAi + MonitorIA, novos cadastros e resumo de organizações/câmeras do MonitorIA. As duas bases mantêm seus logins; a mesma pessoa pode ter duas contas. Atividade/online da minhAi permanece separada do último login do MonitorIA.
- Usuários: nova lista MonitorIA, busca por nome/email/organização, filtros Standard/VIP, paginação e detalhes de organizações. Contas sem organização também aparecem no filtro geral. Uma conta que usa os dois produtos pode aparecer nos dois filtros.
- Financeiro: lista de organizações MonitorIA, responsável/email, recebido no mês e último pagamento. Cada organização aparece uma vez, independentemente do número de membros. Os valores desta lista já integram os totais financeiros: não devem ser somados novamente. MRR e tratamento de cortesias do primeiro pacote permanecem.
- Grupo Silva retirado da operação ativa. PixWiki e MonitorIA VIP passam para SDR próprio, com API configurável, mantendo IDs e oportunidades. Os históricos antigos não são apagados. As duas campanhas convertidas ficam pausadas e sem fornecedor; as demais mantêm a configuração.
- Oito templates disponíveis no botão “Preparar oito templates”. Os dois adicionais são PixWiki e MonitorIA VIP. Os seis anteriores são preservados; aprovação na Meta e opt-in continuam necessários para WhatsApp.

## Ordem de instalação

1. Supabase **MonitorIA** (`xwejfayeackbrilipgrj`): executar apenas o novo `docs/sdr/02-admin-users.sql` pelo SQL Editor. No ZIP há uma cópia em `SQL/01-MONITORIA-usuarios.sql`.
2. Supabase **minhAi** (`qyonozbroekuqlotqcbm`): executar `supabase/migrations/20261005183013_sdr_own_sales.sql`. No ZIP há uma cópia em `SQL/02-MINHAI-sdr-proprio.sql`.
3. Aplicar o patch minhAi no Codespace da minhAi e o patch MonitorIA no Codespace MonitorIA, usando os scripts do ZIP. O segundo só adiciona o arquivo SQL ao repositório; não altera a aplicação MonitorIA nem o Agent.
4. Conferir `git diff --check` e `git diff --stat`, fazer commit/push no fluxo habitual e confirmar a Vercel READY no mesmo SHA da minhAi.
5. Recarregar o Admin. Se o MonitorIA ficar indisponível, o painel apresenta total parcial e aviso, em vez de assumir zero usuários.

Não reaplicar os SQLs iniciais nem o primeiro ZIP por cima desta atualização. Os novos SQLs podem ser repetidos: a conversão das campanhas só afeta linhas ainda classificadas como parceiro.

## Conexão

Reutiliza `MONITORIA_SUPABASE_URL` e `MONITORIA_SUPABASE_SECRET_KEY` já configuradas no servidor minhAi. Nenhuma chave vai para o navegador. A nova projeção exporta apenas identificação, organizações, planos e contagens; não libera a tabela Auth, senhas, tokens, imagens ou credenciais de câmeras. As RPCs são exclusivas do serviço e a rota Next exige acesso de administrador. Nenhuma nova autorização é concedida a usuários comuns.

## Operação própria

| Frente | Produtos | Fornecedor |
| --- | --- | --- |
| API 1 | ConviteIA e MelhorIA | Econodata, Apollo ou Hunter, escolhido por campanha |
| API 2 | Mídia.Pro e ArteFinal | Econodata, Apollo ou Hunter, escolhido por campanha |
| API 3 | ConsultaTec e FuncionarIA | Econodata, Apollo ou Hunter, escolhido por campanha |
| Alto ticket | PixWiki e MonitorIA VIP | Uma das mesmas três APIs; não é uma quarta API |

Esta atualização não contrata fornecedores, inicia trials, altera limites ou envia mensagens. Configure chaves, disponibilidade de trial, prazo e orçamento de cada API antes de habilitar campanhas. “Preparar oito templates” apenas prepara registros; a submissão à Meta é uma ação posterior. Os contatos ainda exigem revisão, origem e canal adequados. API não revela uma necessidade com certeza: o ICP seleciona candidatos e a qualificação confirma interesse. Compare fornecedores em públicos equivalentes para escolher o vencedor. O fechamento continua humano neste piloto.

## Conferência após publicar

- Visão Geral: MonitorIA aparece com contagem de contas e organizações; total geral corresponde à soma das duas bases, não a pessoas únicas.
- Usuários: link “Ver também usuários da MonitorIA”, busca por um email conhecido e paginação. Conferir uma conta sem organização e uma organização com mais de um membro.
- Financeiro: conferir uma fatura paga e seu responsável. Não esperar que todo cadastro apareça como pagante. Valores de cortesias e ConviteIA seguem as regras do primeiro pacote.
- Comercial: oito campanhas, nenhuma do Grupo Silva; PixWiki e MonitorIA VIP pausadas e com seleção de fornecedor. Sem perda de IDs/histórico/opt-outs.
- Mensagens: “Preparar oito templates” inclui os dois produtos adicionais sem substituir os seis já existentes.

A validação local não substitui a conferência do Admin autenticado e do deploy após a instalação. Consulte `VALIDACAO.md` no ZIP.
