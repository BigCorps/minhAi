const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
let PGlite;
try { ({ PGlite } = require(process.env.PGLITE_MODULE_PATH || '@electric-sql/pglite')); } catch { /* local optional SQL runtime */ }
test('commercial classification SQL preserves manual overrides atomically and never modifies other qualification/budgets/queue', { skip: !PGlite && 'Set PGLITE_MODULE_PATH to local PGlite' }, async () => {
  const sql = new PGlite();
  const id = '00000000-0000-0000-0000-000000000001';
  try {
    await sql.exec(`create role anon; create role authenticated; create role service_role;
      create table sdr_leads(id uuid primary key,source text);
      create table sdr_opportunities(id uuid primary key,lead_id uuid,product text,stage text,qualification jsonb);
      create table sdr_provider_budgets(provider text,used_units numeric,enabled boolean);
      create table sdr_queue(id uuid);
      insert into sdr_leads values('${id}','web_research');
      insert into sdr_opportunities values('${id}','${id}','conviteia','new','{"decision_maker":{"source":"web_research","validated":true},"web_research":{"status":"completed"},"email_lookup":{"hunter":{"status":"not_found"}}}');
      insert into sdr_provider_budgets values('web_research',5,false);`);
    await sql.exec(readFileSync(require.resolve('../supabase/migrations/20261006232735_sdr_commercial_classification.sql'), 'utf8'));
    const set = (mode, value) => sql.query('select sdr_set_commercial_classification($1,$2,$3) as classification', [id, mode, value]);
    const automatic = { type: 'partner', confidence: 0.75, reasons: ['partner_event_partner'] };
    let result = (await set('automatic', automatic)).rows[0].classification;
    assert.equal(result.type, 'partner'); assert.equal(result.recommendedRoute, 'partner_outreach');
    assert.equal(result.product, 'conviteia'); assert.equal(result.leadSource, 'web_research'); assert.equal(result.rulesVersion, 1);
    const manual = (await set('manual', { type: 'customer' })).rows[0].classification;
    assert.equal(manual.source, 'manual'); assert.equal(manual.confidence, 1); assert.deepEqual(manual.reasons, ['manual_override']);
    result = (await set('automatic', automatic)).rows[0].classification; assert.deepEqual(result, manual);
    // Multiple queued automatic saves cannot undo a manual update, irrespective of order.
    await Promise.all([set('automatic', automatic), set('manual', { type: 'low_priority' }), set('automatic', automatic)]);
    result = (await sql.query('select qualification from sdr_opportunities')).rows[0].qualification.commercial_classification;
    assert.equal(result.type, 'low_priority'); assert.equal(result.source, 'manual');
    result = (await set('recalculate', automatic)).rows[0].classification;
    assert.equal(result.type, 'partner'); assert.equal(result.source, 'automatic');
    for (const type of ['customer', 'partner', 'customer_or_partner', 'low_priority']) {
      const r = (await set('manual', { type, recommendedRoute: 'unsafe', reasons: ['https://secret'] })).rows[0].classification;
      assert.deepEqual(r.reasons, ['manual_override']); assert.notEqual(r.recommendedRoute, 'unsafe');
    }
    for (const value of [{ type: 'wrong' }, { type: 'partner', confidence: 2, reasons: ['safe'] },
      { type: 'partner', confidence: 0.5, reasons: ['https://secret'] }, { type: 'partner', confidence: 0.5, reasons: [99] }]) {
      await assert.rejects(set('recalculate', value), /invalid_/);
    }
    await assert.rejects(set('wrong_mode', automatic), /invalid_classification_mode/);
    const opportunity = (await sql.query('select * from sdr_opportunities')).rows[0];
    assert.equal(opportunity.stage, 'new'); assert.equal(opportunity.qualification.decision_maker.validated, true);
    assert.equal(opportunity.qualification.web_research.status, 'completed');
    assert.equal(opportunity.qualification.email_lookup.hunter.status, 'not_found');
    assert.equal(Number((await sql.query('select used_units from sdr_provider_budgets')).rows[0].used_units), 5);
    assert.equal((await sql.query('select count(*)::int as count from sdr_queue')).rows[0].count, 0);
    for (const role of ['anon', 'authenticated']) assert.equal((await sql.query("select has_function_privilege($1,'sdr_set_commercial_classification(uuid,text,jsonb)','EXECUTE') as allowed", [role])).rows[0].allowed, false);
    assert.equal((await sql.query("select has_function_privilege('service_role','sdr_set_commercial_classification(uuid,text,jsonb)','EXECUTE') as allowed")).rows[0].allowed, true);
  } finally { await sql.close(); }
});
