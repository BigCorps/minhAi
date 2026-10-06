begin;

-- Release only a known uncharged reservation; callers retain uncertain charges.
create or replace function public.sdr_release_units(p_provider text, p_units numeric)
returns void language plpgsql security invoker set search_path = public, pg_catalog as $$
begin
  if p_units is null or p_units <= 0 or p_units::text in ('NaN', 'Infinity', '-Infinity') then
    raise exception 'invalid_units';
  end if;
  -- UPDATE locks the budget row and uses its current value, including concurrent updates.
  update public.sdr_provider_budgets
    set used_units = greatest(0, used_units - p_units)
    where provider = p_provider;
  if not found then
    raise exception 'provider_budget';
  end if;
end;
$$;

revoke all on function public.sdr_release_units(text, numeric) from public, anon, authenticated;
grant execute on function public.sdr_release_units(text, numeric) to service_role;

commit;
