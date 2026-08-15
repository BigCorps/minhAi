-- ConviteIA — 12º tipo de evento: Formatura
-- Execute uma vez no SQL Editor do Supabase.
-- Idempotente: pode ser executado novamente.

insert into conviteria.tipos_evento
  (id, nome, secoes_padrao, ordem, ativo, grupo)
values
  (
    'formatura',
    'Formatura',
    array['capa','musica','contagem','local','rsvp','presentes','recados']::text[],
    90,
    true,
    'happy_hour'
  )
on conflict (id) do update set
  nome = excluded.nome,
  secoes_padrao = excluded.secoes_padrao,
  ordem = excluded.ordem,
  ativo = true,
  grupo = excluded.grupo;

update conviteria.tipos_evento set ordem = 100 where id = 'happy-hour';
update conviteria.tipos_evento set ordem = 110 where id = 'confraternizacao';
update conviteria.tipos_evento set ordem = 120 where id = 'vaquinha';
