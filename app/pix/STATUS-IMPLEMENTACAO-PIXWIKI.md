# PixWiki — Status de Implementação

Atualizado em: **20/08/2026**

Este arquivo é a fonte de verdade do andamento atual. O
`PLANO-IMPLEMENTACAO-PIXWIKI.md` representa o planejamento original e pode
conter decisões comerciais/arquiteturais que já foram substituídas.

## Fases

- [x] FASE 1 — Base de recebimentos
- [x] FASE 2 — Notificações
- [x] FASE 3 — Planos
- [x] FASE 4 — Subdomínios
- [x] FASE 5 — Dashboard
- [x] FASE 6 — WhatsApp Pix Pro
- [x] FASE 7 — Multiempresa
- [x] FASE 8 — Relatórios
- [x] FASE 9 — API e Webhooks PixWiki
- [ ] FASE 10 — QA final e lançamento

## Modelo atual confirmado

- [x] PixWiki não é carteira e não mantém saldo para saque
- [x] Dinheiro entra diretamente na conta Mercado Pago conectada
- [x] Pix Grátis — R$ 0
- [x] Pix Link — R$ 29,90/mês
- [x] Pix Pro — R$ 99,90/mês
- [x] Sem cobrança percentual do PixWiki por transação
- [x] Painel mostra valores líquidos efetivamente registrados
- [x] Pessoa física e empresa tratadas como recebedor

## Validado em produção

- [x] Pix direto por Chave Pix detectado
- [x] Pix Link real detectado
- [x] Valores líquidos de Pix Link registrados
- [x] Histórico e soma por dia
- [x] Push
- [x] E-mail
- [x] Corpo HTML do e-mail
- [x] WhatsApp
- [x] Pix Pro
- [x] Número de WhatsApp salvo e canal ativado
- [x] PWA/WebApp instalável
- [x] Footer unificado
- [x] Rotas Pix legadas da minhAi preservadas
- [x] Build de produção
- [x] Deploy de produção
- [x] Sem erros de runtime na verificação de 20/08/2026

## Implementado

- [x] Onboarding simplificado
- [x] Conexão Mercado Pago por OAuth
- [x] Desconexão Mercado Pago por empresa
- [x] Sincronização automática com overlap e dedupe
- [x] Botão Atualizar
- [x] Supabase Realtime
- [x] Proteção contra releitura mover recebimento entre empresas
- [x] Subdomínio `*.pix.wiki`
- [x] Multiempresa no Pix Pro
- [x] Relatórios
- [x] Exportação
- [x] Chaves de API
- [x] API de recebimentos/empresas/resumo
- [x] Webhooks `pix.received`
- [x] HMAC-SHA256
- [x] Retry de Webhook
- [x] Logs de entrega
- [x] Landing/SEO/GEO
- [x] Tema claro/escuro
- [x] Header padronizado nas três abas
- [x] Rodapé `PixWiki | Tecnologia minhAi | Desenvolvido por BigCorps`

## Limpeza de lançamento — 20/08/2026

- [x] `lib/seo.ts` corrigido para o modelo atual
- [x] `app/pix/layout.tsx` passa a usar a fonte central `SEO.pix`/`pixGraph`
- [x] README técnico atualizado
- [x] Termos removem saldo/saque e Banco Inter como provedor atual
- [x] Aviso de Privacidade atualizado para Mercado Pago e notificações atuais
- [x] Página de exclusão removida do modelo antigo de saldo/saque
- [x] `mp-webhook-test` neutralizado
- [x] `pixwiki-phase9-selftest` neutralizado
- [x] `pixwiki-webhook-sink-test` neutralizado
- [x] `pixwiki-mp-debug-safe` neutralizado
- [x] `pixwiki-onesignal-user-status` neutralizado após validação do Push
- [x] Tabela temporária `mp_webhook_test_events` removida

## QA que ainda vale executar antes de declarar Fase 10 fechada

- [ ] Criar uma conta Free nova, sem histórico, e concluir onboarding
- [ ] Conectar → desconectar → reconectar Mercado Pago pela interface
- [ ] Confirmar Botão Atualizar nessa conta nova
- [ ] Confirmar Realtime nessa conta nova
- [ ] Testar contratação paga real do Pix Link
- [ ] Confirmar renovação/status da assinatura paga
- [ ] Smoke final de subdomínio Pix Link
- [ ] Smoke final de multiempresa com recebimentos em empresas diferentes
- [ ] Exportar um relatório real
- [ ] Criar uma chave API de QA e fazer chamada real
- [ ] Criar um Webhook externo de QA e receber um `pix.received`
- [ ] Rodada visual final mobile + desktop

## Pós-lançamento

- [ ] FASE 11 — Segundo provedor: Banco Inter Empresas
  - OAuth client credentials + mTLS
  - certificado por integração PJ
  - consulta de Pix recebidos
  - normalização no mesmo histórico PixWiki
  - avaliar Pix Link por cobrança Inter
  - webhook Inter em etapa posterior

## Conta de QA

A liberação temporária Pix Pro usada nos testes continua sendo apenas de QA e
não substitui o teste futuro do fluxo de contratação paga.

## Regra de lançamento

Não adicionar Banco Inter nem outra mudança estrutural antes de fechar os itens
manuais acima. A versão Mercado Pago deve ser a baseline estável do lançamento.
