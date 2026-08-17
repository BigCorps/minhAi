# PixWiki — Status de Implementação

Atualizado em: 16/08/2026

Este arquivo complementa `PLANO-IMPLEMENTACAO-PIXWIKI.md` e registra o andamento real da execução.

## Fases

- [x] FASE 1 — Base de recebimentos
- [x] FASE 2 — Notificações gratuitas
- [x] FASE 3 — Planos
- [x] FASE 4 — Subdomínios
- [x] FASE 5 — Dashboard novo
- [x] FASE 6 — WhatsApp Pix Pro
- [x] FASE 7 — Multiempresa
- [x] FASE 8 — Relatórios
- [x] FASE 9 — API e Webhooks PixWiki
- [ ] FASE 10 — QA e lançamento

## Fase 9 concluída

- [x] Chaves de API
- [x] Hash SHA-256 no banco; chave completa exibida somente uma vez
- [x] Revogação
- [x] Limite de 10 chaves ativas por conta
- [x] Rate limit de 120 requisições/minuto por chave
- [x] `GET /api/v1/companies`
- [x] `GET /api/v1/receipts`
- [x] `GET /api/v1/receipts/:id`
- [x] `GET /api/v1/summary`
- [x] Logs de uso da API
- [x] Retenção automática de logs
- [x] Cadastro de até 10 Webhooks por conta
- [x] Evento `pix.received`
- [x] Escopo por empresa ou todas as empresas
- [x] HMAC-SHA256
- [x] `X-PixWiki-Event`
- [x] `X-PixWiki-Event-Id`
- [x] `X-PixWiki-Timestamp`
- [x] `X-PixWiki-Signature`
- [x] `Idempotency-Key`
- [x] Teste manual de endpoint
- [x] Retry automático
- [x] Tentativas em 1 min, 5 min, 30 min e 2 h
- [x] Máximo de 5 tentativas
- [x] Logs de entrega
- [x] Falha de Webhook não bloqueia confirmação do Pix

## Testes técnicos já realizados na Fase 9

- [x] API `/companies` — HTTP 200
- [x] API `/summary` — HTTP 200
- [x] API `/receipts` — HTTP 200
- [x] Webhook real de teste — HTTP 200
- [x] Receptor confirmou assinatura presente
- [x] Receptor confirmou timestamp presente
- [x] Receptor confirmou evento `pix.received`
- [x] Falha controlada HTTP 500 entrou em `retrying`
- [x] Primeira espera validada em 1 minuto
- [x] Segunda tentativa validada com espera de 5 minutos
- [x] Dados artificiais de teste removidos

## Conta de QA

`ith.almeida@gmail.com` foi liberado temporariamente no Pix Pro para QA das funcionalidades premium.

Vencimento do acesso de teste: **15/09/2026**.

## Próxima fase

FASE 10 — QA e lançamento:

- [ ] Conta nova Free
- [ ] Pix direto
- [ ] Push
- [ ] E-mail
- [ ] Plano Link
- [ ] Subdomínio
- [ ] Pix Link
- [ ] Tarifas corretas
- [ ] Plano Pro
- [ ] WhatsApp
- [ ] Janela aberta
- [ ] Janela fechada
- [ ] Multiempresa
- [ ] API
- [ ] Webhooks
- [ ] Relatórios
- [ ] PWA/WebApp
- [ ] Mobile
- [ ] Desktop
- [ ] Build
- [ ] Deploy
- [ ] Monitorar logs
