# PixWiki V2 — QA de produção

Execute somente depois de aplicar Gates 1 → 10 na ordem.

## 1. Build e roteamento
- `npm ci` e `npm run build` precisam finalizar sem erro.
- `https://pix.wiki/`, `/calculadora`, `/docs` e `/seguranca` respondem 200.
- `/aviso`, `/termos` e `/exclusao` respondem 200.
- `https://empresa.pix.wiki/` abre o Pix Link da empresa.
- `https://empresa.pix.wiki/149,90` abre o Pix Link com valor inicial correto.
- `https://empresa.pix.wiki/dashboard` NÃO abre dashboard; deve cair no 404 PixWiki.
- `https://empresa.pix.wiki/c/chk_...` pode abrir Checkout válido, mas a URL canônica produzida pela API continua sendo `https://pix.wiki/c/chk_...`.
- `https://admin.minhai.app/pixwiki-leads` abre a seção Leads PixWiki depois do login administrativo.

## 2. SEO e privacidade de páginas
- Landing, Calculadora, Docs e Segurança são indexáveis somente no apex `pix.wiki`.
- Checkout, dashboard, onboarding, Caixa e subdomínios de recebedor têm `noindex`.
- `/robots.txt` no subdomínio `empresa.pix.wiki` retorna `Disallow: /`.
- `/sitemap.xml` do apex contém somente Landing, Calculadora, Docs e Segurança.
- JSON-LD não contém referências a saldo, saque ou antiga taxa de 1%.

## 3. Onboarding real
- cadastro por Google e e-mail;
- retomada do onboarding após fechar e voltar;
- conectar Mercado Pago;
- salvar chave Pix;
- Push pode ser negado sem bloquear onboarding;
- e-mail/WhatsApp podem ser configurados independentemente;
- primeiro Pix real é detectado e produz “Sua PixWiki está funcionando”;
- testes opcionais de Link/Checkout/API usam `is_test=true` e não consomem franquia.

## 4. Fila de 11 slots
Use uma conta de teste Mercado Pago e o mesmo valor original.
1. Prepare 11 pagamentos simultâneos.
2. Confirme que cada um recebe valor único entre original e -R$0,10.
3. O 12º deve permanecer em “Preparando seu Pix…”.
4. Pague ou deixe expirar um dos 11.
5. O 12º deve adquirir o slot automaticamente.
6. Nunca deve ser emitido desconto de R$0,11 ou maior.

## 5. Idempotência
- Repetir `POST /api/v1/checkouts` com o mesmo `Idempotency-Key` devolve o mesmo Checkout.
- Retries de confirmação não criam duas transações para o mesmo `direct_intent_id`.
- Webhook repetido mantém o mesmo event ID/idempotency key esperado pelo consumidor.
- Um pagamento com e-mail + WhatsApp + Webhook continua consumindo no máximo 1 Automação PixWiki.

## 6. Quota e canais
- Chave Pix + dashboard + Push = 0 automações.
- Pagamento que usa automação paga = no máximo 1 unidade.
- Ao atingir franquia sem overage, recebimento/dashboard/Push continuam funcionando.
- E-mail/WhatsApp/Webhook/novas automações pagas são pausados conforme allowance.
- `is_test=true` não consome franquia.

## 7. Equipe
- owner: dashboard completo e billing.
- manager: gestão operacional permitida; não altera billing.
- cashier: somente `/caixa`, totais operacionais, recebimentos recentes e Push.
- Caixa não consegue consultar `mp_received_payments` diretamente via Data API.
- Remover funcionário desativa Push daquela empresa.

## 8. Billing
- Free inicia sem método de pagamento.
- Mensal/anual exibem valores V2 corretos.
- Anual = 10 mensalidades.
- Overage liga/desliga e spending limit é respeitado.
- Fechamento aplica o menor custo entre faixas mensais disponíveis.
- Crédito de conveniência reduz excedente/renovação e nunca vira saldo sacável.
- QR de cobrança expirado pode ser regenerado sem duplicar obrigação.
- Após carência, somente automações pagas são pausadas.
- Assinaturas existentes migradas pelo Gate 8 aparecem VIP cortesia.

## 9. API e Webhooks
- GET `/companies`, `/summary`, `/receipts`, `/receipts/:id` continuam compatíveis.
- GET/POST de Checkout funcionam com API key.
- `request_id` aparece na resposta e no log interno.
- Webhook `pix.received` versão `2026-10-01` inclui contexto quando aplicável.
- Assinatura HMAC de `<timestamp>.<raw_body>` valida corretamente.
- Retry: aproximadamente 1, 5, 30 e 120 minutos.

## 10. Segurança
Execute o SQL `supabase/validation/pixwiki_v2_gate10_validate.sql`.
- `pixwiki_receipts` deve estar `security_invoker=true`.
- anon/authenticated não podem selecionar a view diretamente.
- helpers server-only não podem ser executados por anon/authenticated.
- RPCs legítimas de usuário permanecem disponíveis para authenticated.
- Rode novamente os Advisors de segurança/performance e compare apenas os findings PixWiki.
- Findings `RLS enabled no policy` em tabelas deliberadamente service-role-only são informativos; confirme que `anon/authenticated` não têm grants diretos antes de tentar “corrigir” adicionando policy pública.

## 11. Rollback mínimo
- Feature flag `pix_link_v2_enabled` pode desligar criação V2 de Link sem derrubar histórico.
- Não apague tabelas V2 durante rollback.
- Em falha visual, reverta páginas/Edge Functions antes de alterar ledger ou dados financeiros.
- Billing deve ser pausado antes de qualquer rollback de schema que envolva faturas/usage periods.
