-- Midia.Pro — conferência SOMENTE LEITURA após a instalação final.
-- Este arquivo não altera dados.

select table_name
from information_schema.tables
where table_schema = 'midia' and table_type = 'BASE TABLE'
order by table_name;

select plan_key, name, monthly_price_cents, commercial_mode,
       default_network_inventory_percent, active
from midia.screen_plan_catalog
order by sort_order;

select product_key, name, base_price_cents, schedule_kind, active
from midia.ad_product_catalog
order by sort_order;

select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'midia-assets';

select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'midia'
order by tablename;

select trigger_name, event_object_schema, event_object_table, action_timing, event_manipulation
from information_schema.triggers
where trigger_schema = 'midia' or event_object_schema in ('midia','public')
  and trigger_name like '%midia%'
order by event_object_schema, event_object_table, trigger_name;

select routine_name
from information_schema.routines
where routine_schema = 'midia'
order by routine_name;
