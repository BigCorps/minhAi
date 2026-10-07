const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const { randomUUID } = require('node:crypto');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'supabase/functions/enviar-email-google-v2/index.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, reportDiagnostics: true,
});
assert.equal(compiled.diagnostics.length, 0);
assert.ok(source.includes('gmailResp.ok'));
assert.ok(!source.includes('gmailResponse'));
assert.ok(!source.includes('pixThreadId'));
const companyId = '11111111-1111-4111-8111-111111111111';
const serviceRole = 'mock-service-role';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZncAAAAASUVORK5CYII=', 'base64');
const input = { company_id: companyId, to: 'recipient@example.test', subject: 'Assunto ç 🔔', body: 'secret-body-text', email_type: 'assistant_manual' };
let state, queries, calls, warnings, handler;
function reset() {
  state = {
    companies: [{ id: companyId, is_active: true, name: 'Empresa "segura"', logo_url: 'https://company.example/logo.png', website: 'https://company.example', whatsapp_number: '+55 (11) 1234-5678', business_address: 'Rua <Exemplo>' }],
    google_accounts: [{ company_id: companyId, is_active: true, google_email: 'google-internal@example.test', scopes: ['https://www.googleapis.com/auth/gmail.send'], access_token: 'private-access-token', refresh_token: 'private-refresh-token', expires_at: new Date(Date.now() + 3600000).toISOString() }],
    email_logs: [], saved: [], gmailStatus: 200, gmailBody: { id: 'gmail-message-id', threadId: 'new-thread' },
    metadataStatus: 200, metadataBody: { payload: { headers: [{ name: 'Message-ID', value: '<real-rfc@google.example>' }] } },
    errors: {},
  };
  queries = []; calls = []; warnings = [];
}
const admin = {
  from(table) {
    const query = { table, filters: [] };
    queries.push(query);
    return {
      select(...args) { query.select = args; return this; },
      eq(key, value) { query.filters.push(['eq', key, value]); return this; },
      gte(key, value) { query.filters.push(['gte', key, value]); return this; },
      lt(key, value) { query.filters.push(['lt', key, value]); return this; },
      not(key, op, value) { query.filters.push(['not', key, value]); return this; },
      order() { return this; }, limit() { return this; },
      maybeSingle() { query.single = true; return this; },
      insert(value) { query.insert = value; return this; },
      then(resolve, reject) {
        if (query.insert) {
          if (state.logThrow) return Promise.reject(new Error('private-provider-detail')).then(resolve, reject);
          if (!state.logError) state.saved.push(query.insert);
          return Promise.resolve({ error: state.logError }).then(resolve, reject);
        }
        const rows = state[table].filter(row => query.filters.every(([op, key, value]) =>
          op === 'eq' ? row[key] === value : op === 'gte' ? row[key] >= value : op === 'lt' ? row[key] < value : row[key] !== value));
        return Promise.resolve({ data: query.single ? rows[0] || null : rows, error: state.errors[table] }).then(resolve, reject);
      },
    };
  },
};
vm.runInNewContext(compiled.outputText, {
  exports: {}, TextEncoder, TextDecoder, Uint8Array, URL, Date, Intl, Response, AbortSignal, atob, btoa,
  crypto: { randomUUID }, console: { warn: (...args) => warnings.push(args), log: (...args) => warnings.push(args), error: (...args) => warnings.push(args) },
  Deno: { env: { get: key => ({ SUPABASE_SERVICE_ROLE_KEY: serviceRole, SUPABASE_URL: 'https://supabase.test' })[key] }, serve: callback => { handler = callback; } },
  require: () => ({ createClient: (url, key) => { assert.equal(key, serviceRole); return admin; } }),
  fetch: async (url, options = {}) => {
    calls.push({ url, headers: options.headers, body: options.body ? JSON.parse(options.body) : null });
    let status, body;
    if (url.endsWith('/google-refresh-token')) {
      if (state.refreshNetwork) throw new Error('private-provider-detail');
      status = state.refreshFail ? 400 : 200; body = { success: !state.refreshFail, error: 'private-provider-detail' };
      if (!state.refreshFail && !state.refreshStale) {
        state.google_accounts[0] = { ...state.google_accounts[0], access_token: 'updated-access-token', expires_at: new Date(Date.now() + 3600000).toISOString() };
      }
    } else if (url.endsWith('/messages/send')) {
      if (state.gmailNetwork) throw new Error('private-provider-detail');
      status = state.gmailStatus; body = state.gmailBody;
    } else {
      assert.ok(url.includes('format=metadata&metadataHeaders=Message-ID'));
      if (state.metadataNetwork) throw new Error('private-provider-detail');
      status = state.metadataStatus; body = state.metadataBody;
    }
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  },
});

async function post(extra = {}, authorization = `Bearer ${serviceRole}`, method = 'POST') {
  const request = new Request('https://supabase.test/functions/v1/enviar-email-google-v2', {
    method, headers: { 'Content-Type': 'application/json', ...(authorization ? { authorization } : {}) },
    ...(method === 'POST' ? { body: JSON.stringify({ ...input, ...extra }) } : {}),
  });
  const response = await handler(request);
  const body = response.status === 204 ? null : await response.json();
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const text = JSON.stringify(body) + JSON.stringify(warnings);
  for (const sensitive of ['private-access-token', 'private-refresh-token', 'updated-access-token', 'mock-service-role', 'secret-body-text', 'private-provider-detail', 'google-internal@example.test', png.toString('base64')]) {
    assert.ok(!text.includes(sensitive), `leaked ${sensitive}`);
  }
  return { status: response.status, body };
}
function sends() { return calls.filter(call => call.url.endsWith('/messages/send')); }
function mime() { return Buffer.from(sends()[0].body.raw, 'base64url').toString('utf8'); }
function previous(type = 'pix', rfc = '<previous-rfc@provider.example>') {
  state.email_logs = [{ company_id: companyId, to_email: input.to, email_type: type, status: 'sent', sent_at: new Date().toISOString(), gmail_thread_id: 'previous-thread', gmail_rfc_message_id: rfc }];
}

async function main() {
  for (const token of [null, 'Bearer anon-key', 'Bearer user-jwt', `Bearer ${serviceRole}-wrong`]) {
    reset(); assert.equal((await post({}, token)).status, 401); assert.equal(queries.length, 0); assert.equal(calls.length, 0);
  }
  reset(); assert.equal((await post({}, null, 'GET')).status, 405); assert.equal((await post({}, null, 'OPTIONS')).status, 204);
  for (const extra of [{ company_id: 'bad' }, { to: 'invalid' }, { to: 'a@b.test\r\nBcc: c@d.test' }, { subject: 'x\nBcc: c@d.test' }, { subject: 'x'.repeat(201) }, { body: '' }, { body: 'x'.repeat(51201) }, { body: 'é'.repeat(25601) }, { email_type: 'unknown' }, { user_input: 'do anything' }, { access_token: 'injected' }, { refresh_token: 'injected' }, { threadId: 'injected' }]) {
    reset(); assert.equal((await post(extra)).status, 400); assert.equal(calls.length, 0);
  }
  reset(); assert.equal((await post({ email_type: 'unknown' })).body.error, 'invalid_email_type');
  for (const companies of [[], [{ id: companyId, is_active: false }]]) { reset(); state.companies = companies; assert.equal((await post()).status, 404); assert.equal(calls.length, 0); }
  reset(); state.google_accounts = []; assert.equal((await post()).body.error, 'google_account_unavailable');
  reset(); state.google_accounts[0].scopes = ['https://www.googleapis.com/auth/calendar']; assert.equal((await post()).body.error, 'gmail_send_scope_required'); assert.equal(calls.length, 0);
  reset(); let result = await post(); assert.equal(result.status, 200); assert.equal(JSON.stringify(result.body), '{"success":true}');
  assert.equal(calls.filter(call => call.url.includes('google-refresh-token')).length, 0);
  assert.ok(!sends()[0].body.threadId); assert.ok(!mime().includes('In-Reply-To')); assert.ok(!mime().includes('References:'));
  assert.ok(!/[+/=]/.test(sends()[0].body.raw)); assert.ok(mime().includes('Content-Type: text/html; charset=UTF-8'));
  assert.equal(state.saved.length, 1); assert.equal(state.saved[0].gmail_rfc_message_id, '<real-rfc@google.example>');
  assert.equal(state.saved[0].gmail_message_id, 'gmail-message-id'); assert.equal(state.saved[0].gmail_thread_id, 'new-thread');
  assert.equal(state.saved[0].status, 'sent'); assert.equal(state.saved[0].email_type, 'assistant_manual'); assert.equal(state.saved[0].body, input.body);
  const html = Buffer.from(mime().split('\r\n\r\n')[1].replace(/\s/g, ''), 'base64').toString('utf8');
  assert.ok(html.includes('Empresa &quot;segura&quot;')); assert.ok(html.includes('Rua &lt;Exemplo&gt;')); assert.ok(html.includes('https://wa.me/551112345678')); assert.ok(html.includes('BigCorps'));
  const subjectEncoded = mime().match(/Subject: (.*?)\r\nMIME-Version/s)[1];
  const decodedSubject = [...subjectEncoded.matchAll(/=\?UTF-8\?B\?([^?]+)\?=/g)].map(match => Buffer.from(match[1], 'base64').toString('utf8')).join('');
  assert.equal(decodedSubject, input.subject);
  for (const expiry of [Date.now() - 1000, Date.now() + 30000]) {
    reset(); state.google_accounts[0].expires_at = new Date(expiry).toISOString(); assert.equal((await post()).status, 200);
    const refresh = calls.find(call => call.url.endsWith('/google-refresh-token'));
    assert.equal(refresh.headers.Authorization, `Bearer ${serviceRole}`); assert.equal(refresh.headers.apikey, serviceRole); assert.deepEqual(refresh.body, { company_id: companyId });
    assert.equal(queries.filter(q => q.table === 'google_accounts').length, 2); assert.equal(sends()[0].headers.Authorization, 'Bearer updated-access-token');
  }
  for (const failure of ['refreshFail', 'refreshNetwork', 'refreshStale']) {
    reset(); state.google_accounts[0].expires_at = new Date(0).toISOString(); state[failure] = true;
    assert.equal((await post()).body.error, 'google_reconnect_required'); assert.equal(sends().length, 0);
  }
  for (const field of ['email', 'google_email', 'user_email']) {
    reset(); delete state.google_accounts[0].google_email; state.google_accounts[0][field] = 'google-internal@example.test'; assert.equal((await post()).status, 200);
  }
  for (const type of ['pix', 'pedido']) {
    reset(); previous(type); assert.equal((await post({ email_type: type })).status, 200);
    assert.equal(sends()[0].body.threadId, 'previous-thread'); assert.ok(mime().includes('In-Reply-To: <previous-rfc@provider.example>')); assert.ok(mime().includes('References: <previous-rfc@provider.example>'));
    const query = queries.find(q => q.table === 'email_logs' && !q.insert);
    for (const [key, value] of [['company_id', companyId], ['to_email', input.to], ['email_type', type]]) assert.ok(query.filters.some(f => f[1] === key && f[2] === value));
    assert.ok(query.filters.some(f => f[0] === 'gte' && f[1] === 'sent_at')); assert.ok(query.filters.some(f => f[0] === 'lt' && f[1] === 'sent_at'));
  }
  reset(); previous('pix', 'gmail-message-id'); await post({ email_type: 'pix' }); assert.equal(sends()[0].body.threadId, 'previous-thread'); assert.ok(!mime().includes('In-Reply-To'));
  reset(); previous(); state.email_logs[0].sent_at = new Date(Date.now() - 86400000 * 2).toISOString(); await post({ email_type: 'pix' }); assert.ok(!sends()[0].body.threadId);
  for (const failure of ['metadataNetwork', 'metadataHttp', 'metadataBadId']) {
    reset(); if (failure === 'metadataHttp') state.metadataStatus = 403;
    else if (failure === 'metadataNetwork') state.metadataNetwork = true;
    else state.metadataBody.payload.headers[0].value = '<bad@id>\r\nBcc: injected';
    assert.equal((await post()).status, 200); assert.equal(sends().length, 1); assert.equal(state.saved[0].gmail_rfc_message_id, null);
  }
  for (const failure of ['logError', 'logThrow']) {
    reset(); state[failure] = failure === 'logError' ? { message: 'private-provider-detail' } : true;
    assert.equal((await post()).status, 200); assert.equal(sends().length, 1); assert.equal(warnings.length, 1);
  }
  reset(); state.gmailBody = null; assert.equal((await post()).status, 200); assert.equal(sends().length, 1);
  for (const status of [400, 401, 403, 429, 500, 503]) {
    reset(); state.gmailStatus = status; state.gmailBody = { error: 'private-provider-detail' };
    const response = await post(); assert.equal(response.status, 502); assert.equal(response.body.error, 'gmail_send_failed'); assert.equal(state.saved.length, 0);
  }
  reset(); result = await post({ attachments: [{ filename: 'qrcode.png', content: png.toString('base64'), encoding: 'base64', contentType: 'image/png' }] });
  assert.equal(result.status, 200); const mixed = mime(); assert.ok(mixed.includes('Content-Type: multipart/mixed'));
  const boundary = mixed.match(/boundary="([^"]+)"/)[1]; const attachmentPart = mixed.split(`--${boundary}`)[2];
  assert.ok(attachmentPart.includes('Content-Disposition: attachment; filename="qrcode.png"'));
  assert.ok(Buffer.from(attachmentPart.split('\r\n\r\n')[1].trim(), 'base64').equals(png)); assert.ok(mixed.endsWith(`--${boundary}--\r\n`));
  const validFile = { filename: 'barcode_CODE128.png', content: png.toString('base64'), encoding: 'base64', contentType: 'image/png' };
  const huge = Buffer.alloc(2 * 1024 * 1024 + 1); png.copy(huge);
  for (const attachments of [[{ ...validFile, content: Buffer.from('not PNG').toString('base64') }], [{ ...validFile, content: huge.toString('base64') }], [validFile, validFile], [{ ...validFile, filename: '../qrcode.png' }], [{ ...validFile, filename: 'a\r\nBcc:x.png' }], [{ ...validFile, content: 'not base64!' }], [{ ...validFile, contentType: 'image/jpeg' }], [{ ...validFile, encoding: 'binary' }]]) {
    reset(); assert.equal((await post({ attachments })).status, 400); assert.equal(calls.length, 0);
  }
  for (const type of ['assistant_manual', 'assistant_result', 'manager_assistance', 'funcionaria_cash', 'meta_manual', 'pix', 'pedido', 'manual']) {
    reset(); assert.equal((await post({ email_type: type })).status, 200);
  }

  // O guardrail aceita V2 server-side e rejeita legado exato/URL;
  // a chamada V2 no browser também é proibida.
  const probe = path.join(root, 'lib', `.email-v2-probe-${process.pid}.ts`);
  try {
    const check = () => spawnSync(process.execPath, ['scripts/check-email-edge-boundary.mjs'], { cwd: root, encoding: 'utf8' });
    fs.writeFileSync(probe, "export const edge = 'enviar-email-google-v2';", { flag: 'wx' }); assert.equal(check().status, 0);
    fs.writeFileSync(probe, "export const edge = 'enviar-email-google';"); assert.equal(check().status, 1);
    fs.writeFileSync(probe, "export const edge = 'https://supabase.test/functions/v1/enviar-email-google';"); assert.equal(check().status, 1);
    fs.writeFileSync(probe, "'use client'; export const edge = 'enviar-email-google-v2';"); assert.equal(check().status, 1);
  } finally { fs.rmSync(probe, { force: true }); }
  console.log('PASS: 35 required Edge V2 cases + near-expiry, malformed success/metadata, MIME decoding, day boundary, allowlist and legacy/V2 guardrail. No real Gmail/OAuth/Supabase calls.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
