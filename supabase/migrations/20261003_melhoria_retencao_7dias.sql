-- MelhorIA — Gate comercial + retenção
-- Preferências de retorno, redefinição prática de ativação e cron do lembrete diário.

alter table melhoria.perfis
  add column if not exists notificacoes_ativadas_em timestamptz,
  add column if not exists lembrete_diario_ativo boolean not null default false,
  add column if not exists lembrete_diario_horario time not null default '09:00:00',
  add column if not exists lembrete_diario_ultimo_envio date;

comment on column melhoria.perfis.notificacoes_ativadas_em is
  'Primeira confirmação persistida de permissão de notificação no MelhorIA.';
comment on column melhoria.perfis.lembrete_diario_ativo is
  'Opt-in explícito para lembrete genérico diário de retorno ao MelhorIA.';
comment on column melhoria.perfis.lembrete_diario_horario is
  'Horário local escolhido pelo usuário para o lembrete diário genérico.';
comment on column melhoria.perfis.lembrete_diario_ultimo_envio is
  'Data local do último lembrete diário enviado; evita duplicidade.';

-- A partir deste gate, onboarding_completo passa a significar que o usuário já
-- configurou pelo menos um medicamento/lembrete. Mantemos compatibilidade com
-- perfis antigos e corrigimos o histórico existente.
update melhoria.perfis p
set onboarding_completo = true
where onboarding_completo = false
  and exists (
    select 1 from melhoria.medicamentos m where m.perfil_id = p.id
  );

-- Recriar o job é seguro: cron.schedule com o mesmo nome substitui o job.
select cron.schedule(
  'melhoria-engajamento-diario',
  '*/5 * * * *',
  $cron$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
             || '/functions/v1/melhoria-engajamento-diario',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-melhoria-secret',
        (select segredo from melhoria.segredos_internos where chave = 'cron_secret')
      ),
      body := '{}'::jsonb
    );
  $cron$
);
