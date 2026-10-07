const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),legacy='legacy-service-jwt',modern='sb_secret_configured',second='sb_secret_second';
let env={SUPABASE_SERVICE_ROLE_KEY:legacy,SUPABASE_SECRET_KEYS:JSON.stringify({primary:modern,secondary:second,blank:'',publishable:'sb_publishable_bad',other:'user-jwt'})};
const silent={log:()=>assert.fail('No secrets/logs'),warn:()=>assert.fail('No secrets/logs'),error:()=>assert.fail('No secrets/logs')};
function load(file,extra={},cache=new Map()) {file=path.resolve(root,file);if(cache.has(file))return cache.get(file);const exports={};cache.set(file,exports);vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Request,Response,TextEncoder,TextDecoder,Uint8Array,Date,URL,URLSearchParams,AbortSignal,atob,btoa,crypto:require('node:crypto').webcrypto,console:silent,Deno:{env:{get:key=>env[key]},serve:fn=>extra.capture(fn)},require:name=>name.includes('supabase-js')?{createClient:()=>assert.fail('No database access before invalid input rejection')}:name==='server-only'?{}:load(path.resolve(path.dirname(file),name),extra,cache),fetch:()=>assert.fail('No external operations'),...extra});return exports;}
const auth=load('supabase/functions/_shared/internal-service-auth.ts');
const request=headers=>new Request('https://offline.test',{method:'POST',headers,body:'{}'});
assert.equal(auth.isInternalServiceRequest(request({Authorization:'Bearer '+legacy})),true);
assert.equal(auth.isInternalServiceRequest(request({Authorization:'Bearer definitely-invalid',apikey:modern})),true);
for(const key of [modern,second])assert.equal(auth.isInternalServiceRequest(request({apikey:key})),true);
for(const headers of [{},{Authorization:'Bearer invalid'},{apikey:'sb_secret_unknown'},{Authorization:'Bearer anon-jwt'},{Authorization:'Bearer user-jwt'},{apikey:'sb_publishable_bad'},{apikey:'user-jwt'},{Authorization:'Bearer '+modern}])assert.equal(auth.isInternalServiceRequest(request(headers)),false);
for(const malformed of [undefined,'','{bad','null','[]','"secret"',JSON.stringify({key:'',bad:123,key2:'sb_publishable_bad'})]){env.SUPABASE_SECRET_KEYS=malformed;assert.equal(auth.isInternalServiceRequest(request({apikey:modern})),false);assert.equal(auth.isInternalServiceRequest(request({Authorization:'Bearer '+legacy})),true);}
env.SUPABASE_SECRET_KEYS=JSON.stringify({primary:modern});env.SUPABASE_URL='https://supabase.test';
(async()=>{
 for(const slug of ['enviar-email-google-v2','listar-eventos-google-v2','appointment-actions-v2','criar-evento-calendario-v2']){
  let handler;load(`supabase/functions/${slug}/index.ts`,{capture:fn=>handler=fn});env.SUPABASE_URL='https://supabase.test';
  for(const headers of [{Authorization:'Bearer '+legacy},{apikey:modern}]){const result=await handler(request(headers));assert.equal(result.status,400);const body=await result.text();for(const key of [legacy,modern])assert.ok(!body.includes(key));}
  for(const headers of [{},{Authorization:'Bearer invalid'},{apikey:'sb_secret_unknown'},{apikey:'sb_publishable_bad'},{Authorization:'Bearer user-jwt'},{Authorization:'Bearer anon-jwt'}])assert.equal((await handler(request(headers))).status,401);
  for(const malformed of [undefined,'{bad','[]','null']){env.SUPABASE_SECRET_KEYS=malformed;assert.equal((await handler(request({apikey:modern}))).status,401);}
  env.SUPABASE_SECRET_KEYS=JSON.stringify({primary:modern});
  console.log(slug+': dual auth validates empty payload without DB/Google');
 }
 console.log('Internal service auth: all credential/malformed JSON matrices passed; no secrets logged/returned');
})().catch(error=>{console.error(error);process.exitCode=1;});
