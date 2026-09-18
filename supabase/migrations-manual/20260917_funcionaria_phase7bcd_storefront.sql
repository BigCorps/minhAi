-- FuncionarIA — Fase 7B/7C/7D
-- Loja gratuita + shell público por workplace_mode + onboarding Mercado Livre.
-- Base esperada: dd3b19852e5be78eaaec82f484f03ac622a00636
--
-- Seguro para aplicar antes do deploy do frontend:
-- - apenas adiciona colunas/index/função;
-- - backfill de ambos/online ativa storefront, mas public_home_mode fica assistant;
-- - código antigo ignora as novas colunas.
--
-- NÃO altera pagamentos, Lalamove, webhooks ou tokens Mercado Livre.

begin;

alter table public.funcionaria_company_settings
  add column if not exists storefront_enabled boolean not null default false,
  add column if not exists public_home_mode text not null default 'assistant',
  add column if not exists mercadolivre_onboarding_choice text not null default 'later';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.funcionaria_company_settings'::regclass
      and conname = 'funcionaria_company_settings_public_home_mode_check'
  ) then
    alter table public.funcionaria_company_settings
      add constraint funcionaria_company_settings_public_home_mode_check
      check (public_home_mode in ('store','assistant'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.funcionaria_company_settings'::regclass
      and conname = 'funcionaria_company_settings_ml_onboarding_choice_check'
  ) then
    alter table public.funcionaria_company_settings
      add constraint funcionaria_company_settings_ml_onboarding_choice_check
      check (mercadolivre_onboarding_choice in ('connect','no','later'));
  end if;
end
$$;

-- Compatibilidade:
-- empresas existentes em "ambos" ou "online" passam a ter a loja disponível,
-- mas continuam abrindo no atendimento até o lojista trocar o public_home_mode.
update public.funcionaria_company_settings
   set storefront_enabled = true,
       public_home_mode = case
         when workplace_mode = 'online' then 'store'
         else coalesce(public_home_mode, 'assistant')
       end,
       updated_at = now()
 where workplace_mode in ('online','ambos')
   and (
     storefront_enabled is distinct from true
     or (workplace_mode = 'online' and public_home_mode is distinct from 'store')
   );

-- Configuração autenticada da loja. A função força invariantes por workplace_mode:
-- online => loja sempre ativa + home store
-- ambos  => loja sempre ativa; home store|assistant
-- presencial => loja opcional; se desligada, home assistant
create or replace function public.funcionaria_save_storefront_settings(
  p_company_id uuid,
  p_storefront_enabled boolean default null,
  p_public_home_mode text default null,
  p_mercadolivre_onboarding_choice text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_workplace text;
  v_current public.funcionaria_company_settings;
  v_enabled boolean;
  v_home text;
  v_ml text;
begin
  if not public.funcionaria_can_access_company(p_company_id, true) then
    raise exception 'forbidden';
  end if;

  perform public.funcionaria_bootstrap_company(p_company_id);

  select *
    into v_current
    from public.funcionaria_company_settings
   where company_id = p_company_id
   for update;

  if v_current.company_id is null then
    raise exception 'settings_not_found';
  end if;

  v_workplace := v_current.workplace_mode;

  if p_public_home_mode is not null
     and p_public_home_mode not in ('store','assistant') then
    raise exception 'invalid_public_home_mode';
  end if;

  if p_mercadolivre_onboarding_choice is not null
     and p_mercadolivre_onboarding_choice not in ('connect','no','later') then
    raise exception 'invalid_mercadolivre_onboarding_choice';
  end if;

  v_enabled := case
    when v_workplace in ('online','ambos') then true
    else coalesce(p_storefront_enabled, v_current.storefront_enabled, false)
  end;

  v_home := case
    when v_workplace = 'online' then 'store'
    when not v_enabled then 'assistant'
    else coalesce(p_public_home_mode, v_current.public_home_mode, 'assistant')
  end;

  v_ml := case
    when v_workplace = 'presencial' then 'later'
    else coalesce(
      p_mercadolivre_onboarding_choice,
      v_current.mercadolivre_onboarding_choice,
      'later'
    )
  end;

  update public.funcionaria_company_settings
     set storefront_enabled = v_enabled,
         public_home_mode = v_home,
         mercadolivre_onboarding_choice = v_ml,
         updated_at = now()
   where company_id = p_company_id
   returning * into v_current;

  return to_jsonb(v_current);
end;
$function$;

revoke all on function public.funcionaria_save_storefront_settings(uuid,boolean,text,text)
  from public, anon;
grant execute on function public.funcionaria_save_storefront_settings(uuid,boolean,text,text)
  to authenticated, service_role;

-- Idempotência para o pedido público básico.
alter table public.pedidos
  add column if not exists public_order_idempotency_key text;

create unique index if not exists pedidos_company_public_order_idempotency_uidx
  on public.pedidos(company_id, public_order_idempotency_key)
  where public_order_idempotency_key is not null;

commit;

-- Verificação sugerida após aplicar:
-- select workplace_mode, storefront_enabled, public_home_mode,
--        mercadolivre_onboarding_choice, count(*)
-- from public.funcionaria_company_settings
-- group by 1,2,3,4 order by 1,2,3,4;
