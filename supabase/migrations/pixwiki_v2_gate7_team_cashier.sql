-- PixWiki V2 - Gate 7
-- Equipe, convites, papéis e operação Caixa.
-- Dependências: Gates 1 a 6 aplicados em ordem.

begin;

-- -----------------------------------------------------------------------------
-- 1) Papel cashier (idempotente; Gate 1 já prepara isso)
-- -----------------------------------------------------------------------------
alter table public.company_admins drop constraint if exists company_admins_role_check;
alter table public.company_admins add constraint company_admins_role_check
  check (role in ('owner','manager','viewer','cashier'));

-- Para empresas PixWiki, alterações diretas em company_admins ficam bloqueadas.
-- O aceite usa RPC SECURITY DEFINER e a gestão usa a Edge Function Gate 7.
-- Para as demais empresas do repositório, preservamos o comportamento legado.
drop policy if exists company_admins_insert_authorized on public.company_admins;
create policy company_admins_insert_authorized
  on public.company_admins for insert to authenticated
  with check (
    not exists(
      select 1 from public.companies c
      where c.id=company_admins.company_id and c.segment_key='pix_wiki'
    )
    and public.app_can_manage_company(company_admins.company_id)
    and (
      company_admins.role<>'owner'
      or exists(select 1 from public.companies c where c.id=company_admins.company_id and c.user_id=auth.uid())
    )
  );

drop policy if exists company_admins_update_authorized on public.company_admins;
create policy company_admins_update_authorized
  on public.company_admins for update to authenticated
  using (
    not exists(
      select 1 from public.companies c
      where c.id=company_admins.company_id and c.segment_key='pix_wiki'
    )
    and public.app_can_manage_company(company_admins.company_id)
    and (
      company_admins.user_id<>(select c.user_id from public.companies c where c.id=company_admins.company_id)
      or auth.uid()=(select c.user_id from public.companies c where c.id=company_admins.company_id)
    )
  )
  with check (
    not exists(
      select 1 from public.companies c
      where c.id=company_admins.company_id and c.segment_key='pix_wiki'
    )
    and public.app_can_manage_company(company_admins.company_id)
    and (
      company_admins.role<>'owner'
      or exists(select 1 from public.companies c where c.id=company_admins.company_id and c.user_id=auth.uid())
    )
  );

drop policy if exists company_admins_delete_authorized on public.company_admins;
create policy company_admins_delete_authorized
  on public.company_admins for delete to authenticated
  using (
    not exists(
      select 1 from public.companies c
      where c.id=company_admins.company_id and c.segment_key='pix_wiki'
    )
    and public.app_can_manage_company(company_admins.company_id)
    and (
      company_admins.user_id<>(select c.user_id from public.companies c where c.id=company_admins.company_id)
      or auth.uid()=(select c.user_id from public.companies c where c.id=company_admins.company_id)
    )
  );

-- -----------------------------------------------------------------------------
-- 2) Convites de equipe. A autorização NÃO depende de user_metadata.
-- -----------------------------------------------------------------------------
create table if not exists public.pixwiki_v2_team_invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid references auth.users(id) on delete set null,
  email text not null,
  email_normalized text not null,
  role text not null check (role in ('manager','cashier')),
  status text not null default 'pending' check (status in ('pending','accepted','revoked','expired')),
  delivery_method text,
  delivery_error text,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (email_normalized = lower(trim(email)))
);

create unique index if not exists pixwiki_v2_team_invites_pending_email_uidx
  on public.pixwiki_v2_team_invites(company_id,email_normalized)
  where status='pending';
create index if not exists pixwiki_v2_team_invites_target_idx
  on public.pixwiki_v2_team_invites(target_user_id,status,expires_at);
create index if not exists pixwiki_v2_team_invites_company_idx
  on public.pixwiki_v2_team_invites(company_id,status,created_at desc);

alter table public.pixwiki_v2_team_invites enable row level security;
revoke all on public.pixwiki_v2_team_invites from public, anon, authenticated;
grant all on public.pixwiki_v2_team_invites to service_role;

-- -----------------------------------------------------------------------------
-- 3) Utilitários internos usados pela Edge Function de equipe.
-- -----------------------------------------------------------------------------
create or replace function public.pixwiki_v2_auth_user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path='auth','public','pg_temp'
as $$
  select u.id
  from auth.users u
  where lower(u.email)=lower(trim(p_email))
  order by u.created_at asc
  limit 1;
$$;
revoke all on function public.pixwiki_v2_auth_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.pixwiki_v2_auth_user_id_by_email(text) to service_role;

-- -----------------------------------------------------------------------------
-- 4) Contexto de acesso do usuário logado.
-- Usado no login para decidir: convite -> dashboard -> caixa.
-- -----------------------------------------------------------------------------
create or replace function public.pixwiki_v2_my_access_context()
returns jsonb
language plpgsql
stable
security definer
set search_path='public','auth','pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_management integer := 0;
  v_cashier integer := 0;
  v_pending integer := 0;
  v_cashier_company uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select lower(u.email) into v_email from auth.users u where u.id=v_uid;

  select count(*) into v_management
  from public.companies c
  left join public.company_admins ca on ca.company_id=c.id and ca.user_id=v_uid
  where c.segment_key='pix_wiki' and c.is_active=true
    and (c.user_id=v_uid or ca.role in ('owner','manager'));

  select count(*) into v_cashier
  from public.companies c
  join public.company_admins ca on ca.company_id=c.id and ca.user_id=v_uid and ca.role='cashier'
  where c.segment_key='pix_wiki' and c.is_active=true;

  select c.id into v_cashier_company
  from public.companies c
  join public.company_admins ca on ca.company_id=c.id and ca.user_id=v_uid and ca.role='cashier'
  where c.segment_key='pix_wiki' and c.is_active=true
  order by c.created_at,c.id
  limit 1;

  select count(*) into v_pending
  from public.pixwiki_v2_team_invites i
  where i.status='pending'
    and i.expires_at>now()
    and (
      i.target_user_id=v_uid
      or (v_email is not null and i.email_normalized=v_email)
    );

  return jsonb_build_object(
    'has_management',v_management>0,
    'management_count',v_management,
    'has_cashier',v_cashier>0,
    'cashier_count',v_cashier,
    'cashier_company_id',v_cashier_company,
    'pending_invites',v_pending
  );
end;
$$;
revoke all on function public.pixwiki_v2_my_access_context() from public, anon;
grant execute on function public.pixwiki_v2_my_access_context() to authenticated;

-- -----------------------------------------------------------------------------
-- 5) Empresas que owner/manager pode administrar na tela Equipe.
-- -----------------------------------------------------------------------------
create or replace function public.pixwiki_v2_team_manageable_companies()
returns table(id uuid,name text,slug text,logo_url text,role text)
language sql
stable
security definer
set search_path='public','auth','pg_temp'
as $$
  select c.id,c.name,c.slug,c.logo_url,
         case when c.user_id=auth.uid() then 'owner' else ca.role end::text as role
  from public.companies c
  left join public.company_admins ca on ca.company_id=c.id and ca.user_id=auth.uid()
  where auth.uid() is not null
    and c.segment_key='pix_wiki'
    and c.is_active=true
    and (c.user_id=auth.uid() or ca.role in ('owner','manager'))
  order by (c.user_id=auth.uid()) desc,c.created_at,c.id;
$$;
revoke all on function public.pixwiki_v2_team_manageable_companies() from public, anon;
grant execute on function public.pixwiki_v2_team_manageable_companies() to authenticated;

-- -----------------------------------------------------------------------------
-- 6) Lista de equipe + convites. Só owner/manager.
-- -----------------------------------------------------------------------------
create or replace function public.pixwiki_v2_team_list(p_company_id uuid)
returns table(
  row_kind text,
  user_id uuid,
  email text,
  role text,
  status text,
  created_at timestamptz,
  expires_at timestamptz,
  invite_id uuid,
  push_devices integer
)
language plpgsql
stable
security definer
set search_path='public','auth','pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_actor_role text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  v_actor_role := public.pixwiki_company_access_role(p_company_id);
  if v_actor_role not in ('owner','manager') then raise exception 'company_not_allowed'; end if;

  return query
  with company_row as (
    select c.id,c.user_id,c.created_at from public.companies c
    where c.id=p_company_id and c.segment_key='pix_wiki' and c.is_active=true
  ), active_members as (
    select 'member'::text row_kind,
           c.user_id,
           u.email::text,
           'owner'::text role,
           'active'::text status,
           c.created_at,
           null::timestamptz expires_at,
           null::uuid invite_id,
           (select count(*)::integer from public.pixwiki_push_subscriptions ps
             where ps.company_id=p_company_id and ps.user_id=c.user_id and ps.is_active=true) push_devices
      from company_row c
      join auth.users u on u.id=c.user_id
    union all
    select 'member'::text,
           ca.user_id,
           u.email::text,
           ca.role::text,
           'active'::text,
           ca.created_at,
           null::timestamptz,
           null::uuid,
           (select count(*)::integer from public.pixwiki_push_subscriptions ps
             where ps.company_id=p_company_id and ps.user_id=ca.user_id and ps.is_active=true)
      from public.company_admins ca
      join company_row c on c.id=ca.company_id
      join auth.users u on u.id=ca.user_id
     where ca.user_id<>c.user_id
  ), pending_invites as (
    select 'invite'::text,
           i.target_user_id,
           i.email::text,
           i.role::text,
           case when i.expires_at<=now() then 'expired' else 'pending' end::text,
           i.created_at,
           i.expires_at,
           i.id,
           0::integer
      from public.pixwiki_v2_team_invites i
     where i.company_id=p_company_id
       and i.status='pending'
       and not exists(
         select 1 from public.company_admins ca
         where ca.company_id=i.company_id and ca.user_id=i.target_user_id
       )
  )
  select z.*
  from (
    select * from active_members
    union all
    select * from pending_invites
  ) z
  order by case when z.role='owner' then 0 when z.role='manager' then 1 when z.role='cashier' then 2 else 3 end,
           z.created_at;
end;
$$;
revoke all on function public.pixwiki_v2_team_list(uuid) from public, anon;
grant execute on function public.pixwiki_v2_team_list(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 7) Convites pendentes do próprio usuário.
-- -----------------------------------------------------------------------------
create or replace function public.pixwiki_v2_pending_team_invites()
returns table(
  invite_id uuid,
  company_id uuid,
  company_name text,
  company_slug text,
  role text,
  invited_by_email text,
  expires_at timestamptz,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path='public','auth','pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select lower(u.email) into v_email from auth.users u where u.id=v_uid;

  return query
  select i.id,c.id,c.name::text,c.slug::text,i.role::text,inviter.email::text,i.expires_at,i.created_at
  from public.pixwiki_v2_team_invites i
  join public.companies c on c.id=i.company_id and c.segment_key='pix_wiki' and c.is_active=true
  left join auth.users inviter on inviter.id=i.invited_by
  where i.status='pending'
    and i.expires_at>now()
    and (i.target_user_id=v_uid or (v_email is not null and i.email_normalized=v_email))
  order by i.created_at desc;
end;
$$;
revoke all on function public.pixwiki_v2_pending_team_invites() from public, anon;
grant execute on function public.pixwiki_v2_pending_team_invites() to authenticated;

-- -----------------------------------------------------------------------------
-- 8) Aceite explícito do convite.
-- -----------------------------------------------------------------------------
create or replace function public.pixwiki_v2_accept_team_invite(p_invite_id uuid)
returns jsonb
language plpgsql
security definer
set search_path='public','auth','pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_invite public.pixwiki_v2_team_invites;
  v_company public.companies;
  v_existing_role text;
  v_final_role text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select lower(u.email) into v_email from auth.users u where u.id=v_uid;

  select * into v_invite
  from public.pixwiki_v2_team_invites i
  where i.id=p_invite_id
    and i.status='pending'
    and i.expires_at>now()
    and (i.target_user_id=v_uid or (v_email is not null and i.email_normalized=v_email))
  for update;

  if v_invite.id is null then raise exception 'invite_not_found'; end if;

  select * into v_company from public.companies c
  where c.id=v_invite.company_id and c.segment_key='pix_wiki' and c.is_active=true;
  if v_company.id is null then raise exception 'company_not_found'; end if;

  if v_company.user_id=v_uid then
    v_final_role := 'owner';
  else
    select ca.role into v_existing_role from public.company_admins ca
    where ca.company_id=v_company.id and ca.user_id=v_uid;

    if v_existing_role='owner' then v_final_role := 'owner';
    elsif v_existing_role='manager' and v_invite.role='cashier' then v_final_role := 'manager';
    else v_final_role := v_invite.role;
    end if;

    insert into public.company_admins(company_id,user_id,role)
    values(v_company.id,v_uid,v_final_role)
    on conflict(company_id,user_id) do update set role=excluded.role;
  end if;

  update public.pixwiki_v2_team_invites
     set status='accepted',target_user_id=v_uid,accepted_at=now(),updated_at=now()
   where id=v_invite.id;

  return jsonb_build_object(
    'ok',true,
    'company_id',v_company.id,
    'company_name',v_company.name,
    'company_slug',v_company.slug,
    'role',v_final_role
  );
end;
$$;
revoke all on function public.pixwiki_v2_accept_team_invite(uuid) from public, anon;
grant execute on function public.pixwiki_v2_accept_team_invite(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 9) Snapshot mínimo do Caixa.
-- Não retorna Pix key, IDs MP, metadata, tokens, e-mail/WhatsApp ou billing.
-- -----------------------------------------------------------------------------
create or replace function public.pixwiki_v2_cashier_snapshot(p_company_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path='public','auth','pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_company public.companies;
  v_role text;
  v_companies jsonb := '[]'::jsonb;
  v_recent jsonb := '[]'::jsonb;
  v_stats jsonb := '{}'::jsonb;
  v_today_start timestamptz;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  if p_company_id is not null then
    select c.* into v_company
    from public.companies c
    where c.id=p_company_id and c.segment_key='pix_wiki' and c.is_active=true
      and (
        c.user_id=v_uid
        or exists(select 1 from public.company_admins ca where ca.company_id=c.id and ca.user_id=v_uid and ca.role in ('owner','manager','cashier'))
      );
  else
    select c.* into v_company
    from public.companies c
    left join public.company_admins ca on ca.company_id=c.id and ca.user_id=v_uid
    where c.segment_key='pix_wiki' and c.is_active=true
      and (c.user_id=v_uid or ca.role in ('owner','manager','cashier'))
    order by (ca.role='cashier') desc,(c.user_id=v_uid) desc,c.created_at,c.id
    limit 1;
  end if;

  if v_company.id is null then raise exception 'company_not_found'; end if;
  v_role := case when v_company.user_id=v_uid then 'owner' else public.pixwiki_company_access_role(v_company.id) end;
  if v_role not in ('owner','manager','cashier') then raise exception 'company_not_allowed'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',x.id,'name',x.name,'slug',x.slug,'logo_url',x.logo_url,'role',x.role
  ) order by x.name,x.id),'[]'::jsonb)
  into v_companies
  from (
    select c.id,c.name,c.slug,c.logo_url,
           case when c.user_id=v_uid then 'owner' else ca.role end role
    from public.companies c
    left join public.company_admins ca on ca.company_id=c.id and ca.user_id=v_uid
    where c.segment_key='pix_wiki' and c.is_active=true
      and (c.user_id=v_uid or ca.role in ('owner','manager','cashier'))
  ) x;

  v_today_start := (timezone('America/Sao_Paulo',now())::date::timestamp at time zone 'America/Sao_Paulo');

  select jsonb_build_object(
    'last_hour_count',count(*) filter(where coalesce(r.date_approved,r.date_created,r.created_at)>=now()-interval '1 hour'),
    'last_hour_cents',coalesce(sum(r.amount_cents) filter(where coalesce(r.date_approved,r.date_created,r.created_at)>=now()-interval '1 hour'),0),
    'today_count',count(*) filter(where coalesce(r.date_approved,r.date_created,r.created_at)>=v_today_start),
    'today_cents',coalesce(sum(r.amount_cents) filter(where coalesce(r.date_approved,r.date_created,r.created_at)>=v_today_start),0)
  ) into v_stats
  from public.mp_received_payments r
  where r.company_id=v_company.id and r.status='approved';

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',q.id,
    'amount_cents',q.amount_cents,
    'source',q.source,
    'received_at',q.received_at
  ) order by q.received_at desc),'[]'::jsonb)
  into v_recent
  from (
    select r.id,r.amount_cents,
           case when s.id is not null then s.origin when r.source='pixwiki_link' then 'pix_link' else 'pix_key' end as source,
           coalesce(r.date_approved,r.date_created,r.created_at) as received_at
    from public.mp_received_payments r
    left join lateral (
      select cs.id,cs.origin
      from public.pixwiki_v2_checkout_sessions cs
      where cs.company_id=r.company_id
        and (cs.receipt_id=r.id or (cs.provider_payment_id is not null and r.mp_payment_id is not null and cs.provider_payment_id=r.mp_payment_id))
      order by cs.created_at desc
      limit 1
    ) s on true
    where r.company_id=v_company.id and r.status='approved'
    order by coalesce(r.date_approved,r.date_created,r.created_at) desc
    limit 20
  ) q;

  return jsonb_build_object(
    'company',jsonb_build_object('id',v_company.id,'name',v_company.name,'slug',v_company.slug,'logo_url',v_company.logo_url,'role',v_role),
    'companies',v_companies,
    'stats',coalesce(v_stats,'{}'::jsonb),
    'recent_receipts',coalesce(v_recent,'[]'::jsonb),
    'generated_at',now()
  );
end;
$$;
revoke all on function public.pixwiki_v2_cashier_snapshot(uuid) from public, anon;
grant execute on function public.pixwiki_v2_cashier_snapshot(uuid) to authenticated;

-- Mantém o RPC de Push do Gate 1 restrito a owner/manager/cashier.
revoke all on function public.pixwiki_register_push_subscription(uuid,text,text,text) from public, anon;
grant execute on function public.pixwiki_register_push_subscription(uuid,text,text,text) to authenticated;

commit;
