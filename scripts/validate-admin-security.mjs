import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];

function fail(message) {
  failures.push(message);
}

function read(relativePath) {
  const absolute = path.join(root, relativePath);
  if (!fs.existsSync(absolute)) {
    fail(`Arquivo obrigatório ausente: ${relativePath}`);
    return '';
  }
  return fs.readFileSync(absolute, 'utf8');
}

const requiredFiles = [
  'app/admin/page.tsx',
  'app/admin/login/page.tsx',
  'app/admin/auth/callback/route.ts',
  'app/admin/usuarios/[userId]/page.tsx',
  'app/api/admin/session/route.ts',
  'app/api/admin/dashboard/route.ts',
  'app/api/admin/users/route.ts',
  'app/api/admin/users/[userId]/route.ts',
  'app/api/platform/activity/route.ts',
  'components/analytics/PlatformActivityTracker.tsx',
  'components/analytics/ClarityInit.tsx',
  'lib/platform-admin.ts',
  'lib/platform-admin-http.ts',
  'lib/platform-products.ts',
  'next.config.js',
];

for (const file of requiredFiles) read(file);

const nextConfig = read('next.config.js');
if (!nextConfig.includes('admin\\\\.minhai\\\\.app')) {
  fail('next.config.js não contém host Admin com pontos escapados.');
}
if (!nextConfig.includes("destination: '/admin/not-found'")) {
  fail('Isolamento de rotas do host Admin não encontrado.');
}
if (!nextConfig.includes("destination: '/admin/robots.txt'")) {
  fail('robots.txt exclusivo do Admin não encontrado.');
}
if (!nextConfig.includes('X-Frame-Options')) {
  fail('Header anti-framing do Admin não encontrado.');
}

const platformAdmin = read('lib/platform-admin.ts');
if (!platformAdmin.includes(".from('platform_admins')")) {
  fail('Autorização por platform_admins não encontrada.');
}
if (!platformAdmin.includes("identity.provider === 'google'")) {
  fail('Validação de identidade Google não encontrada.');
}
if (!platformAdmin.includes('normalizeEmail(user.email) !== allowedEmail')) {
  fail('Validação conjunta user_id + e-mail não encontrada.');
}

const activityRoute = read('app/api/platform/activity/route.ts');
if (!activityRoute.includes('hasAcceptableOrigin')) {
  fail('Validação same-origin da telemetria não encontrada.');
}
if (!activityRoute.includes('MAX_BODY_BYTES')) {
  fail('Limite de corpo da telemetria não encontrado.');
}

const clarity = read('components/analytics/ClarityInit.tsx');
if (!clarity.includes("'admin.minhai.app'")) {
  fail('Admin não está explicitamente excluído do Clarity.');
}

const adminSourceFiles = [
  'app/api/admin/session/route.ts',
  'app/api/admin/dashboard/route.ts',
  'app/api/admin/users/route.ts',
  'app/api/admin/users/[userId]/route.ts',
  'components/admin/AdminDashboard.tsx',
  'components/admin/AdminUsersTable.tsx',
  'components/admin/AdminUserDetail.tsx',
];

const forbiddenRawFields = [
  'dados_entrada',
  'pdf_base64',
  'pdf_externo_base64',
  'access_token',
  'refresh_token',
  'signing_secret',
  'mensagem_panico',
  'storage_path',
  'ocr_json',
];

for (const file of adminSourceFiles) {
  const content = read(file);
  for (const token of forbiddenRawFields) {
    if (content.includes(token)) {
      fail(`Campo sensível "${token}" apareceu em ${file}.`);
    }
  }
}

const clientCandidates = [
  'components/admin/AdminDashboard.tsx',
  'components/admin/AdminUsersTable.tsx',
  'components/admin/AdminUserDetail.tsx',
  'components/analytics/PlatformActivityTracker.tsx',
];

for (const file of clientCandidates) {
  const content = read(file);
  if (!content.includes("'use client'") && !content.includes('"use client"')) {
    continue;
  }
  if (content.includes('SUPABASE_SERVICE_ROLE_KEY')) {
    fail(`Service role apareceu em componente client: ${file}`);
  }
  if (content.includes('createAdminClient')) {
    fail(`createAdminClient apareceu em componente client: ${file}`);
  }
}

if (failures.length) {
  console.error('\nAdmin security validation: FALHOU\n');
  for (const message of failures) {
    console.error(` - ${message}`);
  }
  process.exit(1);
}

console.log('Admin security validation: OK');
