-- Já aplicada em produção.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname='supabase_realtime'
      and schemaname='public'
      and tablename='mp_received_payments'
  ) then
    alter publication supabase_realtime add table public.mp_received_payments;
  end if;
end $$;
