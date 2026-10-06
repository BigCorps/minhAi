const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
// Local embedded PostgreSQL only. Set PGLITE_MODULE_PATH if installed outside the repository.
let PGlite;
try { ({ PGlite } = require(process.env.PGLITE_MODULE_PATH || '@electric-sql/pglite')); } catch { /* optional local test runtime */ }
const migration = readFileSync(require.resolve('../supabase/migrations/20261006212244_sdr_web_discovery.sql'), 'utf8');
test('web discovery SQL: atomic campaign claim, isolated budget, canonical deduplication, permissions', { skip: !PGlite && 'Install local PGlite or set PGLITE_MODULE_PATH' }, async () => {
  const sql = new PGlite();
  try {
    const foundation = readFileSync(require.resolve('../supabase/migrations/20261004213715_sdr_commercial_foundation.sql'), 'utf8');
    // Existing table definitions, with no seed campaigns/budgets or live credentials.
    await sql.exec(`create role anon; create role authenticated; create role service_role;`);
    await sql.exec(foundation.slice(foundation.indexOf('create table if not exists public.sdr_campaigns'), foundation.indexOf('create or replace function public.sdr_import_lead')));
    const own = readFileSync(require.resolve('../supabase/migrations/20261005183013_sdr_own_sales.sql'), 'utf8');
    await sql.exec(own.slice(own.indexOf('create or replace function public.sdr_import_lead'), own.indexOf('create or replace function public.sdr_reserve_run')));
    await sql.exec(foundation.slice(foundation.indexOf('create or replace function public.sdr_reserve_units'), foundation.indexOf('create or replace function public.sdr_begin_send')));
    await sql.exec(readFileSync(require.resolve('../supabase/migrations/20261006183658_sdr_release_units.sql'), 'utf8'));
    await sql.exec(readFileSync(require.resolve('../supabase/migrations/20261006200158_sdr_web_research.sql'), 'utf8'));
    await sql.exec(migration);
    await sql.exec('delete from sdr_campaigns');
    await sql.exec(`insert into sdr_provider_budgets(provider,used_units,limit_units,enabled,expires_at)
      values ('web_research',0,30,true,now()+interval '1 day'),('econodata',0,0,false,null),('hunter',0,0,false,null),('apollo',0,0,false,null) on conflict(provider) do update set used_units=excluded.used_units, limit_units=excluded.limit_units, enabled=excluded.enabled, expires_at=excluded.expires_at;
      insert into sdr_campaigns(id,name,lane,product,provider,max_runs) values
      ('00000000-0000-0000-0000-000000000001','Test','api1','conviteia','econodata',1);`);
    const campaign = '00000000-0000-0000-0000-000000000001';
    const claims = await Promise.allSettled([sql.query('select sdr_begin_web_discovery($1)', [campaign]), sql.query('select sdr_begin_web_discovery($1)', [campaign])]);
    assert.equal(claims.filter(r => r.status === 'fulfilled').length, 1);
    assert.match(claims.find(r => r.status === 'rejected').reason.message, /search_running/);
    const run = (await sql.query('select * from sdr_runs')).rows[0];
    assert.equal(run.provider, 'web_research'); assert.equal(Number(run.credits_reserved), 3);
    let budget = (await sql.query("select * from sdr_provider_budgets where provider='web_research'")).rows[0];
    assert.equal(Number(budget.used_units), 3);
    await sql.query("select sdr_release_units('web_research',2)");
    await sql.exec("update sdr_runs set status='completed'");
    // Campaign max_runs=1 already reached; web discovery still works independently.
    await sql.query('select sdr_begin_web_discovery($1)', [campaign]);
    const lead = { company_name: 'Empresa Teste', domain: 'empresa.com.br', source: 'web_research', source_ref: 'https://empresa.com.br/', evidence: 'Empresa descoberta por Pesquisa IA.', email_status: 'unknown' };
    const imports = await Promise.all([1, 2].map(() => sql.query('select sdr_import_web_discovery_lead($1,$2,$3) as result', [lead, campaign, ['domain:empresa.com.br']])));
    assert.equal(imports.filter(r => r.rows[0].result.duplicate).length, 1);
    assert.equal((await sql.query('select count(*)::int as total from sdr_leads')).rows[0].total, 1);
    assert.equal((await sql.query('select count(*)::int as total from sdr_opportunities')).rows[0].total, 1);
    assert.equal((await sql.query('select count(*)::int as total from sdr_queue')).rows[0].total, 0);
    assert.ok((await sql.query("select used_units,enabled from sdr_provider_budgets where provider<>'web_research'")).rows.every(r => Number(r.used_units) === 0 && r.enabled === false));
    await sql.exec("update sdr_runs set status='completed'; update sdr_provider_budgets set enabled=false where provider='web_research'");
    const before = (await sql.query("select used_units from sdr_provider_budgets where provider='web_research'")).rows[0].used_units;
    await assert.rejects(sql.query('select sdr_begin_web_discovery($1)', [campaign]), /provider_budget/);
    budget = (await sql.query("select used_units from sdr_provider_budgets where provider='web_research'")).rows[0]; assert.equal(budget.used_units, before);
    assert.equal((await sql.query('select count(*)::int as total from sdr_runs')).rows[0].total, 2);
    for (const signature of ['sdr_begin_web_discovery(uuid)', 'sdr_import_web_discovery_lead(jsonb,uuid,text[])']) {
      for (const role of ['anon', 'authenticated']) assert.equal((await sql.query('select has_function_privilege($1,$2,\'EXECUTE\') as allowed', [role, signature])).rows[0].allowed, false);
      assert.equal((await sql.query('select has_function_privilege(\'service_role\',$1,\'EXECUTE\') as allowed', [signature])).rows[0].allowed, true);
    }
  } finally { await sql.close(); }
});
