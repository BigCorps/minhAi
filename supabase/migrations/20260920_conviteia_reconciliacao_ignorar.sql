-- ConviteIA — permitir ignorar de forma segura uma confirmação histórica
-- que não deve ser vinculada à nova Central de convidados.
-- Não remove o histórico e não altera família, convidado, RSVP ou QR.

alter table conviteria.convidados
  add column if not exists conciliacao_ignorada_em timestamptz;

create index if not exists convidados_conciliacao_pendente_idx
  on conviteria.convidados (evento_id, created_at)
  where teste_id is null
    and familia_lista_id is null
    and convidado_lista_id is null
    and conciliacao_ignorada_em is null;
