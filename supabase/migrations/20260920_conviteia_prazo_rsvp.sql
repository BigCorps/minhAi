-- ConviteIA — prazo real para confirmação de presença
-- Base esperada: Gestão do Evento + WhatsApp do Evento já aplicados.
-- Seguro para famílias, convidados, QR tokens e confirmações existentes.
-- Não migra nem altera dados de convidados.

begin;

alter table conviteria.evento_gestao_config
  add column if not exists rsvp_prazo date null;

comment on column conviteria.evento_gestao_config.rsvp_prazo is
  'Último dia em que o RSVP público pode ser confirmado ou alterado. O dia inteiro é válido no fuso America/Sao_Paulo. NULL mantém o RSVP sem encerramento automático.';

commit;
