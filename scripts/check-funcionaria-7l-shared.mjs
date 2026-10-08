import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Structural, side-effect-free guard for BigCorps' shared Next.js repository.
// This does NOT replace tests for the other products; it blocks accidental
// removal of critical entrypoints/schedules when FuncionarIA is changed.
const read = file => readFileSync(resolve(process.cwd(),file),'utf8');
const vercel = JSON.parse(read('vercel.json'));
const routes = new Map([
  ['/api/conviteria/memorias/limpeza','app/api/conviteria/memorias/limpeza/route.ts'],
  ['/api/conviteria/whatsapp/cron','app/api/conviteria/whatsapp/cron/route.ts'],
  ['/api/conviteria/gravata/whatsapp/cron','app/api/conviteria/gravata/whatsapp/cron/route.ts'],
  ['/api/cron/funcionaria-ml-sync','app/api/cron/funcionaria-ml-sync/route.ts'],
]);
assert.ok(Array.isArray(vercel.crons),'Vercel cron list missing');
const seen = new Set();
for(const cron of vercel.crons){
  assert.ok(typeof cron.path==='string'&&typeof cron.schedule==='string'&&cron.schedule.trim(),
    'Vercel cron missing path or schedule');
  assert.ok(!seen.has(cron.path),'duplicate Vercel cron path: '+cron.path);
  seen.add(cron.path);
}
for(const [path,file] of routes) {
  assert.ok(seen.has(path),'Shared Vercel cron missing: '+path);
  const src=read(file);
  assert.match(src,/export async function GET\(/,'cron route must have GET: '+path);
  assert.ok(src.includes('process.env.CRON_SECRET'),'protected cron route: '+path);
  assert.ok(src.includes('authorization'),'cron bearer check missing: '+path);
}
for(const [path,file,marker] of [
  ['/convite','app/convite/page.tsx','BriefingInteligente'],
  ['/pix','app/pix/page.tsx','PLANS'],
]) {
  const src=read(file);
  assert.ok(src.includes('export default function'),'page entrypoint missing: '+path);
  assert.ok(src.includes(marker),'shared product integration absent: '+path);
}
const pix = read('app/pix/page.tsx');
assert.ok(pix.includes('PIX GRÁTIS'),'PixWiki free plan must remain reachable');
const publicPayments=read('app/api/public/payment-capabilities/route.ts');
assert.match(publicPayments,/createAdminClient/,'shared payment capability must use server');
assert.match(publicPayments,/company\.is_active !== true/,'inactive company must be rejected');
assert.match(publicPayments,/mp_point_configured:/,'MP capability must remain present');
assert.match(publicPayments,/infinitepay_configured:/,'InfinitePay capability must remain present');
const mlCron=read('app/api/cron/funcionaria-ml-sync/route.ts');
assert.ok(mlCron.includes("FUNCIONARIA_ML_SYNC_CRON_ENABLED !== 'true'"),
  'FuncionarIA ML sync must remain off by default');
assert.ok(mlCron.includes('process.env.SUPABASE_SECRET_KEY'),
  'FuncionarIA cron must support modern server secret');
const pkg=JSON.parse(read('package.json'));
for(const required of [
  'check:pix-cancel-boundary',
  'check:withdrawal-boundary',
  'check:funcionaria-monthly-direct',
  'check:funcionaria-ml-sync',
  'check:funcionaria-7k',
]){
  assert.ok(pkg.scripts.prebuild.includes('npm run '+required),
    'shared critical prebuild guard missing: '+required);
}
console.log('FuncionarIA 7L: PixWiki + ConviteIA + shared Vercel cron boundaries PASS');
