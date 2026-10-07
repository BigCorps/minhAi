begin;
create table public.partner_programs (
 id uuid primary key default gen_random_uuid(), product text not null unique check(product ~ '^[a-z0-9_]{2,60}$'),
 name text not null check(length(name) between 1 and 120), status text not null default 'active' check(status in ('active','paused','closed')),
 link_base_url text check(link_base_url ~ '^https://[a-z0-9.-]+/p/$'),
 config jsonb not null default '{}' check(jsonb_typeof(config)='object'), created_at timestamptz not null default now()
);
create table public.partners (
 id uuid primary key default gen_random_uuid(), company_name text not null, domain text, cnpj text,
 origin_lead_id uuid not null references public.sdr_leads, origin_opportunity_id uuid not null references public.sdr_opportunities,
 category text, region text, directory_visible boolean not null default false, created_at timestamptz not null default now()
);
create table public.partner_identity_keys (
 key text primary key, partner_id uuid not null references public.partners
);
create index partner_identity_keys_partner_idx on public.partner_identity_keys(partner_id);
create table public.partner_memberships (
 id uuid primary key default gen_random_uuid(), partner_id uuid not null references public.partners,
 program_id uuid not null references public.partner_programs,
 status text not null default 'prospected' check(status in ('prospected','contacted','interested','active','paused','closed')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(partner_id,program_id), unique(id,program_id)
);
create table public.partner_status_events (
 id uuid primary key default gen_random_uuid(), membership_id uuid not null references public.partner_memberships,
 previous_status text, status text not null check(status in ('prospected','contacted','interested','active','paused','closed')),
 occurred_at timestamptz not null default now()
);
create index partner_status_events_membership_idx on public.partner_status_events(membership_id,occurred_at);
create index partner_memberships_program_idx on public.partner_memberships(program_id);
create table public.partner_origins (
 membership_id uuid not null references public.partner_memberships, opportunity_id uuid not null references public.sdr_opportunities,
 lead_id uuid not null references public.sdr_leads, created_at timestamptz not null default now(), primary key(membership_id,opportunity_id)
);
create table public.partner_links (
 id uuid primary key default gen_random_uuid(), membership_id uuid not null, program_id uuid not null,
 slug text not null check(slug ~ '^[a-z0-9][a-z0-9-]{2,63}$'), code text not null unique check(code ~ '^[a-f0-9]{24}$'),
 status text not null default 'active' check(status in ('active','paused','closed')), created_at timestamptz not null default now(),
 foreign key(membership_id,program_id) references public.partner_memberships(id,program_id), unique(program_id,slug), unique(membership_id), unique(id,membership_id,program_id)
);
create table public.partner_benefits (
 id uuid primary key default gen_random_uuid(), program_id uuid not null references public.partner_programs,
 code text not null check(code ~ '^[a-z0-9_]{2,60}$'), name text not null,
 kind text not null check(kind in ('package','discount','service','visibility','other')),
 config jsonb not null default '{}' check(jsonb_typeof(config)='object'), enabled boolean not null default false,
 created_at timestamptz not null default now(), unique(program_id,code), unique(id,program_id)
);
create table public.partner_referrals (
 id uuid primary key default gen_random_uuid(), link_id uuid not null, membership_id uuid not null, program_id uuid not null,
 referred_reference text not null check(length(referred_reference) between 1 and 200),
 status text not null default 'referred' check(status in ('referred','qualified','converted','cancelled')),
 referred_at timestamptz not null default now(), converted_at timestamptz,
 converted_value_cents bigint not null default 0 check(converted_value_cents>=0),
 benefit_id uuid, benefit_status text not null default 'none' check(benefit_status in ('none','pending','granted','cancelled')), benefit_granted_at timestamptz,
 foreign key(link_id,membership_id,program_id) references public.partner_links(id,membership_id,program_id),
 foreign key(benefit_id,program_id) references public.partner_benefits(id,program_id),
 check((status='converted') = (converted_at is not null)),
 check((benefit_status='granted') = (benefit_granted_at is not null)),
 check(benefit_status='none' or benefit_id is not null), unique(program_id,referred_reference)
);
create index partner_referrals_membership_idx on public.partner_referrals(membership_id);
insert into public.partner_programs(product,name) values
 ('conviteia','Parceiros ConviteIA'),('melhoria','Parceiros MelhorIA'),('midia','Parceiros Mídia.Pro'),('artefinal','Parceiros ArteFinal'),
 ('consultatec','Parceiros ConsultaTec'),('funcionaria','Parceiros FuncionarIA'),('pixwiki','Parceiros PixWiki'),('monitoria_vip','Parceiros MonitorIA VIP');
update public.partner_programs set link_base_url='https://conviteia.com/p/', config='{"typicalPartners":["buffet","espaço de eventos","cerimonialista","fotógrafo"],"persistentAttribution":true,"financialCommissionRequired":false,"directoryPlanned":true,"publicRouteImplemented":false,"automaticBenefits":false}' where product='conviteia';
insert into public.partner_benefits(program_id,code,name,kind,config)
 select id,'memorias_free','Pacote Memórias gratuito','package','{"package":"memorias","trigger":"confirmed_purchase","automaticGrant":false}' from public.partner_programs where product='conviteia';

create function public.partner_promote_opportunity(p_opportunity uuid,p_program uuid,p_slug text,p_code text,p_domain text)
returns jsonb language plpgsql security invoker set search_path=public,pg_catalog as $$
declare o public.sdr_opportunities%rowtype; l public.sdr_leads%rowtype; pr public.partner_programs%rowtype;
 v_partner uuid; v_membership uuid; v_ids uuid[]; v_keys text[] := '{}'; v_cnpj text;
begin
 -- Serialize small manual promotions, including identities sharing different keys; unique keys prevent takeover.
 perform pg_advisory_xact_lock(7052026);
 select * into strict o from public.sdr_opportunities where id=p_opportunity for update;
 select * into strict l from public.sdr_leads where id=o.lead_id;
 select * into strict pr from public.partner_programs where id=p_program;
 if o.stage in ('lost','won','paid') or coalesce(o.qualification->'commercial_classification'->>'type','') not in ('partner','customer_or_partner') then raise exception 'partner_opportunity_not_eligible'; end if;
 if pr.status <> 'active' then raise exception 'partner_program_unavailable'; end if;
 v_cnpj := regexp_replace(coalesce(l.cnpj,''),'[^0-9]','','g');
 if trim(l.company_name)='' or lower(l.company_name) ~ '^(pessoa [fíi]sica|consumidor|noiva|noivo|casal|perfil pessoal)' then raise exception 'lead_not_eligible'; end if;
 if p_domain is not null and (p_domain !~ '^[a-z0-9]([a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}$' or
   p_domain is distinct from regexp_replace(lower(regexp_replace(regexp_replace(l.domain,'^https?://','','i'),'[/?#].*$','')),'^www\.','') or
   p_domain ~ '\.\.|(^|\.)-|-(\.|$)' or p_domain ~ '(^|\.)(gmail\.com|outlook\.com|hotmail\.com|yahoo\.[a-z.]+|icloud\.com|proton\.(me|mail\.com)|aol\.com|live\.com|instagram\.com|facebook\.com|linkedin\.com|tiktok\.com|youtube\.com)$') then raise exception 'invalid_partner_domain'; end if;
 if v_cnpj !~ '^\d{14}$' and (p_domain is null or l.source not in ('econodata','hunter','apollo','web_research')) then raise exception 'lead_not_eligible'; end if;
 if p_slug is null or p_slug !~ '^[a-z0-9][a-z0-9-]{2,63}$' or p_code is null or p_code !~ '^[a-f0-9]{24}$' then raise exception 'invalid_partner_link'; end if;
 if p_domain is not null then v_keys:=array_append(v_keys,'domain:'||p_domain); end if;
 if v_cnpj ~ '^\d{14}$' then v_keys:=array_append(v_keys,'cnpj:'||v_cnpj); end if;
 select array_agg(distinct partner_id) into v_ids from public.partner_identity_keys where key=any(v_keys);
 if cardinality(v_ids)>1 then raise exception 'partner_identity_conflict'; end if;
 v_partner:=v_ids[1];
 if v_partner is null then
   insert into public.partners(company_name,domain,cnpj,origin_lead_id,origin_opportunity_id)
     values(l.company_name,p_domain,case when v_cnpj ~ '^\d{14}$' then v_cnpj else null end,l.id,o.id) returning id into v_partner;
 end if;
 insert into public.partner_identity_keys(key,partner_id) select unnest(v_keys),v_partner on conflict(key) do nothing;
 select id into v_membership from public.partner_memberships where partner_id=v_partner and program_id=p_program;
 if v_membership is null then
   insert into public.partner_memberships(partner_id,program_id) values(v_partner,p_program) returning id into v_membership;
   insert into public.partner_status_events(membership_id,status) values(v_membership,'prospected');
   insert into public.partner_links(membership_id,program_id,slug,code) values(v_membership,p_program,p_slug,p_code);
 end if;
 insert into public.partner_origins(membership_id,opportunity_id,lead_id) values(v_membership,o.id,l.id) on conflict do nothing;
 return jsonb_build_object('partnerId',v_partner,'membershipId',v_membership);
end; $$;
create function public.partner_set_membership_status(p_membership uuid,p_status text)
returns jsonb language plpgsql security invoker set search_path=public,pg_catalog as $$
declare m public.partner_memberships%rowtype;
begin
 if p_status is null or p_status not in ('prospected','contacted','interested','active','paused','closed') then raise exception 'invalid_partner_status'; end if;
 select * into strict m from public.partner_memberships where id=p_membership for update;
 if p_status='active' and not exists(select 1 from public.partner_programs where id=m.program_id and status='active') then raise exception 'partner_program_unavailable'; end if;
 if m.status <> p_status then insert into public.partner_status_events(membership_id,previous_status,status) values(m.id,m.status,p_status); end if;
 update public.partner_memberships set status=p_status,updated_at=now() where id=p_membership;
 update public.partner_links set status=case when p_status='active' then 'active' when p_status='closed' then 'closed' else 'paused' end where membership_id=p_membership;
 return jsonb_build_object('membershipId',p_membership,'status',p_status);
end; $$;
-- Internal future attribution operation, not exposed by any public route/UI. No conversion/benefit grant.
create function public.partner_record_referral(p_code text,p_referred_reference text)
returns uuid language plpgsql security invoker set search_path=public,pg_catalog as $$
declare l public.partner_links%rowtype; v_id uuid;
begin
 select * into strict l from public.partner_links where code=p_code for update;
 if l.status <> 'active' or not exists(select 1 from public.partner_memberships m join public.partner_programs p on p.id=m.program_id where m.id=l.membership_id and m.status='active' and p.status='active') then raise exception 'partner_link_inactive'; end if;
 if p_referred_reference is null or length(trim(p_referred_reference)) not between 1 and 200 then raise exception 'invalid_referral_reference'; end if;
 insert into public.partner_referrals(link_id,membership_id,program_id,referred_reference) values(l.id,l.membership_id,l.program_id,trim(p_referred_reference))
 on conflict(program_id,referred_reference) do nothing returning id into v_id;
 if v_id is null then select id into v_id from public.partner_referrals where program_id=l.program_id and referred_reference=trim(p_referred_reference); end if;
 return v_id;
end; $$;
do $$ declare t text; begin
 foreach t in array array['partner_programs','partners','partner_identity_keys','partner_memberships','partner_origins','partner_status_events','partner_links','partner_benefits','partner_referrals'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select,insert,update,delete on public.%I to service_role',t);
 execute format('create policy service_role_access on public.%I to service_role using (true) with check (true)',t);
 end loop;
end $$;
revoke all on function public.partner_promote_opportunity(uuid,uuid,text,text,text), public.partner_set_membership_status(uuid,text), public.partner_record_referral(text,text) from public,anon,authenticated;
grant execute on function public.partner_promote_opportunity(uuid,uuid,text,text,text), public.partner_set_membership_status(uuid,text), public.partner_record_referral(text,text) to service_role;
commit;
