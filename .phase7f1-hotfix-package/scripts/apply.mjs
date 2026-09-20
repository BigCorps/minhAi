#!/usr/bin/env node
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const EXPECTED_HEAD = '11ba2d61cacc2baeedb7af3ab3b6911463cebfcd';

function fail(message) {
  console.error(`PHASE 7F.1 EDGE HOTFIX: FAIL\n- ${message}`);
  process.exit(1);
}
function read(file) {
  if (!fs.existsSync(file)) fail(`arquivo não encontrado: ${file}`);
  return fs.readFileSync(file, 'utf8');
}
function write(file, content) { fs.writeFileSync(file, content); }
function replaceOnce(file, before, after, label) {
  let s = read(file);
  const i = s.indexOf(before);
  if (i < 0) fail(`${label}: âncora não encontrada em ${file}`);
  if (s.indexOf(before, i + before.length) >= 0) fail(`${label}: âncora duplicada em ${file}`);
  write(file, s.replace(before, after));
}

const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding:'utf8' }).trim();
if (head !== EXPECTED_HEAD) {
  fail(`base divergente. esperado ${EXPECTED_HEAD.slice(0,8)}, atual ${head.slice(0,8)}`);
}

const status = execFileSync(
  'git',
  ['status','--porcelain','--untracked-files=all'],
  { encoding:'utf8' },
).split('\n').filter(Boolean);

const foreign = status.filter(line => {
  const p = line.slice(3).trim();
  return !p.startsWith('.phase7f1-hotfix-package/') &&
         p !== 'funcionaria-phase7f1-edge-hotfix.zip';
});
if (foreign.length) fail(`working tree não está limpa: ${foreign.join(' | ')}`);

// 1) auto-confirmar-pix: preservar o mesmo guard de cron já ativo em produção.
replaceOnce(
  'supabase/functions/auto-confirmar-pix/index.ts',
  `const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const corsHeaders = {`,
  `const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const CRON_SECRET_KEY_NAME = 'cron_automations'

const corsHeaders = {`,
  'cron secret constant',
);

replaceOnce(
  'supabase/functions/auto-confirmar-pix/index.ts',
  `async function callFunction(name: string, body: unknown) {`,
  `function isAuthorizedCronRequest(req: Request): boolean {
  const receivedKey = req.headers.get('apikey')
  const rawSecretKeys = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (!receivedKey || !rawSecretKeys) return false
  try {
    const secretKeys = JSON.parse(rawSecretKeys) as Record<string, string>
    const expectedKey = secretKeys[CRON_SECRET_KEY_NAME]
    return typeof expectedKey === 'string' && expectedKey.length > 0 && receivedKey === expectedKey
  } catch {
    return false
  }
}

async function callFunction(name: string, body: unknown) {`,
  'cron auth helper',
);

replaceOnce(
  'supabase/functions/auto-confirmar-pix/index.ts',
  `Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)`,
  `Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  if (!isAuthorizedCronRequest(req)) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: corsHeaders,
    })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)`,
  'cron auth enforcement',
);

// 2) storefront payment: só autodespacha Lalamove quando configuração permitir.
replaceOnce(
  'supabase/functions/funcionaria-storefront-payments/index.ts',
  `async function dispatchIfNeeded(supabase: any, pedido: any) {
  if (pedido?.delivery_requested !== true) return null`,
  `async function dispatchIfNeeded(supabase: any, pedido: any, company: any) {
  if (pedido?.delivery_requested !== true) return null
  if (company?.delivery_auto_dispatch !== true) {
    return { ok: true, skipped: 'auto_dispatch_disabled' }
  }`,
  'respect delivery_auto_dispatch',
);

replaceOnce(
  'supabase/functions/funcionaria-storefront-payments/index.ts',
  `  const dispatch = await dispatchIfNeeded(supabase, loaded.pedido)`,
  `  const dispatch = await dispatchIfNeeded(supabase, loaded.pedido, loaded.company)`,
  'pass company to dispatch guard',
);

console.log('PHASE 7F.1 EDGE HOTFIX: PASS');
console.log('- auto-confirmar-pix preserva autenticação cron de produção');
console.log('- storefront payment respeita delivery_auto_dispatch');
console.log('- nenhuma migration adicional necessária');
