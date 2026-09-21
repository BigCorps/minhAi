-- ConviteIA — comprovantes das comunicações do WhatsApp do Evento
-- 2026-09-21
-- Aditivo e idempotente: não altera dados existentes nem o limite de mensagens.

alter table conviteria.evento_whatsapp_config
  add column if not exists comprovante_telefone text null,
  add column if not exists primeiro_comprovante_em timestamptz null,
  add column if not exists primeiro_comprovante_wamid text null,
  add column if not exists primeiro_comprovante_erro text null,
  add column if not exists segundo_comprovante_em timestamptz null,
  add column if not exists segundo_comprovante_wamid text null,
  add column if not exists segundo_comprovante_erro text null;

comment on column conviteria.evento_whatsapp_config.comprovante_telefone is
  'WhatsApp do criador/anfitrião que recebe comprovantes das rodadas do WhatsApp do Evento. Armazenado em formato internacional somente com dígitos.';
comment on column conviteria.evento_whatsapp_config.primeiro_comprovante_em is
  'Momento em que o comprovante da primeira comunicação foi aceito pela Meta.';
comment on column conviteria.evento_whatsapp_config.segundo_comprovante_em is
  'Momento em que o comprovante da segunda comunicação foi aceito pela Meta.';
comment on column conviteria.evento_whatsapp_config.primeiro_comprovante_erro is
  'Último erro ao tentar enviar o comprovante da primeira comunicação.';
comment on column conviteria.evento_whatsapp_config.segundo_comprovante_erro is
  'Último erro ao tentar enviar o comprovante da segunda comunicação.';
