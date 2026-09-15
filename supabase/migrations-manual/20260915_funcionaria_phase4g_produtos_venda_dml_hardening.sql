-- FuncionarIA / minhAi — Fase 4G
-- Fechamento final de DML direto em public.produtos_venda.
-- EXECUTAR SOMENTE depois de:
-- 1) 4G verifier + build PASS;
-- 2) rotas Next 4G em produção;
-- 3) ml-publicar-produto, ml-refresh-token e ml-responder-pergunta protegidas como workers service-role-only.

begin;

do $$
begin
  if to_regclass('public.produtos_venda') is null then
    raise exception 'produtos_venda_not_found';
  end if;
  if not (select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='produtos_venda') then
    raise exception 'produtos_venda_rls_disabled';
  end if;
  if not has_table_privilege('service_role','public.produtos_venda','SELECT')
     or not has_table_privilege('service_role','public.produtos_venda','INSERT')
     or not has_table_privilege('service_role','public.produtos_venda','UPDATE')
     or not has_table_privilege('service_role','public.produtos_venda','DELETE') then
    raise exception 'service_role_missing_produtos_venda_crud';
  end if;
end $$;

revoke insert, update, delete, truncate, references, trigger on table public.produtos_venda from public;
revoke insert, update, delete, truncate, references, trigger on table public.produtos_venda from anon;
revoke insert, update, delete, truncate, references, trigger on table public.produtos_venda from authenticated;

grant select on table public.produtos_venda to anon, authenticated, service_role;
grant insert, update, delete on table public.produtos_venda to service_role;

-- Service role bypassa RLS. Toda policy de escrita deixa de ser necessária e
-- poderia reabrir a superfície caso grants fossem alterados no futuro.
do $$
declare p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname='public'
      and tablename='produtos_venda'
      and lower(cmd) in ('all','insert','update','delete')
  loop
    execute format('drop policy if exists %I on public.produtos_venda', p.policyname);
  end loop;
end $$;

do $$
begin
  if has_table_privilege('anon','public.produtos_venda','INSERT')
     or has_table_privilege('anon','public.produtos_venda','UPDATE')
     or has_table_privilege('anon','public.produtos_venda','DELETE') then
    raise exception 'anon_produtos_venda_write_still_enabled';
  end if;
  if has_table_privilege('authenticated','public.produtos_venda','INSERT')
     or has_table_privilege('authenticated','public.produtos_venda','UPDATE')
     or has_table_privilege('authenticated','public.produtos_venda','DELETE') then
    raise exception 'authenticated_produtos_venda_write_still_enabled';
  end if;
  if not has_table_privilege('anon','public.produtos_venda','SELECT')
     or not has_table_privilege('authenticated','public.produtos_venda','SELECT') then
    raise exception 'public_catalog_select_lost';
  end if;
  if not has_table_privilege('service_role','public.produtos_venda','INSERT')
     or not has_table_privilege('service_role','public.produtos_venda','UPDATE')
     or not has_table_privilege('service_role','public.produtos_venda','DELETE') then
    raise exception 'service_role_produtos_venda_write_lost';
  end if;
  if exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='produtos_venda'
      and lower(cmd) in ('all','insert','update','delete')
  ) then
    raise exception 'produtos_venda_write_policy_still_exists';
  end if;
end $$;

commit;

select jsonb_build_object(
  'phase','4G',
  'table','public.produtos_venda',
  'rls_enabled',(select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='produtos_venda'),
  'anon',jsonb_build_object(
    'select',has_table_privilege('anon','public.produtos_venda','SELECT'),
    'insert',has_table_privilege('anon','public.produtos_venda','INSERT'),
    'update',has_table_privilege('anon','public.produtos_venda','UPDATE'),
    'delete',has_table_privilege('anon','public.produtos_venda','DELETE')
  ),
  'authenticated',jsonb_build_object(
    'select',has_table_privilege('authenticated','public.produtos_venda','SELECT'),
    'insert',has_table_privilege('authenticated','public.produtos_venda','INSERT'),
    'update',has_table_privilege('authenticated','public.produtos_venda','UPDATE'),
    'delete',has_table_privilege('authenticated','public.produtos_venda','DELETE')
  ),
  'service_role',jsonb_build_object(
    'select',has_table_privilege('service_role','public.produtos_venda','SELECT'),
    'insert',has_table_privilege('service_role','public.produtos_venda','INSERT'),
    'update',has_table_privilege('service_role','public.produtos_venda','UPDATE'),
    'delete',has_table_privilege('service_role','public.produtos_venda','DELETE')
  ),
  'policies',(select coalesce(jsonb_agg(jsonb_build_object('name',policyname,'command',cmd,'roles',roles)),'[]'::jsonb) from pg_policies where schemaname='public' and tablename='produtos_venda')
) as phase4g_produtos_venda_dml_hardening_result;
