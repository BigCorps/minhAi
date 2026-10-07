const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript')
const {webcrypto}=require('node:crypto')
const file=path.join(__dirname,'../supabase/functions/_shared/pix-cancel-capability.ts')
const compiled=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
let env={SUPABASE_SERVICE_ROLE_KEY:'legacy-service-role-secret-that-is-long-enough'}
const exports={}
vm.runInNewContext(compiled,{exports,Deno:{env:{get:key=>env[key]}},crypto:webcrypto,TextEncoder,TextDecoder,btoa:v=>Buffer.from(v,'binary').toString('base64'),atob:v=>Buffer.from(v,'base64').toString('binary'),Date,JSON,Uint8Array,Error})
const tx='11111111-1111-4111-8111-111111111111',company='22222222-2222-4222-8222-222222222222',other='33333333-3333-4333-8333-333333333333'
;(async()=>{
  const expires=new Date(Date.now()+20*60_000).toISOString()
  const token=await exports.issuePixCancelCapability(tx,company,expires)
  assert.ok(typeof token==='string'&&token.split('.').length===2)
  assert.equal(await exports.verifyPixCancelCapability(token,tx,company,expires),true)
  assert.equal(await exports.verifyPixCancelCapability(token,other,company,expires),false)
  assert.equal(await exports.verifyPixCancelCapability(token,tx,other,expires),false)
  assert.equal(await exports.verifyPixCancelCapability(token,tx,company,new Date(Date.parse(expires)+60_000).toISOString()),false)
  assert.equal(await exports.verifyPixCancelCapability(token+'x',tx,company,expires),false)
  assert.equal(await exports.verifyPixCancelCapability(token,tx,company,expires,Date.parse(expires)+1000),false)
  env={PIX_CANCEL_CAPABILITY_SECRET:'short',SUPABASE_SERVICE_ROLE_KEY:'legacy-service-role-secret-that-is-long-enough'}
  await assert.rejects(()=>exports.issuePixCancelCapability(tx,company,expires),/pix_cancel_capability_unavailable/)
  env={SUPABASE_SERVICE_ROLE_KEY:'legacy-service-role-secret-that-is-long-enough'}
  await assert.rejects(()=>exports.issuePixCancelCapability('bad',company,expires),/invalid_scope/)
  console.log('PIX cancel capability: scope, expiry, tamper and fail-closed PASS')
})().catch(error=>{console.error(error);process.exitCode=1})
