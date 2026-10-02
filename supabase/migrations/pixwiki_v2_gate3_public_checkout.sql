-- =============================================================================
-- PixWiki V2 — Gate 3
-- Checkout público + ativação do Pix Link no motor V2
--
-- PRÉ-REQUISITOS
-- - Gate 1 atualizado
-- - Gate 2 aplicado e Edge Function pixwiki-v2-checkout implantada
--
-- OBJETIVO
-- - Ativar o Pix Link V2 publicamente.
-- - Deixar de usar o plano como bloqueio de existência do subdomínio PixWiki.
-- - A franquia/overage passa a ser decidida pelo motor de uso do Gate 1/2.
--
-- NÃO FAZ AINDA
-- - onboarding V2
-- - dashboard V2
-- - billing visual
-- =============================================================================

begin;

-- A partir deste gate, o Pix Link público cria sessões V2.
update public.pixwiki_v2_runtime_config
set pix_link_v2_enabled = true,
    checkout_public_prepare_enabled = true,
    updated_at = now()
where id = true;

-- No modelo V2, Pix Link/Checkout/API não são recursos bloqueados por plano.
-- Qualquer empresa PixWiki ativa pode ter seu endereço público; a disponibilidade
-- de uma nova automação é verificada pelo ledger/franquia no momento da criação.
create or replace function public.pixwiki_can_serve_subdomain(p_slug text)
returns boolean
language sql
stable
security definer
set search_path='public','pg_temp'
as $$
  select exists(
    select 1
    from public.companies c
    where c.slug = public.pixwiki_normalize_slug(p_slug)
      and c.segment_key = 'pix_wiki'
      and c.is_active = true
  );
$$;

-- É uma consulta booleana pública de baixa sensibilidade, necessária também
-- ao fallback legado. Ela não devolve dados da empresa nem ignora RLS de escrita.
revoke all on function public.pixwiki_can_serve_subdomain(text) from public, anon, authenticated;
grant execute on function public.pixwiki_can_serve_subdomain(text) to anon, authenticated, service_role;

commit;

notify pgrst, 'reload schema';
