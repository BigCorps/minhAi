-- FuncionarIA 7I — sync seguro ML -> catálogo único.
-- NÃO aplicar automaticamente: requer gate de produção após preview/QA.
alter table public.funcionaria_ml_product_sync
  add column if not exists sync_enabled boolean not null default false,
  add column if not exists sync_last_applied jsonb not null default '{}'::jsonb,
  add column if not exists sync_last_state text not null default 'pending',
  add column if not exists sync_last_checked_at timestamptz,
  add column if not exists sync_next_at timestamptz not null default now(),
  add column if not exists sync_attempts integer not null default 0,
  add column if not exists sync_conflicts text[] not null default '{}'::text[];

create index if not exists idx_funcionaria_ml_sync_due
  on public.funcionaria_ml_product_sync(sync_next_at,id)
  where sync_enabled = true;

-- Conflitos são preservados; apenas rows opt-in e com direção ML recebem alterações.
create or replace function public.funcionaria_apply_ml_sync(
  p_company_id uuid,
  p_ml_item_id text,
  p_product jsonb,
  p_sync jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = 'public','pg_temp'
as $fn$
declare
  v_product public.produtos_venda%rowtype;
  v_sync public.funcionaria_ml_product_sync%rowtype;
  v_current jsonb;
  v_previous jsonb;
  v_after jsonb;
  v_key text;
  v_conflicts text[] := array[]::text[];
  v_fields text[] := array['nome','preco_venda','estoque_atual','is_active','ml_status','imagem_url'];
  v_now timestamptz := now();
  v_hash text := nullif(trim(coalesce(p_sync->>'ml_sync_hash','')),'');
begin
  if p_company_id is null or nullif(trim(coalesce(p_ml_item_id,'')),'') is null
     or v_hash is null or jsonb_typeof(p_product) <> 'object'
     or not (p_product ? 'nome') or not (p_product ? 'preco_venda')
     or not (p_product ? 'is_active') or not (p_product ? 'ml_status')
     or coalesce((p_product->>'preco_venda')::numeric,0) <= 0 then
    raise exception 'invalid_ml_sync_payload';
  end if;

  for v_key in select jsonb_object_keys(p_product) loop
    if not (v_key = any(v_fields)) then raise exception 'unsupported_ml_sync_field: %',v_key; end if;
    if p_product->v_key = 'null'::jsonb then raise exception 'null_ml_sync_field'; end if;
  end loop;

  if p_product ? 'estoque_atual' and coalesce(p_sync->>'ml_stock_source','') <> 'user_product' then
    raise exception 'non_authoritative_ml_stock';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_company_id::text || ':' || trim(p_ml_item_id),0));

  select * into v_product from public.produtos_venda
   where company_id=p_company_id and ml_item_id=trim(p_ml_item_id) for update;
  if not found then return jsonb_build_object('status','not_linked'); end if;

  select * into v_sync from public.funcionaria_ml_product_sync
   where company_id=p_company_id and product_id=v_product.id and ml_item_id=trim(p_ml_item_id)
   for update;
  if not found then return jsonb_build_object('status','linked_local'); end if;
  if not v_sync.sync_enabled then return jsonb_build_object('status','disabled'); end if;
  if v_sync.sync_source <> 'mercadolivre' then return jsonb_build_object('status','direction_blocked'); end if;

  v_current := jsonb_build_object(
    'nome',v_product.nome,
    'preco_venda',v_product.preco_venda,
    'estoque_atual',v_product.estoque_atual,
    'is_active',v_product.is_active,
    'ml_status',v_product.ml_status,
    'imagem_url',v_product.imagem_url
  );
  v_previous := v_sync.sync_last_applied;

  for v_key in select jsonb_object_keys(p_product) loop
    if v_previous = '{}'::jsonb then
      -- Primeiro sync: só adota produtos idênticos; jamais sobrescreve edição existente.
      if v_current->v_key is distinct from p_product->v_key then
        v_conflicts := array_append(v_conflicts,v_key);
      end if;
    elsif not (v_previous ? v_key) or v_current->v_key is distinct from v_previous->v_key then
      v_conflicts := array_append(v_conflicts,v_key);
    end if;
  end loop;

  if array_length(v_conflicts,1) is not null then
    update public.funcionaria_ml_product_sync
       set sync_last_state='conflict',sync_conflicts=v_conflicts,
           sync_last_checked_at=v_now,sync_next_at=v_now+interval '24 hours',
           last_error='local_conflict',updated_at=v_now
     where id=v_sync.id;
    return jsonb_build_object('status','conflict','fields',to_jsonb(v_conflicts),'product_id',v_product.id);
  end if;

  if v_previous = '{}'::jsonb then
    update public.funcionaria_ml_product_sync
       set sync_last_applied=v_current,sync_last_state='baseline_created',
           sync_last_checked_at=v_now,sync_next_at=v_now+interval '1 hour',
           sync_conflicts='{}'::text[],last_error=null,updated_at=v_now
     where id=v_sync.id;
    return jsonb_build_object('status','baseline_created','product_id',v_product.id);
  end if;

  if v_sync.ml_sync_hash=v_hash then
    update public.funcionaria_ml_product_sync
       set sync_last_state='unchanged',sync_last_checked_at=v_now,
           sync_next_at=v_now+interval '1 hour',sync_attempts=0,
           sync_conflicts='{}'::text[],last_error=null,updated_at=v_now
     where id=v_sync.id;
    return jsonb_build_object('status','unchanged','product_id',v_product.id);
  end if;

  update public.produtos_venda set
    nome=coalesce(p_product->>'nome',nome),
    preco_venda=coalesce((p_product->>'preco_venda')::numeric,preco_venda),
    estoque_atual=coalesce((p_product->>'estoque_atual')::numeric,estoque_atual),
    is_active=coalesce((p_product->>'is_active')::boolean,is_active),
    ml_status=coalesce(p_product->>'ml_status',ml_status),
    imagem_url=coalesce(p_product->>'imagem_url',imagem_url),
    updated_at=v_now
  where id=v_product.id and company_id=p_company_id;

  v_after := v_current || p_product;
  update public.funcionaria_ml_product_sync set
    sync_last_applied=v_after,ml_last_synced_at=v_now,
    ml_sync_hash=v_hash,ml_status=nullif(p_sync->>'ml_status',''),
    ml_stock_source=coalesce(nullif(p_sync->>'ml_stock_source',''),'unknown'),
    ml_user_product_id=nullif(p_sync->>'ml_user_product_id',''),
    ml_variations=coalesce(p_sync->'ml_variations','[]'::jsonb),
    sync_last_state='synced',sync_last_checked_at=v_now,
    sync_next_at=v_now+interval '1 hour',sync_attempts=0,
    sync_conflicts='{}'::text[],last_error=null,updated_at=v_now
  where id=v_sync.id;
  return jsonb_build_object('status','synced','product_id',v_product.id);
end;
$fn$;

revoke all on function public.funcionaria_apply_ml_sync(uuid,text,jsonb,jsonb)
 from public,anon,authenticated;
grant execute on function public.funcionaria_apply_ml_sync(uuid,text,jsonb,jsonb) to service_role;

alter table public.funcionaria_ml_product_sync enable row level security;
revoke all on table public.funcionaria_ml_product_sync from public,anon,authenticated;
grant select,insert,update,delete on table public.funcionaria_ml_product_sync to service_role;
