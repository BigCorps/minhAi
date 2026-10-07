const serverEnv={ NEXT_PUBLIC_SUPABASE_URL: 'https://supabase.test', SUPABASE_SERVICE_ROLE_KEY: 'mock-service-role' };
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const ts = require('typescript');

function keyHelper() { const exports={}; vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../lib/supabase-server-key.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,process:{env:serverEnv},require:()=>({})}); return exports; }
function serviceHelper() { const exports={}; vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../lib/internal-service-headers.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:name=>name==='server-only'?{}:keyHelper()}); return exports; }
const root = path.resolve(__dirname, '..');
const companyId = '11111111-1111-4111-8111-111111111111';
const otherId = '22222222-2222-4222-8222-222222222222';
const profileId = '33333333-3333-4333-8333-333333333333';
const transpile = file => ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

let state, calls, queries;
function reset() {
  state = {
    companies: [{ id: companyId, user_id: 'owner', is_active: true, is_public: true }],
    company_admins: [], funcionaria_company_settings: [], profile_sessions: [], company_profiles: [],
    google_accounts: [{ company_id: companyId, is_active: true, email: 'destination@database.example' }],
    count: 0, providerStatus: 200, providerBody: { success: true }, errors: {},
  };
  calls = [];
  queries = [];
}

const admin = {
  auth: { getUser: async token => ({ data: { user: ['owner', 'outsider', 'admin'].includes(token) ? { id: token } : null } }) },
  from(table) {
    const query = { table, filters: [] };
    queries.push(query);
    return {
      select(...args) { query.select = args; return this; },
      eq(key, value) { query.filters.push(['eq', key, value]); return this; },
      in(key, value) { query.filters.push(['in', key, value]); return this; },
      gte(key, value) { query.filters.push(['gte', key, value]); return this; },
      order() { return this; }, limit() { return this; },
      maybeSingle() { query.single = true; return this; },
      then(resolve, reject) {
        if (table === 'email_logs') return Promise.resolve({ count: state.count, error: state.errors[table] }).then(resolve, reject);
        const rows = (state[table] || []).filter(row => query.filters.every(([op, key, value]) =>
          op === 'eq' ? row[key] === value : op === 'in' ? value.includes(row[key]) : true));
        return Promise.resolve({ data: query.single ? rows[0] || null : rows, error: state.errors[table] }).then(resolve, reject);
      },
    };
  },
};

// Usar o resolver de produção, substituindo apenas seu cliente de banco.
const orders = {};
vm.runInNewContext(transpile('lib/orders-server.ts'), {
  exports: orders, Date, Buffer, process: { env: {} },
  require: name => name === '@/lib/supabase-server-key' ? keyHelper() : name === '@/lib/internal-service-headers' ? serviceHelper() : name === 'server-only' ? {} : name === '@/lib/supabase-admin'
    ? { createAdminClient: () => admin } : require(name),
});

const route = {};
vm.runInNewContext(transpile('app/api/public/company-result-email/route.ts'), {
  exports: route, Buffer, Date, URL, AbortSignal,
  process: { env: serverEnv },
  require: name => name === '@/lib/supabase-server-key' ? keyHelper() : name === '@/lib/internal-service-headers' ? serviceHelper() : name === 'server-only' ? {} : name === '@/lib/orders-server' ? orders
    : name === '@/lib/supabase-admin' ? { createAdminClient: () => admin }
      : { NextResponse: { json: (body, options) => ({ body, ...options }) } },
  fetch: async (url, options) => {
    calls.push({ url, headers: options.headers, body: JSON.parse(options.body) });
    if (state.networkError) throw new Error('private-provider-payload');
    return {
      status: state.providerStatus, ok: state.providerStatus === 200,
      json: async () => { if (state.invalidProviderJson) throw new Error('private-provider-payload'); return state.providerBody; },
    };
  },
});

const input = { company_id: companyId, subject: 'Resultado atual', body: 'Conteúdo atual' };
function post(extra = {}, token = null, headers = {}) {
  const request = new Request('https://tenant.example/api/public/company-result-email', {
    method: 'POST',
    headers: { host: 'tenant.example', 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
    body: JSON.stringify({ ...input, ...extra }),
  });
  Object.defineProperty(request, 'nextUrl', { value: new URL(request.url) });
  return route.POST(request);
}
function safe(response) {
  assert.equal(response.headers['Cache-Control'], 'no-store');
  for (const sensitive of ['destination@database.example', 'mock-service-role', 'profile-token', 'private-provider-payload']) {
    assert.ok(!JSON.stringify(response.body).includes(sensitive));
  }
}
function profile(type = 'cliente', company = companyId, expires = Date.now() + 60_000) {
  state.profile_sessions = [{ token: 'profile-token', company_id: company, profile_id: profileId, expires_at: new Date(expires).toISOString() }];
  state.company_profiles = [{ id: profileId, company_id: company, tipo: type, is_active: true }];
}

async function main() {
  reset(); assert.equal((await post({ company_id: 'invalid' })).status, 400); assert.equal(queries.length, 0);
  for (const company of [null, { ...state.companies[0], is_active: false }]) {
    reset(); state.companies = company ? [company] : []; assert.equal((await post()).status, 404); assert.equal(calls.length, 0);
  }
  reset(); let response = await post(); assert.equal(response.status, 200); assert.equal(JSON.stringify(response.body), '{"ok":true}'); safe(response);
  assert.equal(calls[0].url, 'https://supabase.test/functions/v1/enviar-email-google-v2');
  assert.equal(calls[0].headers.Authorization, 'Bearer mock-service-role');
  assert.deepEqual(calls[0].body, { ...input, to: 'destination@database.example', email_type: 'assistant_result' });
  const accountQuery = queries.find(q => q.table === 'google_accounts');
  assert.ok(accountQuery.filters.some(f => f[1] === 'company_id' && f[2] === companyId));
  assert.ok(accountQuery.filters.some(f => f[1] === 'is_active' && f[2] === true));
  const logs = queries.find(q => q.table === 'email_logs');
  assert.equal(JSON.stringify(logs.select), JSON.stringify(['id', { count: 'exact', head: true }]));
  for (const [key, value] of [['company_id', companyId], ['email_type', 'assistant_result'], ['status', 'sent']]) {
    assert.ok(logs.filters.some(f => f[0] === 'eq' && f[1] === key && f[2] === value));
  }
  assert.ok(Math.abs(Date.now() - Date.parse(logs.filters.find(f => f[1] === 'sent_at')[2]) - 600_000) < 1000);

  reset(); state.companies[0].is_public = false; assert.equal((await post()).status, 401); assert.equal(calls.length, 0);
  for (const token of ['owner', 'admin']) {
    reset(); state.companies[0].is_public = false;
    state.company_admins = [{ company_id: companyId, user_id: 'admin', role: 'manager' }];
    assert.equal((await post({}, token)).status, 200);
  }
  reset(); state.companies[0].is_public = false; profile(); assert.equal((await post({ profile_tokens: ['profile-token'] })).status, 200);
  reset(); state.companies[0].is_public = false; assert.equal((await post({}, 'outsider')).status, 403); assert.equal(calls.length, 0);
  for (const [type, company, expires] of [['cliente', otherId, Date.now() + 60_000], ['cliente', companyId, Date.now() - 1000], ['totem', companyId, Date.now() + 60_000]]) {
    reset(); state.companies[0].is_public = false; profile(type, company, expires);
    assert.equal((await post({ profile_tokens: ['profile-token'] })).status, 403); assert.equal(calls.length, 0);
  }
  reset(); state.companies[0].is_public = false; state.funcionaria_company_settings = [{ company_id: companyId }]; assert.equal((await post()).status, 200);
  for (const field of ['email', 'google_email', 'user_email']) {
    reset(); state.google_accounts = [{ company_id: companyId, is_active: true, [field]: 'destination@database.example' }]; assert.equal((await post()).status, 200);
  }
  for (const accounts of [[], [{ company_id: otherId, is_active: true, email: 'destination@database.example' }], [{ company_id: companyId, is_active: false, email: 'destination@database.example' }], [{ company_id: companyId, is_active: true }]]) {
    reset(); state.google_accounts = accounts; response = await post(); assert.equal(response.body.reason, 'google_email_unavailable'); assert.equal(calls.length, 0); safe(response);
  }
  for (const field of ['to', 'email', 'recipient', 'destination', 'To']) {
    reset(); response = await post({ [field]: 'attacker@example.test' }); assert.equal(response.status, 400); assert.equal(response.body.reason, 'recipient_not_allowed'); assert.equal(calls.length, 0);
  }
  for (const extra of [{ subject: '' }, { subject: 'x'.repeat(201) }, { subject: 'x\r\nBcc: evil' }, { subject: 'x\u0000' }, { body: '' }, { body: '  ' }, { body: 'x'.repeat(51201) }, { body: 'é'.repeat(25601) }]) {
    reset(); response = await post(extra); assert.equal(response.status, 400); assert.equal(calls.length, 0); safe(response);
  }
  for (const field of ['email_type', 'attachments', 'threadId', 'google_token', 'google_account', 'gmail_params']) {
    reset(); assert.equal((await post({ [field]: 'untrusted' })).status, 400); assert.equal(calls.length, 0);
  }
  reset(); assert.equal((await post({ subject: ' Assunto ' })).status, 200); assert.equal(calls[0].body.subject, 'Assunto');
  reset(); state.count = 20; response = await post(); assert.equal(response.status, 429); assert.equal(response.body.reason, 'rate_limited'); assert.equal(calls.length, 0);
  reset(); state.count = 19; assert.equal((await post()).status, 200);
  for (const table of ['companies', 'google_accounts', 'email_logs', 'funcionaria_company_settings']) {
    reset(); state.companies[0].is_public = false; state.errors[table] = { message: 'private-provider-payload' };
    response = await post({}, 'owner'); assert.equal(response.status, 503); assert.equal(calls.length, 0); safe(response);
  }
  reset(); state.count = null; assert.equal((await post()).status, 503); assert.equal(calls.length, 0);
  for (const mode of ['http', 'logical', 'network', 'invalid_json']) {
    reset(); state.providerBody = { success: false, error: 'private-provider-payload' };
    if (mode === 'http') state.providerStatus = 500;
    if (mode === 'network') state.networkError = true;
    if (mode === 'invalid_json') state.invalidProviderJson = true;
    response = await post(); assert.equal(response.status, 502); safe(response);
  }
  for (const origin of ['https://external.example', 'https://tenant.example:8080', 'null', 'invalid', 'ftp://tenant.example']) {
    reset(); response = await post({}, null, { origin }); assert.equal(response.status, 403); assert.equal(calls.length, 0); assert.equal(queries.length, 0); safe(response);
  }
  reset(); assert.equal((await post({}, null, { origin: 'https://tenant.example' })).status, 200);
  reset(); assert.equal((await post({}, null, { host: 'other.example', origin: 'https://other.example' })).status, 200);
  reset(); assert.equal((await post({ body: 'x'.repeat(512 * 1024 + 1) })).status, 413);
  for (const method of ['GET', 'HEAD', 'OPTIONS', 'PUT', 'PATCH', 'DELETE']) { response = route[method](); assert.equal(response.status, 405); safe(response); }

  let auth = { accessToken: null, profileTokens: [] };
  const clientCalls = [], client = {};
  vm.runInNewContext(transpile('lib/company-result-email-client.ts'), {
    exports: client, require: () => ({ collectOrderClientAuth: async () => auth }),
    fetch: async (url, options) => { clientCalls.push({ url, ...options }); return { ok: true, json: async () => ({ ok: true }) }; },
  });
  await client.sendCompanyResultEmail({ ...input, to: 'attacker@example.test', email_type: 'pix' });
  assert.equal(clientCalls[0].url, '/api/public/company-result-email');
  assert.deepEqual(Object.keys(JSON.parse(clientCalls[0].body)).sort(), ['body', 'company_id', 'profile_tokens', 'subject']);
  assert.ok(!clientCalls[0].headers.Authorization);
  auth = { accessToken: 'user-token', profileTokens: ['profile-token'] };
  await client.sendCompanyResultEmail(input); assert.equal(clientCalls[1].headers.Authorization, 'Bearer user-token');
  assert.deepEqual(JSON.parse(clientCalls[1].body).profile_tokens, ['profile-token']);

  const probe = path.join(root, 'components', `.email-boundary-probe-${process.pid}.tsx`);
  try {
    fs.writeFileSync(probe, "export const forbidden = 'enviar-email-google';", { flag: 'wx' });
    let check = spawnSync(process.execPath, ['scripts/check-email-edge-boundary.mjs'], { cwd: root, encoding: 'utf8' });
    assert.equal(check.status, 1); assert.ok(check.stderr.includes(path.basename(probe)));
    fs.writeFileSync(probe, 'export const forbidden = `https://supabase.test/functions/v1/enviar-email-google`;');
    check = spawnSync(process.execPath, ['scripts/check-email-edge-boundary.mjs'], { cwd: root, encoding: 'utf8' });
    assert.equal(check.status, 1);
  } finally { fs.rmSync(probe, { force: true }); }
  console.log('PASS: 22 required cases + real actor resolver, FuncionarIA, legacy account fields, no-store, UTF-8/payload bounds, helper allowlist and guardrail rejection. No live database/Gmail/SMS calls.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
