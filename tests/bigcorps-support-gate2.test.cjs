const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');

const read = (p) => readFileSync(require.resolve('../' + p), 'utf8');

test('support token is HttpOnly and no longer lives in URL/localStorage', () => {
  const route = read('app/api/support/route.ts');
  const widget = read('components/support/BigCorpsSupportWidget.tsx');
  assert.match(route, /httpOnly:\s*true/);
  assert.match(route, /sameSite:\s*'lax'/);
  assert.doesNotMatch(route, /searchParams\.get\('token'\)/);
  assert.doesNotMatch(widget, /localStorage/);
  assert.doesNotMatch(widget, /token=/);
});

test('support secret fails closed instead of using a hardcoded production fallback', () => {
  const server = read('lib/support/server.ts');
  assert.match(server, /SUPPORT_TOKEN_SECRET \|\| process\.env\.SDR_TOKEN_SECRET/);
  assert.match(server, /support_secret_missing/);
  assert.doesNotMatch(server, /'bigcorps-support'/);
});

test('possible credentials are not persisted verbatim', () => {
  const server = read('lib/support/server.ts');
  assert.match(server, /SENSITIVE_PLACEHOLDER/);
  assert.match(server, /sensitive \? SENSITIVE_PLACEHOLDER : message/);
  assert.match(server, /O conteúdo sensível não foi armazenado/);
});

test('human handoff suppresses bot interjection and resolved threads reopen', () => {
  const server = read('lib/support/server.ts');
  assert.match(server, /thread\.status === 'waiting_human' \|\| thread\.status === 'human'/);
  assert.match(server, /reply: null, humanRequested: true/);
  assert.match(server, /reopenIfResolved/);
  assert.match(server, /status: 'open'/);
});

test('knowledge answers are grounded and AI remains feature-gated', () => {
  const server = read('lib/support/server.ts');
  const knowledge = read('lib/support/knowledge.ts');
  assert.match(server, /supportKnowledgeReply/);
  assert.match(server, /supportKnowledgeContext/);
  assert.match(server, /BIGCORPS_SUPPORT_AI_ENABLED !== 'true'/);
  assert.match(server, /Use somente os fatos do contexto de produto/);
  assert.match(knowledge, /Convites já publicados continuam no ar/);
  assert.match(knowledge, /dinheiro permanece na conta Mercado Pago/);
});
