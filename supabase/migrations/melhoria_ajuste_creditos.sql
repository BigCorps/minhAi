-- ============================================================================
-- MelhorIA — ajuste dos créditos de boas-vindas
--
-- ⚠️ VOCÊ NÃO PRECISA RODAR ISTO.
-- Eu já apliquei o DELETE pelo MCP e conferi o resultado: sobraram os 3
-- pacotes pagos e nenhum de preço zero. O arquivo fica no repositório só como
-- registro da migração — rodar de novo não faz mal, é idempotente.
-- ============================================================================


-- ── Por que a versão anterior deste arquivo deu erro ────────────────────────
--
--     ERROR: 42601: unterminated dollar-quoted string at or near "$$
--
-- O erro NÃO era do SQL. O editor do painel do Supabase acrescenta sozinho, ao
-- fim do script:
--
--     -- Added by Supabase: enable Row Level Security on newly created tables
--     ALTER TABLE v_pacotes ENABLE ROW LEVEL SECURITY;
--     ALTER TABLE v_gratis  ENABLE ROW LEVEL SECURITY;
--
-- Ele leu a linha `declare v_pacotes int; v_gratis int;` de dentro de um bloco
-- `do $$ ... $$` e concluiu que `v_pacotes` e `v_gratis` eram tabelas novas.
-- Ao injetar os ALTER TABLE, cortou a string de aspas-dólar no meio — daí o
-- "unterminated dollar-quoted string".
--
-- LIÇÃO PARA AS PRÓXIMAS MIGRAÇÕES: em script colado no painel, não use
-- `do $$ ... $$` apenas para imprimir `raise notice`. Use um `select` de
-- verificação — além de não ser mangado, o resultado aparece na tela, o que
-- `raise notice` nem sempre faz no editor.


-- ── 1. Remove o pacote fantasma ─────────────────────────────────────────────
-- Eu tinha criado um 'MelhorIA Boas-vindas' de 15 créditos por R$ 0,00.
-- Era inútil e arriscado:
--
--   · Todo usuário novo JÁ recebe 20 créditos, pelo trigger `on_user_created`
--     -> `initialize_user_credits()`, que é da minhAi e vale para todas as
--     marcas. Não é preciso pacote nenhum para isso.
--   · Um pacote de preço zero levaria a um checkout PIX de R$ 0,00, que não
--     existe. A tela filtra `price_cents > 0`, então ele nunca apareceu — mas
--     era linha morta esperando alguém tropeçar.

delete from public.credits_packages
 where package_type = 'melhoria'
   and price_cents = 0;


-- ── 2. Sobre o "Trial" de 14 dias — NÃO MEXER ───────────────────────────────
--
-- O mesmo trigger grava `has_active_plan = true`, `active_plan_name = 'Trial'`
-- e `plan_expires_at = now() + 14 dias`. Isso é da minhAi e NÃO deve ser
-- alterado: o trigger é compartilhado com ArteFinal, ConviteIA, Pix Wiki e
-- ConsultaTec.
--
-- Verifiquei que não interfere na MelhorIA:
--
--   · `cobrar_credito_se_suficiente` lê SÓ `available_credits`. Não consulta
--     `has_active_plan` nem `plan_expires_at` em momento nenhum.
--   · `expire_plans()` apenas limpa as flags do plano. NÃO toca em
--     `available_credits` — os créditos não somem quando os 14 dias passam.
--
-- Na prática: o usuário da MelhorIA ganha 20 usos que não expiram, e o "plano"
-- é encanamento interno que nenhuma tela da MelhorIA menciona.
--
-- Fica registrado aqui para ninguém "consertar" isso mais tarde por engano.


-- ── 3. Verificação ──────────────────────────────────────────────────────────
-- Um select comum, de propósito (ver a lição no topo do arquivo).

select
  count(*)                                as pacotes_melhoria,   -- esperado: 3
  count(*) filter (where price_cents = 0) as pacotes_gratis,     -- esperado: 0
  min(price_cents) / 100.0                as menor_preco_reais,  -- esperado: 9.90
  max(interactions)                       as maior_pacote        -- esperado: 400
from public.credits_packages
where package_type = 'melhoria';
