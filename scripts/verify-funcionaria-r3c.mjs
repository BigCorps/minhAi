#!/usr/bin/env node
import fs from 'node:fs';

const checks = [];

function read(rel) {
  if (!fs.existsSync(rel)) throw new Error(`Arquivo ausente: ${rel}`);
  return fs.readFileSync(rel, 'utf8');
}

function forbid(rel, pattern, label) {
  const text = read(rel);
  const found = typeof pattern === 'string' ? text.includes(pattern) : pattern.test(text);
  checks.push({ ok: !found, label: `${rel}: ${label}` });
}

function require(rel, pattern, label) {
  const text = read(rel);
  const found = typeof pattern === 'string' ? text.includes(pattern) : pattern.test(text);
  checks.push({ ok: found, label: `${rel}: ${label}` });
}

forbid(
  'components/dashboard/functions/MpPointConfigModal.tsx',
  ".select('mp_access_token, mp_terminal_id')",
  'não pode ler token/terminal MP direto',
);
require(
  'components/dashboard/functions/MpPointConfigModal.tsx',
  "getPrivateCompanyConfig",
  'usa configuração privada',
);

forbid(
  'components/dashboard/functions/VendasConfigPanel.tsx',
  /select\([^)]*receiving_pix_key/i,
  'não pode selecionar chave PIX direta',
);
require(
  'components/dashboard/functions/VendasConfigPanel.tsx',
  "'payments'",
  'carrega PIX pela rota privada',
);

forbid(
  'components/funcionaria/management/FuncionarIACashierPanel.tsx',
  /from\('companies'\).*mp_access_token/s,
  'caixa não lê token MP direto',
);

forbid(
  'app/dashboard/assistentes/[id]/page.tsx',
  /\.from\('companies'\)\s*\.select\('\*'\)/s,
  'editar assistente não usa SELECT *',
);
require(
  'app/dashboard/assistentes/[id]/page.tsx',
  "getPrivateCompanyConfig",
  'editar assistente usa rota privada safe',
);

forbid(
  'app/dashboard/faqs/[id]/page.tsx',
  /\.from\('companies'\)\s*\.select\('\*'\)/s,
  'FAQ não usa SELECT * em companies',
);

forbid(
  'app/ia/private/[id]/page.tsx',
  /\.from\('companies'\)\s*\.select\('\*'\)/s,
  'assistente privado não usa SELECT *',
);

forbid(
  'app/ia/[slug]/page.tsx',
  /\.from\('companies'\)\s*\.select\('\*'\)/s,
  'assistente público não carrega linha administrativa inteira',
);

forbid(
  'app/dashboard/fiscal/page.tsx',
  /select\([\s\S]{0,350}brasilnfe_token/,
  'dashboard fiscal não seleciona token Brasil NFE direto',
);
forbid(
  'app/dashboard/fiscal/page.tsx',
  /select\([\s\S]{0,350}nfe_csc_codigo/,
  'dashboard fiscal não seleciona CSC direto',
);
require(
  'app/dashboard/fiscal/page.tsx',
  "'fiscal'",
  'dashboard fiscal usa rota privada',
);

forbid(
  'lib/functions-registry.ts',
  ".select('nfe_ativo, brasilnfe_token, nfe_plano')",
  'registry não lê token fiscal no browser',
);
require(
  'lib/functions-registry.ts',
  'getPublicFiscalCompanyConfig',
  'registry usa capacidade fiscal pública segura',
);

require(
  'components/dashboard/functions/FunctionConfigModal.tsx',
  "'printnode'",
  'PrintNode carrega API key via rota privada',
);
forbid(
  'components/dashboard/functions/FunctionConfigModal.tsx',
  /select\([^)]*wifi_network_password/i,
  'modal genérico não seleciona senha Wi-Fi direta',
);
forbid(
  'components/dashboard/functions/FunctionConfigModal.tsx',
  /select\([^)]*receiving_pix_key/i,
  'modal genérico não seleciona chave PIX direta',
);

require(
  'app/api/company/private-config/route.ts',
  "scope === 'printnode'",
  'rota privada possui escopo PrintNode',
);
require(
  'app/api/company/private-config/route.ts',
  "scope === 'fiscal'",
  'rota privada possui escopo Fiscal',
);

const failed = checks.filter((c) => !c.ok);
for (const c of checks) {
  console.log(`${c.ok ? '✓' : '✗'} ${c.label}`);
}

if (failed.length) {
  console.error(`\nR3C VERIFY: FAIL (${failed.length})`);
  process.exit(1);
}

console.log(`\nR3C VERIFY: PASS (${checks.length} checks)`);
