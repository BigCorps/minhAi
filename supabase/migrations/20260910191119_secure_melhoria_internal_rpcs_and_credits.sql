-- Segurança de créditos compartilhados.
-- Preserva estornos internos via service_role e impede usuário autenticado de
-- debitar empresa alheia ou usar valor negativo.

create or replace function public.cobrar_credito_se_suficiente(
  p_company_id uuid,
  p_function_key varchar,
  p_credits integer,
  p_metadata jsonb default null::jsonb
)
returns table(sucesso boolean, saldo_anterior integer, saldo_novo integer)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid;
  v_saldo integer;
  v_role text := coalesce(auth.role(), '');
  v_caller uuid := auth.uid();
begin
  if p_credits is null or p_credits = 0 then
    raise exception 'Quantidade de créditos inválida';
  end if;

  select user_id into v_user_id
  from public.companies
  where id = p_company_id;

  if v_user_id is null then
    raise exception 'Company sem user_id';
  end if;

  if v_role <> 'service_role' then
    if v_caller is null then
      raise exception 'Autenticação obrigatória';
    end if;
    if v_caller <> v_user_id then
      raise exception 'Empresa não pertence ao usuário autenticado';
    end if;
    if p_credits < 0 then
      raise exception 'Estorno permitido somente pelo backend';
    end if;
  end if;

  select available_credits into v_saldo
  from public.user_credits
  where user_id = v_user_id
  for update;

  if v_saldo is null or (p_credits > 0 and v_saldo < p_credits) then
    return query select false, coalesce(v_saldo, 0), coalesce(v_saldo, 0);
    return;
  end if;

  update public.user_credits
  set available_credits = v_saldo - p_credits,
      total_used = total_used + p_credits,
      last_interaction_at = now(),
      updated_at = now()
  where user_id = v_user_id;

  insert into public.assistant_function_logs
    (company_id, user_id, function_key, credits_consumed, executed_at, metadata)
  values
    (p_company_id, v_user_id, p_function_key, p_credits, now(), p_metadata);

  insert into public.credit_transactions
    (user_id, company_id, transaction_type, amount, balance_after, notes, created_at)
  values
    (v_user_id, p_company_id,
     case when p_credits < 0 then 'refund' else 'usage' end,
     -p_credits,
     v_saldo - p_credits,
     case when p_credits < 0 then 'Estorno: ' || p_function_key else 'Uso: ' || p_function_key end,
     now());

  return query select true, v_saldo, v_saldo - p_credits;
end;
$function$;

revoke all on function public.cobrar_credito_se_suficiente(uuid, varchar, integer, jsonb) from public;
revoke all on function public.cobrar_credito_se_suficiente(uuid, varchar, integer, jsonb) from anon;
grant execute on function public.cobrar_credito_se_suficiente(uuid, varchar, integer, jsonb) to authenticated, service_role;
