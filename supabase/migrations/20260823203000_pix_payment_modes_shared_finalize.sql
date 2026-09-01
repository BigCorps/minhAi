-- Pix Grátis inteligente + Mercado Pago lado a lado.
-- Compatibilidade: nenhuma empresa existente é migrada automaticamente.
-- Sem linha em pix_payment_preferences => mercadopago/fluxo legado.

alter table public.pix_payment_preferences
  add column if not exists allow_payer_choice boolean not null default false;

comment on column public.pix_payment_preferences.allow_payer_choice is
  'PixWiki: permite ao pagador escolher entre Pix Grátis e Pix Mercado Pago. Demais produtos mantêm false.';

create or replace function public.pix_payment_mode_settings(
  p_company_id uuid,
  p_product text
)
returns table(
  has_access boolean,
  can_write boolean,
  has_pix_key boolean,
  has_mp_connection boolean,
  current_mode text,
  merchant_city text,
  allow_payer_choice boolean
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_has_access boolean := false;
  v_can_write boolean := false;
  v_has_key boolean := false;
  v_has_mp boolean := false;
  v_mode text := 'mercadopago';
  v_city text := null;
  v_allow_choice boolean := false;
begin
  if p_product not in ('pixwiki','minhai','funcionaria') then
    return query select false, false, false, false, 'mercadopago'::text, null::text, false;
    return;
  end if;

  select c.user_id into v_user_id
  from public.companies c
  where c.id = p_company_id;

  if v_user_id is null then
    return query select false, false, false, false, 'mercadopago'::text, null::text, false;
    return;
  end if;

  v_has_access := auth.uid() = v_user_id
    or exists (
      select 1 from public.company_admins ca
      where ca.company_id = p_company_id
        and ca.user_id = auth.uid()
    );

  v_can_write := auth.uid() = v_user_id
    or exists (
      select 1 from public.company_admins ca
      where ca.company_id = p_company_id
        and ca.user_id = auth.uid()
        and ca.role in ('owner','manager')
    );

  if not v_has_access then
    return query select false, false, false, false, 'mercadopago'::text, null::text, false;
    return;
  end if;

  select
    coalesce(pp.mode, 'mercadopago'),
    pp.merchant_city,
    case when p_product = 'pixwiki' then coalesce(pp.allow_payer_choice, false) else false end
  into v_mode, v_city, v_allow_choice
  from (select 1) seed
  left join public.pix_payment_preferences pp
    on pp.company_id = p_company_id
   and pp.product = p_product;

  if p_product = 'pixwiki' then
    select
      coalesce(length(trim(ps.pix_key)) > 0, false),
      coalesce(
        ps.mp_connection_id is not null
        and exists (
          select 1
          from public.pixwiki_mp_connections pc
          where pc.id = ps.mp_connection_id
            and pc.company_id = p_company_id
            and pc.is_active = true
            and coalesce(trim(pc.mp_user_id), '') <> ''
        ),
        false
      )
    into v_has_key, v_has_mp
    from public.pixwiki_payment_settings ps
    where ps.company_id = p_company_id;
  else
    select coalesce(length(trim(coalesce(c.receiving_pix_key, ''))) > 0, false)
      into v_has_key
    from public.companies c
    where c.id = p_company_id;

    v_has_mp := exists (
      select 1
      from public.mp_connections mc
      where mc.user_id = v_user_id
        and mc.is_active = true
        and coalesce(trim(mc.mp_user_id), '') <> ''
    );
  end if;

  return query select
    true,
    v_can_write,
    coalesce(v_has_key,false),
    coalesce(v_has_mp,false),
    coalesce(v_mode,'mercadopago'),
    v_city,
    coalesce(v_allow_choice,false);
end;
$$;

revoke all on function public.pix_payment_mode_settings(uuid,text) from public, anon;
grant execute on function public.pix_payment_mode_settings(uuid,text) to authenticated, service_role;

create or replace function public.pix_payment_mode_set(
  p_company_id uuid,
  p_product text,
  p_mode text,
  p_merchant_city text default null,
  p_allow_payer_choice boolean default false
)
returns public.pix_payment_preferences
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_can_write boolean := false;
  v_has_key boolean := false;
  v_has_mp boolean := false;
  v_row public.pix_payment_preferences;
begin
  if p_product not in ('pixwiki','minhai','funcionaria') then
    raise exception 'invalid_pix_product';
  end if;

  if p_mode not in ('free','mercadopago') then
    raise exception 'invalid_pix_payment_mode';
  end if;

  select c.user_id into v_user_id
  from public.companies c
  where c.id = p_company_id;

  if v_user_id is null then
    raise exception 'company_not_found';
  end if;

  v_can_write := auth.uid() = v_user_id
    or exists (
      select 1 from public.company_admins ca
      where ca.company_id = p_company_id
        and ca.user_id = auth.uid()
        and ca.role in ('owner','manager')
    );

  if not v_can_write then
    raise exception 'forbidden';
  end if;

  if p_product = 'pixwiki' then
    select
      coalesce(length(trim(ps.pix_key)) > 0, false),
      coalesce(
        ps.mp_connection_id is not null
        and exists (
          select 1 from public.pixwiki_mp_connections pc
          where pc.id = ps.mp_connection_id
            and pc.company_id = p_company_id
            and pc.is_active = true
            and coalesce(trim(pc.mp_user_id), '') <> ''
        ),
        false
      )
    into v_has_key, v_has_mp
    from public.pixwiki_payment_settings ps
    where ps.company_id = p_company_id;
  else
    select coalesce(length(trim(coalesce(c.receiving_pix_key, ''))) > 0, false)
      into v_has_key
    from public.companies c
    where c.id = p_company_id;

    v_has_mp := exists (
      select 1 from public.mp_connections mc
      where mc.user_id = v_user_id
        and mc.is_active = true
        and coalesce(trim(mc.mp_user_id), '') <> ''
    );
  end if;

  -- O modo grátis depende da chave para montar o BR Code e da conexão MP
  -- somente para confirmar automaticamente o recebimento. Não alteramos
  -- clientes atuais: esta validação só ocorre no opt-in explícito para free.
  if p_mode = 'free' and not coalesce(v_has_key,false) then
    raise exception 'pix_key_required';
  end if;

  if p_mode = 'free' and not coalesce(v_has_mp,false) then
    raise exception 'mp_connection_required';
  end if;

  if p_mode = 'mercadopago' and not coalesce(v_has_mp,false) then
    raise exception 'mp_connection_required';
  end if;

  insert into public.pix_payment_preferences(
    company_id, product, mode, merchant_city, allow_payer_choice, created_at, updated_at
  ) values (
    p_company_id,
    p_product,
    p_mode,
    nullif(trim(coalesce(p_merchant_city,'')),''),
    case when p_product = 'pixwiki' then coalesce(p_allow_payer_choice,false) else false end,
    now(),
    now()
  )
  on conflict (company_id, product) do update
    set mode = excluded.mode,
        merchant_city = excluded.merchant_city,
        allow_payer_choice = excluded.allow_payer_choice,
        updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.pix_payment_mode_set(uuid,text,text,text,boolean) from public, anon;
grant execute on function public.pix_payment_mode_set(uuid,text,text,text,boolean) to authenticated, service_role;

-- Os helpers que podem reservar/confirmar recebimentos são estritamente internos.
revoke all on function public.pix_direct_reserve_intent(uuid,uuid,text,text,integer,text,text,text,text,integer,jsonb) from public, anon, authenticated;
revoke all on function public.pix_direct_match_receipt(uuid) from public, anon, authenticated;
revoke all on function public.pix_direct_claim_provider_payment(uuid,text,timestamptz,uuid,boolean) from public, anon, authenticated;
grant execute on function public.pix_direct_reserve_intent(uuid,uuid,text,text,integer,text,text,text,text,integer,jsonb) to service_role;
grant execute on function public.pix_direct_match_receipt(uuid) to service_role;
grant execute on function public.pix_direct_claim_provider_payment(uuid,text,timestamptz,uuid,boolean) to service_role;
