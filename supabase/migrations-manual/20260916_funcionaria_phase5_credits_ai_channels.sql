-- FuncionarIA — Fase 5: créditos, IA e canais
-- Base esperada: c5287eb99a205c4fca95cd14d03dcdb0ca69d93e
-- Objetivos:
-- 1) permitir reserva antecipada + estorno idempotente de uso;
-- 2) impedir reaproveitamento gratuito de uma chave já estornada;
-- 3) endurecer privilégios estruturais do ledger de uso;
-- 4) manter leitura autenticada via RLS e execução sensível apenas por service_role.

begin;

-- Ledger: navegador nunca deve escrever diretamente.
revoke insert, update, delete, truncate, references, trigger
on table public.funcionaria_usage_events from anon, authenticated;
revoke select on table public.funcionaria_usage_events from anon;

grant select on table public.funcionaria_usage_events to authenticated;
grant select, insert, update, delete, truncate, references, trigger
on table public.funcionaria_usage_events to service_role;

-- Mantém a função de consumo como a operação atômica de reserva/débito.
-- Mudança principal: se uma chave idempotente já foi totalmente estornada,
-- uma repetição NÃO vira sucesso gratuito.
create or replace function public.funcionaria_consume_usage(
  p_company_id uuid,
  p_usage_key text,
  p_units numeric default 1,
  p_source text default null,
  p_channel text default null,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_user_id uuid;
  v_rate public.funcionaria_usage_rates%rowtype;
  v_units numeric := greatest(coalesce(p_units,1),0.001);
  v_required integer := 0;
  v_available integer := 0;
  v_balance_after integer := 0;
  v_existing public.funcionaria_usage_events%rowtype;
  v_was_refunded boolean := false;
begin
  if p_idempotency_key is not null then
    select * into v_existing
    from public.funcionaria_usage_events
    where idempotency_key=p_idempotency_key
    limit 1;

    if found then
      v_was_refunded := coalesce(v_existing.metadata->>'refunded','false') = 'true';
      if v_was_refunded then
        return jsonb_build_object(
          'ok',false,
          'duplicate',true,
          'reason','usage_previously_refunded',
          'usage_event_id',v_existing.id,
          'credits_consumed',v_existing.credits_consumed,
          'usage_key',v_existing.usage_key
        );
      end if;

      return jsonb_build_object(
        'ok',true,
        'duplicate',true,
        'usage_event_id',v_existing.id,
        'credits_consumed',v_existing.credits_consumed,
        'usage_key',v_existing.usage_key
      );
    end if;
  end if;

  select c.user_id into v_user_id
  from public.companies c
  where c.id=p_company_id and c.is_active=true;

  if v_user_id is null then
    return jsonb_build_object('ok',false,'reason','company_not_found');
  end if;

  select * into v_rate
  from public.funcionaria_usage_rates r
  where r.usage_key=p_usage_key and r.is_active=true and r.pricing_status <> 'disabled';

  if not found then
    return jsonb_build_object('ok',false,'reason','usage_rate_unavailable','usage_key',p_usage_key);
  end if;

  v_required := ceil(v_units * v_rate.credits_per_unit)::integer;

  insert into public.user_credits(user_id,available_credits,total_purchased,total_used,created_at,updated_at)
  values(v_user_id,20,0,0,now(),now())
  on conflict (user_id) do nothing;

  select available_credits into v_available
  from public.user_credits
  where user_id=v_user_id
  for update;

  if v_required > 0 and v_available < v_required then
    return jsonb_build_object(
      'ok',false,
      'reason','insufficient_credits',
      'usage_key',p_usage_key,
      'credits_required',v_required,
      'available_credits',v_available
    );
  end if;

  v_balance_after := v_available - v_required;

  if v_required > 0 then
    update public.user_credits
       set available_credits=v_balance_after,
           total_used=total_used+v_required,
           last_interaction_at=now(),
           updated_at=now()
     where user_id=v_user_id;

    insert into public.credit_transactions(
      user_id,company_id,transaction_type,amount,balance_after,notes,created_at
    ) values (
      v_user_id,p_company_id,'usage',-v_required,v_balance_after,
      'FuncionarIA: ' || v_rate.label,now()
    );
  end if;

  insert into public.funcionaria_usage_events(
    company_id,user_id,usage_key,units,credits_consumed,source,channel,provider,idempotency_key,metadata
  ) values (
    p_company_id,v_user_id,p_usage_key,v_units,v_required,p_source,p_channel,v_rate.provider,p_idempotency_key,coalesce(p_metadata,'{}'::jsonb)
  )
  returning id into v_existing.id;

  return jsonb_build_object(
    'ok',true,
    'duplicate',false,
    'usage_event_id',v_existing.id,
    'usage_key',p_usage_key,
    'units',v_units,
    'credits_consumed',v_required,
    'balance_after',v_balance_after,
    'pricing_status',v_rate.pricing_status
  );
exception
  when unique_violation then
    if p_idempotency_key is not null then
      select * into v_existing
      from public.funcionaria_usage_events
      where idempotency_key=p_idempotency_key
      limit 1;

      if coalesce(v_existing.metadata->>'refunded','false') = 'true' then
        return jsonb_build_object(
          'ok',false,
          'duplicate',true,
          'reason','usage_previously_refunded',
          'usage_event_id',v_existing.id,
          'credits_consumed',v_existing.credits_consumed,
          'usage_key',v_existing.usage_key
        );
      end if;

      return jsonb_build_object(
        'ok',true,
        'duplicate',true,
        'usage_event_id',v_existing.id,
        'credits_consumed',v_existing.credits_consumed,
        'usage_key',v_existing.usage_key
      );
    end if;
    raise;
end;
$function$;

-- Estorno completo e idempotente de uma reserva/débito anterior.
-- O evento permanece no ledger para auditoria, mas credits_consumed vira 0;
-- o valor original fica registrado em metadata.original_credits_consumed.
create or replace function public.funcionaria_refund_usage(
  p_usage_event_id uuid,
  p_reason text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_event public.funcionaria_usage_events%rowtype;
  v_refund integer := 0;
  v_balance_after integer := 0;
  v_original integer := 0;
begin
  select * into v_event
  from public.funcionaria_usage_events
  where id=p_usage_event_id
  for update;

  if not found then
    return jsonb_build_object('ok',false,'reason','usage_event_not_found');
  end if;

  if coalesce(v_event.metadata->>'refunded','false') = 'true' then
    v_original := coalesce((v_event.metadata->>'original_credits_consumed')::integer,0);
    select coalesce(available_credits,0) into v_balance_after
    from public.user_credits where user_id=v_event.user_id;

    return jsonb_build_object(
      'ok',true,
      'duplicate',true,
      'usage_event_id',v_event.id,
      'credits_refunded',v_original,
      'balance_after',coalesce(v_balance_after,0)
    );
  end if;

  v_refund := greatest(coalesce(v_event.credits_consumed,0),0);

  insert into public.user_credits(user_id,available_credits,total_purchased,total_used,created_at,updated_at)
  values(v_event.user_id,0,0,0,now(),now())
  on conflict (user_id) do nothing;

  select available_credits into v_balance_after
  from public.user_credits
  where user_id=v_event.user_id
  for update;

  if v_refund > 0 then
    update public.user_credits
       set available_credits=available_credits+v_refund,
           total_used=greatest(total_used-v_refund,0),
           updated_at=now()
     where user_id=v_event.user_id
     returning available_credits into v_balance_after;

    insert into public.credit_transactions(
      user_id,company_id,transaction_type,amount,balance_after,notes,created_at
    ) values (
      v_event.user_id,
      v_event.company_id,
      'refund',
      v_refund,
      v_balance_after,
      'FuncionarIA estorno: ' || coalesce(nullif(left(p_reason,180),''),'provider_not_consumed'),
      now()
    );
  end if;

  update public.funcionaria_usage_events
     set credits_consumed=0,
         metadata=coalesce(metadata,'{}'::jsonb)
           || jsonb_build_object(
                'refunded',true,
                'refunded_at',now(),
                'refund_reason',coalesce(nullif(left(p_reason,180),''),'provider_not_consumed'),
                'original_credits_consumed',v_refund
              )
           || case when coalesce(p_metadata,'{}'::jsonb)='{}'::jsonb
                   then '{}'::jsonb
                   else jsonb_build_object('refund_metadata',p_metadata)
              end
   where id=v_event.id;

  return jsonb_build_object(
    'ok',true,
    'duplicate',false,
    'usage_event_id',v_event.id,
    'credits_refunded',v_refund,
    'balance_after',coalesce(v_balance_after,0)
  );
end;
$function$;

revoke all on function public.funcionaria_consume_usage(uuid,text,numeric,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.funcionaria_consume_usage(uuid,text,numeric,text,text,text,jsonb) to service_role;

revoke all on function public.funcionaria_refund_usage(uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.funcionaria_refund_usage(uuid,text,jsonb) to service_role;

comment on function public.funcionaria_refund_usage(uuid,text,jsonb)
is 'Fase 5 FuncionarIA: estorno idempotente de reserva/débito quando o provedor não consumiu o serviço.';

commit;
