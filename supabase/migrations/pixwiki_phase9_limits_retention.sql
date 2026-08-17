create or replace function public.pixwiki_enforce_api_key_limit()
returns trigger language plpgsql set search_path=public as $$
begin
  if (select count(*) from public.pixwiki_api_keys where user_id=new.user_id and revoked_at is null)>=10 then
    raise exception 'api_key_limit_reached';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_pixwiki_api_key_limit on public.pixwiki_api_keys;
create trigger trg_pixwiki_api_key_limit before insert on public.pixwiki_api_keys
for each row execute function public.pixwiki_enforce_api_key_limit();

create or replace function public.pixwiki_enforce_webhook_limit()
returns trigger language plpgsql set search_path=public as $$
begin
  if (select count(*) from public.pixwiki_webhooks where user_id=new.user_id)>=10 then
    raise exception 'webhook_limit_reached';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_pixwiki_webhook_limit on public.pixwiki_webhooks;
create trigger trg_pixwiki_webhook_limit before insert on public.pixwiki_webhooks
for each row execute function public.pixwiki_enforce_webhook_limit();

do $do$
declare v_job bigint;
begin
  select jobid into v_job from cron.job where jobname='pixwiki-api-log-cleanup' limit 1;
  if v_job is not null then perform cron.unschedule(v_job); end if;
end
$do$;

select cron.schedule(
  'pixwiki-api-log-cleanup',
  '15 3 * * *',
  $cron$
    delete from public.pixwiki_api_request_logs where created_at < now()-interval '30 days';
    delete from public.pixwiki_webhook_events where created_at < now()-interval '90 days';
  $cron$
);
