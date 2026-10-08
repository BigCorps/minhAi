const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');
let PGlite; try { ({ PGlite } = require(process.env.PGLITE_MODULE_PATH || '@electric-sql/pglite')); } catch { /* Optional isolated SQL runtime, consistent with existing SDR tests. */ }
const sqlTest = (name, run) => test(name, { skip: !PGlite && 'Set PGLITE_MODULE_PATH to local PGlite' }, run);
const path = require('node:path');
const read = file => readFileSync(path.join(__dirname, '..', file), 'utf8');
function compile(file, deps = {}, globals = {}) {
  const exports = {};
  runInNewContext(ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, URL, Date, Buffer, console, process: { env: {} }, fetch() { throw Error('unexpected_network'); }, require(id) { if (id === 'server-only') return {}; if (Object.hasOwn(deps, id)) return deps[id]; throw Error(`unexpected_dependency:${id}`); }, ...globals });
  return exports;
}
const catalog = compile('lib/sdr/catalog.ts');
const policy = compile('lib/sdr/commercial-classification.ts', { './catalog': catalog });
const outreach = compile('lib/sdr/outreach.ts', { './catalog': catalog, './commercial-classification': policy });
const actor = '00000000-0000-0000-0000-000000000999';
const uuid = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const address = 'administrativo@empresa.com.br', source = 'https://empresa.com.br/contato/';
function fixture(type = 'partner') {
  return { l: { company_name: 'Empresa Teste', domain: 'empresa.com.br', source: 'web_research', email: null, email_status: 'unknown' },
    o: { id: uuid(1), product: 'conviteia', qualification: { commercial_classification: { type }, web_research: { status: 'completed', validatorVersion: 3,
      companyContacts: [{ type: 'email', value: address, sourceUrl: source }], sources: [{ url: source }] } } } };
}
const corporate = { recipient_kind: 'company_contact', recipient_address: address };
const clean = v => JSON.parse(JSON.stringify(v));
test('corporate recipient is revalidated against stored contacts/source, never copied to lead.email', () => {
  const { l, o } = fixture(); const before = clean(l);
  const s = outreach.recipientSnapshot(o, l, corporate);
  assert.equal(s.recipient_address, address); assert.equal(s.recipient_source_url, source); assert.deepEqual(clean(l), before);
  assert.throws(() => outreach.recipientSnapshot(o, l, { ...corporate, recipient_address: 'contato@attacker.com' }), /validated_company_contact_required/);
  for (const value of ['http://empresa.com.br', 'https://user:secret@empresa.com.br/', 'https://127.0.0.1/', 'javascript:alert(1)']) {
    const f = fixture(); f.o.qualification.web_research.companyContacts[0].sourceUrl = value;
    assert.throws(() => outreach.recipientSnapshot(f.o, f.l, corporate), /validated_company_contact_required/);
  }
  o.qualification.web_research.sources = []; assert.throws(() => outreach.recipientSnapshot(o, l, corporate), /validated_company_contact_required/);
});
test('individual requires verified; public_source and corporate/generic contacts do not bypass it', () => {
  const { l, o } = fixture(); l.email = 'pessoa@empresa.com.br';
  for (const status of ['unknown', 'public_source', 'invalid']) { l.email_status = status; assert.throws(() => outreach.recipientSnapshot(o, l, { recipient_kind: 'individual' }), /verified_email_required/); }
  l.email_status = 'verified'; assert.equal(outreach.recipientSnapshot(o, l, { recipient_kind: 'individual' }).recipient_address, l.email);
});
test('variants follow persisted classification; mixed requires explicit choice and low priority is blocked', () => {
  assert.equal(outreach.messageVariant('partner'), 'partner'); assert.equal(outreach.messageVariant('customer'), 'customer');
  assert.throws(() => outreach.messageVariant('customer_or_partner'), /explicit_variant_required/);
  assert.equal(outreach.messageVariant('customer_or_partner', 'partner'), 'partner');
  assert.throws(() => outreach.messageVariant('partner', 'customer'), /classification_variant_mismatch/);
  assert.throws(() => outreach.messageVariant('low_priority', 'customer'), /low_priority_outreach_blocked/);
});
function channels(server) { return compile('lib/sdr/channels.ts', { './outreach': outreach, './catalog': catalog, './server': server }); }
test('partner/customer preview uses different copy and institutional greeting; sends use snapshot, not lead email', async () => {
  const calls = [];
  const account = { is_active: true, scopes: ['https://www.googleapis.com/auth/gmail.send'], access_token: 'synthetic-token', expires_at: new Date(Date.now() + 86400000).toISOString() };
  const q = { select() { return this; }, eq() { return this; }, async single() { return { data: account }; } };
  const c = channels({ db: () => ({ from: () => q }), checked: r => r.data, required: () => 'synthetic', signToken: () => 'synthetic-token', origin: () => 'https://minhai.app', fetchJson: async (url, init) => { calls.push({ url, init }); return { payload: { id: 'simulated-send-id' } }; } });
  const { o, l } = fixture();
  const partner = c.emailContent(o, l, 0, 'partner', 'company_contact'); const customer = c.emailContent(o, l, 0, 'customer');
  assert.match(partner.body, /link exclusivo/); assert.match(partner.body, /Memórias/); assert.match(partner.body, /não há promessa de comissão/); assert.match(partner.body, /equipe da Empresa/);
  assert.doesNotMatch(customer.body, /link exclusivo/);
  await c.sendEmail({ id: uuid(9), recipient_address: address, message_subject: partner.subject, message_body: partner.body }, o, { ...l, email: 'changed@elsewhere.com' });
  const mime = Buffer.from(JSON.parse(calls[0].init.body).raw, 'base64url').toString();
  assert.match(mime, new RegExp(`To: ${address}`)); assert.doesNotMatch(mime, /changed@elsewhere/);
  assert.equal(Buffer.from(mime.split('\r\n\r\n')[1], 'base64').toString(), partner.body);
  await assert.rejects(c.sendEmail({ id: uuid(9) }, o, l), /queue_recipient_required/); assert.equal(calls.length, 1);
});
test('follow-up snapshots inherit recipient/source/evidence/variant/content and manual pilot never schedules another touch', () => {
  const snapshot = { ...outreach.recipientSnapshot(fixture().o, fixture().l, corporate), message_variant: 'partner', message_subject: 'Subject', message_body: 'Reviewed', enqueue_mode: 'manual_review', reviewed_by: actor, reviewed_at: 'synthetic' };
  assert.deepEqual(clean(outreach.followupSnapshot(snapshot)), clean(snapshot));
  const worker = read('lib/sdr/worker.ts'); assert.match(worker, /followupSnapshot\(q\)/); assert.match(worker, /q\.enqueue_mode !== "manual_pilot"/); assert.match(worker, /q\.enqueue_mode !== "automatic"/);
  assert.match(worker, /SDR_EMAIL_REPLY_READ_ENABLED/); assert.match(worker, /process\.env\.SDR_LIVE_SEND !== "true" \|\| !businessHours\(\)/); assert.match(worker, /threadHasReply/);
});
async function setup(options = {}) {
  const d = new PGlite();
  await d.exec(`create role anon; create role authenticated; create role service_role;
    create table sdr_campaigns(id uuid primary key,enabled boolean not null default true,trial_ends_at timestamptz default now()+interval '1 day',daily_limit integer default 3,max_touches integer default 1);
    create table sdr_leads(id uuid primary key,company_name text,domain text,cnpj text,source text,email text,email_status text default 'unknown',phone text,owner text default 'minhai',outreach_reviewed boolean default true,suppressed_at timestamptz,human_at timestamptz,last_inbound_at timestamptz,last_contact_at timestamptz);
    create table sdr_opportunities(id uuid primary key,lead_id uuid references sdr_leads,campaign_id uuid references sdr_campaigns,product text default 'conviteia',stage text default 'new',qualification jsonb);
    create table sdr_queue(id uuid primary key default gen_random_uuid(),opportunity_id uuid references sdr_opportunities,lead_id uuid references sdr_leads,campaign_id uuid references sdr_campaigns,channel text,step integer default 0,status text default 'queued',due_at timestamptz default now(),lease_at timestamptz,sent_at timestamptz,error_code text,unique(opportunity_id,channel,step));
    create table sdr_consents(lead_id uuid,product text,channel text,address text,revoked_at timestamptz);
    alter table sdr_queue enable row level security; revoke all on sdr_queue from public,anon,authenticated; grant all on sdr_queue to service_role; create policy service_role_access on sdr_queue to service_role using(true) with check(true);
    grant select,update on sdr_leads,sdr_campaigns,sdr_opportunities to service_role; grant select on sdr_consents to service_role;
    insert into sdr_campaigns(id) values('${uuid(20)}');`);
  await d.exec(read('supabase/migrations/20261007110000_sdr_product_rollouts.sql'));
  for (let n = 1; n <= 4; n++) {
    const f = fixture();
    await d.query('insert into sdr_leads(id,company_name,domain,source) values($1,$2,$3,$4)', [uuid(n), f.l.company_name, f.l.domain, f.l.source]);
    await d.query('insert into sdr_opportunities(id,lead_id,campaign_id,qualification) values($1,$1,$2,$3)', [uuid(n), uuid(20), f.o.qualification]);
  }
  if (options.legacy) {
    await d.query("update sdr_leads set email='original@empresa.com.br',email_status='verified' where id=$1", [uuid(1)]);
    await d.query("insert into sdr_queue(opportunity_id,lead_id,campaign_id,channel) values($1,$1,$2,'email')", [uuid(1), uuid(20)]);
  }
  await d.exec(read('supabase/migrations/20261007164922_sdr_institutional_recipients.sql'));
  await d.exec(read('supabase/migrations/20261007164923_sdr_manual_pilot_gate.sql'));
  await d.exec(read('supabase/migrations/20261008141000_sdr_automatic_first_contact.sql'));
  const snapshot = { ...clean(outreach.recipientSnapshot(fixture().o, fixture().l, corporate)), message_variant: 'partner', message_subject: 'Reviewed subject', message_body: 'Reviewed body', enqueue_mode: 'manual_pilot' };
  const enqueue = (n, s = snapshot) => d.query('select sdr_enqueue_reviewed_email($1,$2,$3) id', [uuid(n), s, actor]);
  return { d, snapshot, enqueue };
}
sqlTest('SQL freezes corporate snapshot without touching lead; unsafe address/evidence/variants rejected; no fourth distinct pilot opportunity', async () => {
  const { d, snapshot, enqueue } = await setup(); try {
    await assert.rejects(enqueue(1, { ...snapshot, recipient_address: 'contato@attacker.com' }), /validated_company_contact_required/);
    await assert.rejects(enqueue(1, { ...snapshot, recipient_source_url: 'https://attacker.com/' }), /validated_company_contact_required/);
    await assert.rejects(enqueue(1, { ...snapshot, recipient_evidence: {} }), /manual_contact_review_required/);
    await d.query("update sdr_opportunities set qualification=jsonb_set(qualification,'{commercial_classification,type}','\"low_priority\"') where id=$1", [uuid(1)]);
    await assert.rejects(enqueue(1), /low_priority_outreach_blocked/);
    await d.query("update sdr_opportunities set qualification=jsonb_set(qualification,'{commercial_classification,type}','\"customer_or_partner\"') where id=$1", [uuid(1)]);
    await assert.rejects(enqueue(1, { ...snapshot, message_variant: null }), /explicit_variant_required/);
    const id = (await enqueue(1)).rows[0].id;
    const row = (await d.query('select * from sdr_queue where id=$1', [id])).rows[0]; assert.equal(row.recipient_address, address); assert.equal(row.message_body, snapshot.message_body); assert.equal(row.reviewed_by, actor);
    assert.equal((await d.query('select email from sdr_leads where id=$1', [uuid(1)])).rows[0].email, null);
    await assert.rejects(d.query("update sdr_queue set recipient_address='changed@empresa.com.br' where id=$1", [id]), /queue_snapshot_immutable/);
    await enqueue(2); await enqueue(3); await assert.rejects(enqueue(4), /pilot_opportunity_limit/);
    assert.equal((await d.query('select count(*)::int n from sdr_manual_pilot_opportunities')).rows[0].n, 3);
  } finally { await d.close(); }
});
sqlTest('pilot starts blocked; only explicitly reviewed single-touch email is claimed; caps and disable-before-send hold', async () => {
  const { d, enqueue } = await setup(); try {
    await enqueue(1); await enqueue(2); await enqueue(3);
    assert.equal((await d.query("select manual_pilot_send_enabled from sdr_product_rollouts where product='conviteia'")).rows[0].manual_pilot_send_enabled, false);
    assert.equal((await d.query('select * from sdr_claim()')).rows.length, 0);
    await d.query("select sdr_set_manual_pilot_gate('conviteia',true)");
    await d.query("update sdr_product_rollouts set daily_send_cap=1 where product='conviteia'");
    const claimed = (await d.query('select * from sdr_claim()')).rows; assert.equal(claimed.length, 1); assert.equal(claimed[0].enqueue_mode, 'manual_pilot');
    assert.equal((await d.query('select * from sdr_claim()')).rows.length, 0);
    await d.query('select sdr_begin_send($1)', [claimed[0].id]);
    await d.query("update sdr_queue set status='sent',sent_at=now() where id=$1", [claimed[0].id]);
    assert.equal((await d.query('select * from sdr_claim()')).rows.length, 0);
    await d.query("update sdr_product_rollouts set daily_send_cap=3 where product='conviteia'");
    const next = (await d.query('select * from sdr_claim()')).rows;
    await d.query("select sdr_set_manual_pilot_gate('conviteia',false)");
    await assert.rejects(d.query('select sdr_begin_send($1)', [next[0].id]), /send_no_longer_eligible/);
    await d.query("update sdr_campaigns set max_touches=2"); await d.query("select sdr_set_manual_pilot_gate('conviteia',true)");
    await assert.rejects(d.query('select sdr_begin_send($1)', [next[0].id]), /send_no_longer_eligible/);
  } finally { await d.close(); }
});
sqlTest('automatic first contact requires active gates, one touch and a validated immutable snapshot without human review', async () => {
  const { d } = await setup(); try {
    await d.query("update sdr_leads set email='person@empresa.com.br',email_status='verified',outreach_reviewed=false where id=$1", [uuid(1)]);
    const individual = {
      recipient_kind: 'individual', recipient_address: 'person@empresa.com.br', recipient_source_url: null,
      recipient_evidence: { automation_policy: 'first_contact_v1' }, message_variant: 'partner',
      message_subject: 'Automatic subject', message_body: 'Automatic body', enqueue_mode: 'automatic'
    };
    await assert.rejects(d.query('select sdr_enqueue_automatic_email($1,$2) id',[uuid(1),individual]), /automatic_outreach_not_active/);
    await d.query("select sdr_set_product_rollout('conviteia','active',false,true,true,3,3)");
    await d.query("update sdr_campaigns set max_touches=2");
    await assert.rejects(d.query('select sdr_enqueue_automatic_email($1,$2) id',[uuid(1),individual]), /automatic_first_contact_requires_single_touch/);
    await d.query("update sdr_campaigns set max_touches=1");
    const id=(await d.query('select sdr_enqueue_automatic_email($1,$2) id',[uuid(1),individual])).rows[0].id;
    let row=(await d.query('select * from sdr_queue where id=$1',[id])).rows[0];
    assert.equal(row.enqueue_mode,'automatic'); assert.equal(row.step,0); assert.equal(row.reviewed_by,null);
    assert.equal(row.recipient_evidence.automation_policy,'first_contact_v1');
    const claimed=(await d.query('select * from sdr_claim()')).rows; assert.equal(claimed.length,1); assert.equal(claimed[0].id,id);
    await d.query('select sdr_begin_send($1)',[id]);

    await d.query("update sdr_queue set status='sent',sent_at=now() where id=$1",[id]);
    await d.query("update sdr_leads set outreach_reviewed=false where id=$1",[uuid(2)]);
    const corp = {
      ...clean(outreach.recipientSnapshot(fixture().o, fixture().l, corporate)),
      recipient_evidence: { validation: 'web_research_company_contact', validatorVersion: 3, automation_policy: 'first_contact_v1' },
      message_variant: 'partner', message_subject: 'Corporate subject', message_body: 'Corporate body', enqueue_mode: 'automatic'
    };
    const id2=(await d.query('select sdr_enqueue_automatic_email($1,$2) id',[uuid(2),corp])).rows[0].id;
    row=(await d.query('select * from sdr_queue where id=$1',[id2])).rows[0];
    assert.equal(row.recipient_kind,'company_contact'); assert.equal(row.reviewed_by,null);
    await assert.rejects(d.query("update sdr_queue set message_body='changed' where id=$1",[id2]), /queue_snapshot_immutable/);

    await d.query("update sdr_opportunities set qualification=jsonb_set(qualification,'{commercial_classification,type}','\"customer_or_partner\"') where id=$1",[uuid(3)]);
    await assert.rejects(d.query('select sdr_enqueue_automatic_email($1,$2) id',[uuid(3),corp]), /explicit_variant_required/);
  } finally { await d.close(); }
});
sqlTest('SQL RLS/grants restrict new RPCs, queue and pilot ledger; concurrent allocations cannot exceed cap', async () => {
  const { d, enqueue } = await setup(); try {
    const outcomes = await Promise.allSettled([enqueue(1), enqueue(2), enqueue(3), enqueue(4)]);
    assert.equal(outcomes.filter(r => r.status === 'fulfilled').length, 3);
    for (const table of ['sdr_queue', 'sdr_manual_pilot_opportunities', 'sdr_product_rollouts']) {
      assert.equal((await d.query('select relrowsecurity from pg_class where relname=$1', [table])).rows[0].relrowsecurity, true);
      for (const role of ['anon', 'authenticated']) assert.equal((await d.query("select has_table_privilege($1,$2,'INSERT') ok", [role, table])).rows[0].ok, false);
    }
    for (const fn of ['sdr_enqueue_reviewed_email(uuid,jsonb,uuid)', 'sdr_enqueue_automatic_email(uuid,jsonb)', 'sdr_automatic_queue_valid(sdr_queue)', 'sdr_set_manual_pilot_gate(text,boolean)', 'sdr_claim()', 'sdr_begin_send(uuid)']) {
      for (const role of ['anon', 'authenticated']) assert.equal((await d.query('select has_function_privilege($1,$2,\'EXECUTE\') ok', [role, fn])).rows[0].ok, false);
      assert.equal((await d.query('select prosecdef from pg_proc where oid=$1::regprocedure', [fn])).rows[0].prosecdef, false);
    }
  } finally { await d.close(); }
});

test('signed preview enqueues exact reviewed content and rejects forgery, wrong admin, expiration and stale contact/context', async () => {
  const crypto = require('node:crypto'); const f = fixture(); f.o.lead_id = uuid(1);
  const calls = [];
  const query = table => ({ select() { return this; }, eq() { return this; }, async single() { return { data: table === 'sdr_leads' ? f.l : f.o }; }, async maybeSingle() { return { data: { status: "pilot" } }; } });
  const server = { checked: r => r.data, db: () => ({ from: query, rpc: async (name, args) => { calls.push({ name, args }); return { data: 'queued' }; } }), required: () => 'test-only-signing-secret', origin: () => 'https://minhai.app', signToken: () => 'link-token' };
  const c = channels(server);
  const mod = compile('lib/sdr/outreach-server.ts', { './server': server, './channels': c, './outreach': outreach, 'node:crypto': crypto });
  const preview = await mod.previewOutreach(uuid(1), corporate, actor);
  assert.equal(calls.length, 0); assert.equal(f.l.email, null);
  assert.equal(await mod.enqueueReviewedOutreach(uuid(1), preview.reviewToken, actor), 'queued');
  assert.equal(calls.length, 1); const saved = calls[0].args.p_snapshot;
  assert.equal(saved.message_subject, preview.subject); assert.equal(saved.message_body, preview.body); assert.equal(saved.recipient_address, preview.recipient_address);
  assert.equal(calls[0].name, 'sdr_enqueue_reviewed_email');
  await assert.rejects(mod.enqueueReviewedOutreach(uuid(1), preview.reviewToken + 'tamper', actor), /outreach_review_invalid/);
  await assert.rejects(mod.enqueueReviewedOutreach(uuid(1), preview.reviewToken, uuid(555)), /outreach_review_invalid/);
  await assert.rejects(mod.enqueueReviewedOutreach(uuid(1), mod.sealReview({ ...saved, exp: 0 }), actor), /outreach_review_invalid/);
  f.o.qualification.web_research.companyContacts = []; await assert.rejects(mod.enqueueReviewedOutreach(uuid(1), preview.reviewToken, actor), /validated_company_contact_required/);
  f.o.qualification.web_research.companyContacts = fixture().o.qualification.web_research.companyContacts;
  f.l.company_name = 'Company changed'; await assert.rejects(mod.enqueueReviewedOutreach(uuid(1), preview.reviewToken, actor), /outreach_review_context_changed/); assert.equal(calls.length, 1);
});
test('worker performs no sends or claims while global kill switch or businessHours blocks it', async () => {
  const calls = []; const throwing = () => { throw Error('unexpected_send_or_provider'); };
  const server = { db: () => ({ rpc: async name => { calls.push(name); throw Error('unexpected_claim'); } }) };
  for (const [live, hours] of [['false', true], ['true', false]]) {
    const w = compile('lib/sdr/worker.ts', { './server': server, './outreach': outreach, './catalog': { businessHours: () => hours }, './channels': { sendEmail: throwing, sendWhatsapp: throwing, syncTemplate: throwing, threadHasReply: throwing, googleAccount: throwing }, './web-discovery': { discoverWebCompanies: throwing }, './sales': { reconcileSales: async () => ({}) }, './auto-outreach': { prepareAutomaticFirstContacts: throwing } }, { process: { env: { SDR_LIVE_SEND: live } } });
    assert.equal((await w.runWorker()).mode, 'paused'); assert.equal(calls.length, 0);
  }
});
sqlTest('SQL campaign cap, expired trial, human/reply/suppression guards and pilot email-only checks survive', async () => {
  const { d, enqueue } = await setup(); try {
    await enqueue(1); await enqueue(2); await d.query("select sdr_set_manual_pilot_gate('conviteia',true)");
    await d.query('update sdr_campaigns set daily_limit=1'); let q = (await d.query('select * from sdr_claim()')).rows; assert.equal(q.length, 1);
    await d.query('select sdr_begin_send($1)', [q[0].id]);
    await d.query("update sdr_queue set status='sent',sent_at=now() where id=$1", [q[0].id]); assert.equal((await d.query('select * from sdr_claim()')).rows.length, 0);
    await d.query('update sdr_campaigns set daily_limit=3');
    for (const field of ['human_at', 'last_inbound_at', 'suppressed_at']) {
      await d.query(`update sdr_leads set ${field}=now() where id=$1`, [uuid(2)]); assert.equal((await d.query('select * from sdr_claim()')).rows.length, 0);
      await d.query(`update sdr_leads set ${field}=null where id=$1`, [uuid(2)]);
    }
    await d.query("update sdr_campaigns set trial_ends_at=now()-interval '1 day'"); assert.equal((await d.query('select * from sdr_claim()')).rows.length, 0);
    await d.query("update sdr_campaigns set trial_ends_at=now()+interval '1 day'");
    await d.query("update sdr_leads set outreach_reviewed=false where id=$1", [uuid(2)]); assert.equal((await d.query('select * from sdr_claim()')).rows.length, 0);
    await d.query("update sdr_leads set outreach_reviewed=true where id=$1", [uuid(2)]);
    // Gate rejects any manually forged non-email/extra-touch pilot row as well.
    await d.query("insert into sdr_queue(opportunity_id,lead_id,campaign_id,channel,enqueue_mode,reviewed_by,reviewed_at,message_subject,message_body,recipient_address) values($1,$1,$2,'whatsapp','manual_pilot',$3,now(),'s','b','corp@empresa.com.br')", [uuid(3),uuid(20),actor]);
    q = (await d.query('select * from sdr_claim()')).rows; assert.equal(q.length, 1); assert.equal(q[0].channel, 'email');
  } finally { await d.close(); }
});

test('Admin recipient and variant are explicit controlled choices; mixed classification cannot preview without selection', () => {
  const sourceCode = read('components/admin/AdminCommercial.tsx') + '\nexport { OutreachReview };';
  const exports = {}, slots = []; let cursor = 0, effects = [];
  const react = { useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = value; }]; }, useEffect(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((d,n) => !Object.is(d,slots[i][n]))) effects.push(fn); slots[i] = deps; } };
  const jsx = (type, props) => ({ type, props });
  const deps = { react, 'react/jsx-runtime': { jsx, jsxs: jsx }, 'lucide-react': {}, '@/lib/sdr/catalog': catalog, '@/lib/sdr/commercial-classification': policy, '@/lib/sdr/playbooks': {}, './AdminHeader': {}, './AdminBusinessUi': {} };
  runInNewContext(ts.transpileModule(sourceCode, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports, require: id => deps[id] });
  const f = fixture('customer_or_partner'), calls = [], props = { o: { ...f.o, lead: f.l }, busy: false, action: p => calls.push(p) };
  const render = () => { cursor = 0; effects = []; const tree = exports.OutreachReview(props); effects.forEach(fn => fn()); return tree; };
  const nodes = (tree, type) => !tree || typeof tree !== 'object' ? [] : [...(tree.type === type ? [tree] : []), ...[tree.props?.children].flat(Infinity).flatMap(c => nodes(c,type))];
  let tree = render(); assert.equal(nodes(tree,'button')[0].props.disabled, true);
  nodes(tree,'select')[0].props.onChange({ target: { value: address } }); tree = render(); assert.equal(nodes(tree,'button')[0].props.disabled, true);
  nodes(tree,'select')[1].props.onChange({ target: { value: 'partner' } }); tree = render(); assert.equal(nodes(tree,'button')[0].props.disabled, false);
  tree.props.onSubmit({ preventDefault() {} }); assert.equal(calls.length, 1); assert.equal(calls[0].message_variant,'partner'); assert.equal(calls[0].recipient_kind,'company_contact'); assert.equal(calls[0].recipient_address,address); assert.equal(calls[0].action,'preview'); assert.equal(f.l.email,null);
});
test('legacy individual queue migration backfills address without deletion or verification relaxation', () => {
  const sql = read('supabase/migrations/20261007164922_sdr_institutional_recipients.sql');
  assert.match(sql, /update public\.sdr_queue q set recipient_address=lower\(l\.email\)/);
  assert.doesNotMatch(sql, /delete from|update public\.sdr_leads|disable row level security|security definer/i);
  assert.match(sql, /queue_snapshot_immutable/);
  assert.match(sql, /manual_pilot_migration_required/);
});
sqlTest('legacy automatic email rows keep their address but fail closed without the new automation snapshot', async () => {
  const { d } = await setup({ legacy: true }); try {
    const before = (await d.query('select * from sdr_queue')).rows; assert.equal(before.length,1); assert.equal(before[0].recipient_address,'original@empresa.com.br'); assert.equal(before[0].recipient_kind,'individual');
    await d.query("select sdr_set_product_rollout('conviteia','active',false,true,true,3,3)");
    assert.equal((await d.query('select * from sdr_claim()')).rows.length,0);
    assert.equal((await d.query('select recipient_address from sdr_queue')).rows[0].recipient_address,'original@empresa.com.br');
  } finally { await d.close(); }
});

sqlTest('pilot rejects manual_review; active accepts reviewed snapshots without consuming pilot ledger and rejects manual_pilot', async () => {
  const { d, snapshot, enqueue } = await setup(); try {
    const review = { ...snapshot, enqueue_mode: 'manual_review' };
    await assert.rejects(enqueue(1, review), /outreach_review_mode_changed/);
    assert.equal((await d.query('select count(*)::int n from sdr_manual_pilot_opportunities')).rows[0].n,0);
    await enqueue(1); // Existing pilot path still reserves its own slot.
    await d.query("select sdr_set_product_rollout('conviteia','active',false,false,false,1,3)");
    await assert.rejects(enqueue(2, snapshot), /outreach_review_mode_changed/);
    const id = (await enqueue(2, review)).rows[0].id;
    const q = (await d.query('select * from sdr_queue where id=$1',[id])).rows[0];
    for (const key of ['recipient_kind','recipient_address','recipient_source_url','recipient_evidence','message_variant','message_subject','message_body','enqueue_mode']) assert.deepEqual(clean(q[key]),clean(review[key]));
    assert.equal(q.reviewed_by,actor); assert.ok(q.reviewed_at);
    assert.equal((await d.query('select count(*)::int n from sdr_manual_pilot_opportunities')).rows[0].n,1);
    assert.equal((await d.query('select * from sdr_claim()')).rows.length,0);
    await d.query("select sdr_set_product_rollout('conviteia','active',false,true,false,1,3)");
    assert.equal((await d.query('select * from sdr_claim()')).rows.length,0);
    await d.query("select sdr_set_product_rollout('conviteia','active',false,true,true,1,3)");
    const claimed = (await d.query('select * from sdr_claim()')).rows; assert.equal(claimed.length,1); assert.equal(claimed[0].id,id);
    await d.query('select sdr_begin_send($1)',[id]);
    assert.equal((await d.query('select status from sdr_queue where opportunity_id=$1',[uuid(1)])).rows[0].status,'queued'); // A pilot row never silently becomes active/manual_review.
    assert.equal((await d.query('select email from sdr_leads where id=$1',[uuid(2)])).rows[0].email,null);
  } finally { await d.close(); }
});
sqlTest('active manual_review does not consume pilot_limit and remains subject to product/campaign caps and all contact guards', async () => {
  const { d, snapshot, enqueue } = await setup(); try {
    const review = { ...snapshot, enqueue_mode: 'manual_review' };
    await d.query("select sdr_set_product_rollout('conviteia','active',false,false,false,1,3)");
    for (let n=1;n<=4;n++) await enqueue(n,review);
    assert.equal((await d.query('select count(*)::int n from sdr_queue')).rows[0].n,4);
    assert.equal((await d.query('select count(*)::int n from sdr_manual_pilot_opportunities')).rows[0].n,0);
    await d.query("select sdr_set_product_rollout('conviteia','active',false,true,true,1,1)");
    let claimed=(await d.query('select * from sdr_claim()')).rows; assert.equal(claimed.length,1);
    assert.equal((await d.query('select * from sdr_claim()')).rows.length,0);
    await d.query("update sdr_queue set status='queued',lease_at=null");
    await d.query("select sdr_set_product_rollout('conviteia','active',false,true,true,1,3)");
    await d.query('update sdr_campaigns set daily_limit=1'); claimed=(await d.query('select * from sdr_claim()')).rows; assert.equal(claimed.length,1);
    for (const field of ['suppressed_at','human_at','last_inbound_at']) {
      await d.query(`update sdr_leads set ${field}=now() where id=$1`,[claimed[0].lead_id]);
      await assert.rejects(d.query('select sdr_begin_send($1)',[claimed[0].id]), /send_no_longer_eligible/);
      await d.query(`update sdr_leads set ${field}=null where id=$1`,[claimed[0].lead_id]);
    }
    await d.query('update sdr_leads set outreach_reviewed=false where id=$1',[claimed[0].lead_id]);
    await assert.rejects(d.query('select sdr_begin_send($1)',[claimed[0].id]), /send_no_longer_eligible/);
    await d.query('update sdr_leads set outreach_reviewed=true where id=$1',[claimed[0].lead_id]);
    await d.query('update sdr_campaigns set enabled=false'); await assert.rejects(d.query('select sdr_begin_send($1)',[claimed[0].id]), /send_no_longer_eligible/);
    await d.query("update sdr_campaigns set enabled=true,trial_ends_at=now()-interval '1 day'"); await assert.rejects(d.query('select sdr_begin_send($1)',[claimed[0].id]), /send_no_longer_eligible/);
    await d.query("update sdr_campaigns set trial_ends_at=now()+interval '1 day'");
    await d.query("select sdr_set_product_rollout('conviteia','active',false,true,false,1,3)"); await assert.rejects(d.query('select sdr_begin_send($1)',[claimed[0].id]), /send_no_longer_eligible/);
  } finally { await d.close(); }
});
sqlTest('manual_review follow-up inherits the same recipient/content/review snapshot and never uses the pilot ledger', async () => {
  const { d, snapshot, enqueue } = await setup(); try {
    await d.query("select sdr_set_product_rollout('conviteia','active',false,true,true,3,3)");
    await d.query('update sdr_campaigns set max_touches=2');
    const id=(await enqueue(1,{...snapshot,enqueue_mode:'manual_review'})).rows[0].id;
    const q=(await d.query('select * from sdr_claim()')).rows[0]; assert.equal(q.id,id); await d.query('select sdr_begin_send($1)',[id]);
    await d.query("update sdr_queue set status='sent',sent_at=now() where id=$1",[id]);
    const inherited=clean(outreach.followupSnapshot(q));
    const row={ opportunity_id:q.opportunity_id, lead_id:q.lead_id, campaign_id:q.campaign_id, channel:'email',step:1,...inherited };
    const keys=Object.keys(row); await d.query(`insert into sdr_queue(${keys.join(',')}) values(${keys.map((_,i)=>'$'+(i+1)).join(',')})`,Object.values(row));
    const followup=(await d.query('select * from sdr_claim()')).rows[0]; assert.equal(followup.step,1); assert.equal(followup.enqueue_mode,'manual_review');
    assert.deepEqual(clean(outreach.followupSnapshot(followup)),inherited); await d.query('select sdr_begin_send($1)',[followup.id]);
    assert.equal((await d.query('select count(*)::int n from sdr_manual_pilot_opportunities')).rows[0].n,0);
  } finally { await d.close(); }
});
sqlTest('draft, ready and paused reject reviewed enqueue with explicit safe errors; neither mode can masquerade as automatic', async () => {
  const { d, snapshot, enqueue } = await setup(); try {
    for (const status of ['draft','ready','paused']) {
      await d.query('select sdr_set_product_rollout($1,$2,false,false,false,3,3)',['conviteia',status]);
      for (const mode of ['manual_pilot','manual_review']) await assert.rejects(enqueue(1,{...snapshot,enqueue_mode:mode}), /reviewed_outreach_requires_pilot_or_active/);
    }
    await d.query("select sdr_set_product_rollout('conviteia','active',false,false,false,3,3)");
    await assert.rejects(enqueue(1,{...snapshot,enqueue_mode:'automatic'}), /manual_contact_review_required/);
    assert.equal((await d.query('select count(*)::int n from sdr_queue')).rows[0].n,0);
  } finally { await d.close(); }
});
function reviewedServerHarness(status='pilot') {
  const f=fixture(); f.o.lead_id=uuid(1); const rollout={ status },calls=[];
  const query=table=>({select(){return this;},eq(){return this;},async single(){return {data:table==='sdr_leads'?f.l:f.o};},async maybeSingle(){return {data:rollout};}});
  const server={checked:r=>r.data,db:()=>({from:query,rpc:async(name,args)=>{calls.push({name,args});return {data:'queue-id'};}}),required:()=> 'synthetic-review-key',origin:()=> 'https://minhai.app',signToken:()=> 'synthetic-link'};
  const mod=compile('lib/sdr/outreach-server.ts',{'./server':server,'./channels':{emailContent:()=>({subject:'Reviewed subject',body:'Reviewed body'})},'./outreach':outreach,'node:crypto':require('node:crypto')});
  return {f,rollout,calls,server,mod};
}
test('server derives and freezes mode from real rollout, ignores browser mode, and rejects pilot/active changes before any enqueue', async () => {
  for (const [status,mode,next] of [['pilot','manual_pilot','active'],['active','manual_review','pilot']]) {
    const h=reviewedServerHarness(status);
    for (const browserMode of ['automatic','manual_pilot','manual_review','arbitrary']) {
      const preview=await h.mod.previewOutreach(uuid(1),{...corporate,enqueue_mode:browserMode},actor);
      assert.equal(preview.enqueue_mode,mode); assert.equal(h.mod.readReview(preview.reviewToken,uuid(1),actor).enqueue_mode,mode);
    }
    const preview=await h.mod.previewOutreach(uuid(1),corporate,actor);
    h.rollout.status=next;
    await assert.rejects(h.mod.enqueueReviewedOutreach(uuid(1),preview.reviewToken,actor), /outreach_review_mode_changed/); assert.equal(h.calls.length,0);
  }
  for (const status of ['draft','ready','paused']) {
    const h=reviewedServerHarness(status); await assert.rejects(h.mod.previewOutreach(uuid(1),corporate,actor), /reviewed_outreach_requires_pilot_or_active/); assert.equal(h.calls.length,0);
  }
});
test('browser enqueue route passes only the signed review; arbitrary enqueue_mode cannot replace server-selected mode', async () => {
  const h=reviewedServerHarness('active'); const preview=await h.mod.previewOutreach(uuid(1),{...corporate,enqueue_mode:'manual_pilot'},actor);
  const route=compile('app/api/admin/comercial/route.ts', {
    '@/lib/sdr/server':{...h.server,adminRequest:async(req,fn)=>fn(actor),body:async req=>req.payload,event:async()=>{}},
    '@/lib/sdr/catalog':catalog,'@/lib/sdr/outreach-server':h.mod,'@/lib/sdr/providers':{},'@/lib/sdr/partners':{},'@/lib/sdr/rollouts':{},
    '@/lib/sdr/commercial-classification-server':{},'@/lib/sdr/web-discovery':{},'@/lib/sdr/web-research':{},'@/lib/sdr/channels':{},'@/lib/sdr/monitoria':{},'@/lib/sdr/sales':{},'@/lib/sdr/sales-queue':{sellerQueueSnapshot:async()=>[]},
  });
  await route.POST({payload:{action:'enqueue',id:uuid(1),channel:'email',reviewToken:preview.reviewToken,enqueue_mode:'automatic'}});
  assert.equal(h.calls.length,1); assert.equal(h.calls[0].args.p_snapshot.enqueue_mode,'manual_review'); assert.equal(h.f.l.email,null);
  const parts=preview.reviewToken.split('.'),payload=JSON.parse(Buffer.from(parts[0],'base64url'));
  payload.enqueue_mode='automatic'; const forged=Buffer.from(JSON.stringify(payload)).toString('base64url')+'.'+parts[1];
  await assert.rejects(route.POST({payload:{action:'enqueue',id:uuid(1),channel:'email',reviewToken:forged}}), /outreach_review_invalid/); assert.equal(h.calls.length,1);
});
test('Admin displays reviewed mode, neutral form title and safe actionable errors without echoing unknown messages', () => {
  const react=require('react'),{renderToStaticMarkup}=require('react-dom/server');
  let slot=0,preview;
  const hooks={...react,useState(initial){const n=slot++;return [n===7?preview:initial,()=>{}];},useEffect(){},useCallback:fn=>fn,useRef:()=>({current:null})};
  const deps={react:hooks,'react/jsx-runtime':require('react/jsx-runtime'),'lucide-react':require('lucide-react'),'@/lib/sdr/catalog':catalog,'@/lib/sdr/commercial-classification':policy,'@/lib/sdr/playbooks':{},'./AdminHeader':{default:()=>null},'./AdminBusinessUi':{money:()=> 'R$ 0'}};
  const exports={}; runInNewContext(ts.transpileModule(read('components/admin/AdminCommercial.tsx')+'\nexport { commercialError };',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:id=>deps[id]});
  for (const [mode,label,hint] of [['manual_pilot','Piloto manual','Preparar a fila não libera o piloto.'],['manual_review','Envio revisado','Este email continuará sujeito aos gates ativos de envio.']]) {
    slot=0; preview={id:uuid(1),enqueue_mode:mode,recipient_address:address,recipient_kind:'company_contact',message_variant:'partner',subject:'Subject',body:'Body',url:'https://minhai.app',recipient_source_url:source};
    const html=renderToStaticMarkup(react.createElement(exports.default,{admin:{},basePath:'/admin'}));
    for (const text of [label,hint,'Destinatário:','Tipo:','Variante:']) assert.ok(html.includes(text));
  }
  for (const code of ['outreach_review_invalid_or_expired','outreach_review_context_changed','outreach_recipient_changed','explicit_recipient_required','explicit_variant_required','classification_variant_mismatch','commercial_classification_required','low_priority_outreach_blocked','validated_company_contact_required','manual_contact_review_required','queue_recipient_required','manual_pilot_requires_single_touch_pilot','pilot_opportunity_limit','manual_gate_requires_pilot','invalid_manual_pilot_gate','outreach_review_mode_changed','reviewed_outreach_requires_pilot_or_active']) assert.match(exports.commercialError(code),new RegExp(`\\(${code}\\)`));
  assert.doesNotMatch(exports.commercialError('https://secret.invalid/token=secret'),/secret|https/);
  assert.match(read('components/admin/AdminCommercial.tsx'),/Preparar email revisado/); assert.doesNotMatch(read('components/admin/AdminCommercial.tsx'),/Preparar piloto manual por email/);
});
sqlTest('legacy sdr_enqueue signature remains callable but automatic email without first_contact_v1 snapshot fails closed', async () => {
  const { d } = await setup(); try {
    const old=read('supabase/migrations/20261005183013_sdr_own_sales.sql');
    const start=old.indexOf('create or replace function public.sdr_enqueue('),end=old.indexOf('create or replace function public.sdr_claim()',start);
    assert.ok(start>=0 && end>start); await d.exec(old.slice(start,end));
    await d.exec('revoke all on function public.sdr_enqueue(uuid,text) from public,anon,authenticated; grant execute on function public.sdr_enqueue(uuid,text) to service_role;');
    await d.query("update sdr_leads set email='person@empresa.com.br',email_status='verified' where id=$1",[uuid(1)]);
    await assert.rejects(d.query("select sdr_enqueue($1,'email') id",[uuid(1)]), /automatic_snapshot_required/);
    assert.equal((await d.query('select count(*)::int n from sdr_queue')).rows[0].n,0);
  } finally { await d.close(); }
});

test('automatic worker is single-touch without Gmail read permission and seller queue is human-only', () => {
  const worker = read('lib/sdr/worker.ts');
  const auto = read('lib/sdr/auto-outreach.ts');
  const sales = read('lib/sdr/sales-queue.ts');
  assert.match(worker,/SDR_EMAIL_REPLY_READ_ENABLED === "true"/);
  assert.match(worker,/q\.enqueue_mode !== "automatic"/);
  assert.match(auto,/automation_policy: POLICY/);
  assert.match(auto,/researched < 1/);
  assert.match(auto,/sdr_enqueue_automatic_email/);
  assert.match(auto,/sdr_automatic_outreach_capacity/);
  assert.match(auto,/researchResult\.attempted/);
  assert.match(auto,/attempted: false/);
  assert.match(worker,/discoverWebCompanies\(campaign\.id, "automatic"\)/);
  assert.doesNotMatch(worker,/from "\.\/providers"/);
  assert.match(sales,/sales_priority/);
  assert.doesNotMatch(sales,/sendEmail|sendWhatsapp|sdr_enqueue/);
});
