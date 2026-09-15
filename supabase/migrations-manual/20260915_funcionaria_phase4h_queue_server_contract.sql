-- FuncionarIA Phase 4H — queue server contract (ADDITIVE / safe before deploy)
-- Creates service-role-only RPCs used by /api/queue/public and /api/queue/manage.
-- This file DOES NOT revoke table DML yet.

begin;

create or replace function public.queue_generate_ticket_server(p_company_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_config public.fila_configs%rowtype;
  v_ticket public.fila_senhas%rowtype;
  v_today_start timestamptz;
  v_today_count integer := 0;
  v_next integer := 0;
  v_code text;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'queue_forbidden' using errcode = '42501';
  end if;

  if p_company_id is null then
    raise exception 'queue_not_available' using errcode = '22023';
  end if;

  select fc.*
    into v_config
  from public.fila_configs fc
  join public.companies c on c.id = fc.company_id
  where fc.company_id = p_company_id
    and c.is_active is distinct from false
  order by fc.created_at asc
  limit 1
  for update of fc;

  if not found then
    raise exception 'queue_not_available' using errcode = 'P0002';
  end if;

  if coalesce(v_config.fila_ativa, false) is not true then
    raise exception 'queue_paused' using errcode = 'P0001';
  end if;

  v_today_start := date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';

  select count(*)::integer
    into v_today_count
  from public.fila_senhas fs
  where fs.fila_config_id = v_config.id
    and fs.gerada_em >= v_today_start;

  if coalesce(v_config.max_senhas_dia, 0) > 0 and v_today_count >= v_config.max_senhas_dia then
    raise exception 'queue_daily_limit_reached' using errcode = '54000';
  end if;

  if coalesce(v_config.reiniciar_numeracao_diariamente, true) then
    select coalesce(max(fs.numero), 0)::integer
      into v_next
    from public.fila_senhas fs
    where fs.fila_config_id = v_config.id
      and fs.gerada_em >= v_today_start;
  else
    v_next := coalesce(v_config.ultimo_numero_gerado, 0);
  end if;

  v_next := v_next + 1;
  v_code := coalesce(nullif(trim(v_config.prefixo_senha), ''), 'A') || lpad(v_next::text, 3, '0');

  update public.fila_configs
  set ultimo_numero_gerado = v_next,
      updated_at = now()
  where id = v_config.id;

  insert into public.fila_senhas (
    company_id,
    fila_config_id,
    senha_completa,
    numero,
    prefixo,
    status
  ) values (
    p_company_id,
    v_config.id,
    v_code,
    v_next,
    coalesce(nullif(trim(v_config.prefixo_senha), ''), 'A'),
    'aguardando'
  )
  returning * into v_ticket;

  return jsonb_build_object(
    'ok', true,
    'ticket', to_jsonb(v_ticket),
    'tempo_medio_atendimento', coalesce(v_config.tempo_medio_atendimento, 10)
  );
end;
$$;

create or replace function public.queue_call_next_server(
  p_company_id uuid,
  p_attendente_profile_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ticket public.fila_senhas%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'queue_forbidden' using errcode = '42501';
  end if;

  if p_company_id is null then
    raise exception 'invalid_company_id' using errcode = '22023';
  end if;

  if p_attendente_profile_id is not null and not exists (
    select 1
    from public.company_profiles cp
    where cp.id = p_attendente_profile_id
      and cp.company_id = p_company_id
      and cp.is_active is distinct from false
  ) then
    raise exception 'invalid_attendant_profile' using errcode = '42501';
  end if;

  -- Preserve the management-panel behavior: calling the next ticket closes
  -- any previous active ticket first, preventing multiple active calls.
  update public.fila_senhas
  set status = 'finalizado',
      finalizada_em = coalesce(finalizada_em, now()),
      updated_at = now()
  where company_id = p_company_id
    and status in ('chamando', 'atendimento');

  select fs.*
    into v_ticket
  from public.fila_senhas fs
  where fs.company_id = p_company_id
    and fs.status = 'aguardando'
  order by fs.gerada_em asc
  for update skip locked
  limit 1;

  if not found then
    return jsonb_build_object('ok', true, 'ticket', null);
  end if;

  update public.fila_senhas
  set status = 'chamando',
      chamada_em = now(),
      atendente_profile_id = coalesce(p_attendente_profile_id, atendente_profile_id),
      updated_at = now()
  where id = v_ticket.id
  returning * into v_ticket;

  return jsonb_build_object('ok', true, 'ticket', to_jsonb(v_ticket));
end;
$$;

revoke all on function public.queue_generate_ticket_server(uuid) from public;
revoke all on function public.queue_generate_ticket_server(uuid) from anon;
revoke all on function public.queue_generate_ticket_server(uuid) from authenticated;
grant execute on function public.queue_generate_ticket_server(uuid) to service_role;

revoke all on function public.queue_call_next_server(uuid, uuid) from public;
revoke all on function public.queue_call_next_server(uuid, uuid) from anon;
revoke all on function public.queue_call_next_server(uuid, uuid) from authenticated;
grant execute on function public.queue_call_next_server(uuid, uuid) to service_role;

do $$
begin
  if has_function_privilege('anon', 'public.queue_generate_ticket_server(uuid)', 'EXECUTE') then
    raise exception '4H contract failed: anon can execute queue_generate_ticket_server';
  end if;
  if has_function_privilege('authenticated', 'public.queue_generate_ticket_server(uuid)', 'EXECUTE') then
    raise exception '4H contract failed: authenticated can execute queue_generate_ticket_server';
  end if;
  if not has_function_privilege('service_role', 'public.queue_generate_ticket_server(uuid)', 'EXECUTE') then
    raise exception '4H contract failed: service_role cannot execute queue_generate_ticket_server';
  end if;

  if has_function_privilege('anon', 'public.queue_call_next_server(uuid,uuid)', 'EXECUTE') then
    raise exception '4H contract failed: anon can execute queue_call_next_server';
  end if;
  if has_function_privilege('authenticated', 'public.queue_call_next_server(uuid,uuid)', 'EXECUTE') then
    raise exception '4H contract failed: authenticated can execute queue_call_next_server';
  end if;
  if not has_function_privilege('service_role', 'public.queue_call_next_server(uuid,uuid)', 'EXECUTE') then
    raise exception '4H contract failed: service_role cannot execute queue_call_next_server';
  end if;
end $$;

commit;

select jsonb_build_object(
  'phase', '4H-contract',
  'queue_generate_ticket_server', jsonb_build_object(
    'anon_execute', has_function_privilege('anon', 'public.queue_generate_ticket_server(uuid)', 'EXECUTE'),
    'authenticated_execute', has_function_privilege('authenticated', 'public.queue_generate_ticket_server(uuid)', 'EXECUTE'),
    'service_role_execute', has_function_privilege('service_role', 'public.queue_generate_ticket_server(uuid)', 'EXECUTE')
  ),
  'queue_call_next_server', jsonb_build_object(
    'anon_execute', has_function_privilege('anon', 'public.queue_call_next_server(uuid,uuid)', 'EXECUTE'),
    'authenticated_execute', has_function_privilege('authenticated', 'public.queue_call_next_server(uuid,uuid)', 'EXECUTE'),
    'service_role_execute', has_function_privilege('service_role', 'public.queue_call_next_server(uuid,uuid)', 'EXECUTE')
  )
) as phase4h_queue_server_contract_result;
