-- minhAi / FuncionarIA — Fase 4E8
-- Hardening DML de public.pedidos e public.pedido_itens.
--
-- PRÉ-CONDIÇÃO OBRIGATÓRIA:
--   node scripts/verify-funcionaria-phase4e-browser-writes.mjs --build
-- deve terminar em PASS e reportar Browser DML = 0.
--
-- Escopo desta migration:
--   - remove INSERT/UPDATE/DELETE/TRUNCATE/TRIGGER/REFERENCES de public/anon/authenticated;
--   - remove policies públicas/de authenticated que autorizam escrita;
--   - preserva SELECT atual para não misturar hardening de leitura nesta fase;
--   - preserva service_role DML;
--   - NÃO altera funções SECURITY DEFINER existentes.
--
-- Observação importante:
--   policies SELECT amplas (inclusive anon_read_own_pedido com OR true) ficam para
--   uma fase separada de hardening de leitura, porque há vários consumidores browser.

begin;

do $$
declare
  v_pedidos regclass := to_regclass('public.pedidos');
  v_itens regclass := to_regclass('public.pedido_itens');
begin
  if v_pedidos is null or v_itens is null then
    raise exception '4E8 abortada: pedidos/pedido_itens não existem';
  end if;

  if not has_table_privilege('service_role', v_pedidos, 'SELECT')
     or not has_table_privilege('service_role', v_pedidos, 'INSERT')
     or not has_table_privilege('service_role', v_pedidos, 'UPDATE')
     or not has_table_privilege('service_role', v_pedidos, 'DELETE') then
    raise exception '4E8 abortada: service_role sem DML esperado em pedidos';
  end if;

  if not has_table_privilege('service_role', v_itens, 'SELECT')
     or not has_table_privilege('service_role', v_itens, 'INSERT')
     or not has_table_privilege('service_role', v_itens, 'UPDATE')
     or not has_table_privilege('service_role', v_itens, 'DELETE') then
    raise exception '4E8 abortada: service_role sem DML esperado em pedido_itens';
  end if;
end
$$;

-- Grants: browser fica somente com SELECT nessas tabelas.
revoke insert, update, delete, truncate, trigger, references
on table public.pedidos, public.pedido_itens
from public, anon, authenticated;

grant select on table public.pedidos, public.pedido_itens
to anon, authenticated;

grant select, insert, update, delete, truncate, trigger, references
on table public.pedidos, public.pedido_itens
to service_role;

-- Policies explícitas de escrita em pedido_itens.
drop policy if exists anon_insert_pedido_itens on public.pedido_itens;
drop policy if exists public_insert on public.pedido_itens;

-- A antiga ALL permitia DML a admins. O runtime novo grava via servidor/service_role.
-- Mantemos apenas o recorte SELECT equivalente para não alterar leitura administrativa.
drop policy if exists auth_manage_pedido_itens on public.pedido_itens;
drop policy if exists auth_select_company_pedido_itens on public.pedido_itens;
create policy auth_select_company_pedido_itens
on public.pedido_itens
for select
to authenticated
using (
  pedido_id in (
    select p.id
    from public.pedidos p
    join public.company_admins ca on ca.company_id = p.company_id
    where ca.user_id = auth.uid()
  )
);

-- Policies explícitas de escrita em pedidos.
drop policy if exists anon_insert_pedidos on public.pedidos;
drop policy if exists public_insert_by_company on public.pedidos;
drop policy if exists public_update_by_company on public.pedidos;

-- A antiga ALL permitia DML a admins. Preserva apenas SELECT equivalente.
drop policy if exists auth_manage_pedidos on public.pedidos;
drop policy if exists auth_select_company_pedidos on public.pedidos;
create policy auth_select_company_pedidos
on public.pedidos
for select
to authenticated
using (
  company_id in (
    select company_admins.company_id
    from public.company_admins
    where company_admins.user_id = auth.uid()
  )
);

do $$
declare
  v_table regclass;
  v_role text;
  v_write_policies integer;
begin
  foreach v_table in array array['public.pedidos'::regclass, 'public.pedido_itens'::regclass]
  loop
    foreach v_role in array array['anon','authenticated']
    loop
      if has_table_privilege(v_role, v_table, 'INSERT')
         or has_table_privilege(v_role, v_table, 'UPDATE')
         or has_table_privilege(v_role, v_table, 'DELETE')
         or has_table_privilege(v_role, v_table, 'TRUNCATE')
         or has_table_privilege(v_role, v_table, 'TRIGGER')
         or has_table_privilege(v_role, v_table, 'REFERENCES') then
        raise exception '4E8 falhou: % ainda possui DML/estrutura em %', v_role, v_table;
      end if;

      if not has_table_privilege(v_role, v_table, 'SELECT') then
        raise exception '4E8 falhou: % perdeu SELECT em %', v_role, v_table;
      end if;
    end loop;

    if not has_table_privilege('service_role', v_table, 'SELECT')
       or not has_table_privilege('service_role', v_table, 'INSERT')
       or not has_table_privilege('service_role', v_table, 'UPDATE')
       or not has_table_privilege('service_role', v_table, 'DELETE') then
      raise exception '4E8 falhou: service_role perdeu DML em %', v_table;
    end if;

    select count(*)
      into v_write_policies
    from pg_policy
    where polrelid = v_table
      and polcmd in ('a','w','d','*');

    if v_write_policies <> 0 then
      raise exception '4E8 falhou: ainda existem % policies de escrita em %', v_write_policies, v_table;
    end if;
  end loop;
end
$$;

commit;

with tbl as (
  select c.oid,
         c.relname as table_name,
         c.relrowsecurity as rls_enabled,
         jsonb_build_object(
           'anon', jsonb_build_object(
             'select', has_table_privilege('anon', c.oid, 'SELECT'),
             'insert', has_table_privilege('anon', c.oid, 'INSERT'),
             'update', has_table_privilege('anon', c.oid, 'UPDATE'),
             'delete', has_table_privilege('anon', c.oid, 'DELETE'),
             'truncate', has_table_privilege('anon', c.oid, 'TRUNCATE'),
             'trigger', has_table_privilege('anon', c.oid, 'TRIGGER'),
             'references', has_table_privilege('anon', c.oid, 'REFERENCES')
           ),
           'authenticated', jsonb_build_object(
             'select', has_table_privilege('authenticated', c.oid, 'SELECT'),
             'insert', has_table_privilege('authenticated', c.oid, 'INSERT'),
             'update', has_table_privilege('authenticated', c.oid, 'UPDATE'),
             'delete', has_table_privilege('authenticated', c.oid, 'DELETE'),
             'truncate', has_table_privilege('authenticated', c.oid, 'TRUNCATE'),
             'trigger', has_table_privilege('authenticated', c.oid, 'TRIGGER'),
             'references', has_table_privilege('authenticated', c.oid, 'REFERENCES')
           ),
           'service_role', jsonb_build_object(
             'select', has_table_privilege('service_role', c.oid, 'SELECT'),
             'insert', has_table_privilege('service_role', c.oid, 'INSERT'),
             'update', has_table_privilege('service_role', c.oid, 'UPDATE'),
             'delete', has_table_privilege('service_role', c.oid, 'DELETE')
           )
         ) as grants
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in ('pedidos','pedido_itens')
), policies as (
  select p.polrelid,
         coalesce(jsonb_agg(jsonb_build_object(
           'name', p.polname,
           'command', case p.polcmd when 'r' then 'select' when 'a' then 'insert' when 'w' then 'update' when 'd' then 'delete' when '*' then 'all' else p.polcmd::text end,
           'roles', (select jsonb_agg(r.rolname) from pg_roles r where r.oid = any(p.polroles))
         ) order by p.polname), '[]'::jsonb) as value
  from pg_policy p
  where p.polrelid in ('public.pedidos'::regclass, 'public.pedido_itens'::regclass)
  group by p.polrelid
)
select jsonb_pretty(jsonb_build_object(
  'tables', coalesce(jsonb_agg(jsonb_build_object(
    'table', t.table_name,
    'rls_enabled', t.rls_enabled,
    'grants', t.grants,
    'policies', coalesce(p.value, '[]'::jsonb)
  ) order by t.table_name), '[]'::jsonb),
  'expected', jsonb_build_object(
    'anon_authenticated', 'SELECT only; no table DML grants; no write policies',
    'service_role', 'SELECT/INSERT/UPDATE/DELETE preserved',
    'select_hardening', 'deferred; existing SELECT policies intentionally preserved'
  )
)) as phase4e_orders_dml_hardening_result
from tbl t
left join policies p on p.polrelid = t.oid;
