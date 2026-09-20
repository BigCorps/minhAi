-- ConviteIA — identificação do RSVP + idade de crianças
-- Seguro para dados existentes: não reinterpreta confirmações, não altera tokens/QR
-- e não preenche idades antigas automaticamente.

alter table conviteria.convidados_lista
  add column if not exists idade smallint;

alter table conviteria.convidados
  add column if not exists telefone text,
  add column if not exists telefone_normalizado text,
  add column if not exists acompanhantes_detalhes jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'convidados_lista_idade_check'
      and conrelid = 'conviteria.convidados_lista'::regclass
  ) then
    alter table conviteria.convidados_lista
      add constraint convidados_lista_idade_check
      check (idade is null or (tipo = 'crianca' and idade between 1 and 12));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'convidados_acompanhantes_detalhes_array_check'
      and conrelid = 'conviteria.convidados'::regclass
  ) then
    alter table conviteria.convidados
      add constraint convidados_acompanhantes_detalhes_array_check
      check (jsonb_typeof(acompanhantes_detalhes) = 'array');
  end if;
end $$;

create index if not exists convidados_evento_telefone_idx
  on conviteria.convidados (evento_id, telefone_normalizado)
  where telefone_normalizado is not null;
