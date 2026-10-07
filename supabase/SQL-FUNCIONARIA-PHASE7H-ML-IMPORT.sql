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
