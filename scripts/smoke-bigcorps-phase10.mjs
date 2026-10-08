// Optional READ-ONLY smoke check on an already accessible deployment.
// Run explicitly with: BIGCORPS_QA_BASE_URL=https://<preview-host> npm run smoke:bigcorps-10
// Do not run on build: deployment protection can require user auth.
import assert from 'node:assert/strict';

const base = String(process.env.BIGCORPS_QA_BASE_URL || '').trim();
if(!base) {
  console.error('Set BIGCORPS_QA_BASE_URL to the exact accessible preview URL.');
  process.exit(2);
}
const root = new URL(base);
assert.equal(root.protocol,'https:','HTTPS required');
assert.equal(root.pathname,'/','Base URL must be origin only');
assert.equal(root.search,'','Base URL must not contain query');
assert.equal(root.hash,'','Base URL must not contain fragment');

const checks=[
  ['/','minhAi'],
  ['/funcionaria','FuncionarIA'],
  ['/convite','ConviteIA'],
  ['/pix','PixWiki'],
  ['/consultatec','ConsultaTec'],
  ['/melhoria','MelhorIA'],
  ['/min','Min.IA'],
  ['/.well-known/assetlinks.json','Digital Asset Links'],
];
let failed=false;
for(const [path,name] of checks) {
  try{
    const res=await fetch(new URL(path,root), {
      method:'GET',redirect:'manual',cache:'no-store',
      headers:{'Accept': path.endsWith('.json')?'application/json':'text/html'},
      signal:AbortSignal.timeout(12000),
    });
    const ok=(res.status>=200 && res.status<400);
    const ct=res.headers.get('content-type')||'';
    const isProtection=res.status===401||res.status===403;
    console.log(name, path, res.status, ct);
    if(isProtection)console.error('Deployment protection/auth blocked GET: '+path);
    if(!ok || (res.status===200 && !(ct.includes(path.endsWith('.json')?'json':'html'))))failed=true;
  }catch(e){
    failed=true;console.error(name,path,String(e));
  }
}
if(failed)process.exitCode=1;
else console.log('BigCorps Phase 10 read-only public HTTP smoke PASS');
