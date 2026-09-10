-- Estado de retentativa do push enviado aos cuidadores após atraso da dose.
alter table melhoria.dose_eventos
  add column if not exists cuidador_push_tentativas smallint not null default 0,
  add column if not exists cuidador_push_ultima_tentativa_em timestamptz,
  add column if not exists cuidador_push_erro text;
