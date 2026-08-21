-- ============================================================================
-- MelhorIA — Fase 0 (fundação) + Fase 1 (remédios)
-- "a IA da Melhor Idade!"
--
-- Projeto Supabase: qyonozbroekuqlotqcbm
-- Rodar INTEIRO, de uma vez, no SQL Editor. É idempotente: pode rodar de novo.
--
-- ANTES DE RODAR: leia o BLOCO 2 — tem um valor que você precisa trocar.
-- DEPOIS DE RODAR: leia o BLOCO 10 — tem passos no painel, um deles é
--                  obrigatório ou o app não abre.
-- ============================================================================


-- ════════════════════════════════════════════════════════════════════════════
-- BLOCO 1 — Schema e tabelas
-- ════════════════════════════════════════════════════════════════════════════
-- Schema dedicado, no padrão do ConviteIA (schema 'conviteria', 24 tabelas),
-- e não prefixo em public. Aqui há dado sensível de saúde: ter a fronteira no
-- schema torna RLS, retenção e exclusão auditáveis, e evita somar 15 tabelas
-- às 121 que public já carrega.

create schema if not exists melhoria;

comment on schema melhoria is
  'MelhorIA — lembretes de medicação, agenda de saúde e antifraude para a melhor idade. Contém dado pessoal sensível (LGPD art. 11).';


-- ── 1.1 Segredos internos ───────────────────────────────────────────────────
-- Mesmo padrão de public.pixwiki_internal_secrets. Usado pelo pg_cron para se
-- autenticar na edge function. Nunca exposto ao cliente (ver BLOCO 9).
create table if not exists melhoria.segredos_internos (
  chave      text primary key,
  segredo    text not null,
  descricao  text,
  criado_em  timestamptz not null default now()
);


-- ── 1.2 Perfil do idoso ─────────────────────────────────────────────────────
create table if not exists melhoria.perfis (
  id                   uuid primary key default gen_random_uuid(),
  company_id           uuid not null unique
                         references public.companies(id) on delete cascade,
  user_id              uuid not null references auth.users(id) on delete cascade,

  nome                 text not null,
  data_nascimento      date,
  foto_url             text,
  telefone             text,

  timezone             text not null default 'America/Sao_Paulo',

  -- Acessibilidade
  tamanho_fonte        text not null default 'grande'
                         check (tamanho_fonte in ('normal','grande','gigante')),
  alto_contraste       boolean not null default false,
  -- speechSynthesis do navegador (grátis). Opt-in: o app confirma, não conversa.
  falar_confirmacoes   boolean not null default false,

  -- LGPD art. 11: consentimento específico e destacado, separado dos termos
  consentiu_saude_em   timestamptz,
  consentiu_agenda_em  timestamptz,

  responsavel_legal_id uuid references melhoria.perfis(id) on delete set null,

  onboarding_completo  boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists idx_melhoria_perfis_user    on melhoria.perfis(user_id);
create index if not exists idx_melhoria_perfis_company on melhoria.perfis(company_id);


-- ── 1.3 Cuidadores ──────────────────────────────────────────────────────────
create table if not exists melhoria.cuidadores (
  id                   uuid primary key default gen_random_uuid(),
  perfil_id            uuid not null references melhoria.perfis(id) on delete cascade,
  user_id              uuid references auth.users(id) on delete set null,

  nome                 text not null,
  email                text,
  telefone             text,
  parentesco           text,

  pode_editar          boolean not null default true,
  recebe_escalonamento boolean not null default true,
  recebe_panico        boolean not null default true,

  status               text not null default 'convidado'
                         check (status in ('convidado','ativo','removido')),
  convite_token        text unique,
  convite_expira_em    timestamptz,
  aceito_em            timestamptz,

  created_at           timestamptz not null default now()
);

create index if not exists idx_melhoria_cuidadores_perfil on melhoria.cuidadores(perfil_id);
create index if not exists idx_melhoria_cuidadores_user
  on melhoria.cuidadores(user_id) where user_id is not null;


-- ── 1.4 Medicamentos ────────────────────────────────────────────────────────
create table if not exists melhoria.medicamentos (
  id              uuid primary key default gen_random_uuid(),
  perfil_id       uuid not null references melhoria.perfis(id) on delete cascade,

  nome            text not null,
  dosagem         text,                       -- "50mg", "20 gotas", "meio comprimido"
  forma           text,                       -- comprimido, gota, xarope, injeção
  cor_etiqueta    text,                       -- ajuda quem lê pouco a distinguir
  foto_caixa_url  text,
  observacoes     text,

  estoque_atual   numeric(10,2),
  estoque_alerta  numeric(10,2) default 3,    -- avisa com N doses restantes

  data_inicio     date not null default current_date,
  data_fim        date,                       -- null = uso contínuo
  ativo           boolean not null default true,

  -- Se veio de foto de receita, PRECISA de revisão humana antes de virar
  -- lembrete ativo. OCR que lê 0,25mg como 25mg é overdose programada.
  origem          text not null default 'manual'
                    check (origem in ('manual','receita_ia')),
  documento_id    uuid,
  revisado        boolean not null default true,
  revisado_por    uuid references auth.users(id),
  revisado_em     timestamptz,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_melhoria_medicamentos_perfil
  on melhoria.medicamentos(perfil_id) where ativo;


-- ── 1.5 Doses (a grade) ─────────────────────────────────────────────────────
-- horario é hora de PAREDE (time), não instante. O timestamptz real sai na
-- materialização, com o timezone do perfil. Gravar direto em UTC quebra em
-- viagem e em mudança de horário.
create table if not exists melhoria.doses (
  id              uuid primary key default gen_random_uuid(),
  medicamento_id  uuid not null references melhoria.medicamentos(id) on delete cascade,

  horario         time not null,
  dias_semana     int[] not null default '{0,1,2,3,4,5,6}',  -- 0=domingo
  quantidade      numeric(10,2) not null default 1,

  -- RRULE: UM evento recorrente por grade, não um por dose. O laço aninhado do
  -- LembreteRemediosDisplay da minhAi dispara 270 chamadas para 3 doses x 90
  -- dias, aborta no meio em caso de erro e descarta o event_id — deixando
  -- eventos órfãos que o app não consegue editar nem apagar.
  google_event_id text,

  ativo           boolean not null default true,
  created_at      timestamptz not null default now(),

  unique (medicamento_id, horario)
);

create index if not exists idx_melhoria_doses_medicamento
  on melhoria.doses(medicamento_id) where ativo;


-- ── 1.6 Ocorrências (o cron lê daqui) ───────────────────────────────────────
create table if not exists melhoria.dose_eventos (
  id                uuid primary key default gen_random_uuid(),
  dose_id           uuid not null references melhoria.doses(id) on delete cascade,
  perfil_id         uuid not null references melhoria.perfis(id) on delete cascade,

  previsto_para     timestamptz not null,

  status            text not null default 'pendente'
                      check (status in ('pendente','notificado','tomado','pulado','perdido')),

  notificado_em     timestamptz,
  confirmado_em     timestamptz,
  confirmado_por    uuid references auth.users(id),
  canal             text,                     -- push | app | cuidador

  escalonado_em     timestamptz,              -- 30 min sem confirmar
  escalonado_sms_em timestamptz,              -- 60 min sem confirmar

  created_at        timestamptz not null default now(),

  -- Idempotência. Não é opcional: se o cron repetir ou houver retry, a pessoa
  -- não pode receber dois avisos e achar que precisa tomar duas doses.
  unique (dose_id, previsto_para)
);

create index if not exists idx_melhoria_dose_eventos_pendentes
  on melhoria.dose_eventos(previsto_para) where status = 'pendente';

create index if not exists idx_melhoria_dose_eventos_escalonar
  on melhoria.dose_eventos(previsto_para) where status = 'notificado';

create index if not exists idx_melhoria_dose_eventos_perfil_dia
  on melhoria.dose_eventos(perfil_id, previsto_para desc);


-- ── 1.7 Agenda de saúde (Fase 2) ────────────────────────────────────────────
create table if not exists melhoria.agendamentos (
  id              uuid primary key default gen_random_uuid(),
  perfil_id       uuid not null references melhoria.perfis(id) on delete cascade,

  tipo            text not null default 'consulta'
                    check (tipo in ('consulta','exame','vacina','retorno')),
  titulo          text not null,
  especialidade   text,
  profissional    text,
  local           text,
  endereco        text,
  telefone_local  text,

  data_hora       timestamptz not null,
  duracao_min     int not null default 60,

  preparo         text,
  jejum_horas     int,
  levar           text[],

  status          text not null default 'agendado'
                    check (status in ('agendado','confirmado','realizado','cancelado','faltou')),

  google_event_id text,
  origem          text not null default 'manual'
                    check (origem in ('manual','pedido_ia')),
  documento_id    uuid,
  observacoes     text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_melhoria_agendamentos_perfil
  on melhoria.agendamentos(perfil_id, data_hora);


create table if not exists melhoria.agenda_alertas (
  id             uuid primary key default gen_random_uuid(),
  agendamento_id uuid not null references melhoria.agendamentos(id) on delete cascade,
  disparar_em    timestamptz not null,
  tipo           text not null check (tipo in ('7d','1d','3h','1h','preparo')),
  status         text not null default 'pendente'
                   check (status in ('pendente','enviado','cancelado')),
  enviado_em     timestamptz,
  unique (agendamento_id, tipo)
);

create index if not exists idx_melhoria_agenda_alertas_pendentes
  on melhoria.agenda_alertas(disparar_em) where status = 'pendente';


-- ── 1.8 Emergência (Fase 4) ─────────────────────────────────────────────────
create table if not exists melhoria.contatos_emergencia (
  id         uuid primary key default gen_random_uuid(),
  perfil_id  uuid not null references melhoria.perfis(id) on delete cascade,
  nome       text not null,
  telefone   text not null,
  parentesco text,
  ordem      int not null default 1,
  ativo      boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_melhoria_contatos_perfil
  on melhoria.contatos_emergencia(perfil_id, ordem) where ativo;


create table if not exists melhoria.panico_eventos (
  id           uuid primary key default gen_random_uuid(),
  perfil_id    uuid not null references melhoria.perfis(id) on delete cascade,
  disparado_em timestamptz not null default now(),
  origem       text not null default 'botao'
                 check (origem in ('botao','texto','ditado')),
  latitude     double precision,
  longitude    double precision,
  precisao_m   int,

  -- por contato: { nome, telefone, canal, status, erro }
  contatos_notificados       jsonb not null default '[]'::jsonb,
  push_enviados              int not null default 0,
  sms_enviados               int not null default 0,
  sms_bloqueados_sem_credito int not null default 0,

  status       text not null default 'disparado'
                 check (status in ('disparado','cancelado','resolvido')),
  cancelado_em timestamptz
);

create index if not exists idx_melhoria_panico_perfil
  on melhoria.panico_eventos(perfil_id, disparado_em desc);


-- ── 1.9 Antifraude (Fase 3) ─────────────────────────────────────────────────
create table if not exists melhoria.verificacoes (
  id              uuid primary key default gen_random_uuid(),
  perfil_id       uuid not null references melhoria.perfis(id) on delete cascade,
  tipo            text not null
                    check (tipo in ('url','boleto_linha','boleto_imagem','comprovante')),
  entrada         text,

  -- Três estados, e o melhor deles é 'sem_indicios'. NUNCA "é seguro" nem
  -- "pode pagar": falso negativo que leva alguém a pagar boleto falso é dano
  -- concreto.
  veredito        text not null
                    check (veredito in ('sem_indicios','atencao','alto_risco')),
  score           int,
  motivos         jsonb not null default '[]'::jsonb,
  creditos_gastos int not null default 0,
  criado_em       timestamptz not null default now()
);

create index if not exists idx_melhoria_verificacoes_perfil
  on melhoria.verificacoes(perfil_id, criado_em desc);


-- ── 1.10 Documentos digitalizados (dado sensível) ───────────────────────────
create table if not exists melhoria.documentos (
  id           uuid primary key default gen_random_uuid(),
  perfil_id    uuid not null references melhoria.perfis(id) on delete cascade,
  tipo         text not null check (tipo in ('receita','pedido_exame','resultado')),
  storage_path text not null,
  ocr_json     jsonb,
  revisado     boolean not null default false,
  revisado_por uuid references auth.users(id),
  revisado_em  timestamptz,
  criado_em    timestamptz not null default now(),
  -- Retenção: o cron do BLOCO 7 apaga o que passar disso.
  expira_em    timestamptz not null default (now() + interval '24 months')
);

create index if not exists idx_melhoria_documentos_perfil on melhoria.documentos(perfil_id);
create index if not exists idx_melhoria_documentos_expira on melhoria.documentos(expira_em);


-- ── 1.11 Log de acesso do cuidador (LGPD) ───────────────────────────────────
create table if not exists melhoria.acessos_log (
  id        bigserial primary key,
  perfil_id uuid not null references melhoria.perfis(id) on delete cascade,
  user_id   uuid references auth.users(id) on delete set null,
  recurso   text not null,
  acao      text not null,
  criado_em timestamptz not null default now()
);

create index if not exists idx_melhoria_acessos_perfil
  on melhoria.acessos_log(perfil_id, criado_em desc);


-- ════════════════════════════════════════════════════════════════════════════
-- BLOCO 2 — ⚠️ TROQUE ESTE VALOR ANTES DE RODAR
-- ════════════════════════════════════════════════════════════════════════════
-- Segredo compartilhado entre o pg_cron e a edge function.
--
-- Por que não usar current_setting('app.supabase_url') / 'app.service_role_key':
-- esse parâmetro NÃO EXISTE neste banco. É exatamente por isso que os jobs
-- 'check-expired-plans' e 'alerta-certificado-nfe' falham em TODA execução com
--   ERROR: unrecognized configuration parameter "app.supabase_url"
-- ('check-links-weekly' usa o mesmo padrão e tem o mesmo problema.)
-- O padrão que funciona aqui é segredo + header, igual ao 'arte-uploads-cleanup'.
--
-- Gere um valor com:  openssl rand -hex 32
-- Guarde-o: vira a env MELHORIA_CRON_SECRET da edge function (BLOCO 10.3).

do $$
declare
  v_segredo text := 'TROQUE_ESTE_VALOR';
begin
  if v_segredo = 'TROQUE_ESTE_VALOR' or length(v_segredo) < 32 then
    raise exception
      'BLOCO 2: gere um segredo com "openssl rand -hex 32" e troque v_segredo antes de rodar.';
  end if;

  insert into melhoria.segredos_internos (chave, segredo, descricao)
  values ('cron_secret', v_segredo, 'Header x-melhoria-secret usado pelo pg_cron')
  on conflict (chave) do update set segredo = excluded.segredo;
end $$;


-- ════════════════════════════════════════════════════════════════════════════
-- BLOCO 3 — Segmento (FK de companies.segment_key)
-- ════════════════════════════════════════════════════════════════════════════
-- companies.segment_key referencia assistant_segments. Sem esta linha, a RPC
-- do BLOCO 4 falha na inserção. pix_wiki = 100, consultatec = 101.

insert into public.assistant_segments
  (segment_key, label, emoji, description, function_keys, function_keys_vendas,
   is_active, sort_order)
values
  ('melhoria', 'MelhorIA', '💚',
   'Assistente de lembretes e segurança para a melhor idade, criado via melhoria.org',
   '["lembrete_remedios","criar_lembrete","lista_compras","identificar_fraude","enviar_sms","agendar_compromisso","ver_agenda"]'::jsonb,
   '[]'::jsonb,
   true, 102)
on conflict (segment_key) do update
  set label       = excluded.label,
      emoji       = excluded.emoji,
      description = excluded.description,
      is_active   = true;


-- ════════════════════════════════════════════════════════════════════════════
-- BLOCO 4 — Company por usuário
-- ════════════════════════════════════════════════════════════════════════════
-- Mesmo padrão de ensure_my_consultatec_company_v2 e ensure_my_arte_company.
-- O advisory lock não é enfeite: sem ele, getUser() e onAuthStateChange()
-- chamando a RPC ao mesmo tempo criam DUAS companies para o mesmo usuário.
--
-- Créditos: nada a configurar aqui. cobrar_credito_se_suficiente já resolve o
-- user_id a partir da company e debita user_credits — os créditos já são por
-- usuário. O SMS fica em 2 créditos, valor global de assistant_functions,
-- igual à minhAi.

create or replace function public.ensure_my_melhoria_company()
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid  uuid := auth.uid();
  v_id   uuid;
  v_slug text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));

  select id into v_id
    from public.companies
   where user_id = v_uid
     and segment_key = 'melhoria'
   order by created_at asc
   limit 1;

  if v_id is null then
    v_slug := 'melhoria-' || replace(v_uid::text, '-', '');

    insert into public.companies (
      name, slug, user_id, assistant_type, is_active, is_public,
      webapp_enabled, segment_key
    ) values (
      'MelhorIA', v_slug, v_uid, 'smart', true, false, false, 'melhoria'
    )
    returning id into v_id;
  end if;

  -- Perfil: 1 por company. O nome real vem no onboarding.
  insert into melhoria.perfis (company_id, user_id, nome)
  values (v_id, v_uid, 'Meu perfil')
  on conflict (company_id) do nothing;

  return v_id;
end;
$function$;

grant execute on function public.ensure_my_melhoria_company() to authenticated;


-- Atalho: o perfil do usuário logado, sem o app precisar de dois round-trips.
create or replace function public.melhoria_meu_perfil()
returns uuid
language sql
stable
security definer
set search_path to 'public'
as $$
  select p.id
    from melhoria.perfis p
    join public.companies c on c.id = p.company_id
   where c.user_id = auth.uid()
   limit 1;
$$;

grant execute on function public.melhoria_meu_perfil() to authenticated;


-- ════════════════════════════════════════════════════════════════════════════
-- BLOCO 5 — RLS
-- ════════════════════════════════════════════════════════════════════════════

-- Quem enxerga um perfil: o dono da company, ou um cuidador ativo.
create or replace function melhoria.pode_ver_perfil(p_perfil_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'melhoria, public'
as $$
  select exists (
    select 1
      from melhoria.perfis p
      join public.companies c on c.id = p.company_id
     where p.id = p_perfil_id
       and c.user_id = auth.uid()
  )
  or exists (
    select 1
      from melhoria.cuidadores cu
     where cu.perfil_id = p_perfil_id
       and cu.user_id = auth.uid()
       and cu.status = 'ativo'
  );
$$;

create or replace function melhoria.pode_editar_perfil(p_perfil_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'melhoria, public'
as $$
  select exists (
    select 1
      from melhoria.perfis p
      join public.companies c on c.id = p.company_id
     where p.id = p_perfil_id
       and c.user_id = auth.uid()
  )
  or exists (
    select 1
      from melhoria.cuidadores cu
     where cu.perfil_id = p_perfil_id
       and cu.user_id = auth.uid()
       and cu.status = 'ativo'
       and cu.pode_editar
  );
$$;

grant execute on function melhoria.pode_ver_perfil(uuid)    to authenticated;
grant execute on function melhoria.pode_editar_perfil(uuid) to authenticated;


alter table melhoria.segredos_internos    enable row level security;
alter table melhoria.perfis               enable row level security;
alter table melhoria.cuidadores           enable row level security;
alter table melhoria.medicamentos         enable row level security;
alter table melhoria.doses                enable row level security;
alter table melhoria.dose_eventos         enable row level security;
alter table melhoria.agendamentos         enable row level security;
alter table melhoria.agenda_alertas       enable row level security;
alter table melhoria.contatos_emergencia  enable row level security;
alter table melhoria.panico_eventos       enable row level security;
alter table melhoria.verificacoes         enable row level security;
alter table melhoria.documentos           enable row level security;
alter table melhoria.acessos_log          enable row level security;

-- segredos_internos: RLS ligada e SEM policy nenhuma = ninguém lê pelo
-- PostgREST. Só service_role, que ignora RLS.


-- perfis
drop policy if exists perfis_select on melhoria.perfis;
create policy perfis_select on melhoria.perfis for select to authenticated
  using (melhoria.pode_ver_perfil(id));

drop policy if exists perfis_update on melhoria.perfis;
create policy perfis_update on melhoria.perfis for update to authenticated
  using (melhoria.pode_editar_perfil(id))
  with check (melhoria.pode_editar_perfil(id));


-- cuidadores: administra quem é dono da company; o cuidador enxerga o próprio
-- vínculo
drop policy if exists cuidadores_all on melhoria.cuidadores;
create policy cuidadores_all on melhoria.cuidadores for all to authenticated
  using (
    exists (
      select 1 from melhoria.perfis p
        join public.companies c on c.id = p.company_id
       where p.id = cuidadores.perfil_id and c.user_id = auth.uid()
    )
    or cuidadores.user_id = auth.uid()
  )
  with check (
    exists (
      select 1 from melhoria.perfis p
        join public.companies c on c.id = p.company_id
       where p.id = cuidadores.perfil_id and c.user_id = auth.uid()
    )
  );


-- Tabelas ligadas direto a perfil_id
do $$
declare t text;
begin
  foreach t in array array[
    'medicamentos','agendamentos','contatos_emergencia',
    'panico_eventos','verificacoes','documentos'
  ]
  loop
    execute format('drop policy if exists %I on melhoria.%I', t || '_select', t);
    execute format(
      'create policy %I on melhoria.%I for select to authenticated
         using (melhoria.pode_ver_perfil(perfil_id))', t || '_select', t);

    execute format('drop policy if exists %I on melhoria.%I', t || '_write', t);
    execute format(
      'create policy %I on melhoria.%I for all to authenticated
         using (melhoria.pode_editar_perfil(perfil_id))
         with check (melhoria.pode_editar_perfil(perfil_id))', t || '_write', t);
  end loop;
end $$;


-- doses: herda de medicamentos
drop policy if exists doses_select on melhoria.doses;
create policy doses_select on melhoria.doses for select to authenticated
  using (exists (
    select 1 from melhoria.medicamentos m
     where m.id = doses.medicamento_id and melhoria.pode_ver_perfil(m.perfil_id)
  ));

drop policy if exists doses_write on melhoria.doses;
create policy doses_write on melhoria.doses for all to authenticated
  using (exists (
    select 1 from melhoria.medicamentos m
     where m.id = doses.medicamento_id and melhoria.pode_editar_perfil(m.perfil_id)
  ))
  with check (exists (
    select 1 from melhoria.medicamentos m
     where m.id = doses.medicamento_id and melhoria.pode_editar_perfil(m.perfil_id)
  ));


-- dose_eventos: ler e confirmar. INSERT é só do cron (service_role).
drop policy if exists dose_eventos_select on melhoria.dose_eventos;
create policy dose_eventos_select on melhoria.dose_eventos for select to authenticated
  using (melhoria.pode_ver_perfil(perfil_id));

drop policy if exists dose_eventos_update on melhoria.dose_eventos;
create policy dose_eventos_update on melhoria.dose_eventos for update to authenticated
  using (melhoria.pode_editar_perfil(perfil_id))
  with check (melhoria.pode_editar_perfil(perfil_id));


-- agenda_alertas: herda de agendamentos
drop policy if exists agenda_alertas_select on melhoria.agenda_alertas;
create policy agenda_alertas_select on melhoria.agenda_alertas for select to authenticated
  using (exists (
    select 1 from melhoria.agendamentos a
     where a.id = agenda_alertas.agendamento_id and melhoria.pode_ver_perfil(a.perfil_id)
  ));


-- acessos_log: leitura pelo dono
drop policy if exists acessos_log_select on melhoria.acessos_log;
create policy acessos_log_select on melhoria.acessos_log for select to authenticated
  using (melhoria.pode_ver_perfil(perfil_id));


-- ════════════════════════════════════════════════════════════════════════════
-- BLOCO 6 — Materialização das doses
-- ════════════════════════════════════════════════════════════════════════════
-- Gera as ocorrências dos próximos N dias. Roda por cron diário e também no
-- momento do cadastro — sem isso, quem cadastra às 7h50 um remédio das 8h só
-- recebe o lembrete no dia seguinte.

create or replace function melhoria.materializar_doses(
  p_dias      int  default 7,
  p_perfil_id uuid default null
)
returns int
language plpgsql
security definer
set search_path to 'melhoria, public'
as $$
declare
  v_criados int := 0;
begin
  with grade as (
    select
      d.id        as dose_id,
      p.id        as perfil_id,
      p.timezone  as tz,
      d.horario   as horario,
      d.dias_semana as dias_semana,
      m.data_inicio as data_inicio,
      m.data_fim    as data_fim,
      g::date     as dia
    from melhoria.doses d
    join melhoria.medicamentos m on m.id = d.medicamento_id
    join melhoria.perfis       p on p.id = m.perfil_id
    cross join lateral generate_series(
      (now() at time zone p.timezone)::date,
      (now() at time zone p.timezone)::date + (p_dias || ' days')::interval,
      interval '1 day'
    ) as g
    where d.ativo
      and m.ativo
      and m.revisado                       -- receita por foto exige revisão humana
      and (p_perfil_id is null or p.id = p_perfil_id)
  ),
  validos as (
    select
      dose_id,
      perfil_id,
      ((dia + horario) at time zone tz) as previsto_para
    from grade
    where extract(dow from dia)::int = any(dias_semana)
      and dia >= data_inicio
      and (data_fim is null or dia <= data_fim)
  ),
  inseridos as (
    insert into melhoria.dose_eventos (dose_id, perfil_id, previsto_para)
    select dose_id, perfil_id, previsto_para
      from validos
     where previsto_para > now() - interval '10 minutes'
    on conflict (dose_id, previsto_para) do nothing
    returning 1
  )
  select count(*) into v_criados from inseridos;

  return v_criados;
end;
$$;

grant execute on function melhoria.materializar_doses(int, uuid) to authenticated, service_role;


create or replace function melhoria.tg_materializar_ao_criar_dose()
returns trigger
language plpgsql
security definer
set search_path to 'melhoria, public'
as $$
declare v_perfil uuid;
begin
  select m.perfil_id into v_perfil
    from melhoria.medicamentos m
   where m.id = new.medicamento_id;

  perform melhoria.materializar_doses(7, v_perfil);
  return new;
end;
$$;

drop trigger if exists trg_melhoria_materializar on melhoria.doses;
create trigger trg_melhoria_materializar
  after insert or update of horario, dias_semana, ativo on melhoria.doses
  for each row execute function melhoria.tg_materializar_ao_criar_dose();


-- Marca como 'perdido' o que passou de 2h sem confirmação. Sem isto, o app
-- mostra dose de ontem como pendente e a pessoa toma remédio fora de hora.
create or replace function melhoria.marcar_perdidos()
returns int
language sql
security definer
set search_path to 'melhoria, public'
as $$
  with u as (
    update melhoria.dose_eventos
       set status = 'perdido'
     where status in ('pendente','notificado')
       and previsto_para < now() - interval '2 hours'
    returning 1
  )
  select coalesce(count(*)::int, 0) from u;
$$;


-- updated_at
create or replace function melhoria.tg_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array['perfis','medicamentos','agendamentos'] loop
    execute format('drop trigger if exists %I on melhoria.%I', 'trg_' || t || '_updated', t);
    execute format(
      'create trigger %I before update on melhoria.%I
         for each row execute function melhoria.tg_updated_at()',
      'trg_' || t || '_updated', t);
  end loop;
end $$;


-- ════════════════════════════════════════════════════════════════════════════
-- BLOCO 7 — Cron
-- ════════════════════════════════════════════════════════════════════════════
-- URL do vault (secret 'project_url', já existe) + header com o segredo do
-- BLOCO 2. Mesmo formato do 'arte-uploads-cleanup', que funciona.

do $$
declare j text;
begin
  foreach j in array array[
    'melhoria-disparar-lembretes','melhoria-materializar-doses',
    'melhoria-marcar-perdidos','melhoria-limpar-documentos'
  ]
  loop
    if exists (select 1 from cron.job where jobname = j) then
      perform cron.unschedule(j);
    end if;
  end loop;
end $$;


-- A cada minuto: dispara push e escalona
select cron.schedule(
  'melhoria-disparar-lembretes',
  '* * * * *',
  $cron$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
             || '/functions/v1/melhoria-disparar-lembretes',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-melhoria-secret',
        (select segredo from melhoria.segredos_internos where chave = 'cron_secret')
      ),
      body := '{}'::jsonb
    );
  $cron$
);

-- Todo dia às 3h05 (fora do pico dos outros jobs das 3h)
select cron.schedule(
  'melhoria-materializar-doses', '5 3 * * *',
  $cron$ select melhoria.materializar_doses(7); $cron$
);

select cron.schedule(
  'melhoria-marcar-perdidos', '*/15 * * * *',
  $cron$ select melhoria.marcar_perdidos(); $cron$
);

-- Retenção LGPD
select cron.schedule(
  'melhoria-limpar-documentos', '25 3 * * *',
  $cron$ delete from melhoria.documentos where expira_em < now(); $cron$
);


-- ════════════════════════════════════════════════════════════════════════════
-- BLOCO 8 — Pacotes de crédito
-- ════════════════════════════════════════════════════════════════════════════
-- ATENÇÃO: credits_packages.package_type tem CHECK que só aceita 'credits' e
-- 'monthly'. Sem o ALTER abaixo, o INSERT falha. O ALTER é aditivo: não afeta
-- nenhuma linha nem nenhuma marca existente.

alter table public.credits_packages
  drop constraint if exists credits_packages_package_type_check;

alter table public.credits_packages
  add constraint credits_packages_package_type_check
  check (package_type::text in ('credits','monthly','melhoria'));


-- Referência de consumo: SMS custa 2 créditos POR DESTINATÁRIO, então um
-- disparo de pânico com 3 contatos gasta 6. "Família" dá 25 disparos completos.
insert into public.credits_packages
  (name, description, interactions, price_cents, price_per_interaction,
   package_type, is_active, is_highlighted, display_order)
select v.name, v.description, v.interactions, v.price_cents,
       v.price_per_interaction, 'melhoria', true, v.destaque, v.ordem
from (values
  ('MelhorIA Boas-vindas', 'Créditos de cortesia no cadastro',
     15,  0,    0.0::numeric,    false, 200),
  ('MelhorIA Cuidar', 'Para quem usa a câmera e o SMS de vez em quando',
     60,  990,  0.165::numeric,  false, 201),
  ('MelhorIA Família', 'O mais escolhido por quem cuida dos pais',
     150, 1990, 0.1327::numeric, true,  202),
  ('MelhorIA Família+', 'Mensal, para acompanhar duas pessoas',
     400, 3990, 0.0998::numeric, false, 203)
) as v(name, description, interactions, price_cents,
       price_per_interaction, destaque, ordem)
where not exists (
  select 1 from public.credits_packages cp where cp.name = v.name
);


-- ════════════════════════════════════════════════════════════════════════════
-- BLOCO 9 — Grants (PostgREST)
-- ════════════════════════════════════════════════════════════════════════════

grant usage on schema melhoria to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema melhoria to authenticated;
grant all on all tables    in schema melhoria to service_role;
grant all on all sequences in schema melhoria to authenticated, service_role;

-- O grant acima é em bloco; a tabela de segredos sai da lista na marra.
revoke all on melhoria.segredos_internos from anon, authenticated;

alter default privileges in schema melhoria
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema melhoria
  grant all on tables to service_role;
alter default privileges in schema melhoria
  grant all on sequences to authenticated, service_role;


-- ════════════════════════════════════════════════════════════════════════════
-- BLOCO 10 — DEPOIS DE RODAR: passos no painel
-- ════════════════════════════════════════════════════════════════════════════
--
-- 10.1  ⚠️ OBRIGATÓRIO — Settings → API → Exposed schemas
--       Acrescente 'melhoria' à lista (deve ficar: public, graphql_public,
--       conviteria, melhoria). Sem isso o PostgREST devolve 404 em TODAS as
--       tabelas do schema e o app não abre. É o erro nº 1 de schema dedicado.
--
--       No cliente: createClient(url, key, { db: { schema: 'melhoria' } })
--       ou .schema('melhoria') por consulta.
--
-- 10.2  Authentication → URL Configuration → Redirect URLs
--       Acrescente:  https://melhoria.org/**
--
-- 10.3  Edge Functions → melhoria-disparar-lembretes
--         - verify_jwt = false
--         - MELHORIA_CRON_SECRET  = o valor do BLOCO 2
--         - ONESIGNAL_APP_ID      (já existe no projeto)
--         - ONESIGNAL_REST_API_KEY (já existe no projeto)
--
-- 10.4  Storage → New bucket
--       Nome: melhoria-documentos — PRIVADO. Guarda receita e exame, dado
--       sensível do art. 11 da LGPD. Nunca público.


-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare
  v_tabelas int;
  v_jobs    int;
  v_pacotes int;
begin
  select count(*) into v_tabelas from information_schema.tables where table_schema = 'melhoria';
  select count(*) into v_jobs    from cron.job where jobname like 'melhoria-%';
  select count(*) into v_pacotes from public.credits_packages where package_type = 'melhoria';

  raise notice '─────────────────────────────────────────────';
  raise notice '  MelhorIA — a IA da Melhor Idade!';
  raise notice '  tabelas no schema melhoria : %  (esperado 13)', v_tabelas;
  raise notice '  cron jobs melhoria-*       : %  (esperado 4)',  v_jobs;
  raise notice '  pacotes de crédito         : %  (esperado 4)',  v_pacotes;
  raise notice '  segmento                   : %',
    (select label from public.assistant_segments where segment_key = 'melhoria');
  raise notice '';
  raise notice '  >>> AGORA FAÇA O BLOCO 10.1 (Exposed schemas) <<<';
  raise notice '─────────────────────────────────────────────';

  if v_tabelas <> 13 or v_jobs <> 4 then
    raise warning 'Contagem fora do esperado — revise os erros acima antes de seguir.';
  end if;
end $$;
