import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const file = path => resolve(process.cwd(), path);
const read = path => readFileSync(file(path), 'utf8');
const middleware = read('middleware.ts');
const links = read('app/.well-known/assetlinks.json/route.ts');
const vercel = JSON.parse(read('vercel.json'));

const products = [
  { name:'minhAi', page:'app/page.tsx' },
  { name:'Min.IA', page:'app/min/page.tsx', host:'app.min.ia.br' },
  { name:'ConviteIA', page:'app/convite/page.tsx', host:'conviteia.com', manifest:'public/brands/convite/manifest.webmanifest', llms:'public/brands/convite/llms.txt', pkg:'com.conviteia.twa' },
  { name:'PixWiki', page:'app/pix/page.tsx', host:'pix.wiki', manifest:'public/brands/pix/manifest.webmanifest', llms:'public/brands/pix/llms.txt', pkg:'wiki.pix.twa' },
  { name:'ConsultaTec', page:'app/consultatec/page.tsx', host:'consulta.tec.br', manifest:'public/brands/consultatec/manifest.webmanifest', llms:'public/brands/consultatec/llms.txt', pkg:'br.tec.consulta.twa' },
  { name:'MelhorIA', page:'app/melhoria/page.tsx', host:'melhoria.org', manifest:'public/brands/melhoria/manifest.webmanifest', llms:'public/brands/melhoria/llms.txt', pkg:'org.melhoria.twa' },
  { name:'ArteFinal', page:'app/arte/page.tsx', host:'ia.artefinal.app', manifest:'public/brands/artefinal/manifest.webmanifest', llms:'public/brands/artefinal/llms.txt', pkg:'com.artefinal.app', legacyPwa:true },
  { name:'FuncionarIA', page:'app/funcionaria/page.tsx', host:'funcionaria.net', manifest:'public/brands/funcionaria/manifest.webmanifest', llms:'public/brands/funcionaria/llms.txt', pkg:'net.funcionaria.twa' },
];

for(const p of products) {
  assert.ok(existsSync(file(p.page)), p.name+': missing public page');
  assert.match(read(p.page),/export default (?:async )?function/,p.name+': missing default page');
  if(!p.host)continue;
  assert.ok(middleware.includes("'"+p.host+"':"),p.name+': llms host mapping missing');
  if(p.llms) {
    const path=p.llms.replace(/^public/,'');
    assert.ok(middleware.includes("'"+p.host+"':") && middleware.includes("'"+path+"'"), p.name+': branding for llms not mapped');
    assert.ok(existsSync(file(p.llms)),p.name+': llms file missing');
  }
  if(p.manifest) {
    const m=JSON.parse(read(p.manifest));
    assert.equal(m.display,'standalone',p.name+': PWA mode');
    // ArteFinal's existing manifest is 512-only and omits scope: track as
    // baseline gap, rather than treating an unrelated repo QA as a change.
    if(!p.legacyPwa) {
      assert.equal(m.scope,'/',p.name+': PWA scope');
      assert.ok(m.icons?.some(i=>i.sizes==='192x192'),p.name+': missing 192 icon');
    }
    assert.ok(m.icons?.some(i=>i.sizes==='512x512'),p.name+': missing 512 icon');
  }
  if(p.pkg)assert.ok(links.includes("package_name: '"+p.pkg+"'"),p.name+': Android association absent');
}

// Host-specific rewrites must not collapse every brand into the minhAi root.
const expectedRouter = [
  ["if (PIX_DOMAINS.includes(hostname))","url.pathname = pathname === '/' ? '/pix' : `/pix${pathname}`"],
  ["if (MELHORIA_DOMAINS.includes(hostname))","url.pathname = '/brands/melhoria/manifest.webmanifest'"],
  ["if (CONSULTATEC_DOMAINS.includes(hostname))","url.pathname = '/consultatec'"],
  ["if (ARTEFINAL_DOMAINS.includes(hostname))","url.pathname = '/arte'"],
  ["if (FUNCIONARIA_DOMAINS.includes(hostname))","url.pathname = '/funcionaria'"],
  ["if (hostname === 'conviteia.com' || hostname === 'www.conviteia.com')","url.pathname = '/convite'"],
  ["if (isSubdomainHost(hostname))","if (brand === 'funcionaria')"],
];
for(const [branch,marker] of expectedRouter){
  assert.ok(middleware.includes(branch), 'brand host condition missing: '+branch);
  assert.ok(middleware.includes(marker),'brand rewrite missing: '+marker);
}

assert.ok(middleware.includes("suffix: '.conviteia.com'"),'ConviteIA dynamic invitation hosts missing');
assert.ok(middleware.includes("suffix: '.funcionaria.net'"),'FuncionarIA tenant hosts missing');
assert.ok(links.includes("['.conviteia.com', CONVITEIA_ENTRY]"),'ConviteIA tenant Android association missing');
assert.ok(links.includes("['.funcionaria.net', FUNCIONARIA_ENTRY]"),'FuncionarIA tenant Android association missing');
assert.ok(links.includes("'funcionaria.net': FUNCIONARIA_ENTRY"),'FuncionarIA apex Android association missing');

// Multiple revenue products share public payment infrastructure. Validate
// only the contract; never issue a charge, payout, or webhook from this test.
const caps=read('app/api/public/payment-capabilities/route.ts');
assert.ok(caps.includes('createAdminClient'),'shared payment capabilities must remain server-side');
assert.ok(caps.includes('company.is_active !== true'),'inactive company must be blocked');
for(const name of ['mp_point_configured','infinitepay_configured'])assert.ok(caps.includes(name),name+': provider capability lost');

// Keep all scheduled jobs protected; no manual firing or provider side effects.
const expectedCrons=[
  '/api/conviteria/memorias/limpeza',
  '/api/conviteria/whatsapp/cron',
  '/api/conviteria/gravata/whatsapp/cron',
  '/api/cron/funcionaria-ml-sync',
];
const configured=new Map((vercel.crons||[]).map(c=>[c.path,c.schedule]));
assert.equal(configured.size, (vercel.crons||[]).length,'duplicated Vercel cron path');
for(const route of expectedCrons){
  assert.ok(configured.has(route),'missing cron: '+route);
  assert.ok(String(configured.get(route)).trim(),'missing cron schedule: '+route);
}
const ml=read('app/api/cron/funcionaria-ml-sync/route.ts');
assert.ok(ml.includes("FUNCIONARIA_ML_SYNC_CRON_ENABLED !== 'true'"),'ML cron must remain opt-in');
const pix=read('app/pix/page.tsx');
assert.ok(pix.includes('PIX GRÁTIS'),'PixWiki free plan removed');
const convite=read('app/convite/page.tsx');
assert.ok(convite.includes('BriefingInteligente'),'ConviteIA onboarding absent');
const funcReturn=read('app/api/funcionaria/storefront-infinitepay/return/route.ts');
assert.ok(funcReturn.includes('https://${clean}.funcionaria.net/vendas?pagamento=${state}'),'payment return cannot escape tenant storefront');
console.log('BigCorps Phase 10A: 8 shared products + domain/PWA/TWA + payment/cron boundaries PASS');
