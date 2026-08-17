# PixWiki — Status de Implementação

Atualizado em: 17/08/2026

Este arquivo complementa `PLANO-IMPLEMENTACAO-PIXWIKI.md` e registra o andamento real da execução.

## Fases

- [x] FASE 1 — Base de recebimentos
- [x] FASE 2 — Notificações gratuitas
- [x] FASE 3 — Planos
- [x] FASE 4 — Subdomínios
- [x] FASE 5 — Dashboard
- [x] FASE 6 — WhatsApp Pix Pro
- [x] FASE 7 — Multiempresa
- [x] FASE 8 — Relatórios
- [x] FASE 9 — API e Webhooks PixWiki
- [ ] FASE 10 — QA e lançamento

## Otimização pré-QA — 17/08/2026

- [x] Landing reescrita com o produto atual
- [x] Onboarding inicial simplificado
- [x] Pessoa física e empresa tratadas como recebedor
- [x] Planos Pix Grátis, Pix Link e Pix Pro atualizados na comunicação
- [x] Landing sem cálculo de tarifa
- [x] Dashboard sem cálculo/estimativa de tarifa
- [x] Recebimentos exibem o valor líquido efetivamente registrado
- [x] Totais do painel usam valores líquidos
- [x] Recebimentos em tempo real pelo Supabase Realtime
- [x] Atualização automática de segurança
- [x] Botão Atualizar com consulta imediata ao Mercado Pago
- [x] Dashboard reorganizado com áreas expansíveis
- [x] Desconexão do Mercado Pago por empresa
- [x] Proteção para releitura não mover histórico entre empresas
- [x] SEO do PixWiki atualizado no layout
- [x] Dados estruturados atualizados para os três planos e recursos atuais
- [x] Conteúdo GEO/LLM atualizado
- [x] Landing entrega conteúdo público antes da checagem de login
- [x] Páginas privadas continuam fora da indexação

## Fase 9 concluída

- [x] Chaves de API
- [x] Chave completa exibida somente na criação
- [x] Revogação
- [x] Limite de 10 chaves ativas por conta
- [x] Limite de 120 requisições/minuto por chave
- [x] Recebimentos, empresas, recebimento individual e resumo pela API
- [x] Webhooks por conta ou empresa
- [x] Evento `pix.received`
- [x] Assinatura HMAC-SHA256
- [x] Teste de endpoint
- [x] Retry automático
- [x] Máximo de 5 tentativas
- [x] Logs de entrega
- [x] Falha de Webhook não bloqueia confirmação do Pix

## Conta de QA

`ith.almeida@gmail.com` está liberado temporariamente no Pix Pro para QA das funcionalidades premium.

Vencimento do acesso de teste: **15/09/2026**.

## Próxima fase

FASE 10 — QA e lançamento:

- [ ] Conta nova Free
- [ ] Onboarding do zero
- [ ] Conectar e desconectar Mercado Pago
- [ ] Pix direto
- [ ] Atualização em tempo real
- [ ] Botão Atualizar
- [ ] Push
- [ ] E-mail
- [ ] Plano Link
- [ ] Subdomínio
- [ ] Pix Link
- [ ] Valores líquidos corretos
- [ ] Plano Pro
- [ ] WhatsApp
- [ ] Multiempresa
- [ ] API
- [ ] Webhooks
- [ ] Relatórios
- [ ] PWA/WebApp
- [ ] Landing e SEO/GEO publicados
- [ ] Mobile
- [ ] Desktop
- [ ] Build
- [ ] Deploy
- [ ] Monitorar logs
