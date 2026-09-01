-- ============================================================================
-- MelhorIA — Fase 6: painel da família
--
-- Rode depois das fases anteriores. Idempotente.
-- A tabela melhoria.cuidadores já existe desde a Fase 0; aqui entram o fluxo
-- de convite e as consultas de aderência.
-- ============================================================================


-- ════════════════════════════════════════════════════════════════════════════
-- BLOCO 1 — Convite de cuidador
-- ════════════════════════════════════════════════════════════════════════════

-- Criar convite. Devolve o token, que vira o link.
create or replace function public.melhoria_criar_convite(
  p_nome       text,
  p_parentesco text default null,
  p_pode_editar boolean default true
)
returns table (convite_id uuid, token text, expira_em timestamptz)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_perfil uuid;
  v_token  text;
  v_id     uuid;
  v_expira timestamptz := now() + interval '7 days';
begin
  select p.id into v_perfil
    from melhoria.perfis p
    join public.companies c on c.id = p.company_id
   where c.user_id = auth.uid()
   limit 1;

  if v_perfil is null then
    raise exception 'perfil não encontrado';
  end if;

  -- 32 bytes de aleatoriedade. gen_random_uuid() seria previsível demais para
  -- um token que dá acesso a dado de saúde por 7 dias.
  v_token := encode(gen_random_bytes(32), 'hex');

  insert into melhoria.cuidadores
    (perfil_id, nome, parentesco, pode_editar, status, convite_token, convite_expira_em)
  values
    (v_perfil, p_nome, p_parentesco, p_pode_editar, 'convidado', v_token, v_expira)
  returning id into v_id;

  return query select v_id, v_token, v_expira;
end;
$$;

grant execute on function public.melhoria_criar_convite(text, text, boolean) to authenticated;


-- Aceitar convite. Roda com o usuário JÁ LOGADO (o cuidador).
create or replace function public.melhoria_aceitar_convite(p_token text)
returns table (ok boolean, mensagem text, perfil_nome text)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_cuidador record;
  v_nome     text;
begin
  if auth.uid() is null then
    return query select false, 'Você precisa entrar na sua conta primeiro.'::text, null::text;
    return;
  end if;

  select * into v_cuidador
    from melhoria.cuidadores
   where convite_token = p_token
   limit 1;

  if not found then
    return query select false, 'Este convite não existe.'::text, null::text;
    return;
  end if;

  if v_cuidador.status = 'ativo' then
    return query select false, 'Este convite já foi usado.'::text, null::text;
    return;
  end if;

  if v_cuidador.convite_expira_em < now() then
    return query select false, 'Este convite venceu. Peça um novo.'::text, null::text;
    return;
  end if;

  -- O dono do perfil não pode virar cuidador de si mesmo: ele já tem acesso
  -- total, e o vínculo duplicado bagunçaria a contagem de escalonamento.
  if exists (
    select 1 from melhoria.perfis p
      join public.companies c on c.id = p.company_id
     where p.id = v_cuidador.perfil_id and c.user_id = auth.uid()
  ) then
    return query select false, 'Este convite é para outra pessoa acompanhar você.'::text, null::text;
    return;
  end if;

  update melhoria.cuidadores
     set user_id       = auth.uid(),
         status        = 'ativo',
         aceito_em     = now(),
         convite_token = null      -- token de uso único
   where id = v_cuidador.id;

  select p.nome into v_nome from melhoria.perfis p where p.id = v_cuidador.perfil_id;

  return query select true, 'Pronto! Agora você acompanha ' || v_nome || '.', v_nome;
end;
$$;

grant execute on function public.melhoria_aceitar_convite(text) to authenticated;


-- Convite não aceito perde a validade. Sem isso, um link vazado continua
-- servindo para sempre.
select cron.unschedule('melhoria-limpar-convites')
  where exists (select 1 from cron.job where jobname = 'melhoria-limpar-convites');

select cron.schedule(
  'melhoria-limpar-convites', '50 3 * * *',
  $cron$
    update melhoria.cuidadores
       set status = 'removido', convite_token = null
     where status = 'convidado' and convite_expira_em < now();
  $cron$
);


-- ════════════════════════════════════════════════════════════════════════════
-- BLOCO 2 — Aderência
-- ════════════════════════════════════════════════════════════════════════════
-- Este é o número que faz alguém pagar todo mês. Não é o alarme — é o
-- "papai tomou 94% dos remédios essa semana".
--
-- Só conta o que já venceu: dose de amanhã não é falta.

create or replace function public.melhoria_aderencia(
  p_perfil_id uuid,
  p_dias      int default 7
)
returns table (
  total       int,
  tomados     int,
  pulados     int,
  perdidos    int,
  pendentes   int,
  percentual  int
)
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if not melhoria.pode_ver_perfil(p_perfil_id) then
    raise exception 'sem permissão';
  end if;

  return query
  with janela as (
    select e.status
      from melhoria.dose_eventos e
     where e.perfil_id = p_perfil_id
       and e.previsto_para >= now() - (p_dias || ' days')::interval
       and e.previsto_para <= now()          -- o futuro não é falta
  ),
  contagem as (
    select
      count(*)::int                                          as total,
      count(*) filter (where status = 'tomado')::int          as tomados,
      count(*) filter (where status = 'pulado')::int          as pulados,
      count(*) filter (where status = 'perdido')::int         as perdidos,
      count(*) filter (where status in ('pendente','notificado'))::int as pendentes
    from janela
  )
  select
    c.total, c.tomados, c.pulados, c.perdidos, c.pendentes,
    case when c.total = 0 then 0
         else round(c.tomados::numeric * 100 / c.total)::int end
  from contagem c;
end;
$$;

grant execute on function public.melhoria_aderencia(uuid, int) to authenticated;


-- Perfis que o usuário logado acompanha (como cuidador ou como dono).
create or replace function public.melhoria_meus_acompanhados()
returns table (
  perfil_id    uuid,
  nome         text,
  eh_dono      boolean,
  pode_editar  boolean
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select p.id, p.nome, true, true
    from melhoria.perfis p
    join public.companies c on c.id = p.company_id
   where c.user_id = auth.uid()

  union all

  select p.id, p.nome, false, cu.pode_editar
    from melhoria.cuidadores cu
    join melhoria.perfis p on p.id = cu.perfil_id
   where cu.user_id = auth.uid() and cu.status = 'ativo';
$$;

grant execute on function public.melhoria_meus_acompanhados() to authenticated;


-- ════════════════════════════════════════════════════════════════════════════
-- BLOCO 3 — Log de acesso do cuidador (LGPD)
-- ════════════════════════════════════════════════════════════════════════════
-- O cuidador é um TERCEIRO vendo dado de saúde do titular. O aviso de
-- privacidade promete que esse acesso é registrado — esta função cumpre.

create or replace function public.melhoria_registrar_acesso(
  p_perfil_id uuid,
  p_recurso   text,
  p_acao      text default 'visualizou'
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not melhoria.pode_ver_perfil(p_perfil_id) then
    return;   -- silencioso: não é erro de aplicação
  end if;

  -- Não registra o dono olhando os próprios dados: log de auditoria só faz
  -- sentido para acesso de terceiro, e o ruído esconderia o que importa.
  if exists (
    select 1 from melhoria.perfis p
      join public.companies c on c.id = p.company_id
     where p.id = p_perfil_id and c.user_id = auth.uid()
  ) then
    return;
  end if;

  insert into melhoria.acessos_log (perfil_id, user_id, recurso, acao)
  values (p_perfil_id, auth.uid(), p_recurso, p_acao);
end;
$$;

grant execute on function public.melhoria_registrar_acesso(uuid, text, text) to authenticated;


-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare v_fn int; v_jobs int;
begin
  select count(*) into v_fn
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname like 'melhoria_%';

  select count(*) into v_jobs from cron.job where jobname like 'melhoria-%';

  raise notice '─────────────────────────────────────────────';
  raise notice '  MelhorIA — Fase 6 aplicada';
  raise notice '  funções melhoria_* : %  (esperado 8)', v_fn;
  raise notice '  cron jobs          : %  (esperado 8)', v_jobs;
  raise notice '─────────────────────────────────────────────';
end $$;
