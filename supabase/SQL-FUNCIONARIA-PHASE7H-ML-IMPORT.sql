-- FuncionarIA — Fase 7H
-- Importação inicial Mercado Livre -> produtos_venda.
--
-- produtos_venda continua sendo o único catálogo.
-- Metadados internos de sincronização ficam em tabelas service-role-only.

create unique index if not exists ux_produtos_venda_company_ml_item
  on public.produtos_venda(company_id,ml_item_id)
  where ml_item_id is not null;

create table if not exists public.funcionaria_ml_product_sync (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  product_id uuid not null unique references public.produtos_venda(id) on delete cascade,
  ml_item_id text not null,
  source text not null default 'mercadolivre'
    check (source='mercadolivre'),
  sync_source text not null default 'mercadolivre'
    check (sync_source in ('mercadolivre','local','bidirectional')),
  ml_last_synced_at timestamptz not null default now(),
  ml_sync_hash text not null,
  ml_permalink text,
  ml_user_product_id text,
  ml_stock_source text not null default 'unknown'
    check (ml_stock_source in ('user_product','variation_referential','item_referential','unknown')),
  ml_variations jsonb not null default '[]'::jsonb,
  ml_attributes jsonb not null default '[]'::jsonb,
  ml_status text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id,ml_item_id)
);

create index if not exists idx_funcionaria_ml_product_sync_company
  on public.funcionaria_ml_product_sync(company_id,ml_last_synced_at desc);

drop trigger if exists update_funcionaria_ml_product_sync_updated_at
  on public.funcionaria_ml_product_sync;
create trigger update_funcionaria_ml_product_sync_updated_at
before update on public.funcionaria_ml_product_sync
for each row execute function public.update_updated_at_column();

alter table public.funcionaria_ml_product_sync enable row level security;
revoke all on table public.funcionaria_ml_product_sync from public,anon,authenticated;
grant select,insert,update,delete on table public.funcionaria_ml_product_sync to service_role;

create table if not exists public.funcionaria_ml_option_links (
  id uuid primary key default gen_random_uuid(),
  sync_id uuid not null references public.funcionaria_ml_product_sync(id) on delete cascade,
  group_id uuid not null references public.produto_opcoes_grupos(id) on delete cascade,
  option_id uuid not null unique references public.produto_opcoes_itens(id) on delete cascade,
  ml_attribute_id text not null,
  ml_value_id text,
  ml_variation_id text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_funcionaria_ml_option_links_sync
  on public.funcionaria_ml_option_links(sync_id);

alter table public.funcionaria_ml_option_links enable row level security;
revoke all on table public.funcionaria_ml_option_links from public,anon,authenticated;
grant select,insert,update,delete on table public.funcionaria_ml_option_links to service_role;
create or replace function public.funcionaria_import_ml_product_upsert(
  p_company_id uuid,
  p_ml_item_id text,
  p_product jsonb,
  p_sync jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path to 'public','pg_temp'
as $function$
declare
  v_product public.produtos_venda%rowtype;
  v_sync public.funcionaria_ml_product_sync%rowtype;
  v_status text;
  v_now timestamptz := now();
begin
  if p_company_id is null
     or nullif(trim(coalesce(p_ml_item_id,'')),'') is null
     or nullif(trim(coalesce(p_product->>'nome','')),'') is null
     or nullif(trim(coalesce(p_sync->>'ml_sync_hash','')),'') is null then
    raise exception 'invalid_ml_import_payload';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_company_id::text || ':' || trim(p_ml_item_id), 0)
  );

  select * into v_product
  from public.produtos_venda
  where company_id=p_company_id
    and ml_item_id=trim(p_ml_item_id)
  for update;

  if found then
    select * into v_sync
    from public.funcionaria_ml_product_sync
    where product_id=v_product.id
    for update;

    if not found then
      return jsonb_build_object(
        'status','linked_local',
        'product_id',v_product.id,
        'sync_id',null
      );
    end if;

    if v_sync.ml_sync_hash=trim(p_sync->>'ml_sync_hash')
       and v_sync.last_error is null then
      update public.funcionaria_ml_product_sync
         set ml_last_synced_at=v_now,
             ml_status=nullif(trim(coalesce(p_sync->>'ml_status','')),''),
             updated_at=v_now
       where id=v_sync.id
       returning * into v_sync;

      return jsonb_build_object(
        'status','unchanged',
        'product_id',v_product.id,
        'sync_id',v_sync.id
      );
    end if;

    update public.produtos_venda
       set nome=trim(p_product->>'nome'),
           descricao=nullif(p_product->>'descricao',''),
           categoria=nullif(p_product->>'categoria',''),
           imagem_url=nullif(p_product->>'imagem_url',''),
           ean=nullif(p_product->>'ean',''),
           marca=nullif(p_product->>'marca',''),
           preco_venda=greatest(0,coalesce((p_product->>'preco_venda')::numeric,0)),
           unidade='un',
           estoque_atual=greatest(0,coalesce((p_product->>'estoque_atual')::numeric,0)),
           controla_estoque=true,
           is_active=coalesce((p_product->>'is_active')::boolean,false),
           ml_category_id=nullif(p_product->>'ml_category_id',''),
           ml_listing_type=coalesce(nullif(p_product->>'ml_listing_type',''),'free'),
           ml_status=nullif(p_product->>'ml_status',''),
           updated_at=v_now
     where id=v_product.id
     returning * into v_product;

    v_status := 'updated';
  else
    insert into public.produtos_venda (
      company_id,nome,descricao,categoria,imagem_url,ean,marca,
      preco_venda,unidade,estoque_atual,controla_estoque,is_active,
      ml_item_id,ml_category_id,ml_listing_type,ml_status,created_at,updated_at
    ) values (
      p_company_id,
      trim(p_product->>'nome'),
      nullif(p_product->>'descricao',''),
      nullif(p_product->>'categoria',''),
      nullif(p_product->>'imagem_url',''),
      nullif(p_product->>'ean',''),
      nullif(p_product->>'marca',''),
      greatest(0,coalesce((p_product->>'preco_venda')::numeric,0)),
      'un',
      greatest(0,coalesce((p_product->>'estoque_atual')::numeric,0)),
      true,
      coalesce((p_product->>'is_active')::boolean,false),
      trim(p_ml_item_id),
      nullif(p_product->>'ml_category_id',''),
      coalesce(nullif(p_product->>'ml_listing_type',''),'free'),
      nullif(p_product->>'ml_status',''),
      v_now,v_now
    )
    returning * into v_product;

    v_status := 'imported';
  end if;

  insert into public.funcionaria_ml_product_sync (
    company_id,product_id,ml_item_id,source,sync_source,
    ml_last_synced_at,ml_sync_hash,ml_permalink,ml_user_product_id,
    ml_stock_source,ml_variations,ml_attributes,ml_status,last_error,
    created_at,updated_at
  ) values (
    p_company_id,v_product.id,trim(p_ml_item_id),'mercadolivre','mercadolivre',
    v_now,trim(p_sync->>'ml_sync_hash'),
    nullif(p_sync->>'ml_permalink',''),
    nullif(p_sync->>'ml_user_product_id',''),
    coalesce(nullif(p_sync->>'ml_stock_source',''),'unknown'),
    coalesce(p_sync->'ml_variations','[]'::jsonb),
    coalesce(p_sync->'ml_attributes','[]'::jsonb),
    nullif(p_sync->>'ml_status',''),
    null,v_now,v_now
  )
  on conflict (product_id) do update
    set ml_item_id=excluded.ml_item_id,
        source='mercadolivre',
        sync_source='mercadolivre',
        ml_last_synced_at=excluded.ml_last_synced_at,
        ml_sync_hash=excluded.ml_sync_hash,
        ml_permalink=excluded.ml_permalink,
        ml_user_product_id=excluded.ml_user_product_id,
        ml_stock_source=excluded.ml_stock_source,
        ml_variations=excluded.ml_variations,
        ml_attributes=excluded.ml_attributes,
        ml_status=excluded.ml_status,
        last_error=null,
        updated_at=v_now
  returning * into v_sync;

  return jsonb_build_object(
    'status',v_status,
    'product_id',v_product.id,
    'sync_id',v_sync.id
  );
end;
$function$;

revoke all on function public.funcionaria_import_ml_product_upsert(uuid,text,jsonb,jsonb)
  from public,anon,authenticated;
grant execute on function public.funcionaria_import_ml_product_upsert(uuid,text,jsonb,jsonb)
  to service_role;
