const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),file='app/api/internal/release-probe-google-v2/route.ts';
const source=fs.readFileSync(path.join(root,file),'utf8');
const slugs=['enviar-email-google-v2','listar-eventos-google-v2','appointment-actions-v2','criar-evento-calendario-v2'];
const secret='test-private-service-role',base='https://qyonozbroekuqlotqcbm.supabase.co';
let calls=[],fail=null;
const env={VERCEL_ENV:'preview',SUPABASE_SERVICE_ROLE_KEY:secret,NEXT_PUBLIC_SUPABASE_URL:base};
const route={};
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
 exports:route,process:{env},AbortSignal,
 console:{log:()=>assert.fail('No logs allowed'),warn:()=>assert.fail('No logs allowed'),error:()=>assert.fail('No logs allowed')},
 require:name=>name==='server-only'?{}:{NextResponse:{json:(body,options)=>({body:JSON.parse(JSON.stringify(body)),...options})}},
 fetch:async(url,options)=>{
  calls.push({url,...options});
  assert.ok(options.signal);assert.equal(options.cache,'no-store');assert.equal(options.redirect,'error');
  if(fail==='network')throw Error(secret);
  const slug=url.split('/').at(-1),token=options.headers.Authorization;
  const status=options.method==='GET'?405:token===`Bearer ${secret}`?400:401;
  const error=status===405?'method_not_allowed':status===401?'unauthorized':slug==='appointment-actions-v2'?'invalid_action':'invalid_company_id';
  return {status:fail==='status'?200:status,json:async()=>fail==='payload'?{error:secret,Authorization:secret,apikey:secret}:{error}};
 },
});
assert.equal(calls.length,0,'No calls at module import/build');
function safe(result){assert.equal(result.headers['Cache-Control'],'no-store');for(const value of [secret,'Authorization','apikey','SUPABASE_SERVICE_ROLE_KEY'])assert.ok(!JSON.stringify(result).includes(value));}
(async()=>{
 for(const mode of [undefined,'production','development','PREVIEW']){
  env.VERCEL_ENV=mode;for(const method of ['GET','POST','HEAD','OPTIONS','PUT','PATCH','DELETE']){const result=await route[method]();assert.equal(result.status,404);safe(result);}assert.equal(calls.length,0);
 }
 env.VERCEL_ENV='preview';env.SUPABASE_SERVICE_ROLE_KEY='';assert.equal((await route.GET()).status,503);assert.equal(calls.length,0);env.SUPABASE_SERVICE_ROLE_KEY=secret;
 env.NEXT_PUBLIC_SUPABASE_URL='https://external.test';assert.equal((await route.GET()).status,503);assert.equal(calls.length,0);env.NEXT_PUBLIC_SUPABASE_URL=base;
 const poison=new Proxy({}, {get(){assert.fail('External request/input must never be read');}});
 const result=await route.GET(poison);assert.equal(result.status,200);assert.equal(result.body.success,true);safe(result);assert.equal(calls.length,16);
 assert.deepEqual(Object.keys(result.body.probes).sort(),slugs.slice().sort());
 for(const slug of slugs){
  const requests=calls.filter(c=>c.url===base+'/functions/v1/'+slug);assert.equal(requests.length,4);
  assert.deepEqual(requests.map(c=>c.method),['POST','POST','GET','POST']);
  assert.equal(requests[0].headers.Authorization,undefined);assert.equal(requests[1].headers.Authorization,'Bearer definitely-invalid');
  for(const index of [2,3])assert.equal(requests[index].headers.Authorization,'Bearer '+secret);
  for(const index of [0,1,3])assert.equal(requests[index].body,'{}');assert.equal(requests[2].body,undefined);
  assert.deepEqual(result.body.probes[slug],{no_auth:401,invalid_auth:401,wrong_method:405,invalid_payload_service_role:400});
 }
 for(const failure of ['network','payload','status']){fail=failure;const result=await route.GET(poison);assert.equal(result.status,502);assert.equal(result.body.success,false);safe(result);}
 fail=null;calls=[];assert.equal((await route.POST(poison)).status,405);assert.equal(calls.length,0);
 assert.ok(!/\bcompany_id\b/.test(source));assert.ok(!/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(source));
 assert.ok(!source.includes('console.'));
 console.log('Release probe: Preview-only, fixed 16 requests, no input/secrets, no build calls, sanitized failures: PASS (offline only)');
})().catch(error=>{console.error(error);process.exitCode=1;});
