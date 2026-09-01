alter table conviteria.recebedores add column if not exists email text;

create table if not exists conviteria.mensalidades (
  id uuid primary key default gen_random_uuid(),
  conta_id uuid not null references conviteria.contas(id) on delete cascade,
  pix_transaction_id uuid not null unique,
  txid text,
  valor_centavos integer not null check (valor_centavos > 0),
  status text not null default 'pendente' check (status in ('pendente','pago','expirado')),
  created_at timestamptz not null default now(),
  pago_em timestamptz,
  processado_em timestamptz
);
alter table conviteria.mensalidades enable row level security;
create index if not exists mensalidades_conta_created_idx on conviteria.mensalidades(conta_id, created_at desc);

create or replace function conviteria.processar_mensalidade(p_mensalidade_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = conviteria, public
as $$
declare
  v conviteria.mensalidades%rowtype;
  v_atual timestamptz;
  v_novo timestamptz;
begin
  select * into v from conviteria.mensalidades where id=p_mensalidade_id for update;
  if not found then raise exception 'mensalidade_invalida'; end if;
  if v.processado_em is not null then
    select plano_expira_em into v_novo from conviteria.contas where id=v.conta_id;
    return v_novo;
  end if;
  if v.status <> 'pago' then raise exception 'mensalidade_nao_paga'; end if;
  select plano_expira_em into v_atual from conviteria.contas where id=v.conta_id for update;
  v_novo := greatest(coalesce(v_atual, now()), now()) + interval '30 days';
  update conviteria.contas set plano='mensal', plano_expira_em=v_novo where id=v.conta_id;
  update conviteria.mensalidades set processado_em=now() where id=v.id;
  return v_novo;
end;
$$;
revoke all on function conviteria.processar_mensalidade(uuid) from public, anon, authenticated;
grant execute on function conviteria.processar_mensalidade(uuid) to service_role;
