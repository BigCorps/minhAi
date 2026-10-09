begin;

create table if not exists public.bigcorps_support_threads (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  visitor_hash text,
  product text not null check (product in ('minhai','conviteia','pixwiki','midia','artefinal','consultatec','melhoria','funcionaria','minia','other')),
  host text not null,
  path text,
  user_id uuid,
  company_id uuid references public.companies(id) on delete set null,
  status text not null default 'open' check (status in ('open','waiting_human','human','resolved')),
  human_requested boolean not null default false,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bigcorps_support_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.bigcorps_support_threads(id) on delete cascade,
  role text not null check (role in ('user','assistant','human','system')),
  source text not null check (source in ('widget','ai','admin','system')),
  content text not null check (char_length(content) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists bigcorps_support_threads_last_message_idx
  on public.bigcorps_support_threads(last_message_at desc);
create index if not exists bigcorps_support_threads_status_idx
  on public.bigcorps_support_threads(status,last_message_at desc);
create index if not exists bigcorps_support_threads_visitor_idx
  on public.bigcorps_support_threads(visitor_hash,created_at desc);
create index if not exists bigcorps_support_messages_thread_idx
  on public.bigcorps_support_messages(thread_id,created_at);

alter table public.bigcorps_support_threads enable row level security;
alter table public.bigcorps_support_messages enable row level security;

revoke all on public.bigcorps_support_threads,public.bigcorps_support_messages from public,anon,authenticated;
grant select,insert,update,delete on public.bigcorps_support_threads,public.bigcorps_support_messages to service_role;

comment on table public.bigcorps_support_threads is
  'Threads do widget compartilhado de suporte BigCorps. Acesso somente server-side/service_role.';
comment on table public.bigcorps_support_messages is
  'Mensagens do widget de suporte BigCorps. Tokens públicos são armazenados apenas como hash.';

commit;
