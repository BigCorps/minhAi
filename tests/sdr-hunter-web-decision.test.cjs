const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');
function compile(file, dependencies) {
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync(require.resolve(`../lib/sdr/${file}.ts`), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, URL, URLSearchParams, Date, Error, console,
    require(id) { if (id === 'server-only') return {}; if (id === 'node:crypto') return require(id);
      if (Object.hasOwn(dependencies, id)) return dependencies[id]; throw new Error('unexpected_dependency'); } });
  return exports;
}
const catalog = compile('catalog', {});
async function simulate(options = {}) {
  const calls = [], rpc = [], updates = [];
  const lead = { source: 'web_research', contact_name: 'Pessoa Teste', company_name: 'Empresa Teste',
    domain: 'empresa.com.br', cnpj: null, email: null, evidence: 'Histórico.', ...options.lead };
  const opportunity = { lead_id: 'lead', stage: 'new', qualification: { preserved: true,
    decision_maker: { source: 'web_research', validated: options.validated ?? true, role: 'Fundador' } }, ...options.opportunity };
  const d = { from(table) { const q = { select() { return q; }, eq() { return q; },
    async single() { return { data: table === 'sdr_leads' ? lead : opportunity }; },
    update(value) { updates.push({ table, value }); return q; }, then(resolve) { return Promise.resolve({ data: null }).then(resolve); } }; return q; },
    async rpc(name, args) { rpc.push({ name, args }); assert.equal(args.p_provider, 'hunter'); return { data: null }; } };
  const providerModule = compile('providers', { './catalog': catalog, './server': {
    db: () => d, checked(r) { if (r.error) throw new Error(r.error.message); return r.data; }, required: () => 'synthetic-key',
    async fetchJson(url) { calls.push(new URL(url)); assert.equal(new URL(url).pathname, '/v2/email-finder');
      if (options.error) throw new Error(options.error);
      return { payload: { data: options.empty ? {} : { email: 'pessoa@empresa.com.br', verification: { status: options.unverified ? 'unknown' : 'valid' } } } }; },
  } });
  let error; try { await providerModule.findHunterDecisionMakerEmail('opportunity'); } catch (e) { error = e.message; }
  return { error, calls, rpc, updates };
}

test('Hunter accepts validated web decision maker without CNPJ and uses only stored full_name + domain', async () => {
  const r = await simulate(); assert.equal(r.error, undefined); assert.equal(r.calls.length, 1);
  assert.equal(r.calls[0].searchParams.get('full_name'), 'Pessoa Teste'); assert.equal(r.calls[0].searchParams.get('domain'), 'empresa.com.br');
  assert.equal(r.calls[0].searchParams.has('company'), false); assert.equal(r.rpc.length, 1); assert.equal(r.rpc[0].args.p_units, 1);
  assert.equal(r.updates[0].value.email_status, 'verified'); assert.equal(r.updates[0].value.email, 'pessoa@empresa.com.br');
  assert.match(r.updates[0].value.evidence, /Pesquisa IA/); assert.equal(r.updates[1].value.qualification.preserved, true);
  assert.equal(r.updates[1].value.qualification.decision_maker.validated, true);
  assert.equal(r.updates[1].value.qualification.email_enrichment.lookupMethod, 'domain');
});

test('Hunter rejects unvalidated web decision makers, personal/invalid domains and inactive leads before reserving', async () => {
  for (const options of [{ validated: false }, { validated: 'true' }, { lead: { contact_name: null } },
    { lead: { domain: null } }, { lead: { domain: 'gmail.com' } }, { lead: { domain: 'bad_domain.com' } },
    { opportunity: { stage: 'lost' } }, { lead: { email: 'existing@empresa.com.br' } }]) {
    const r = await simulate(options); assert.ok(r.error); assert.equal(r.calls.length, 0); assert.equal(r.rpc.length, 0); assert.equal(r.updates.length, 0);
  }
});

test('Hunter keeps Econodata authority and always uses domain; URL normalization is safe', async () => {
  const r = await simulate({ lead: { source: 'econodata', cnpj: '12345678000199', domain: 'https://www.empresa.com.br/path?x=1' },
    opportunity: { qualification: { decision_maker: { source: 'econodata' } } } });
  assert.equal(r.error, undefined); assert.equal(r.calls[0].searchParams.get('domain'), 'empresa.com.br');
  assert.equal(r.calls[0].searchParams.has('company'), false);
});

test('Hunter empty result still releases one unit; found unverified result and HTTP errors retain reservation', async () => {
  const empty = await simulate({ empty: true }); assert.equal(empty.error, 'hunter_email_not_found');
  assert.equal(empty.rpc.length, 2); assert.equal(empty.rpc[1].name, 'sdr_release_units'); assert.equal(empty.rpc[1].args.p_units, 1);
  assert.ok(empty.updates.every(x => x.table === 'sdr_opportunities'));
  const unverified = await simulate({ unverified: true }); assert.equal(unverified.error, 'hunter_email_not_verified');
  assert.equal(unverified.rpc.length, 1); assert.equal(unverified.updates.length, 0);
  const http = await simulate({ error: 'provider_http_403' }); assert.equal(http.error, 'provider_http_403');
  assert.equal(http.rpc.length, 1); assert.equal(http.updates.length, 0);
});
