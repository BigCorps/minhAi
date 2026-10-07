-- BigCorps / ajuda.bigcorps.com.br
-- Diagnóstico comercial público com escrita exclusivamente server-side.

create table if not exists public.bigcorps_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nome text not null,
  empresa text not null,
  whatsapp text not null,
  email text,
  cidade text,
  uf text,
  melhor_horario text,
  tipo_empresa text not null,
  segmento text not null,
  porte text not null,
  tempo_empresa text not null,
  faturamento_faixa text not null,
  areas text[] not null default '{}'::text[],
  respostas jsonb not null default '{}'::jsonb,
  areas_prioritarias text[] not null default '{}'::text[],
  prioridade text not null check (prioridade in ('alta', 'media', 'baixa')),
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  fbclid text,
  fbc text,
  fbp text,
  user_agent text,
  consentimento_em timestamptz not null,
  consentimento_texto text not null,
  status text not null default 'novo' check (status in ('novo', 'contatado', 'proposta', 'cliente', 'descartado')),
  notas text
);

create index if not exists bigcorps_leads_created_at_idx
  on public.bigcorps_leads (created_at desc);
create index if not exists bigcorps_leads_status_prioridade_idx
  on public.bigcorps_leads (status, prioridade, created_at desc);
create index if not exists bigcorps_leads_areas_gin_idx
  on public.bigcorps_leads using gin (areas);

alter table public.bigcorps_leads enable row level security;
revoke all on table public.bigcorps_leads from public, anon, authenticated;
grant select, insert, update, delete on table public.bigcorps_leads to service_role;

-- Rate limit simples por hash do IP. IP bruto nunca é persistido.
create table if not exists public.bigcorps_lead_rate_limits (
  ip_hash text primary key,
  window_started_at timestamptz not null default now(),
  hits integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.bigcorps_lead_rate_limits enable row level security;
revoke all on table public.bigcorps_lead_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.bigcorps_lead_rate_limits to service_role;

create or replace function public.bigcorps_consume_lead_quota(
  p_ip_hash text,
  p_limit integer default 5,
  p_window_seconds integer default 900
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hits integer;
  v_now timestamptz := now();
begin
  if p_ip_hash is null or length(p_ip_hash) < 32 then
    return false;
  end if;

  if p_limit < 1 or p_limit > 100 or p_window_seconds < 60 or p_window_seconds > 86400 then
    return false;
  end if;

  insert into public.bigcorps_lead_rate_limits (ip_hash, window_started_at, hits, updated_at)
  values (p_ip_hash, v_now, 1, v_now)
  on conflict (ip_hash) do update
  set
    window_started_at = case
      when public.bigcorps_lead_rate_limits.window_started_at < v_now - make_interval(secs => p_window_seconds)
        then v_now
      else public.bigcorps_lead_rate_limits.window_started_at
    end,
    hits = case
      when public.bigcorps_lead_rate_limits.window_started_at < v_now - make_interval(secs => p_window_seconds)
        then 1
      else public.bigcorps_lead_rate_limits.hits + 1
    end,
    updated_at = v_now
  returning hits into v_hits;

  return v_hits <= p_limit;
end;
$$;

revoke all on function public.bigcorps_consume_lead_quota(text, integer, integer) from public, anon, authenticated;
grant execute on function public.bigcorps_consume_lead_quota(text, integer, integer) to service_role;

comment on table public.bigcorps_leads is
  'Leads do diagnóstico gratuito em ajuda.bigcorps.com.br. Acesso apenas via service_role/admin.';
comment on function public.bigcorps_consume_lead_quota(text, integer, integer) is
  'Rate limit server-side por hash de IP; não armazena endereço IP bruto.';
