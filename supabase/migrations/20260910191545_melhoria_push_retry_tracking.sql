-- Estado de retentativa para push do titular e alertas de agenda.
alter table melhoria.dose_eventos
  add column if not exists push_tentativas smallint not null default 0,
  add column if not exists push_ultima_tentativa_em timestamptz,
  add column if not exists push_erro text;

alter table melhoria.agenda_alertas
  add column if not exists push_tentativas smallint not null default 0,
  add column if not exists push_ultima_tentativa_em timestamptz,
  add column if not exists push_erro text;
