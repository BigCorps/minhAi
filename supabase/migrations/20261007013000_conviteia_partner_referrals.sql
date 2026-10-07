begin;

create table if not exists conviteria.evento_partner_attributions (
  evento_id uuid primary key references conviteria.eventos(id) on delete cascade,
  referral_id uuid not null unique references public.partner_referrals(id) on delete restrict,
  attributed_at timestamptz not null default now()
);
alter table conviteria.evento_partner_attributions enable row level security;
revoke all on conviteria.evento_partner_attributions from public, anon, authenticated;
grant select,insert,update,delete on conviteria.evento_partner_attributions to service_role;
drop policy if exists service_role_access on conviteria.evento_partner_attributions;
create policy service_role_access on conviteria.evento_partner_attributions
  to service_role using (true) with check (true);

alter table conviteria.evento_memorias_config
  add column if not exists beneficio_codigo text,
  add column if not exists beneficio_referral_id uuid references public.partner_referrals(id) on delete set null;

update public.partner_programs
set config = config || '{"publicRouteImplemented":true,"automaticBenefits":true,"referralVersion":1}'::jsonb
where product='conviteia';

update public.partner_benefits b
set enabled=true,
    config = b.config || '{"automaticGrant":true,"grantOn":"confirmed_invite_purchase","oncePerEvent":true}'::jsonb
from public.partner_programs p
where p.id=b.program_id and p.product='conviteia' and b.code='memorias_free';

create or replace function public.partner_convert_referral(
  p_referral uuid,
  p_value_cents bigint,
  p_benefit_code text default null
) returns jsonb
language plpgsql
security invoker
set search_path=public,pg_catalog
as $$
declare r public.partner_referrals%rowtype; v_benefit uuid;
begin
  if p_value_cents is null or p_value_cents < 0 or p_value_cents > 100000000000 then raise exception 'invalid_conversion_value'; end if;
  select * into strict r from public.partner_referrals where id=p_referral for update;
  if r.status='cancelled' then raise exception 'referral_cancelled'; end if;
  if p_benefit_code is not null then
    if p_benefit_code !~ '^[a-z0-9_]{2,60}$' then raise exception 'invalid_benefit_code'; end if;
    select id into v_benefit from public.partner_benefits where program_id=r.program_id and code=p_benefit_code and enabled=true;
    if v_benefit is null then raise exception 'benefit_unavailable'; end if;
    if r.benefit_id is not null and r.benefit_id<>v_benefit then raise exception 'referral_benefit_conflict'; end if;
  end if;
  update public.partner_referrals
  set status='converted',
      converted_at=coalesce(converted_at,now()),
      converted_value_cents=case when status='converted' then converted_value_cents else p_value_cents end,
      benefit_id=coalesce(benefit_id,v_benefit),
      benefit_status=case when v_benefit is null then benefit_status when benefit_status='granted' then 'granted' else 'pending' end
  where id=p_referral returning * into r;
  return jsonb_build_object('referralId',r.id,'status',r.status,'convertedAt',r.converted_at,'convertedValueCents',r.converted_value_cents,'benefitId',r.benefit_id,'benefitStatus',r.benefit_status);
end;
$$;

create or replace function public.partner_mark_benefit_granted(
  p_referral uuid,
  p_benefit_code text
) returns jsonb
language plpgsql
security invoker
set search_path=public,pg_catalog
as $$
declare r public.partner_referrals%rowtype; v_benefit uuid;
begin
  if p_benefit_code is null or p_benefit_code !~ '^[a-z0-9_]{2,60}$' then raise exception 'invalid_benefit_code'; end if;
  select * into strict r from public.partner_referrals where id=p_referral for update;
  if r.status<>'converted' then raise exception 'referral_not_converted'; end if;
  select id into v_benefit from public.partner_benefits where program_id=r.program_id and code=p_benefit_code and enabled=true;
  if v_benefit is null then raise exception 'benefit_unavailable'; end if;
  if r.benefit_id is not null and r.benefit_id<>v_benefit then raise exception 'referral_benefit_conflict'; end if;
  update public.partner_referrals
  set benefit_id=v_benefit, benefit_status='granted', benefit_granted_at=coalesce(benefit_granted_at,now())
  where id=p_referral returning * into r;
  return jsonb_build_object('referralId',r.id,'benefitId',r.benefit_id,'benefitStatus',r.benefit_status,'benefitGrantedAt',r.benefit_granted_at);
end;
$$;

revoke all on function public.partner_convert_referral(uuid,bigint,text), public.partner_mark_benefit_granted(uuid,text) from public,anon,authenticated;
grant execute on function public.partner_convert_referral(uuid,bigint,text), public.partner_mark_benefit_granted(uuid,text) to service_role;

commit;
