create or replace function conviteria.solicitar_repasse_evento(
  p_evento_id uuid,
  p_recebedor_id uuid,
  p_valor_centavos bigint
)
returns uuid
language plpgsql
security definer
set search_path = conviteria, public
as $$
declare
  v_disponivel bigint;
  v_repasse_id uuid;
begin
  if p_valor_centavos <= 0 then raise exception 'valor_invalido'; end if;

  if not exists (
    select 1 from conviteria.recebedores
    where id = p_recebedor_id and evento_id = p_evento_id
  ) then raise exception 'recebedor_invalido'; end if;

  if exists (
    select 1 from conviteria.repasses
    where evento_id = p_evento_id and status in ('pendente','processando')
  ) then raise exception 'repasse_pendente'; end if;

  insert into conviteria.evento_saldo(evento_id, disponivel_centavos, repassado_centavos)
  values (p_evento_id, 0, 0)
  on conflict (evento_id) do nothing;

  select disponivel_centavos into v_disponivel
  from conviteria.evento_saldo
  where evento_id = p_evento_id
  for update;

  if coalesce(v_disponivel,0) < p_valor_centavos then
    raise exception 'saldo_insuficiente';
  end if;

  update conviteria.evento_saldo
  set disponivel_centavos = disponivel_centavos - p_valor_centavos,
      atualizado_em = now()
  where evento_id = p_evento_id;

  insert into conviteria.repasses(evento_id, recebedor_id, valor_centavos, status)
  values (p_evento_id, p_recebedor_id, p_valor_centavos, 'pendente')
  returning id into v_repasse_id;

  return v_repasse_id;
end;
$$;

revoke all on function conviteria.solicitar_repasse_evento(uuid,uuid,bigint) from public, anon, authenticated;
grant execute on function conviteria.solicitar_repasse_evento(uuid,uuid,bigint) to service_role;
