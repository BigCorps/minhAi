const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {test}=require('node:test');
const {runInNewContext}=require('node:vm');
const ts=require('typescript');

function compile(path,deps={}){
  const exports={};
  runInNewContext(ts.transpileModule(readFileSync(require.resolve(path),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
    {exports,URL,Set,require(id){if(Object.hasOwn(deps,id)) return deps[id];throw new Error('unexpected_dependency:'+id);}});
  return exports;
}
test('every current SDR product has a conservative commercial playbook',()=>{
  const catalog=compile('../lib/sdr/catalog.ts');
  const p=compile('../lib/sdr/playbooks.ts',{'./catalog':catalog});
  const rows=p.allCommercialPlaybooks();
  assert.equal(rows.length,Object.keys(catalog.PRODUCTS).length);
  for(const row of rows){assert.equal(row.primaryChannel,'email');assert.equal(row.whatsappPolicy,'after_consent');assert.equal(row.decisionMakerRequired,true);assert.ok(row.defaultPilotSize>=1);}
  assert.equal(p.commercialPlaybook('melhoria').manualReviewRequired,true);
  assert.equal(p.commercialPlaybook('monitoria_vip').manualReviewRequired,true);
});
test('rollout migration adds product-level double lock and daily cap to send RPCs',()=>{
  const sql=readFileSync(require.resolve('../supabase/migrations/20261007110000_sdr_product_rollouts.sql'),'utf8');
  assert.match(sql,/sdr_product_rollouts/);
  assert.match(sql,/ro\.status='active'/);
  assert.match(sql,/ro\.auto_outreach_enabled/);
  assert.match(sql,/ro\.live_send_enabled/);
  assert.match(sql,/daily_send_cap/);
  assert.match(sql,/sdr_begin_send/);
  assert.match(sql,/grant execute on function public\.sdr_claim\(\), public\.sdr_begin_send\(uuid\) to service_role/);
});
test('worker auto discovery also obeys the per-product rollout gate',()=>{
  const worker=readFileSync(require.resolve('../lib/sdr/worker.ts'),'utf8');
  assert.match(worker,/sdr_product_rollouts/);
  assert.match(worker,/auto_discovery_enabled/);
  assert.match(worker,/\["pilot", "active"\]/);
});
