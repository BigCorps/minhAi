-- ConviteIA — Memórias do Evento — desafios públicos
-- Execute UMA vez antes de publicar o frontend deste patch.
-- Migration aditiva: não altera fotos, vídeos, pagamentos nem convites existentes.

begin;

alter table conviteria.evento_memorias_config
  add column if not exists desafios_ativos boolean not null default false,
  add column if not exists desafios_titulo text not null default 'Desafio',
  add column if not exists desafios_ids text[] not null default '{}'::text[];

-- Limites defensivos para impedir configurações anormais via acesso administrativo.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'evento_memorias_desafios_titulo_chk'
      and conrelid = 'conviteria.evento_memorias_config'::regclass
  ) then
    alter table conviteria.evento_memorias_config
      add constraint evento_memorias_desafios_titulo_chk
      check (char_length(desafios_titulo) between 1 and 40);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'evento_memorias_desafios_qtd_chk'
      and conrelid = 'conviteria.evento_memorias_config'::regclass
  ) then
    alter table conviteria.evento_memorias_config
      add constraint evento_memorias_desafios_qtd_chk
      check (coalesce(array_length(desafios_ids, 1), 0) <= 9);
  end if;
end $$;

commit;
