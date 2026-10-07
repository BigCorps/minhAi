const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),id='11111111-1111-4111-8111-111111111111';let calls=[];
const env={NEXT_PUBLIC_SUPABASE_URL:'https://supabase.test',SUPABASE_SERVICE_ROLE_KEY:'legacy-service-jwt',NEXT_PUBLIC_SUPABASE_ANON_KEY:'sms-anon'};
const rows={companies:{id,is_active:true,is_public:true,email_contato:'company@example.test'},company_profiles:{nome:'Gerente',email:'manager@example.test'},google_accounts:{email:'company@example.test'}};
const admin={from(table){return {select(){return this;},eq(){return this;},gte(){return this;},limit(){return this;},order(){return this;},maybeSingle(){return this;},then(resolve,reject){return Promise.resolve({data:rows[table]||null,count:0,error:null}).then(resolve,reject);}};}};
const cache=new Map();
function load(file){file=path.resolve(root,file);if(!file.endsWith('.ts'))file+='.ts';if(cache.has(file))return cache.get(file);const exports={};cache.set(file,exports);vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,process:{env},Buffer,Date,AbortSignal,URL,TextEncoder,TextDecoder,console,require:name=>name==='server-only'?{}:name==='next/server'?{NextResponse:{json:(body,options)=>({body,...options})}}:name==='@/lib/supabase-admin'?{createAdminClient:()=>admin}:name==='@/lib/orders-server'?{cleanUuid:value=>value,resolveCompanyActor:async()=>({actor:{type:'owner'}})}:name.startsWith('node:')?require(name):load(name.startsWith('@/')?name.slice(2):path.resolve(path.dirname(file),name)),fetch:async(url,options)=>{calls.push({url,...options});return {ok:true,status:200,json:async()=>({success:true})};}});return exports;}
const modules=['app/api/company/email/route.ts','app/api/public/company-result-email/route.ts','app/api/public/manager-assistance/route.ts'];
(async()=>{
 for(const credential of ['legacy-service-jwt','sb_secret_modern']){
  env.SUPABASE_SERVICE_ROLE_KEY='legacy-service-jwt';
  if(credential.startsWith('sb_secret_'))env.SUPABASE_SECRET_KEY=credential;else delete env.SUPABASE_SECRET_KEY;
  for(const file of modules){calls=[];const req=new Request('https://app.test/api/test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({company_id:id,to:'destination@example.test',subject:'Assunto',body:'Texto',reason:'Ajuda'})});
   // Result endpoint estrito não aceita recipient/body extras de outro contrato.
   const input=file.includes('company-result-email')?{company_id:id,subject:'Assunto',body:'Texto'}:file.includes('manager-assistance')?{company_id:id,reason:'Ajuda'}:{company_id:id,to:'destination@example.test',subject:'Assunto',body:'Texto'};
   const request=new Request(req.url,{method:'POST',headers:req.headers,body:JSON.stringify(input)});Object.defineProperty(request,'nextUrl',{value:new URL(req.url)});
   const response=await load(file).POST(request);assert.equal(response.status,200,file);assert.equal(calls.length,1);assert.ok(!JSON.stringify(response).includes(credential));check(calls[0],credential);console.log(file+': '+(credential.startsWith('sb_secret_')?'modern':'legacy')+' headers OK');
  }
  calls=[];await load('lib/calendar-server.ts').calendarEdge('listar-eventos-google-v2',{});assert.equal(calls.length,1);check(calls[0],credential);
 }
 function check(call,credential){assert.equal(call.headers.apikey,credential);assert.equal(call.headers.Authorization,credential.startsWith('sb_secret_')?undefined:'Bearer '+credential);assert.ok(call.url.includes('-v2'));}
 for(const invalid of ['', 'sb_secret_', 'bad', 'sb_secret_bad\n']){env.SUPABASE_SECRET_KEY=invalid;calls=[];assert.throws(()=>load('lib/supabase-server-key.ts').getSupabaseServerKey(),/supabase_server_key_unavailable/);await assert.rejects(()=>load('lib/calendar-server.ts').calendarEdge('listar-eventos-google-v2',{}));assert.equal(calls.length,0);for(const file of modules){const input=file.includes('manager-assistance')?{company_id:id,reason:'Ajuda'}:file.includes('company-result-email')?{company_id:id,subject:'Assunto',body:'Texto'}:{company_id:id,to:'destination@example.test',subject:'Assunto',body:'Texto'};const request=new Request('https://app.test/api/test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});Object.defineProperty(request,'nextUrl',{value:new URL(request.url)});const result=await load(file).POST(request);assert.ok([502,503].includes(result.status));assert.equal(calls.length,0);}}
 delete env.SUPABASE_SECRET_KEY;
 console.log('All four Next boundaries use actual server-only credential strategy; no real requests');
})().catch(error=>{console.error(error);process.exitCode=1;});
