#!/usr/bin/env node
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const errors = [];
function text(file) { return fs.existsSync(file) ? fs.readFileSync(file,'utf8') : ''; }
function expect(v,msg){ if(!v) errors.push(msg); }

const auto = text('supabase/functions/auto-confirmar-pix/index.ts');
expect(auto.includes("CRON_SECRET_KEY_NAME = 'cron_automations'"), 'cron secret name ausente');
expect(auto.includes('function isAuthorizedCronRequest'), 'cron auth helper ausente');
expect(auto.includes('if (!isAuthorizedCronRequest(req))'), 'cron auth enforcement ausente');
expect(auto.includes("origem === 'funcionaria_storefront_commission'"), 'branch storefront perdida');

const pay = text('supabase/functions/funcionaria-storefront-payments/index.ts');
expect(pay.includes("company?.delivery_auto_dispatch !== true"), 'delivery_auto_dispatch não respeitado');
expect(pay.includes("skipped: 'auto_dispatch_disabled'"), 'resultado de skip ausente');
expect(pay.includes('funcionaria_settle_storefront_commission'), 'settlement perdido');

try {
  execFileSync('git',['diff','--check'],{stdio:'pipe'});
} catch { errors.push('git diff --check falhou'); }

const status = execFileSync(
  'git',['status','--porcelain','--untracked-files=all'],{encoding:'utf8'}
).split('\n').filter(Boolean);
for (const line of status) {
  const p = line.slice(3).trim();
  if (p.startsWith('.phase7f1-hotfix-package/')) continue;
  if (p === 'funcionaria-phase7f1-edge-hotfix.zip') continue;
  if (![
    'supabase/functions/auto-confirmar-pix/index.ts',
    'supabase/functions/funcionaria-storefront-payments/index.ts'
  ].includes(p)) errors.push(`arquivo fora do escopo: ${p}`);
}

if (errors.length) {
  console.error('PHASE 7F.1 EDGE HOTFIX VERIFY: FAIL');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log('PHASE 7F.1 EDGE HOTFIX VERIFY: PASS');
console.log('Cron auth: preservado');
console.log('Storefront branch: preservado');
console.log('Lalamove auto dispatch: respeita configuração');
console.log('git diff --check: PASS');
