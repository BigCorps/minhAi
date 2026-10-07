const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');
let PGlite; try { ({ PGlite } = require(process.env.PGLITE_MODULE_PATH || '@electric-sql/pglite')); } catch { /* optional local database */ }
const migration = require.resolve('../supabase/migrations/20261007005406_sdr_partner_programs.sql');
const uuid = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
async function setup() {
 const d = new PGlite();
 await d.exec(`create role anon;create role authenticated;create role service_role;
 create table sdr_leads(id uuid primary key,company_name text,domain text,cnpj text,source text,email text);
 create table sdr_opportunities(id uuid primary key,lead_id uuid,stage text,qualification jsonb,product text);
 create table sdr_provider_budgets(used_units numeric); insert into sdr_provider_budgets values(5);
 create table sdr_queue(id uuid);
 insert into sdr_leads values('${uuid(1)}','Buffet Teste','empresa.com.br',null,'web_research',null),('${uuid(2)}','Empresa Teste','empresa.com.br',null,'web_research',null),('${uuid(3)}','Outro Buffet','outro.com.br',null,'web_research',null),('${uuid(4)}','Consumidor','gmail.com',null,'manual',null);
 insert into sdr_opportunities select id,id,'new','{"commercial_classification":{"type":"partner","source":"manual"},"decision_maker":{"validated":true}}','conviteia' from sdr_leads;`);
 await d.exec(readFileSync(migration, 'utf8'));
 const programs = (await d.query('select id,product from partner_programs')).rows;
 const program = product => programs.find(p => p.product === product).id;
 const promote = (n, product = 'conviteia', slug = `empresa-${n}`, domain = 'empresa.com.br') => d.query('select partner_promote_opportunity($1,$2,$3,$4,$5) as result', [uuid(n), program(product), slug, String(n).padStart(24, '0'), domain]);
 return { d, programs, program, promote };
}
test('partner promotion deduplicates business identity, supports many programs, preserves SDR and prevents slug takeover', { skip: !PGlite }, async () => {
 const { d, promote, program } = await setup(); try {
 const before = (await d.query('select * from sdr_opportunities order by id')).rows;
 const a = (await promote(1)).rows[0].result;
 const b = (await promote(2)).rows[0].result; assert.equal(a.partnerId, b.partnerId); assert.equal(a.membershipId, b.membershipId);
 await promote(2, 'monitoria_vip'); assert.equal((await d.query('select count(*)::int n from partners')).rows[0].n, 1);
 assert.equal((await d.query('select count(*)::int n from partner_memberships')).rows[0].n, 2);
 assert.equal((await d.query('select count(*)::int n from partner_origins')).rows[0].n, 3);
 await assert.rejects(promote(3, 'conviteia', 'empresa-1', 'outro.com.br'), /unique|duplicate/);
 assert.equal((await d.query('select count(*)::int n from partners')).rows[0].n, 1);
 await assert.rejects(promote(4, 'conviteia', 'consumer', null), /lead_not_eligible/);
 await assert.rejects(promote(1, 'conviteia', 'INVALID SLUG'), /invalid_partner_link/);
 await assert.rejects(promote(1, 'conviteia', 'safe-slug', 'attacker.com.br'), /invalid_partner_domain/);
 await d.query("update sdr_opportunities set qualification='{}' where id=$1", [uuid(3)]);
 await assert.rejects(promote(3, 'conviteia', 'other-business', 'outro.com.br'), /partner_opportunity_not_eligible/);
 assert.deepEqual((await d.query('select * from sdr_opportunities where id in ($1,$2) order by id', [uuid(1), uuid(2)])).rows, before.slice(0, 2));
 assert.equal((await d.query('select used_units from sdr_provider_budgets')).rows[0].used_units, '5');
 assert.equal((await d.query('select count(*)::int n from sdr_queue')).rows[0].n, 0);
 const config = (await d.query('select config from partner_programs where id=$1', [program('conviteia')])).rows[0].config;
 assert.equal(config.automaticBenefits, false); assert.equal(config.publicRouteImplemented, false);
 } finally { await d.close(); }
});
test('partner lifecycle and persistent first-touch attribution keep benefits configurable and inert', { skip: !PGlite }, async () => {
 const { d, promote, program } = await setup(); try {
 const m = (await promote(1)).rows[0].result.membershipId;
 const code = (await d.query('select code from partner_links where membership_id=$1', [m])).rows[0].code;
 await assert.rejects(d.query('select partner_record_referral($1,$2)', [code, 'customer-internal-ref']), /partner_link_inactive/);
 for (const status of ['contacted','interested','active','paused','active','closed','active']) {
 await d.query('select partner_set_membership_status($1,$2)', [m, status]);
 assert.equal((await d.query('select status from partner_memberships where id=$1', [m])).rows[0].status, status);
 }
 await assert.rejects(d.query('select partner_set_membership_status($1,$2)', [m, 'unsafe']), /invalid_partner_status/);
 const ref = await d.query('select partner_record_referral($1,$2) id', [code, 'customer-internal-ref']);
 const refAgain = await d.query('select partner_record_referral($1,$2) id', [code, 'customer-internal-ref']); assert.equal(ref.rows[0].id, refAgain.rows[0].id);
 const benefit = (await d.query("select * from partner_benefits where code='memorias_free'")).rows[0]; assert.equal(benefit.enabled, false);
 await d.query("insert into partner_benefits(program_id,code,name,kind,config) values($1,'visibility','Destaque','visibility','{\"durationDays\":30}')", [program('monitoria_vip')]);
 const foreignBenefit = (await d.query("select id from partner_benefits where code='visibility'")).rows[0].id;
 await assert.rejects(d.query("update partner_referrals set benefit_id=$1,benefit_status='pending' where id=$2", [foreignBenefit, ref.rows[0].id]), /foreign key/);
 const referral = (await d.query('select * from partner_referrals')).rows[0];
 assert.equal(referral.program_id, program('conviteia')); assert.equal(referral.membership_id, m); assert.equal(referral.status, 'referred'); assert.equal(referral.benefit_status, 'none'); assert.equal(referral.benefit_granted_at, null);
 // Conversion and benefit audit fields are modelled, not executed by any RPC or UI.
 await assert.rejects(d.query("update partner_referrals set status='converted'"), /check constraint/);
 await assert.rejects(d.query("insert into partner_benefits(program_id,code,name,kind) values($1,'bad','bad','payment')", [program('conviteia')]), /check constraint/);
 } finally { await d.close(); }
});
test('partner tables use RLS and writing RPCs are invoker/service-role only', { skip: !PGlite }, async () => {
 const { d } = await setup(); try {
 const tables = ['partners','partner_programs','partner_memberships','partner_identity_keys','partner_origins','partner_status_events','partner_links','partner_referrals','partner_benefits'];
 for (const table of tables) {
 assert.equal((await d.query('select relrowsecurity from pg_class where relname=$1', [table])).rows[0].relrowsecurity, true);
 for (const role of ['anon','authenticated']) assert.equal((await d.query("select has_table_privilege($1,$2,'INSERT') ok", [role, table])).rows[0].ok, false);
 }
 for (const signature of ['partner_promote_opportunity(uuid,uuid,text,text,text)','partner_set_membership_status(uuid,text)','partner_record_referral(text,text)']) {
 for (const role of ['anon','authenticated']) assert.equal((await d.query("select has_function_privilege($1,$2,'EXECUTE') ok", [role, signature])).rows[0].ok, false);
 assert.equal((await d.query("select has_function_privilege('service_role',$1,'EXECUTE') ok", [signature])).rows[0].ok, true);
 }
 assert.ok((await d.query("select prosecdef from pg_proc where proname like 'partner_%'")).rows.every(r => r.prosecdef === false));
 } finally { await d.close(); }
});
test('partner server only loads trusted business identity and calls isolated RPCs, never external APIs or sends', async () => {
 const catalog = {}; const calls = [];
 function compile(file, deps) {
 const exports = {}; runInNewContext(ts.transpileModule(readFileSync(require.resolve(`../lib/sdr/${file}.ts`), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
 { exports, URL, fetch() { throw new Error('unexpected_network'); }, require(id) { if (id === 'server-only') return {}; if (id === 'node:crypto') return require(id); if (Object.hasOwn(deps, id)) return deps[id]; throw new Error('unexpected_dependency'); } }); return exports;
 }
 Object.assign(catalog, compile('catalog', {})); const policy = compile('commercial-classification', { './catalog': catalog });
 let lead = { source: 'web_research', domain: 'empresa.com.br', company_name: 'Buffet Teste' };
 const db = { from(table) { assert.ok(['sdr_opportunities','sdr_leads'].includes(table)); const q = { select() { return q; }, eq() { return q; }, async single() { return { data: table === 'sdr_leads' ? lead : { lead_id: uuid(1) } }; } }; return q; }, async rpc(name, args) { calls.push({ name, args }); return { data: {} }; } };
 const server = compile('partners', { './catalog': catalog, './commercial-classification': policy, './server': { db: () => db, checked: result => result.data } });
 await server.promotePartner(uuid(1), uuid(2), 'buffet-teste'); assert.equal(calls[0].name, 'partner_promote_opportunity'); assert.equal(calls[0].args.p_domain, 'empresa.com.br'); assert.equal(calls[0].args.p_slug, 'buffet-teste'); assert.match(calls[0].args.p_code, /^[a-f0-9]{24}$/);
 await server.updatePartnerStatus(uuid(1), 'paused'); assert.equal(calls[1].name, 'partner_set_membership_status');
 await assert.rejects(server.updatePartnerStatus(uuid(1), 'invalid'), /invalid_partner_status/);
 await assert.rejects(server.promotePartner(uuid(1), uuid(2), 'INVALID SLUG'), /invalid_partner_slug/);
 lead = { source: 'manual', company_name: 'Consumidor', domain: 'gmail.com' };
 await assert.rejects(server.promotePartner(uuid(1), uuid(2), 'consumer'), /lead_not_eligible/); assert.equal(calls.length, 2);
});
test('partner Admin displays candidates, explicit promotion, program/link/status and counters without executing actions', () => {
 const react = require('react'); const { renderToStaticMarkup } = require('react-dom/server');
 function load(file, dependencies, extra = '') {
 const exports = {}; runInNewContext(ts.transpileModule(readFileSync(require.resolve(file), 'utf8') + extra,
 { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText,
 { exports, URL, Date, console, require(id) { if (Object.hasOwn(dependencies, id)) return dependencies[id]; throw new Error('unexpected_dependency'); } }); return exports;
 }
 const catalog = load('../lib/sdr/catalog.ts', {});
 const policy = load('../lib/sdr/commercial-classification.ts', { './catalog': catalog });
 const ui = load('../components/admin/AdminCommercial.tsx', { react, 'react/jsx-runtime': require('react/jsx-runtime'), 'lucide-react': require('lucide-react'),
 '@/lib/sdr/playbooks': { commercialPlaybook: () => ({}) }, '@/lib/sdr/catalog': catalog, '@/lib/sdr/commercial-classification': policy, './AdminHeader': {}, './AdminBusinessUi': { money: n => `R$ ${n}` } }, '\nexport { PartnersPanel };');
 const html = renderToStaticMarkup(react.createElement(ui.PartnersPanel, { busy: false, action() { throw new Error('unexpected_action'); }, data: {
 programs: [{ id: uuid(20), product: 'conviteia', name: 'Parceiros ConviteIA', status: 'active' }],
 candidates: [{ id: uuid(1), product: 'conviteia', lead: { company_name: 'Buffet Teste' } }],
 memberships: [{ id: uuid(30), status: 'paused', partner: { company_name: 'Buffet Teste' }, program: { name: 'Parceiros ConviteIA', link_base_url: 'https://conviteia.com/p/' }, links: [{ slug: 'buffet-teste', code: 'public-code' }] }],
 referrals: [{ membership_id: uuid(30), status: 'converted', converted_value_cents: 100 }],
 } }));
 for (const text of ['Promover a parceiro','Parceiros ConviteIA','Pausado','Indicações: 1','Conversões: 1','https://conviteia.com/p/buffet-teste','Salvar status']) assert.ok(html.includes(text));
});
test('concurrent partner promotions share one identity; closed opportunities and paused programs cannot promote', { skip: !PGlite }, async () => {
 const { d, promote, program } = await setup(); try {
 const results = await Promise.all([promote(1), promote(2)]); assert.equal(results[0].rows[0].result.partnerId, results[1].rows[0].result.partnerId);
 assert.equal((await d.query('select count(*)::int n from partners')).rows[0].n, 1);
 await d.query("update sdr_opportunities set stage='lost' where id=$1", [uuid(3)]);
 await assert.rejects(promote(3, 'conviteia', 'outro-buffet', 'outro.com.br'), /partner_opportunity_not_eligible/);
 await d.query("update partner_programs set status='paused' where id=$1", [program('monitoria_vip')]);
 await assert.rejects(promote(1, 'monitoria_vip'), /partner_program_unavailable/);
 const m = results[0].rows[0].result.membershipId;
 await d.query("select partner_set_membership_status($1,'contacted')", [m]);
 assert.equal((await d.query('select count(*)::int n from partner_status_events where membership_id=$1', [m])).rows[0].n, 2);
 } finally { await d.close(); }
});
test('missing partner migration disables only partner area without hiding unrelated database errors', async () => {
 const exports = {}; let code = 'PGRST205';
 const db = { from() { const q = { select() { return q; }, order() { return q; }, limit() { return q; }, in() { return q; }, not() { return q; }, then(resolve) { resolve({ error: { code } }); } }; return q; } };
 runInNewContext(ts.transpileModule(readFileSync(require.resolve('../lib/sdr/partners.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
 { exports, require(id) { if (id === 'server-only') return {}; if (id === 'node:crypto') return require(id); if (id === './commercial-classification' || id === './catalog') return {};
 if (id === './server') return { db: () => db, checked(r) { if (r.error) throw new Error('database_error'); return r.data; } }; throw new Error('unexpected_dependency'); } });
 const result = await exports.partnerSnapshot(); assert.equal(result.available, false); assert.equal(result.memberships.length, 0);
 code = '42501'; await assert.rejects(exports.partnerSnapshot(), /database_error/);
});
