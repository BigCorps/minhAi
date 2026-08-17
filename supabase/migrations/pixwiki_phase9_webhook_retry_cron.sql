do $do$
declare v_job bigint;
begin
  select jobid into v_job from cron.job where jobname='pixwiki-webhook-retry' limit 1;
  if v_job is not null then perform cron.unschedule(v_job); end if;
end
$do$;

select cron.schedule(
  'pixwiki-webhook-retry',
  '* * * * *',
  $cron$
    select net.http_post(
      url := 'https://qyonozbroekuqlotqcbm.supabase.co/functions/v1/pixwiki-webhook-dispatch',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'x-pixwiki-internal-key',(select secret from public.pixwiki_internal_secrets where key='webhook_internal')
      ),
      body := '{"retry_due":true}'::jsonb
    );
  $cron$
);
