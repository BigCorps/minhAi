-- Já aplicada em produção.
create or replace function public.pixwiki_disconnect_mp_connection(p_company_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_connection_id uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  if not exists (
    select 1 from public.companies c
    where c.id=p_company_id and c.user_id=v_uid and c.segment_key='pix_wiki'
  ) then
    raise exception 'company_not_allowed';
  end if;

  select p.mp_connection_id into v_connection_id
  from public.pixwiki_payment_settings p
  where p.company_id=p_company_id and p.user_id=v_uid;

  update public.pixwiki_payment_settings
     set mp_connection_id=null, updated_at=now()
   where company_id=p_company_id and user_id=v_uid;

  update public.pixwiki_mp_connections
     set is_active=false, updated_at=now()
   where id=v_connection_id and company_id=p_company_id and user_id=v_uid;

  return true;
end;
$$;

revoke all on function public.pixwiki_disconnect_mp_connection(uuid) from public;
revoke all on function public.pixwiki_disconnect_mp_connection(uuid) from anon;
grant execute on function public.pixwiki_disconnect_mp_connection(uuid) to authenticated;
