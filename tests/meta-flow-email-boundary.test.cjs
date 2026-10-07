const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const file = path.join(root, 'supabase/functions/meta-flow-agenda/index.ts');
const original = fs.readFileSync(file, 'utf8');
const source = ts.createSourceFile(file, original, ts.ScriptTarget.Latest, true);
const fn = source.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'enviarEmailsAgendamento');
assert.ok(fn);
// Executar a função real; somente banco/fetch/console são substituídos.
const compiled = ts.transpileModule(fn.getText(source) + '\nexports.send = enviarEmailsAgendamento;', {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
let calls, queries, logs, account, fail;
const supabase = { from(table) {
  const q = { table, filters: [] }; queries.push(q);
  return { select(columns) { q.columns = columns; return this; }, eq(k,v) { q.filters.push([k,v]); return this; },
    async maybeSingle() { return { data: account }; } };
} };
const exported = {};
vm.runInNewContext(compiled, { exports: exported, supabaseUrl: 'https://supabase.test', serviceKey: 'service-secret',
  AbortSignal, console: { warn: (...args) => logs.push(args.join(' ')) },
  fetch: async (url, options) => {
    const body = JSON.parse(options.body); calls.push({url, ...options, body});
    if (fail === 'network') throw Error('provider-secret');
    if (fail === body.to) return Response.json({error:'provider-secret'}, {status:502});
    return Response.json({success:true});
  },
});
function reset() { calls=[]; queries=[]; logs=[]; account={google_email:'company@example.test'}; fail=null; }
const data = {nome_cliente:'Cliente',email_cliente:'customer@example.test',servico:'Consulta',observacoes:'Nenhuma'};
async function send(dados=data) { await exported.send('company-id',{name:'Empresa'},dados,new Date('2026-10-07T12:00:00Z'),new Date('2026-10-07T13:00:00Z'),supabase); }
(async()=>{
  reset(); await send(); assert.equal(calls.length,2);
  assert.deepEqual(calls.map(c=>c.body.to),['customer@example.test','company@example.test']);
  for (const call of calls) {
    assert.equal(call.url,'https://supabase.test/functions/v1/enviar-email-google-v2');
    assert.equal(call.headers.Authorization,'Bearer service-secret'); assert.equal(call.headers.apikey,'service-secret');
    assert.deepEqual(Object.keys(call.body).sort(),['company_id','to','subject','body','email_type'].sort());
    assert.equal(call.body.email_type,'meta_manual'); assert.ok(call.body.body.includes('Consulta'));
  }
  assert.equal(queries[0].columns,'google_email'); assert.deepEqual(queries[0].filters,[['company_id','company-id'],['is_active',true]]);
  reset(); await send({...data,email_cliente:null}); assert.equal(calls.length,1);
  reset(); account=null; await send(); assert.equal(calls.length,1); assert.equal(calls[0].body.to,data.email_cliente);
  for (const failure of ['customer@example.test','company@example.test','network']) {
    reset(); fail=failure; await assert.doesNotReject(send()); assert.equal(calls.length,2);
    assert.ok(logs.length>0); assert.ok(logs.every(line=>line==='appointment_email_failed'));
    assert.equal(queries.length,1); // Nenhuma alteração/rollback de appointment por falha de email.
  }
  assert.ok(/enviarEmailsAgendamento\([^]*?\.catch\(\s*\(\) => console.warn\('appointment_email_failed'\)/.test(original));
  assert.equal(spawnSync(process.execPath,['scripts/check-email-edge-boundary.mjs'],{cwd:root}).status,0);
  // Provar que o guardrail rejeita tanto endpoint Gmail quanto leitura de tokens.
  try {
    for (const probe of ["\nconst bypass='https://gmail.googleapis.com/gmail/v1/users/me/messages/send';", "\nconst bypass='https://www.googleapis.com/gmail/v1/users/me/messages/send';", "\nconst bypass='access_token, google_email';", '\nconst bypass=account.access_token;']) {
      fs.writeFileSync(file,original+probe);
      assert.equal(spawnSync(process.execPath,['scripts/check-email-edge-boundary.mjs'],{cwd:root}).status,1);
    }
  } finally { fs.writeFileSync(file,original); }
  console.log('Meta Flow email boundary: 10 groups passed (no real Gmail)');
})().catch(error=>{console.error(error);process.exitCode=1;});
