create or replace function conviteria.processar_acao_repasse(
  p_token_hash text,
  p_acao text
)
returns table(
  repasse_id uuid,
  evento_id uuid,
  valor_centavos bigint,
  status text,
  conta_email text,
  conta_nome text
)
language plpgsql
security definer
set search_path = conviteria, public, auth
as $$
declare
  v conviteria.repasses%rowtype;
  v_email text;
  v_nome text;
begin
  select * into v from conviteria.repasses where action_token_hash=p_token_hash for update;
  if not found then raise exception 'token_invalido'; end if;
  if v.action_consumida_em is not null then raise exception 'token_usado'; end if;
  if v.action_token_expira_em is null or v.action_token_expira_em < now() then raise exception 'token_expirado'; end if;
  if v.status not in ('pendente','processando') then raise exception 'repasse_finalizado'; end if;

  if p_acao='confirmar' then
    update conviteria.repasses set status='concluido',concluido_em=now(),erro=null,action_consumida_em=now() where id=v.id;
    update conviteria.evento_saldo set repassado_centavos=repassado_centavos+v.valor_centavos,atualizado_em=now() where evento_id=v.evento_id;
  elsif p_acao='falhar' then
    update conviteria.repasses set status='falhou',erro='Repasse manual não realizado',action_consumida_em=now() where id=v.id;
    update conviteria.evento_saldo set disponivel_centavos=disponivel_centavos+v.valor_centavos,atualizado_em=now() where evento_id=v.evento_id;
  else
    raise exception 'acao_invalida';
  end if;

  select coalesce(r.email,c.email), r.nome_completo into v_email,v_nome
  from conviteria.recebedores r
  join conviteria.eventos e on e.id=r.evento_id
  join conviteria.contas c on c.id=e.conta_id
  where r.id=v.recebedor_id;

  return query select v.id,v.evento_id,v.valor_centavos,
    case when p_acao='confirmar' then 'concluido'::text else 'falhou'::text end,
    v_email,v_nome;
end;
$$;
revoke all on function conviteria.processar_acao_repasse(text,text) from public, anon, authenticated;
grant execute on function conviteria.processar_acao_repasse(text,text) to service_role;
