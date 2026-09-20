-- BigCorps WhatsApp Inbox
-- Caixa administrativa para o número compartilhado BigCorps/minhAi.
-- Não altera as tabelas de mensagens existentes; adiciona apenas metadados,
-- configuração e um trigger assíncrono para a resposta automática.

create extension if not exists pg_net with schema extensions;

create table if not exists public.bigcorps_whatsapp_settings (
  id text primary key default 'shared',
  company_id uuid not null references public.companies(id) on delete cascade,
  whatsapp_number_id text not null unique,
  support_number text not null default '(11) 92682-8418',
  auto_reply_text text not null,
  auto_reply_enabled boolean not null default true,
  window_hours integer not null default 24 check (window_hours between 1 and 168),
  callback_url text not null default 'https://www.minhai.app/api/internal/bigcorps-whatsapp-inbound',
  webhook_secret text not null default gen_random_uuid()::text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bigcorps_whatsapp_settings enable row level security;

create table if not exists public.bigcorps_whatsapp_threads (
  page_id text not null,
  from_id text not null,
  sender_name text null,
  source text not null default 'minhai'
    check (source in ('conviteia','pixwiki','minhai','outros')),
  source_context jsonb not null default '{}'::jsonb,
  unread_count integer not null default 0 check (unread_count >= 0),
  last_message_text text null,
  last_inbound_at timestamptz null,
  last_outbound_at timestamptz null,
  last_auto_reply_at timestamptz null,
  auto_reply_claimed_at timestamptz null,
  last_read_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (page_id, from_id)
);

create index if not exists bigcorps_whatsapp_threads_updated_idx
  on public.bigcorps_whatsapp_threads(updated_at desc);
create index if not exists bigcorps_whatsapp_threads_source_idx
  on public.bigcorps_whatsapp_threads(source, updated_at desc);
create index if not exists bigcorps_whatsapp_threads_unread_idx
  on public.bigcorps_whatsapp_threads(unread_count, updated_at desc);

alter table public.bigcorps_whatsapp_threads enable row level security;

-- Sem policies para anon/authenticated: a caixa é acessível somente pelas rotas
-- server-side do Admin (service_role). Revoga privilégios concedidos por padrão.
revoke all on table public.bigcorps_whatsapp_settings from anon, authenticated;
revoke all on table public.bigcorps_whatsapp_threads from anon, authenticated;
grant select, insert, update, delete on table public.bigcorps_whatsapp_settings to service_role;
grant select, insert, update, delete on table public.bigcorps_whatsapp_threads to service_role;

-- Descobre e cadastra automaticamente a conexão compartilhada já existente.
insert into public.bigcorps_whatsapp_settings (
  id,
  company_id,
  whatsapp_number_id,
  support_number,
  auto_reply_text,
  auto_reply_enabled,
  window_hours,
  callback_url
)
select
  'shared',
  mc.company_id,
  mc.whatsapp_number_id,
  '(11) 92682-8418',
  E'Olá! 👋 Esta é uma mensagem automática da BigCorps.\n\nEste número é utilizado exclusivamente para o envio de notificações, confirmações e mensagens dos aplicativos BigCorps e minhAi.\n\nPara atendimento, dúvidas ou suporte, fale com nossa equipe pelo WhatsApp: (11) 92682-8418.\n\nObrigado!\nEquipe BigCorps / minhAi',
  true,
  24,
  'https://www.minhai.app/api/internal/bigcorps-whatsapp-inbound'
from public.meta_connections mc
join public.companies c on c.id = mc.company_id
where c.slug = 'bigcorps'
  and mc.whatsapp_number_id is not null
order by mc.updated_at desc nulls last
limit 1
on conflict (id) do update
set company_id = excluded.company_id,
    whatsapp_number_id = excluded.whatsapp_number_id,
    callback_url = excluded.callback_url,
    updated_at = now();

-- Registra uma mensagem recebida, incrementa não lidas e reserva de forma
-- atômica o direito de enviar a resposta automática. O claim evita duplicidade
-- caso duas requisições cheguem quase ao mesmo tempo.
create or replace function public.bigcorps_whatsapp_record_inbound(
  p_page_id text,
  p_from_id text,
  p_sender_name text,
  p_message_text text,
  p_source text,
  p_source_context jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.bigcorps_whatsapp_settings%rowtype;
  v_thread public.bigcorps_whatsapp_threads%rowtype;
  v_should_reply boolean := false;
  v_now timestamptz := now();
begin
  select * into v_settings
  from public.bigcorps_whatsapp_settings
  where whatsapp_number_id = p_page_id
  limit 1;

  if not found then
    return jsonb_build_object('configured', false, 'should_auto_reply', false);
  end if;

  perform pg_advisory_xact_lock(hashtextextended(coalesce(p_page_id,'') || ':' || coalesce(p_from_id,''), 0));

  select * into v_thread
  from public.bigcorps_whatsapp_threads
  where page_id = p_page_id and from_id = p_from_id
  for update;

  if not found then
    -- Segurança adicional caso o callback seja chamado fora do trigger normal.
    v_should_reply := v_settings.auto_reply_enabled;
    insert into public.bigcorps_whatsapp_threads (
      page_id, from_id, sender_name, source, source_context,
      unread_count, last_message_text, last_inbound_at,
      auto_reply_claimed_at, created_at, updated_at
    ) values (
      p_page_id,
      p_from_id,
      nullif(trim(coalesce(p_sender_name,'')), ''),
      case when p_source in ('conviteia','pixwiki','minhai','outros') then p_source else 'outros' end,
      coalesce(p_source_context, '{}'::jsonb),
      0,
      nullif(left(coalesce(p_message_text,''), 500), ''),
      v_now,
      case when v_should_reply then v_now else null end,
      v_now,
      v_now
    );
  else
    v_should_reply := v_settings.auto_reply_enabled
      and (v_thread.last_auto_reply_at is null
           or v_thread.last_auto_reply_at <= v_now - make_interval(hours => v_settings.window_hours))
      and (v_thread.auto_reply_claimed_at is null
           or v_thread.auto_reply_claimed_at <= v_now - interval '5 minutes');

    -- O trigger já registrou a mensagem e incrementou não lidas. Aqui apenas
    -- enriquecemos a origem e fazemos o claim da resposta automática.
    update public.bigcorps_whatsapp_threads
    set sender_name = coalesce(nullif(trim(coalesce(p_sender_name,'')), ''), sender_name),
        source = case when p_source in ('conviteia','pixwiki','minhai','outros') then p_source else source end,
        source_context = case
          when coalesce(p_source_context, '{}'::jsonb) = '{}'::jsonb then source_context
          else p_source_context
        end,
        auto_reply_claimed_at = case when v_should_reply then v_now else auto_reply_claimed_at end,
        updated_at = v_now
    where page_id = p_page_id and from_id = p_from_id;
  end if;

  return jsonb_build_object(
    'configured', true,
    'should_auto_reply', v_should_reply,
    'auto_reply_text', v_settings.auto_reply_text,
    'support_number', v_settings.support_number,
    'window_hours', v_settings.window_hours,
    'auto_reply_enabled', v_settings.auto_reply_enabled
  );
end;
$$;

revoke all on function public.bigcorps_whatsapp_record_inbound(text,text,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.bigcorps_whatsapp_record_inbound(text,text,text,text,text,jsonb) to service_role;

-- Trigger síncrono: ao receber uma mensagem no número compartilhado, pausa a IA
-- apenas para aquela conversa e enfileira a chamada HTTP para o backend minhAi.
-- pg_net é assíncrono; falha no callback nunca impede a gravação da mensagem.
create or replace function public.bigcorps_whatsapp_dispatch_inbound()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_conv record;
  v_settings public.bigcorps_whatsapp_settings%rowtype;
begin
  if new.role <> 'user' then
    return new;
  end if;

  select c.meta_from_id, c.meta_page_id, c.meta_platform
    into v_conv
  from public.conversations c
  where c.id = new.conversation_id;

  if not found
     or v_conv.meta_platform <> 'whatsapp'
     or v_conv.meta_from_id is null
     or v_conv.meta_page_id is null then
    return new;
  end if;

  select * into v_settings
  from public.bigcorps_whatsapp_settings
  where whatsapp_number_id = v_conv.meta_page_id
  limit 1;

  if not found then
    return new;
  end if;

  -- Registra a chegada no banco antes de qualquer callback HTTP. Assim a caixa
  -- continua íntegra mesmo se o Vercel estiver temporariamente indisponível.
  insert into public.bigcorps_whatsapp_threads as inbox_thread (
    page_id, from_id, source, unread_count,
    last_message_text, last_inbound_at, created_at, updated_at
  ) values (
    v_conv.meta_page_id,
    v_conv.meta_from_id,
    'minhai',
    1,
    left(new.content, 500),
    now(),
    now(),
    now()
  )
  on conflict (page_id, from_id) do update
  set unread_count = inbox_thread.unread_count + 1,
      last_message_text = excluded.last_message_text,
      last_inbound_at = excluded.last_inbound_at,
      updated_at = now();

  -- O número compartilhado é de notificações/sistema. Mesmo que a conexão Meta
  -- tenha agent_enabled=true, esta conversa específica não passa pela IA.
  insert into public.conversation_ai_control (
    conversation_id, page_id, company_id, platform,
    ai_enabled, is_paused, paused_until,
    last_message_text, updated_at
  ) values (
    v_conv.meta_from_id,
    v_conv.meta_page_id,
    v_settings.company_id,
    'whatsapp',
    false,
    true,
    null,
    left(new.content, 500),
    now()
  )
  on conflict (conversation_id, page_id) do update
  set company_id = excluded.company_id,
      platform = 'whatsapp',
      ai_enabled = false,
      is_paused = true,
      paused_until = null,
      last_message_text = excluded.last_message_text,
      updated_at = now();

  begin
    perform net.http_post(
      url := v_settings.callback_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-BigCorps-Webhook-Secret', v_settings.webhook_secret
      ),
      body := jsonb_build_object(
        'messageId', new.id,
        'conversationId', new.conversation_id,
        'pageId', v_conv.meta_page_id,
        'fromId', v_conv.meta_from_id,
        'text', new.content
      ),
      timeout_milliseconds := 10000
    );
  exception when others then
    raise warning '[bigcorps-whatsapp] callback não enfileirado: %', sqlerrm;
  end;

  return new;
end;
$$;

revoke all on function public.bigcorps_whatsapp_dispatch_inbound() from public, anon, authenticated;

drop trigger if exists trg_bigcorps_whatsapp_inbound on public.messages;
create trigger trg_bigcorps_whatsapp_inbound
after insert on public.messages
for each row
execute function public.bigcorps_whatsapp_dispatch_inbound();

-- Pré-popula a caixa com conversas antigas do mesmo número para que o Admin já
-- tenha histórico visível após a migration. Elas começam como lidas.
insert into public.bigcorps_whatsapp_threads (
  page_id, from_id, source, unread_count,
  last_message_text, last_inbound_at, created_at, updated_at
)
select distinct on (c.meta_page_id, c.meta_from_id)
  c.meta_page_id,
  c.meta_from_id,
  'minhai',
  0,
  lm.content,
  lm.created_at,
  coalesce(c.created_at, now()),
  coalesce(lm.created_at, c.updated_at, c.created_at, now())
from public.conversations c
join public.bigcorps_whatsapp_settings s
  on s.whatsapp_number_id = c.meta_page_id
left join lateral (
  select m.content, m.created_at
  from public.messages m
  where m.conversation_id = c.id and m.role = 'user'
  order by m.created_at desc
  limit 1
) lm on true
where c.meta_platform = 'whatsapp'
  and c.meta_from_id is not null
order by c.meta_page_id, c.meta_from_id, c.updated_at desc nulls last
on conflict (page_id, from_id) do nothing;
