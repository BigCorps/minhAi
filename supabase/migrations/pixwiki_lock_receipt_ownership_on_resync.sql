-- Já aplicada em produção.
create or replace function public.pixwiki_preserve_receipt_ownership()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.mp_payment_id = old.mp_payment_id then
    new.user_id := old.user_id;
    new.company_id := old.company_id;
    new.mp_connection_id := old.mp_connection_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_pixwiki_preserve_receipt_ownership on public.mp_received_payments;
create trigger trg_pixwiki_preserve_receipt_ownership
before update on public.mp_received_payments
for each row execute function public.pixwiki_preserve_receipt_ownership();
