-- PixWiki V2 Gate 7 - validação read-only

select 'team_invites_table' as check_name,
       to_regclass('public.pixwiki_v2_team_invites') is not null as ok;

select 'cashier_role_constraint' as check_name,
       exists(
         select 1 from pg_constraint
         where conrelid='public.company_admins'::regclass
           and conname='company_admins_role_check'
           and pg_get_constraintdef(oid) like '%cashier%'
       ) as ok;

select p.proname,
       pg_get_function_identity_arguments(p.oid) as args,
       prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in (
    'pixwiki_v2_my_access_context',
    'pixwiki_v2_team_manageable_companies',
    'pixwiki_v2_team_list',
    'pixwiki_v2_pending_team_invites',
    'pixwiki_v2_accept_team_invite',
    'pixwiki_v2_cashier_snapshot',
    'pixwiki_v2_auth_user_id_by_email'
  )
order by p.proname;

select grantee,privilege_type
from information_schema.role_table_grants
where table_schema='public'
  and table_name='pixwiki_v2_team_invites'
order by grantee,privilege_type;

select role,count(*)
from public.company_admins
where role in ('owner','manager','viewer','cashier')
group by role
order by role;

-- Nenhum cashier deve ter acesso por política direta a mp_received_payments.
select policyname,cmd,roles,qual
from pg_policies
where schemaname='public' and tablename='mp_received_payments'
order by policyname;

select 'pixwiki_company_admin_writes_blocked_for_authenticated' as check_name,
       count(*) filter (where cmd in ('INSERT','UPDATE','DELETE') and qual::text like '%segment_key%pix_wiki%' or with_check::text like '%segment_key%pix_wiki%') >= 1 as ok
from pg_policies
where schemaname='public' and tablename='company_admins';

select routine_name,grantee,privilege_type
from information_schema.routine_privileges
where specific_schema='public'
  and routine_name in (
    'pixwiki_v2_my_access_context',
    'pixwiki_v2_team_manageable_companies',
    'pixwiki_v2_team_list',
    'pixwiki_v2_pending_team_invites',
    'pixwiki_v2_accept_team_invite',
    'pixwiki_v2_cashier_snapshot',
    'pixwiki_v2_auth_user_id_by_email'
  )
order by routine_name,grantee;
