-- FuncionarIA — Fase 6: Idempotência / Zero-cost
-- Base esperada do repositório: 191d36b74d619d36a985538e86aaeac8ed7aacb8
-- Aplicar somente depois de verify_phase6.py + build PASS.
--
-- Objetivos:
--   1) nenhuma consulta externa inicia sem reserva financeira anterior;
--   2) retry da mesma operação não chama o provedor novamente;
--   3) payment_confirmed do navegador deixa de ser prova de pagamento;
--   4) PIX confirmado é vinculado a uma única operação/action/input;
--   5) o RPC legado debit_consulta_fee deixa de ser chamável pelo browser.

begin;

create table if not exists public.funcionaria_consulta_operations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null,
  action text not null,
  input_hash text not null,
  status text not null default 'preparing'
    check (status in ('preparing','awaiting_payment','processing','completed','failed','indeterminate')),
  payment_method text null
    check (payment_method is null or payment_method in ('credits','balance','pix')),
  amount_cents integer null check (amount_cents is null or amount_cents >= 0),
  usage_event_id uuid null references public.funcionaria_usage_events(id) on delete set null,
  payment_transaction_id uuid null references public.pix_transactions(id) on delete set null,
  result jsonb null,
  speech_text text null,
  error_code text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz null,
  unique (company_id, idempotency_key)
);

create unique index if not exists funcionaria_consulta_operations_payment_uq
  on public.funcionaria_consulta_operations(payment_transaction_id)
  where payment_transaction_id is not null;

create index if not exists funcionaria_consulta_operations_company_created_idx
  on public.funcionaria_consulta_operations(company_id, created_at desc);

alter table public.funcionaria_consulta_operations enable row level security;
revoke all on table public.funcionaria_consulta_operations from public, anon, authenticated;
grant all on table public.funcionaria_consulta_operations to service_role;

-- A tabela de vínculo PIX já usada pelo ConsultaTec passa a aceitar placa no
-- fluxo legado da FuncionarIA. Nenhum outro comportamento do ConsultaTec muda.
alter table public.consultatec_payment_requests
  drop constraint if exists consultatec_payment_requests_action_check;

alter table public.consultatec_payment_requests
  add constraint consultatec_payment_requests_action_check
  check (action = any (array[
    'dados_cpf'::text,
    'dados_cnpj'::text,
    'restricoes_cpf'::text,
    'restricoes_cnpj'::text,
    'consultar_protestos'::text,
    'completa_cpf'::text,
    'completa_cnpj'::text,
    'consultar_placa'::text
  ]));

create or replace function public.funcionaria_prepare_consulta(
  p_company_id uuid,
  p_action text,
  p_input_hash text,
  p_idempotency_key text,
  p_document_last4 text default '',
  p_payment_transaction_id uuid default null,
  p_allow_balance boolean default false,
  p_metadata jsonb default '{}'::jsonb,
  p_billing_mode text default 'legacy'
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_payment_pref text;
  v_amount integer;
  v_is_paid boolean := false;
  v_op public.funcionaria_consulta_operations%rowtype;
  v_inserted_id uuid;
  v_usage jsonb;
  v_available integer := 0;
  v_remaining integer := 0;
  v_take integer := 0;
  v_after integer := 0;
  v_row record;
  v_pix public.pix_transactions%rowtype;
  v_req public.consultatec_payment_requests%rowtype;
begin
  if p_company_id is null
     or p_billing_mode not in ('legacy','funcionaria_usage')
     or nullif(trim(p_action),'') is null
     or nullif(trim(p_input_hash),'') is null
     or nullif(trim(p_idempotency_key),'') is null then
    return jsonb_build_object('ok',false,'reason','invalid_request');
  end if;

  -- Valores legados preservados exatamente para não alterar preço nesta fase.
  v_amount := case p_action
    when 'consultar_placa' then 300
    when 'consultar_protestos' then 1000
    when 'restricoes_cpf' then 1500
    when 'restricoes_cnpj' then 2000
    when 'dados_cpf' then 300
    when 'dados_cnpj' then 300
    when 'completa_cpf' then 2800
    else null
  end;
  v_is_paid := v_amount is not null;

  if p_action not in (
    'consultar_cambio','consultar_cep','consultar_cnpj','consultar_cpf',
    'consultar_feriados','consultar_ddd',
    'consultar_placa','consultar_protestos','restricoes_cpf','restricoes_cnpj',
    'dados_cpf','dados_cnpj','completa_cpf'
  ) then
    return jsonb_build_object('ok',false,'reason','invalid_action');
  end if;

  select c.user_id, coalesce(c.consultas_payment_method,'balance')
    into v_user_id, v_payment_pref
  from public.companies c
  where c.id=p_company_id and c.is_active=true;

  if v_user_id is null then
    return jsonb_build_object('ok',false,'reason','company_not_found');
  end if;

  insert into public.funcionaria_consulta_operations(
    company_id,user_id,idempotency_key,action,input_hash,status,amount_cents,metadata
  ) values (
    p_company_id,v_user_id,left(p_idempotency_key,180),p_action,p_input_hash,
    'preparing',coalesce(v_amount,0),coalesce(p_metadata,'{}'::jsonb)
  )
  on conflict (company_id,idempotency_key) do nothing
  returning id into v_inserted_id;

  select * into v_op
  from public.funcionaria_consulta_operations
  where company_id=p_company_id and idempotency_key=left(p_idempotency_key,180)
  for update;

  if not found then
    return jsonb_build_object('ok',false,'reason','operation_create_failed');
  end if;

  if v_op.action <> p_action or v_op.input_hash <> p_input_hash then
    return jsonb_build_object('ok',false,'reason','idempotency_conflict','operation_id',v_op.id);
  end if;

  if v_inserted_id is null then
    if v_op.status='completed' then
      return jsonb_build_object(
        'ok',true,'duplicate',true,'cached',true,'operation_id',v_op.id,
        'result',v_op.result,'speech_text',v_op.speech_text,
        'payment_method',v_op.payment_method,'amount_cents',v_op.amount_cents
      );
    elsif v_op.status in ('preparing','processing') then
      return jsonb_build_object(
        'ok',false,'duplicate',true,'reason','operation_in_progress',
        'operation_id',v_op.id,'status',v_op.status
      );
    elsif v_op.status in ('failed','indeterminate') then
      return jsonb_build_object(
        'ok',false,'duplicate',true,'reason','previous_operation_' || v_op.status,
        'operation_id',v_op.id
      );
    elsif v_op.status='awaiting_payment' and p_payment_transaction_id is null and not p_allow_balance then
      return jsonb_build_object(
        'ok',false,'duplicate',true,'requires_payment',true,'reason','payment_required',
        'operation_id',v_op.id,'amount_cents',v_op.amount_cents
      );
    end if;
    -- awaiting_payment pode continuar quando a Edge encontrou um PIX confirmado
    -- ou quando um chamador confiável pediu para reavaliar saldo.
  end if;

  -- FuncionarIA Meta: toda consulta externa usa a tarifa única paid_lookup.
  -- O contexto só é aceito pela Edge quando a chamada chega com service_role.
  if p_billing_mode='funcionaria_usage' then
    select public.funcionaria_consume_usage(
      p_company_id,
      'paid_lookup',
      1,
      'funcionaria_meta_consulta',
      'meta',
      'consulta:' || v_op.id::text,
      jsonb_build_object(
        'phase','6','operation_id',v_op.id,'action',p_action,
        'billing_mode','funcionaria_usage_prepaid'
      ) || coalesce(p_metadata,'{}'::jsonb)
    ) into v_usage;

    if not coalesce((v_usage->>'ok')::boolean,false) then
      -- Nenhum provedor/reserva foi iniciado: remove o ledger para permitir
      -- nova tentativa após recarga de créditos sem furar idempotência.
      delete from public.funcionaria_consulta_operations where id=v_op.id;
      return coalesce(v_usage,'{}'::jsonb)
        || jsonb_build_object('ok',false,'operation_id',v_op.id);
    end if;

    update public.funcionaria_consulta_operations
       set status='processing',payment_method='credits',
           usage_event_id=(v_usage->>'usage_event_id')::uuid,
           metadata=metadata || jsonb_build_object('billing_mode','funcionaria_usage'),
           updated_at=now()
     where id=v_op.id;

    return jsonb_build_object(
      'ok',true,'duplicate',false,'operation_id',v_op.id,
      'payment_method','credits','billing_mode','funcionaria_usage',
      'credits_consumed',coalesce((v_usage->>'credits_consumed')::integer,0)
    );
  end if;

  -- Consulta gratuita legada/web: reserva 2 créditos ANTES do primeiro fetch externo.
  if not v_is_paid then
    select public.funcionaria_consume_usage(
      p_company_id,
      'external_request',
      2,
      'funcionaria_consulta',
      'consulta',
      'consulta:' || v_op.id::text,
      jsonb_build_object(
        'phase','6','operation_id',v_op.id,'action',p_action,
        'billing_mode','prepaid_reservation'
      ) || coalesce(p_metadata,'{}'::jsonb)
    ) into v_usage;

    if not coalesce((v_usage->>'ok')::boolean,false) then
      -- Nenhum provedor/reserva foi iniciado: remove o ledger para permitir
      -- nova tentativa após recarga de créditos sem furar idempotência.
      delete from public.funcionaria_consulta_operations where id=v_op.id;
      return coalesce(v_usage,'{}'::jsonb)
        || jsonb_build_object('ok',false,'operation_id',v_op.id);
    end if;

    update public.funcionaria_consulta_operations
       set status='processing',payment_method='credits',
           usage_event_id=(v_usage->>'usage_event_id')::uuid,updated_at=now()
     where id=v_op.id;

    return jsonb_build_object(
      'ok',true,'duplicate',false,'operation_id',v_op.id,
      'payment_method','credits',
      'credits_consumed',coalesce((v_usage->>'credits_consumed')::integer,0)
    );
  end if;

  -- PIX: somente uma transação realmente confirmada e de valor exato pode ser
  -- vinculada. O booleano payment_confirmed do browser não chega a este RPC.
  if p_payment_transaction_id is not null then
    select * into v_pix
    from public.pix_transactions
    where id=p_payment_transaction_id
      and company_id=p_company_id
      and purpose='consulta_fee'
      and status='confirmed'
      and amount_cents=v_amount
    for update;

    if not found then
      update public.funcionaria_consulta_operations
         set status='awaiting_payment',payment_method='pix',updated_at=now()
       where id=v_op.id;
      return jsonb_build_object(
        'ok',false,'requires_payment',true,'reason','payment_not_confirmed',
        'operation_id',v_op.id,'amount_cents',v_amount
      );
    end if;

    insert into public.consultatec_payment_requests(
      transaction_id,company_id,action,document_hash,document_last4,
      amount_cents,status,metadata,confirmed_at
    ) values (
      v_pix.id,p_company_id,p_action,p_input_hash,left(coalesce(p_document_last4,''),16),
      v_amount,'confirmed',
      jsonb_build_object('source','funcionaria_phase6','operation_id',v_op.id)
        || coalesce(p_metadata,'{}'::jsonb),
      coalesce(v_pix.confirmed_at,now())
    )
    on conflict (transaction_id) do nothing;

    select * into v_req
    from public.consultatec_payment_requests
    where transaction_id=v_pix.id
    for update;

    if not found
       or v_req.company_id<>p_company_id
       or v_req.action<>p_action
       or v_req.document_hash<>p_input_hash
       or v_req.amount_cents<>v_amount then
      update public.funcionaria_consulta_operations
         set status='failed',error_code='payment_binding_mismatch',updated_at=now()
       where id=v_op.id;
      return jsonb_build_object('ok',false,'reason','payment_binding_mismatch','operation_id',v_op.id);
    end if;

    if v_req.status in ('processing','consumed') then
      update public.funcionaria_consulta_operations
         set status='failed',error_code='payment_already_used',updated_at=now()
       where id=v_op.id;
      return jsonb_build_object('ok',false,'reason','payment_already_used','operation_id',v_op.id);
    end if;

    update public.consultatec_payment_requests
       set status='processing',updated_at=now()
     where transaction_id=v_pix.id and status='confirmed';

    if not found then
      update public.funcionaria_consulta_operations
         set status='failed',error_code='payment_reservation_failed',updated_at=now()
       where id=v_op.id;
      return jsonb_build_object('ok',false,'reason','payment_reservation_failed','operation_id',v_op.id);
    end if;

    begin
      update public.funcionaria_consulta_operations
         set status='processing',payment_method='pix',payment_transaction_id=v_pix.id,updated_at=now()
       where id=v_op.id;
    exception when unique_violation then
      update public.consultatec_payment_requests
         set status='confirmed',updated_at=now()
       where transaction_id=v_pix.id and status='processing';
      update public.funcionaria_consulta_operations
         set status='failed',error_code='payment_already_bound',updated_at=now()
       where id=v_op.id;
      return jsonb_build_object('ok',false,'reason','payment_already_bound','operation_id',v_op.id);
    end;

    return jsonb_build_object(
      'ok',true,'duplicate',false,'operation_id',v_op.id,
      'payment_method','pix','amount_cents',v_amount
    );
  end if;

  -- Visitante público nunca escolhe gastar o saldo interno da empresa.
  -- service_role / dono / admin autorizado é que passa p_allow_balance=true.
  if not p_allow_balance or v_payment_pref='pix' then
    update public.funcionaria_consulta_operations
       set status='awaiting_payment',payment_method='pix',updated_at=now()
     where id=v_op.id;
    return jsonb_build_object(
      'ok',false,'requires_payment',true,'reason','payment_required',
      'operation_id',v_op.id,'amount_cents',v_amount
    );
  end if;

  -- Saldo compartilhado por usuário: reserva atômica ANTES do provedor.
  perform pg_advisory_xact_lock(hashtextextended('minai_wallet:' || v_user_id::text,0));

  perform cb.company_id
  from public.company_balance cb
  join public.companies c on c.id=cb.company_id
  where c.user_id=v_user_id
  order by cb.company_id
  for update of cb;

  select coalesce(sum(cb.available_balance_cents),0)::integer into v_available
  from public.company_balance cb
  join public.companies c on c.id=cb.company_id
  where c.user_id=v_user_id;

  if v_available < v_amount then
    update public.funcionaria_consulta_operations
       set status='awaiting_payment',payment_method='pix',updated_at=now()
     where id=v_op.id;
    return jsonb_build_object(
      'ok',false,'requires_payment',true,'reason','insufficient_balance',
      'operation_id',v_op.id,'amount_cents',v_amount,'available_cents',v_available
    );
  end if;

  v_remaining := v_amount;
  for v_row in
    select cb.company_id, cb.available_balance_cents
    from public.company_balance cb
    join public.companies c on c.id=cb.company_id
    where c.user_id=v_user_id and cb.available_balance_cents>0
    order by (cb.company_id=p_company_id) desc, cb.created_at asc nulls last, cb.company_id
  loop
    exit when v_remaining<=0;
    v_take := least(v_row.available_balance_cents,v_remaining);
    v_after := v_row.available_balance_cents-v_take;

    update public.company_balance
       set available_balance_cents=v_after,last_transaction_at=now(),updated_at=now()
     where company_id=v_row.company_id;

    insert into public.balance_transactions(
      company_id,user_id,transaction_type,amount_cents,
      balance_before_cents,balance_after_cents,description,metadata
    ) values (
      v_row.company_id,v_user_id,'consulta_fee',-v_take,
      v_row.available_balance_cents,v_after,
      'FuncionarIA consulta: ' || p_action,
      jsonb_build_object(
        'source','funcionaria_phase6','phase6_operation_id',v_op.id,
        'consultation_company_id',p_company_id,'action',p_action,
        'input_hash',p_input_hash,'refunded',false
      ) || coalesce(p_metadata,'{}'::jsonb)
    );

    v_remaining := v_remaining-v_take;
  end loop;

  update public.funcionaria_consulta_operations
     set status='processing',payment_method='balance',amount_cents=v_amount,updated_at=now(),
         metadata=metadata || jsonb_build_object(
           'balance_before_cents',v_available,
           'balance_after_cents',v_available-v_amount
         )
   where id=v_op.id;

  return jsonb_build_object(
    'ok',true,'duplicate',false,'operation_id',v_op.id,
    'payment_method','balance','amount_cents',v_amount,
    'balance_after_cents',v_available-v_amount
  );
end;
$$;

create or replace function public.funcionaria_complete_consulta(
  p_operation_id uuid,
  p_result jsonb,
  p_speech_text text,
  p_metadata jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_op public.funcionaria_consulta_operations%rowtype;
begin
  select * into v_op
  from public.funcionaria_consulta_operations
  where id=p_operation_id
  for update;

  if not found then return jsonb_build_object('ok',false,'reason','operation_not_found'); end if;
  if v_op.status='completed' then
    return jsonb_build_object(
      'ok',true,'duplicate',true,'cached',true,
      'result',v_op.result,'speech_text',v_op.speech_text
    );
  end if;
  if v_op.status<>'processing' then
    return jsonb_build_object('ok',false,'reason','operation_not_processing','status',v_op.status);
  end if;

  update public.funcionaria_consulta_operations
     set status='completed',result=p_result,speech_text=p_speech_text,error_code=null,
         metadata=metadata || coalesce(p_metadata,'{}'::jsonb),
         completed_at=now(),updated_at=now()
   where id=p_operation_id;

  if v_op.payment_method='pix' and v_op.payment_transaction_id is not null then
    update public.consultatec_payment_requests
       set status='consumed',consumed_at=now(),updated_at=now()
     where transaction_id=v_op.payment_transaction_id and status='processing';
  end if;

  return jsonb_build_object('ok',true,'duplicate',false,'operation_id',p_operation_id);
end;
$$;

-- Se um fetch externo já começou e o resultado ficou incerto, NÃO estornamos e
-- NÃO permitimos retry automático da mesma operação. Isso evita custo duplicado.
create or replace function public.funcionaria_mark_consulta_indeterminate(
  p_operation_id uuid,
  p_reason text,
  p_metadata jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status text;
begin
  select status into v_status
  from public.funcionaria_consulta_operations
  where id=p_operation_id
  for update;

  if not found then return jsonb_build_object('ok',false,'reason','operation_not_found'); end if;
  if v_status='completed' then return jsonb_build_object('ok',false,'reason','operation_already_completed'); end if;
  if v_status='indeterminate' then return jsonb_build_object('ok',true,'duplicate',true); end if;
  if v_status<>'processing' then return jsonb_build_object('ok',false,'reason','operation_not_processing','status',v_status); end if;

  update public.funcionaria_consulta_operations
     set status='indeterminate',
         error_code=left(coalesce(p_reason,'provider_result_indeterminate'),120),
         metadata=metadata || coalesce(p_metadata,'{}'::jsonb),
         updated_at=now()
   where id=p_operation_id;

  return jsonb_build_object('ok',true,'operation_id',p_operation_id,'status','indeterminate');
end;
$$;

-- Falha comprovadamente anterior ao provedor: desfaz a reserva de forma
-- idempotente. A Edge da Fase 6 só chama esta função quando provider_started=false.
create or replace function public.funcionaria_fail_consulta(
  p_operation_id uuid,
  p_reason text,
  p_metadata jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_op public.funcionaria_consulta_operations%rowtype;
  v_refund jsonb;
  v_orig record;
  v_balance integer;
  v_after integer;
  v_refunded integer := 0;
begin
  select * into v_op
  from public.funcionaria_consulta_operations
  where id=p_operation_id
  for update;

  if not found then return jsonb_build_object('ok',false,'reason','operation_not_found'); end if;
  if v_op.status='completed' then return jsonb_build_object('ok',false,'reason','operation_already_completed'); end if;
  if v_op.status='failed' then return jsonb_build_object('ok',true,'duplicate',true,'already_failed',true); end if;
  if v_op.status='indeterminate' then return jsonb_build_object('ok',false,'reason','operation_indeterminate'); end if;

  if v_op.payment_method='credits' and v_op.usage_event_id is not null then
    select public.funcionaria_refund_usage(
      v_op.usage_event_id,
      coalesce(p_reason,'consulta_failed'),
      jsonb_build_object('phase','6','operation_id',v_op.id)
        || coalesce(p_metadata,'{}'::jsonb)
    ) into v_refund;

  elsif v_op.payment_method='balance' then
    perform pg_advisory_xact_lock(hashtextextended('minai_wallet:' || v_op.user_id::text,0));

    for v_orig in
      select *
      from public.balance_transactions
      where user_id=v_op.user_id
        and transaction_type='consulta_fee'
        and metadata->>'source'='funcionaria_phase6'
        and metadata->>'phase6_operation_id'=v_op.id::text
        and coalesce((metadata->>'refunded')::boolean,false)=false
      order by created_at,id
      for update
    loop
      select available_balance_cents into v_balance
      from public.company_balance
      where company_id=v_orig.company_id
      for update;
      if not found then continue; end if;

      v_after := coalesce(v_balance,0)+abs(v_orig.amount_cents);
      update public.company_balance
         set available_balance_cents=v_after,last_transaction_at=now(),updated_at=now()
       where company_id=v_orig.company_id;

      update public.balance_transactions
         set metadata=coalesce(metadata,'{}'::jsonb)
           || jsonb_build_object(
             'refunded',true,'refund_reason',p_reason,'refunded_at',now()
           )
       where id=v_orig.id;

      insert into public.balance_transactions(
        company_id,user_id,transaction_type,amount_cents,
        balance_before_cents,balance_after_cents,description,metadata
      ) values (
        v_orig.company_id,v_op.user_id,'consulta_fee_estorno',abs(v_orig.amount_cents),
        v_balance,v_after,'Estorno FuncionarIA consulta',
        jsonb_build_object(
          'source','funcionaria_phase6','phase6_operation_id',v_op.id,
          'original_transaction_id',v_orig.id,'reason',p_reason
        )
      );

      v_refunded := v_refunded+abs(v_orig.amount_cents);
    end loop;

  elsif v_op.payment_method='pix' and v_op.payment_transaction_id is not null then
    update public.consultatec_payment_requests
       set status='confirmed',updated_at=now()
     where transaction_id=v_op.payment_transaction_id and status='processing';
  end if;

  update public.funcionaria_consulta_operations
     set status='failed',
         error_code=left(coalesce(p_reason,'consulta_failed'),120),
         metadata=metadata || coalesce(p_metadata,'{}'::jsonb)
           || case
                when payment_method='pix' and payment_transaction_id is not null
                  then jsonb_build_object('failed_payment_transaction_id',payment_transaction_id)
                else '{}'::jsonb
              end,
         payment_transaction_id=case when payment_method='pix' then null else payment_transaction_id end,
         updated_at=now()
   where id=v_op.id;

  return jsonb_build_object(
    'ok',true,'duplicate',false,'operation_id',v_op.id,
    'refunded_cents',v_refunded,'usage_refund',v_refund
  );
end;
$$;

revoke all on function public.funcionaria_prepare_consulta(uuid,text,text,text,text,uuid,boolean,jsonb,text) from public, anon, authenticated;
grant execute on function public.funcionaria_prepare_consulta(uuid,text,text,text,text,uuid,boolean,jsonb,text) to service_role;

revoke all on function public.funcionaria_complete_consulta(uuid,jsonb,text,jsonb) from public, anon, authenticated;
grant execute on function public.funcionaria_complete_consulta(uuid,jsonb,text,jsonb) to service_role;

revoke all on function public.funcionaria_mark_consulta_indeterminate(uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.funcionaria_mark_consulta_indeterminate(uuid,text,jsonb) to service_role;

revoke all on function public.funcionaria_fail_consulta(uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.funcionaria_fail_consulta(uuid,text,jsonb) to service_role;

-- Vulnerabilidade legada: recebia company/preço escolhidos pelo browser e não
-- validava o chamador. Nenhum arquivo da branch atual usa este RPC diretamente;
-- a Edge antiga o chama com service_role e continua funcionando até o deploy.
revoke all on function public.debit_consulta_fee(uuid,text,integer,jsonb) from public, anon, authenticated;
grant execute on function public.debit_consulta_fee(uuid,text,integer,jsonb) to service_role;

commit;
