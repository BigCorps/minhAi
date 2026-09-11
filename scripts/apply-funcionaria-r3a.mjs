import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) throw new Error(`Arquivo não encontrado: ${rel}`);
  return fs.readFileSync(file, 'utf8');
}

function write(rel, content) {
  fs.writeFileSync(path.join(root, rel), content, 'utf8');
  console.log(`✓ ${rel}`);
}

function insertImport(content, anchorRegex, importLine, label) {
  if (content.includes(importLine.trim())) return content;
  let count = 0;
  const next = content.replace(anchorRegex, (match) => {
    count++;
    return `${match}${importLine}`;
  });
  if (count !== 1) throw new Error(`${label}: esperado 1 ponto de import, encontrado ${count}`);
  return next;
}

function replaceCount(content, regex, replacement, expected, label) {
  let count = 0;
  const next = content.replace(regex, (...args) => {
    count++;
    return typeof replacement === 'function' ? replacement(...args) : replacement;
  });
  if (count !== expected) {
    throw new Error(`${label}: esperado ${expected} substituição(ões), encontrado ${count}`);
  }
  return next;
}

// ---------------------------------------------------------------------------
// lib/paymentGatewayEntries.ts
// ---------------------------------------------------------------------------
{
  const rel = 'lib/paymentGatewayEntries.ts';
  let content = read(rel);
  content = insertImport(
    content,
    /import type \{ FunctionDefinition \} from '\.\/functions-registry'[^\r\n]*\r?\n/,
    "import { getPublicPaymentCompanyConfig } from './public-company-capabilities'\n",
    rel,
  );

  content = replaceCount(
    content,
    /\s*const supabase = createClient\(\)\s*\r?\n\s*const \{ data: company \} = await supabase\s*\r?\n\s*\.from\('companies'\)\s*\r?\n\s*\.select\('mp_access_token, mp_terminal_id'\)\s*\r?\n\s*\.eq\('id', companyId\)\s*\r?\n\s*\.single\(\)/g,
    "\n      const company = await getPublicPaymentCompanyConfig(companyId)",
    2,
    `${rel} / Mercado Pago público`,
  );

  if (content.includes(".select('mp_access_token, mp_terminal_id')")) {
    throw new Error(`${rel}: ainda existe leitura direta de credenciais Mercado Pago`);
  }
  write(rel, content);
}

// ---------------------------------------------------------------------------
// lib/functions-registry.ts
// ---------------------------------------------------------------------------
{
  const rel = 'lib/functions-registry.ts';
  let content = read(rel);
  content = insertImport(
    content,
    /import \{ getContextualRoute \} from '@\/lib\/routing-utils';\r?\n/,
    "import { getPublicPaymentCompanyConfig, getPublicWifiConfig } from './public-company-capabilities';\n",
    rel,
  );

  content = replaceCount(
    content,
    /const \{ data: company \} = await supabase\s*\r?\n\s*\.from\('companies'\)\s*\r?\n\s*\.select\('mp_access_token, mp_terminal_id'\)\s*\r?\n\s*\.eq\('id', companyId\)\s*\r?\n\s*\.single\(\);?/g,
    'const company = await getPublicPaymentCompanyConfig(companyId)',
    2,
    `${rel} / TEF`,
  );

  content = replaceCount(
    content,
    /const supabase = createClient\(\);\s*\r?\n\s*const \{ data \} = await supabase\s*\r?\n\s*\.from\('companies'\)\s*\r?\n\s*\.select\('wifi_network_name, wifi_network_password, name'\)\s*\r?\n\s*\.eq\('id', companyId\)\s*\r?\n\s*\.single\(\);?/g,
    'const data = await getPublicWifiConfig(companyId);',
    1,
    `${rel} / Wi-Fi`,
  );

  if (content.includes(".select('mp_access_token, mp_terminal_id')")) {
    throw new Error(`${rel}: ainda existe leitura direta de credenciais Mercado Pago`);
  }
  if (content.includes(".select('wifi_network_name, wifi_network_password, name')")) {
    throw new Error(`${rel}: ainda existe leitura direta da senha Wi-Fi`);
  }
  write(rel, content);
}

// ---------------------------------------------------------------------------
// components/VoiceAssistant/handlers/companyHandlers.ts
// ---------------------------------------------------------------------------
{
  const rel = 'components/VoiceAssistant/handlers/companyHandlers.ts';
  let content = read(rel);
  content = insertImport(
    content,
    /import \{ saveInteractionToHistory \} from '\.\/functionUsage';\r?\n/,
    "import { getPublicWifiConfig } from '@/lib/public-company-capabilities';\n",
    rel,
  );

  content = replaceCount(
    content,
    /const supabase = createClient\(\);\s*\r?\n\s*const \{ data \} = await supabase\s*\r?\n\s*\.from\('companies'\)\s*\r?\n\s*\.select\('wifi_network_name, wifi_network_password, name'\)\s*\r?\n\s*\.eq\('id', companyId\)\s*\r?\n\s*\.single\(\);?/g,
    'const data = await getPublicWifiConfig(companyId);',
    1,
    `${rel} / Wi-Fi`,
  );

  if (content.includes(".select('wifi_network_name, wifi_network_password, name')")) {
    throw new Error(`${rel}: ainda existe leitura direta da senha Wi-Fi`);
  }
  write(rel, content);
}

// ---------------------------------------------------------------------------
// Verificação do arquivo PIX (ele vem completo no ZIP R3A)
// ---------------------------------------------------------------------------
{
  const rel = 'components/VoiceAssistant/functions/payment/pix-generate.ts';
  const content = read(rel);
  if (content.includes(".select('receiving_pix_key, receiving_pix_key_type')")) {
    throw new Error(`${rel}: ZIP não substituiu a versão antiga antes do patch`);
  }
  console.log(`✓ ${rel} (verificado)`);
}

console.log('\nR3A aplicada com sucesso. Rode: git diff --check && git status');
