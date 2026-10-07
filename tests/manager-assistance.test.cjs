const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),id='11111111-1111-4111-8111-111111111111';
let state,calls,queries;
function reset(){state={companies:[{id,is_active:true,is_public:true,email_contato:'fallback@example.test'}],company_profiles:[{company_id:id,tipo:'gerente',is_active:true,nome:'Gerente',email:'manager@example.test',telefone:'5511999999999'}],company_function_settings:[],funcionaria_company_settings:[],count:0,errors:{},failEmail:false,failSms:false};calls=[];queries=[];}
const admin={from(table){const q={table,filters:[]};queries.push(q);return {
 select(...args){q.select=args;return this;},eq(k,v){q.filters.push([k,v]);return this;},limit(){return this;},maybeSingle(){q.single=true;return this;},gte(k,v){q.since=[k,v];return this;},
 then(resolve,reject){if(table==='email_logs')return Promise.resolve({count:state.count,error:state.errors[table]}).then(resolve,reject);const rows=(state[table]||[]).filter(row=>q.filters.every(([k,v])=>row[k]===v));return Promise.resolve({data:q.single?rows[0]||null:rows,error:state.errors[table]}).then(resolve,reject);},
};}};
const route={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,'app/api/public/manager-assistance/route.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
 exports:route,Date,AbortSignal,process:{env:{NEXT_PUBLIC_SUPABASE_URL:'https://supabase.test',SUPABASE_SERVICE_ROLE_KEY:'service-secret',NEXT_PUBLIC_SUPABASE_ANON_KEY:'sms-public-key'}},
 require:name=>name==='server-only'?{}:name==='node:crypto'?require(name):name==='@/lib/supabase-admin'?{createAdminClient:()=>admin}:{NextResponse:{json:(body,options)=>({body:JSON.parse(JSON.stringify(body)),...options})}},
 fetch:async(url,options)=>{calls.push({url,...options,body:JSON.parse(options.body)});const sms=url.endsWith('send-sms-gerente'),failed=sms?state.failSms:state.failEmail;return {ok:!failed,status:failed?(sms?402:502):200,json:async()=>failed?{error:'provider-secret'}:{success:true}};},
});
const post=extra=>route.POST({json:async()=>({company_id:id,reason:'Preciso de ajuda',...extra})});
const get=()=>route.GET({nextUrl:new URL('https://app.test/api/public/manager-assistance?company_id='+id)});
function safe(response){assert.equal(response.headers['Cache-Control'],'no-store');for(const value of ['manager@example.test','fallback@example.test','5511999999999','service-secret','provider-secret'])assert.ok(!JSON.stringify(response).includes(value));}
(async()=>{
 reset();assert.equal((await post({company_id:'bad'})).status,400);
 for(const reason of ['', '  ', '\u0000', 'x'.repeat(501),null]){reset();assert.equal((await post({reason})).status,400);assert.equal(calls.length,0);}
 for(const companies of [[],[{id,is_active:false,is_public:true}]]){reset();state.companies=companies;assert.equal((await post()).status,404);assert.equal(calls.length,0);}
 reset();let result=await get();safe(result);assert.deepEqual(result.body,{ok:true,manager_name:'Gerente',channels:{email:true,sms:false}});
 reset();state.company_profiles=[];state.companies[0].email_contato=null;result=await post();assert.equal(result.body.reason,'no_channel');assert.equal(calls.length,0);
 reset();result=await post({to:'attacker@example.test',phone:'attacker-phone',subject:'attacker-subject',body:'attacker-body',gerente_nome:'attacker',reason:'  <script>teste</script>\u0000  '});safe(result);assert.equal(result.status,200);
 assert.equal(calls[0].url,'https://supabase.test/functions/v1/enviar-email-google-v2');assert.equal(calls[0].headers.Authorization,'Bearer service-secret');
 assert.equal(calls[0].body.to,'manager@example.test');assert.equal(calls[0].body.email_type,'manager_assistance');assert.ok(calls[0].body.body.includes('&lt;script&gt;'));assert.ok(!JSON.stringify(calls[0].body).includes('attacker'));
 reset();state.company_profiles[0].email='';await post();assert.equal(calls[0].body.to,'fallback@example.test');
 reset();state.count=3;result=await post();assert.equal(result.status,429);assert.equal(result.body.reason,'rate_limited');assert.equal(calls.length,0);
 let query=queries.find(q=>q.table==='email_logs');assert.deepEqual(query.filters,[['company_id',id],['email_type','manager_assistance'],['status','sent']]);assert.ok(Math.abs(Date.now()-Date.parse(query.since[1])-600000)<1000);
 reset();state.errors.email_logs=true;assert.equal((await post()).status,503);assert.equal(calls.length,0);
 reset();state.failEmail=true;result=await post();assert.equal(result.status,502);safe(result);
 reset();state.company_function_settings=[{company_id:id,function_key:'chamar_gerente',config:{notificar_sms:true}}];state.failSms=true;result=await post();assert.equal(result.status,200);assert.deepEqual(result.body,{ok:true,notified:['email']});safe(result);
 reset();state.funcionaria_company_settings=[{company_id:id}];await post();assert.equal(calls[0].body.subject,'🔔 Cliente aguardando — FuncionarIA');assert.ok(calls[0].body.body.includes('Enviado pela FuncionarIA'));
 reset();state.companies[0].is_public=false;assert.equal((await post()).status,403);
 console.log('Manager assistance: 12 groups passed (no real Gmail/SMS)');
})().catch(error=>{console.error(error);process.exitCode=1;});
