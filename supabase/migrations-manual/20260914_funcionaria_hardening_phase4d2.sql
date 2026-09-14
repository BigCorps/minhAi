-- minhAi / FuncionarIA — Hardening Fase 4D2
-- Fecha escrita direta de pix_transactions para browser.
--
-- PRÉ-REQUISITOS CONFIRMADOS:
-- 1) 4D1B publicada em produção;
-- 2) zero INSERT/UPDATE/DELETE browser rastreado em pix_transactions;
-- 3) gerar-pix-assistente-v2 usa service_role;
-- 4) gerar-pix-assistente legado usa SUPABASE_SERVICE_ROLE_KEY para
--    INSERT/UPDATE em pix_transactions;
-- 5) Edge Functions/APIs que escrevem na tabela usam contexto privilegiado.
--
-- ESTA MIGRATION:
-- - preserva SELECT para anon/authenticated;
-- - preserva acesso completo para service_role;
-- - revoga INSERT/UPDATE/DELETE/TRUNCATE/TRIGGER/REFERENCES de
--   PUBLIC/anon/authenticated;
-- - remove somente as quatro policies históricas de escrita pública;
-- - NÃO altera as policies de SELECT;
-- - NÃO altera pixwiki_confirm_link_from_received_payment() nesta fase.

begin;

do $$
declare
  v_table regclass := to_regclass('public.pix_transactions');
begin
  if v_table is null then
    raise exception '4D2 abortada: public.pix_transactions não existe';
  end if;

  -- O backend precisa continuar plenamente operacional.
  if not has_table_privilege('service_role', v_table, 'SELECT')
     or not has_table_privilege('service_role', v_table, 'INSERT')
     or not has_table_privilege('service_role', v_table, 'UPDATE')
     or not has_table_privilege('service_role', v_table, 'DELETE') then
    raise exception '4D2 abortada: service_role não possui contrato DML esperado';
  end if;

  -- Estado esperado antes do corte.
  if not has_table_privilege('anon', v_table, 'SELECT')
     or not has_table_privilege('authenticated', v_table, 'SELECT') then
    raise exception '4D2 abortada: SELECT público/autenticado divergiu do esperado';
  end if;

  if not has_table_privilege('anon', v_table, 'INSERT')
     or not has_table_privilege('anon', v_table, 'UPDATE')
     or not has_table_privilege('authenticated', v_table, 'INSERT')
     or not has_table_privilege('authenticated', v_table, 'UPDATE') then
    raise exception '4D2 abortada: grants de escrita pré-migration divergiram do esperado';
  end if;
end
$$;

-- Fecha privilégios de escrita/DDL-like no browser, inclusive herança via PUBLIC.
revoke insert, update, delete, truncate, trigger, references
on table public.pix_transactions
from public, anon, authenticated;

-- SELECT continua explicitamente disponível aos contratos públicos existentes.
grant select on table public.pix_transactions to anon, authenticated;

-- Garante o contrato completo do backend privilegiado.
grant select, insert, update, delete, truncate, trigger, references
on table public.pix_transactions
to service_role;

-- Remove apenas policies históricas de escrita pública.
drop policy if exists "Public insert pix transactions"
  on public.pix_transactions;

drop policy if exists "Public update pix transactions"
  on public.pix_transactions;

drop policy if exists "public_insert_by_company"
  on public.pix_transactions;

drop policy if exists "public_update_by_company"
  on public.pix_transactions;

-- Pós-condições. Qualquer divergência aborta e faz rollback.
do $$
declare
  v_table regclass := 'public.pix_transactions'::regclass;
  v_write_policy_count integer;
begin
  if has_table_privilege('anon', v_table, 'INSERT')
     or has_table_privilege('anon', v_table, 'UPDATE')
     or has_table_privilege('anon', v_table, 'DELETE')
     or has_table_privilege('anon', v_table, 'TRUNCATE')
     or has_table_privilege('anon', v_table, 'TRIGGER')
     or has_table_privilege('anon', v_table, 'REFERENCES') then
    raise exception '4D2 falhou: anon ainda possui privilégio de escrita/estrutura';
  end if;

  if has_table_privilege('authenticated', v_table, 'INSERT')
     or has_table_privilege('authenticated', v_table, 'UPDATE')
     or has_table_privilege('authenticated', v_table, 'DELETE')
     or has_table_privilege('authenticated', v_table, 'TRUNCATE')
     or has_table_privilege('authenticated', v_table, 'TRIGGER')
     or has_table_privilege('authenticated', v_table, 'REFERENCES') then
    raise exception '4D2 falhou: authenticated ainda possui privilégio de escrita/estrutura';
  end if;

  if not has_table_privilege('anon', v_table, 'SELECT')
     or not has_table_privilege('authenticated', v_table, 'SELECT') then
    raise exception '4D2 falhou: SELECT necessário foi removido';
  end if;

  if not has_table_privilege('service_role', v_table, 'SELECT')
     or not has_table_privilege('service_role', v_table, 'INSERT')
     or not has_table_privilege('service_role', v_table, 'UPDATE')
     or not has_table_privilege('service_role', v_table, 'DELETE') then
    raise exception '4D2 falhou: contrato do service_role foi alterado';
  end if;

  select count(*)
    into v_write_policy_count
  from pg_policy
  where polrelid = v_table
    and polcmd in ('a','w','d');

  if v_write_policy_count <> 0 then
    raise exception
      '4D2 abortada: ainda existem % policies de escrita em pix_transactions',
      v_write_policy_count;
  end if;
end
$$;

commit;

with grants as (
  select jsonb_build_object(
    'anon', jsonb_build_object(
      'select', has_table_privilege('anon','public.pix_transactions','SELECT'),
      'insert', has_table_privilege('anon','public.pix_transactions','INSERT'),
      'update', has_table_privilege('anon','public.pix_transactions','UPDATE'),
      'delete', has_table_privilege('anon','public.pix_transactions','DELETE'),
      'truncate', has_table_privilege('anon','public.pix_transactions','TRUNCATE'),
      'trigger', has_table_privilege('anon','public.pix_transactions','TRIGGER'),
      'references', has_table_privilege('anon','public.pix_transactions','REFERENCES')
    ),
    'authenticated', jsonb_build_object(
      'select', has_table_privilege('authenticated','public.pix_transactions','SELECT'),
      'insert', has_table_privilege('authenticated','public.pix_transactions','INSERT'),
      'update', has_table_privilege('authenticated','public.pix_transactions','UPDATE'),
      'delete', has_table_privilege('authenticated','public.pix_transactions','DELETE'),
      'truncate', has_table_privilege('authenticated','public.pix_transactions','TRUNCATE'),
      'trigger', has_table_privilege('authenticated','public.pix_transactions','TRIGGER'),
      'references', has_table_privilege('authenticated','public.pix_transactions','REFERENCES')
    ),
    'service_role', jsonb_build_object(
      'select', has_table_privilege('service_role','public.pix_transactions','SELECT'),
      'insert', has_table_privilege('service_role','public.pix_transactions','INSERT'),
      'update', has_table_privilege('service_role','public.pix_transactions','UPDATE'),
      'delete', has_table_privilege('service_role','public.pix_transactions','DELETE'),
      'truncate', has_table_privilege('service_role','public.pix_transactions','TRUNCATE'),
      'trigger', has_table_privilege('service_role','public.pix_transactions','TRIGGER'),
      'references', has_table_privilege('service_role','public.pix_transactions','REFERENCES')
    )
  ) as value
),
policies as (
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'name', polname,
      'command', case polcmd
        when 'r' then 'select'
        when 'a' then 'insert'
        when 'w' then 'update'
        when 'd' then 'delete'
        else polcmd::text
      end,
      'qual', pg_get_expr(polqual,polrelid),
      'with_check', pg_get_expr(polwithcheck,polrelid)
    )
    order by polname
  ), '[]'::jsonb) as value
  from pg_policy
  where polrelid='public.pix_transactions'::regclass
)
select jsonb_pretty(jsonb_build_object(
  'table_contract',(select value from grants),
  'remaining_policies',(select value from policies),
  'expected',jsonb_build_object(
    'anon','SELECT only',
    'authenticated','SELECT only',
    'service_role','full table privileges',
    'write_policies',0
  )
)) as phase4d2_result;
