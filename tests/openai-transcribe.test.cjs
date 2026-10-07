const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
const {spawnSync}=require('node:child_process');
const {File}=require('node:buffer');
const root=path.resolve(__dirname,'..');
const compile=file=>ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const defaults={fast:'gpt-4o-mini',smart:'gpt-4o',tools:'gpt-4o-mini',vision:'gpt-4o',transcribe:'whisper-1',embedding:'text-embedding-3-small',tts:'tts-1'};
function registry(file,env={}) {const exports={};vm.runInNewContext(compile(file),{exports,process:{env},Deno:{env:{get:name=>env[name]}},require:()=>({})});return exports.OPENAI_MODELS;}
for(const file of ['lib/openai-models.ts','supabase/functions/_shared/openai-models.ts']) {
  assert.equal(JSON.stringify(registry(file)),JSON.stringify(defaults));
  for(const category of Object.keys(defaults)) {
    const variable='OPENAI_MODEL_'+category.toUpperCase();
    assert.equal(registry(file,{[variable]:'custom-model'})[category],'custom-model');
    assert.equal(registry(file,{[variable]:''})[category],defaults[category]);
  }
}
let calls=[],providerFail=false,env={OPENAI_API_KEY:'server-secret'},clock=Date.now();
class Clock extends Date {constructor(...args){super(...(args.length?args:[clock]));}static now(){return clock;}}
class OpenAI {constructor(options){assert.equal(options.apiKey,'server-secret');this.audio={transcriptions:{create:async input=>{calls.push(input);if(providerFail)throw Error('provider-secret');return {text:'Texto'};}}};}}
const route={};vm.runInNewContext(compile('app/api/openai/transcribe/route.ts'),{exports:route,File,Date:Clock,URL,process:{env},require:name=>name==='openai'?{default:OpenAI}:name==='@/lib/openai-models'?{OPENAI_MODELS:{transcribe:'custom-transcription-model'}}:{NextResponse:{json:(body,options)=>({body:JSON.parse(JSON.stringify(body)),...options})}}});
let ip=0;
async function post(file=new File(['audio'],'voice.webm',{type:'audio/webm'}),options={}) {
  const headers=new Headers({'content-type':'multipart/form-data; boundary=test',host:'tenant.test','x-forwarded-for':String(++ip),...options.headers});
  return route.POST({headers,nextUrl:new URL('https://tenant.test/api/openai/transcribe'),formData:async()=>{if(options.invalidForm)throw Error('invalid');return {get:()=>file};}});
}
(async()=>{
  assert.equal(route.GET().status,405);
  for(const origin of ['https://external.test','null','bad']) assert.equal((await post(undefined,{headers:{origin}})).status,403);
  assert.equal((await post(undefined,{headers:{'content-type':'application/json'}})).status,415);
  assert.equal((await post(null)).status,400);assert.equal((await post(new File([],'empty.webm',{type:'audio/webm'}))).status,400);
  assert.equal((await post(undefined,{invalidForm:true})).status,400);
  assert.equal((await post(new File([new Uint8Array(4*1024*1024+1)],'large.webm',{type:'audio/webm'}))).status,413);
  assert.equal((await post(new File(['fake'],'fake.txt',{type:'text/plain'}))).status,415);assert.equal(calls.length,0);
  for(const type of ['audio/webm;codecs=opus','audio/ogg','audio/mpeg','audio/mp4','audio/wav','audio/x-wav']) assert.equal((await post(new File(['audio'],'voice',{type}),{headers:{origin:'https://tenant.test'}})).status,200);
  for(const input of calls){assert.equal(input.model,'custom-transcription-model');assert.equal(input.language,'pt');}
  const success=await post();assert.deepEqual(success.body,{text:'Texto'});assert.equal(success.headers['Cache-Control'],'no-store');
  env.OPENAI_API_KEY='';assert.equal((await post()).status,503);env.OPENAI_API_KEY='server-secret';providerFail=true;
  const failed=await post();assert.equal(failed.status,502);assert.ok(!JSON.stringify(failed).includes('provider-secret'));providerFail=false;
  for(let i=0;i<30;i++)assert.equal((await post(undefined,{headers:{'x-forwarded-for':'rate-ip'}})).status,200);
  const limited=await post(undefined,{headers:{'x-forwarded-for':'rate-ip'}});assert.equal(limited.status,429);assert.equal(limited.headers['Retry-After'],'60');
  clock+=60001;assert.equal((await post(undefined,{headers:{'x-forwarded-for':'rate-ip'}})).status,200);
  for(const name of ['CreateEventModal','CriarMidiaDisplay','FazerPedidoDisplay','CadastrarProdutoDisplay']) {
    const source=fs.readFileSync(path.join(root,`components/assistant/${name}.tsx`),'utf8');
    assert.ok(source.includes('/api/openai/transcribe'));assert.ok(!source.includes('NEXT_PUBLIC_OPENAI_API_KEY'));
    assert.ok(!source.includes('api.openai.com'));assert.ok(!source.includes('OPENAI_MODEL_TRANSCRIBE'));assert.ok(!source.includes('whisper-1'));
  }
  assert.equal(spawnSync(process.execPath,['scripts/check-openai-model-registry.mjs'],{cwd:root}).status,0);
  console.log('OpenAI registry/transcription: 15 groups passed (no real OpenAI)');
})().catch(error=>{console.error(error);process.exitCode=1;});
