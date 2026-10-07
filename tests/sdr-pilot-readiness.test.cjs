const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');
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
  const worker = read('lib/sdr/worker.ts'); assert.match(worker, /followupSnapshot\(q\)/); assert.match(worker, /q\.enqueue_mode !== "manual_pilot"/);
  assert.match(worker, /process\.env\.SDR_LIVE_SEND !== "true" \|\| !businessHours\(\)/); assert.match(worker, /threadHasReply/);
});
test('signed preview enqueues exact reviewed content and rejects forgery, wrong admin, expiration and stale contact/context', async () => {
  const crypto = require('node:crypto'); const f = fixture(); f.o.lead_id = uuid(1);
  const calls = [];
  const query = table => ({ select() { return this; }, eq() { return this; }, async single() { return { data: table === 'sdr_leads' ? f.l : f.o }; } });
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
    const w = compile('lib/sdr/worker.ts', { './server': server, './outreach': outreach, './catalog': { businessHours: () => hours }, './channels': { sendEmail: throwing, sendWhatsapp: throwing, syncTemplate: throwing, threadHasReply: throwing, googleAccount: throwing }, './providers': { discover: throwing }, './sales': { reconcileSales: async () => ({}) } }, { process: { env: { SDR_LIVE_SEND: live } } });
    assert.equal((await w.runWorker()).mode, 'paused'); assert.equal(calls.length, 0);
  }
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
