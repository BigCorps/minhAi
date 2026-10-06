const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

const code = ts.transpileModule(
  readFileSync(require.resolve('../lib/sdr/providers.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;

async function simulate(message, reserveError = false) {
  const events = [], updates = [];
  let used = 3;
  const qualification = {
    decision_maker: { source: 'econodata' },
    email_lookup: { hunter: { status: 'not_found', lookupMethod: 'domain' } },
    preserved: 'existing',
  };
  const database = {
    from(table) {
      const query = {
        select() { return query; },
        eq() { return query; },
        async single() {
          return { data: table === 'sdr_leads'
            ? { source: 'econodata', contact_name: 'Pessoa Sintética', domain: 'example.com', email: null }
            : { lead_id: 'lead', stage: 'new', qualification } };
        },
        update(value) { events.push('update'); updates.push({ table, value }); return query; },
        then(resolve) { return Promise.resolve({ data: null }).then(resolve); },
      };
      return query;
    },
    async rpc(name, args) {
      events.push(name);
      assert.equal(args.p_provider, 'apollo');
      assert.equal(args.p_units, 2);
      assert.deepEqual(Object.keys(args).sort(), ['p_provider', 'p_units']);
      if (reserveError) return { error: { message } };
      used = name === 'sdr_reserve_units' ? used + 2 : Math.max(0, used - 2);
      return { data: null };
    },
  };
  const exports = {};
  runInNewContext(code, {
    exports, URL, URLSearchParams, Error, Date, console,
    require(name) {
      if (name === 'server-only' || name === './catalog') return {};
      if (name === 'node:crypto') return require(name);
      if (name !== './server') throw new Error('unexpected_dependency');
      return {
        db: () => database,
        checked(result) { if (result.error) throw new Error(result.error.message); return result.data; },
        required: () => 'synthetic-key',
        async fetchJson(url) {
          assert.equal(new URL(url).pathname, '/api/v1/people/bulk_match');
          events.push('fetch');
          throw new Error(message);
        },
      };
    },
  });
  await assert.rejects(exports.findApolloDecisionMakerEmail('opportunity'), (error) => error.message === message);
  return { events, updates, used, qualification };
}

test('Apollo 403 releases two units and records only the permission attempt', async () => {
  const result = await simulate('provider_http_403');
  assert.deepEqual(result.events, ['sdr_reserve_units', 'fetch', 'sdr_release_units', 'update']);
  assert.equal(result.used, 3);
  assert.equal(result.updates.length, 1);
  assert.equal(result.updates[0].table, 'sdr_opportunities');
  const updated = result.updates[0].value.qualification;
  assert.equal(updated.preserved, result.qualification.preserved);
  assert.deepEqual(updated.decision_maker, result.qualification.decision_maker);
  assert.deepEqual(updated.email_lookup.hunter, result.qualification.email_lookup.hunter);
  assert.equal(updated.email_lookup.apollo.status, 'permission_error');
  assert.equal(updated.email_lookup.apollo.creditsConsumed, 0);
  assert.ok(Number.isFinite(Date.parse(updated.email_lookup.apollo.attemptedAt)));
  assert.deepEqual(Object.keys(updated.email_lookup.apollo).sort(), ['attemptedAt', 'creditsConsumed', 'status']);
});

for (const message of ['provider_http_401', 'provider_http_402', 'provider_http_422', 'provider_http_429', 'provider_http_500', 'provider_http_503', 'timeout']) {
  test(`${message} retains the reservation and changes no data`, async () => {
    const result = await simulate(message);
    assert.deepEqual(result.events, ['sdr_reserve_units', 'fetch']);
    assert.equal(result.used, 5);
    assert.equal(result.updates.length, 0);
  });
}

test('a failed reservation does not release units or call the provider', async () => {
  const result = await simulate('provider_http_403', true);
  assert.deepEqual(result.events, ['sdr_reserve_units']);
  assert.equal(result.used, 3);
  assert.equal(result.updates.length, 0);
});
