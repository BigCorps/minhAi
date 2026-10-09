const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const read = (p) => readFileSync(require.resolve('../' + p), 'utf8');

test('support tables are service-role only and tokenized', () => {
  const sql = read('supabase/migrations/20261009150000_bigcorps_support_gate1.sql');
  assert.match(sql, /token_hash text not null unique/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /revoke all .* anon,authenticated/s);
  assert.match(sql, /grant select,insert,update,delete .* service_role/s);
});

test('public support route never trusts a raw database id', () => {
  const server = read('lib/support/server.ts');
  const route = read('app/api/support/route.ts');
  assert.match(server, /supportTokenHash/);
  assert.match(server, /randomBytes\(32\)/);
  assert.match(route, /findSupportThread/);
  assert.doesNotMatch(route, /service_role/i);
});

test('support widget hides on admin and has human handoff', () => {
  const ctx = read('lib/support/product-context.ts');
  const widget = read('components/support/BigCorpsSupportWidget.tsx');
  assert.match(ctx, /admin\.minhai\.app/);
  assert.match(widget, /Falar com uma pessoa/);
  assert.match(widget, /localStorage/);
});

test('ConviteIA template matches the approved Meta copy', () => {
  const catalog = read('lib/sdr/catalog.ts');
  assert.match(catalog, /BigCorps \| ConviteIA/);
  assert.match(catalog, /espaços de eventos, buffets e cerimonialistas/);
  assert.match(catalog, /Acesse \*\{\{1\}\}\*/);
});
