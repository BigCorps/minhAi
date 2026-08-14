-- ConviteIA — confirmação de repasse por e-mail.
-- Executar após conviteria_fase_6_1_6_3_repasse.sql.

alter table conviteria.repasses
  add column if not exists action_token_hash text,
  add column if not exists action_token_expira_em timestamptz,
  add column if not exists action_consumida_em timestamptz;

create unique index if not exists repasses_action_token_hash_uidx
  on conviteria.repasses(action_token_hash)
  where action_token_hash is not null;

create or replace function conviteria.definir_token_repasse(
  p_repasse_id uuid,
  p_token_hash text,
  p_expira_em timestamptz
)
returns void
language plpgsql
security definer
set search_path = conviteria, public
as $$
begin
  update conviteria.repasses
     set action_token_hash = p_token_hash,
         action_token_expira_em = p_expira_em,
         action_consumida_em = null
   where id = p_repasse_id
     and status = 'pendente';

  if not found then
    raise exception 'repasse_invalido';
  end if;
end;
$$;

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
  v_conta_email text;
  v_conta_nome text;
begin
  select * into v
    from conviteria.repasses
   where action_token_hash = p_token_hash
   for update;

  if not found then raise exception 'token_invalido'; end if;
  if v.action_consumida_em is not null then raise exception 'token_usado'; end if;
  if v.action_token_expira_em is null or v.action_token_expira_em < now() then
    raise exception 'token_expirado';
  end if;
  if v.status not in ('pendente','processando') then raise exception 'repasse_finalizado'; end if;

  if p_acao = 'confirmar' then
    update conviteria.repasses
       set status='concluido', concluido_em=now(), erro=null, action_consumida_em=now()
     where id=v.id;

    update conviteria.evento_saldo
       set repassado_centavos = repassado_centavos + v.valor_centavos,
           atualizado_em = now()
     where evento_id=v.evento_id;

  elsif p_acao = 'falhar' then
    update conviteria.repasses
       set status='falhou', erro='Repasse manual não realizado', action_consumida_em=now()
     where id=v.id;

    update conviteria.evento_saldo
       set disponivel_centavos = disponivel_centavos + v.valor_centavos,
           atualizado_em = now()
     where evento_id=v.evento_id;
  else
    raise exception 'acao_invalida';
  end if;

  select c.email, c.nome
    into v_conta_email, v_conta_nome
    from conviteria.eventos e
    join conviteria.contas c on c.id=e.conta_id
   where e.id=v.evento_id;

  return query
  select v.id, v.evento_id, v.valor_centavos,
         case when p_acao='confirmar' then 'concluido'::text else 'falhou'::text end,
         v_conta_email, v_conta_nome;
end;
$$;

revoke all on function conviteria.definir_token_repasse(uuid,text,timestamptz) from public, anon, authenticated;
revoke all on function conviteria.processar_acao_repasse(text,text) from public, anon, authenticated;
grant execute on function conviteria.definir_token_repasse(uuid,text,timestamptz) to service_role;
grant execute on function conviteria.processar_acao_repasse(text,text) to service_role;
