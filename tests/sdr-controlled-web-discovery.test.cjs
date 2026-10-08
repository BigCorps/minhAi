const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
let PGlite;
try { ({ PGlite } = require(process.env.PGLITE_MODULE_PATH || '@electric-sql/pglite')); } catch {}

test('controlled automatic web discovery enforces rollout, daily cadence, budget and send capacity', { skip: !PGlite && 'Install local PGlite or set PGLITE_MODULE_PATH' }, async () => {
  const d = new PGlite();
  try {
    await d.exec(`
      create extension if not exists pgcrypto;
      create role anon; create role authenticated; create role service_role;
      create table sdr_campaigns(
        id uuid primary key, product text not null, enabled boolean not null default false,
        auto_discover boolean not null default false, trial_ends_at timestamptz,
        next_search_at timestamptz, daily_limit integer not null default 3,
        max_touches integer not null default 1
      );
      create table sdr_product_rollouts(
        product text primary key, status text not null default 'draft',
        auto_discovery_enabled boolean not null default false,
        auto_outreach_enabled boolean not null default false,
        live_send_enabled boolean not null default false,
        daily_send_cap integer not null default 0
      );
      create table sdr_runs(
        id uuid primary key default gen_random_uuid(), campaign_id uuid, provider text,
        request_fingerprint text, credits_reserved numeric, status text not null default 'running',
        created_at timestamptz not null default now()
      );
      create table sdr_opportunities(id uuid primary key, product text not null);
      create table sdr_queue(
        id uuid primary key default gen_random_uuid(), campaign_id uuid, opportunity_id uuid,
        status text not null, sent_at timestamptz
      );
      create table sdr_provider_budgets(
        provider text primary key, enabled boolean not null default false,
        limit_units numeric not null default 0, used_units numeric not null default 0,
        expires_at timestamptz
      );
      create or replace function sdr_reserve_units(p_provider text,p_units numeric)
      returns void language plpgsql as $$
      begin
        update sdr_provider_budgets
        set used_units=used_units+p_units
        where provider=p_provider and enabled and expires_at>now() and used_units+p_units<=limit_units;
        if not found then raise exception 'provider_budget'; end if;
      end $$;
    `);
    await d.exec(readFileSync(require.resolve('../supabase/migrations/20261008183000_sdr_controlled_web_discovery.sql'),'utf8'));

    const c1='00000000-0000-0000-0000-000000000001';
    const c2='00000000-0000-0000-0000-000000000002';
    const o1='00000000-0000-0000-0000-000000000011';
    const o2='00000000-0000-0000-0000-000000000012';
    await d.query(`insert into sdr_provider_budgets values('web_research',true,30,0,now()+interval '7 days')`);
    await d.query(`insert into sdr_product_rollouts values('conviteia','active',true,true,true,3)`);
    await d.query(`insert into sdr_campaigns(id,product,enabled,auto_discover,trial_ends_at,daily_limit,max_touches)
      values($1,'conviteia',true,true,now()+interval '7 days',3,1),($2,'conviteia',true,true,now()+interval '7 days',3,1)`,[c1,c2]);
    await d.query(`insert into sdr_opportunities values($1,'conviteia'),($2,'conviteia')`,[o1,o2]);

    assert.equal((await d.query('select sdr_automatic_outreach_capacity($1,$2) n',['conviteia',c1])).rows[0].n,3);
    await d.query(`insert into sdr_queue(campaign_id,opportunity_id,status) values($1,$2,'queued')`,[c1,o1]);
    assert.equal((await d.query('select sdr_automatic_outreach_capacity($1,$2) n',['conviteia',c1])).rows[0].n,2);
    await d.query(`insert into sdr_queue(campaign_id,opportunity_id,status,sent_at) values($1,$2,'sent',now())`,[c1,o2]);
    assert.equal((await d.query('select sdr_automatic_outreach_capacity($1,$2) n',['conviteia',c1])).rows[0].n,1);

    const first=(await d.query('select sdr_begin_automatic_web_discovery($1) id',[c1])).rows[0].id;
    assert.ok(first);
    const run=(await d.query('select * from sdr_runs where id=$1',[first])).rows[0];
    assert.equal(run.provider,'web_research');
    assert.equal(run.request_fingerprint,'web_discovery:gpt-5.6-luna:auto:v1');
    assert.equal(Number(run.credits_reserved),3);
    assert.equal(Number((await d.query(`select used_units from sdr_provider_budgets where provider='web_research'`)).rows[0].used_units),3);
    assert.ok((await d.query('select next_search_at>now() ok from sdr_campaigns where id=$1',[c1])).rows[0].ok);

    await assert.rejects(d.query('select sdr_begin_automatic_web_discovery($1)',[c1]), /search_not_due/);
    await d.query('update sdr_campaigns set next_search_at=null where id=$1',[c1]);
    await d.query("update sdr_runs set status='completed'");
    await assert.rejects(d.query('select sdr_begin_automatic_web_discovery($1)',[c1]), /search_daily_limit/);

    await d.query('update sdr_campaigns set auto_discover=false where id=$1',[c2]);
    await assert.rejects(d.query('select sdr_begin_automatic_web_discovery($1)',[c2]), /automatic_discovery_not_active/);
    await d.query('update sdr_campaigns set auto_discover=true where id=$1',[c2]);
    await d.query("update sdr_provider_budgets set enabled=false where provider='web_research'");
    await assert.rejects(d.query('select sdr_begin_automatic_web_discovery($1)',[c2]), /provider_budget/);

    for(const signature of ['sdr_automatic_outreach_capacity(text,uuid)','sdr_begin_automatic_web_discovery(uuid)']){
      for(const role of ['anon','authenticated'])
        assert.equal((await d.query("select has_function_privilege($1,$2,'EXECUTE') allowed",[role,signature])).rows[0].allowed,false);
      assert.equal((await d.query("select has_function_privilege('service_role',$1,'EXECUTE') allowed",[signature])).rows[0].allowed,true);
    }
  } finally { await d.close(); }
});
