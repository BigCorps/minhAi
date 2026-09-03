alter table public.pixwiki_fast_watch_state
  add column if not exists last_webhook_at timestamptz,
  add column if not exists last_webhook_payment_id text,
  add column if not exists last_webhook_handled boolean,
  add column if not exists last_webhook_reason text;
