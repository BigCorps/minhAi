-- PixWiki — limpeza dos diagnósticos temporários de pré-lançamento
-- Aplicada em produção em 20/08/2026.
--
-- As Edge Functions temporárias foram neutralizadas separadamente para
-- responder somente 404. Esta migration remove a única tabela de captura
-- criada para o teste antigo de webhook do Mercado Pago.

drop table if exists public.mp_webhook_test_events;
