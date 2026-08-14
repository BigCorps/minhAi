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
  v_repasse conviteria.repasses%rowtype;
  v_email text;
  v_nome text;
begin
  select rp.*
    into v_repasse
    from conviteria.repasses as rp
   where rp.action_token_hash = p_token_hash
   for update;

  if not found then raise exception 'token_invalido'; end if;
  if v_repasse.action_consumida_em is not null then raise exception 'token_usado'; end if;
  if v_repasse.action_token_expira_em is null
     or v_repasse.action_token_expira_em < now() then
    raise exception 'token_expirado';
  end if;
  if v_repasse.status not in ('pendente', 'processando') then
    raise exception 'repasse_finalizado';
  end if;

  if p_acao = 'confirmar' then
    update conviteria.repasses as rp
       set status = 'concluido',
           concluido_em = now(),
           erro = null,
           action_consumida_em = now()
     where rp.id = v_repasse.id;

    update conviteria.evento_saldo as es
       set repassado_centavos = es.repassado_centavos + v_repasse.valor_centavos,
           atualizado_em = now()
     where es.evento_id = v_repasse.evento_id;

    if not found then raise exception 'saldo_evento_inexistente'; end if;

  elsif p_acao = 'falhar' then
    update conviteria.repasses as rp
       set status = 'falhou',
           erro = 'Repasse manual não realizado',
           action_consumida_em = now()
     where rp.id = v_repasse.id;

    update conviteria.evento_saldo as es
       set disponivel_centavos = es.disponivel_centavos + v_repasse.valor_centavos,
           atualizado_em = now()
     where es.evento_id = v_repasse.evento_id;

    if not found then raise exception 'saldo_evento_inexistente'; end if;
  else
    raise exception 'acao_invalida';
  end if;

  select coalesce(rc.email, ct.email), rc.nome_completo
    into v_email, v_nome
    from conviteria.recebedores as rc
    join conviteria.eventos as ev on ev.id = rc.evento_id
    join conviteria.contas as ct on ct.id = ev.conta_id
   where rc.id = v_repasse.recebedor_id;

  return query
  select
    v_repasse.id,
    v_repasse.evento_id,
    v_repasse.valor_centavos,
    case when p_acao = 'confirmar' then 'concluido'::text else 'falhou'::text end,
    v_email,
    v_nome;
end;
$$;

revoke all on function conviteria.processar_acao_repasse(text, text)
  from public, anon, authenticated;
grant execute on function conviteria.processar_acao_repasse(text, text)
  to service_role;
