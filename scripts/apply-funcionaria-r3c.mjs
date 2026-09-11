#!/usr/bin/env node
/**
 * minhAi / FuncionarIA — R3C + R3B recovery
 * Base exata: 740070f5661ee0b9000b7f3b6faa1e815ed9222b
 *
 * Os arquivos pequenos da R3C são entregues completos no ZIP.
 * Este aplicador altera somente arquivos grandes/compartilhados.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const EXPECTED = '740070f5661ee0b9000b7f3b6faa1e815ed9222b';

function git(cmd, { trim = true } = {}) {
  const output = execSync(`git ${cmd}`, { cwd: ROOT, encoding: 'utf8' });
  return trim ? output.trim() : output;
}

function file(rel) {
  return path.join(ROOT, rel);
}

function read(rel) {
  const p = file(rel);
  if (!fs.existsSync(p)) throw new Error(`Arquivo ausente: ${rel}`);
  return fs.readFileSync(p, 'utf8');
}

function write(rel, value) {
  fs.writeFileSync(file(rel), value, 'utf8');
  console.log(`✓ ${rel}`);
}

function eolOf(value) {
  return value.includes('\r\n') ? '\r\n' : '\n';
}

function nl(value, eol) {
  return value.replace(/\n/g, eol);
}

function assertCount(value, needle, expected, label) {
  const count = value.split(needle).length - 1;
  if (count !== expected) {
    throw new Error(`${label}: esperado ${expected}, encontrado ${count}`);
  }
}

function addImportAfter(rel, anchor, newImport) {
  let value = read(rel);
  if (value.includes(newImport)) return;
  const eol = eolOf(value);
  const a = nl(anchor, eol);
  assertCount(value, a, 1, `${rel} / import anchor`);
  value = value.replace(a, a + eol + newImport);
  write(rel, value);
}

function replaceLiteral(rel, from, to, expected = 1) {
  let value = read(rel);
  const eol = eolOf(value);
  const f = nl(from, eol);
  const t = nl(to, eol);
  assertCount(value, f, expected, rel);
  value = value.split(f).join(t);
  write(rel, value);
}

function replaceRegex(rel, regex, replacement, expected = 1) {
  let value = read(rel);
  const matches = [...value.matchAll(regex)];
  if (matches.length !== expected) {
    throw new Error(`${rel}: esperado ${expected} match(es), encontrado ${matches.length}`);
  }
  value = value.replace(regex, nl(replacement, eolOf(value)));
  write(rel, value);
}

const head = git('rev-parse HEAD');
if (head !== EXPECTED) {
  throw new Error(
    `Commit inesperado.\nEsperado: ${EXPECTED}\nAtual:    ${head}\n` +
    'Não apliquei os patches. A R3C foi preparada para o commit que está hoje em produção.'
  );
}

{
  const allowedDirty = new Set([
    'README-R3C.md',
    'app/api/company/private-config/route.ts',
    'app/api/public/fiscal-capabilities/route.ts',
    'components/funcionaria/management/FuncionarIACashierPanel.tsx',
    'lib/company-private-config.ts',
    'lib/company-security.ts',
    'lib/public-company-capabilities.ts',
    'scripts/apply-funcionaria-r3c.mjs',
    'scripts/verify-funcionaria-r3c.mjs',
    'supabase/migrations-manual/20260911_funcionaria_hardening_phase3c.sql',
  ]);

  // Não use trim aqui: no formato porcelain o primeiro espaço faz parte
  // do status XY. Removê-lo desloca o path da primeira linha (app -> pp).
  const status = git('status --porcelain', { trim: false });

  const isAllowedDirty = (rel) =>
    allowedDirty.has(rel) ||
    rel === 'app/api/public/fiscal-capabilities/' ||
    rel.startsWith('app/api/public/fiscal-capabilities/');

  const unexpected = status
    ? status.split(/\r?\n/).filter(Boolean).map((line) => {
        // Formato porcelain v1: "XY path". O caminho começa no índice 3.
        const rel = line.length >= 4 ? line.slice(3).trim() : '';
        return rel;
      }).filter(Boolean).filter((rel) => !isAllowedDirty(rel))
    : [];

  if (unexpected.length) {
    throw new Error(
      'Há alterações locais fora da R3C:\n' +
      unexpected.map((rel) => ` - ${rel}`).join('\n') +
      '\nFaça commit/stash dessas alterações antes de continuar.'
    );
  }
}

// ---------------------------------------------------------------------------
// R3B recovery 1 — Mercado Pago config modal
// ---------------------------------------------------------------------------
addImportAfter(
  'components/dashboard/functions/MpPointConfigModal.tsx',
  `import { createClient } from '@/lib/supabase-browser';`,
  `import { getPrivateCompanyConfig } from '@/lib/company-private-config';`,
);

replaceRegex(
  'components/dashboard/functions/MpPointConfigModal.tsx',
  /const \{ data: company \} = await supabase\s*\r?\n\s*\.from\('companies'\)\s*\r?\n\s*\.select\('mp_access_token, mp_terminal_id'\)\s*\r?\n\s*\.eq\('id', companyId\)\s*\r?\n\s*\.single\(\)/g,
  `const company = await getPrivateCompanyConfig<{
        mp_access_token: string | null;
        mp_terminal_id: string | null;
      }>(companyId, 'payments').catch(() => null)`,
  1,
);

// ---------------------------------------------------------------------------
// R3B recovery 2 — VendasConfigPanel / PIX
// ---------------------------------------------------------------------------
addImportAfter(
  'components/dashboard/functions/VendasConfigPanel.tsx',
  `import { createClient } from '@/lib/supabase-browser';`,
  `import { getPrivateCompanyConfig } from '@/lib/company-private-config';`,
);

{
  const rel = 'components/dashboard/functions/VendasConfigPanel.tsx';
  let value = read(rel);
  const eol = eolOf(value);

  const oldFields = `'system_prompt, assistant_role, greeting_message, wake_word, business_address, business_hours, telefone_fixo, whatsapp_number, email_contato, website, receiving_pix_key, receiving_pix_key_type'`;
  const newFields = `'system_prompt, assistant_role, greeting_message, wake_word, business_address, business_hours, telefone_fixo, whatsapp_number, email_contato, website'`;
  assertCount(value, oldFields, 1, `${rel} / sensitive select`);
  value = value.replace(oldFields, newFields);

  const oldTry = nl(`      try {
        const { data: company } = await supabase.from('companies').select(`, eol);
  const newTry = nl(`      try {
        const privatePayments = await getPrivateCompanyConfig<any>(companyId, 'payments').catch(() => null);
        const { data: company } = await supabase.from('companies').select(`, eol);
  assertCount(value, oldTry, 1, `${rel} / load start`);
  value = value.replace(oldTry, newTry);

  const oldSet = `setReceivingPixKey(company.receiving_pix_key || ''); setReceivingPixKeyType(company.receiving_pix_key_type || '');`;
  const newSet = `setReceivingPixKey(privatePayments?.receiving_pix_key || ''); setReceivingPixKeyType(privatePayments?.receiving_pix_key_type || '');`;
  assertCount(value, oldSet, 1, `${rel} / pix setters`);
  value = value.replace(oldSet, newSet);

  write(rel, value);
}

// ---------------------------------------------------------------------------
// R3B recovery 3 — dashboard Vendas / capacidades de pagamento
// ---------------------------------------------------------------------------
addImportAfter(
  'app/dashboard/vendas/page.tsx',
  `import { createClient } from '@/lib/supabase-browser';`,
  `import { getPrivateCompanyConfig } from '@/lib/company-private-config';`,
);

replaceRegex(
  'app/dashboard/vendas/page.tsx',
  /const \{ data \} = await supabase\s*\r?\n\s*\.from\('companies'\)\s*\r?\n\s*\.select\('receiving_pix_key, infinitepay_handle, mp_access_token, mp_terminal_id, \\\r?\n\s*print_auto_type_purchase, print_auto_type_queue, print_auto_type_payment, print_auto_type'\)\s*\r?\n\s*\.eq\('id', companyId\)\s*\r?\n\s*\.single\(\);\s*\r?\n\s*setConfig\(data \?\? \{\}\);/g,
  `const [{ data }, paymentStatus] = await Promise.all([
        supabase
          .from('companies')
          .select('print_auto_type_purchase, print_auto_type_queue, print_auto_type_payment, print_auto_type')
          .eq('id', companyId)
          .single(),
        getPrivateCompanyConfig<any>(companyId, 'payment-status').catch(() => null),
      ]);
      setConfig({
        ...(data ?? {}),
        receiving_pix_key: paymentStatus?.pix_configured ? '__configured__' : null,
        mp_access_token: paymentStatus?.mp_point_configured ? '__configured__' : null,
        mp_terminal_id: paymentStatus?.mp_point_configured ? '__configured__' : null,
        infinitepay_handle: paymentStatus?.infinitepay_configured ? '__configured__' : null,
      });`,
  1,
);

// ---------------------------------------------------------------------------
// R3B recovery 4 + R3C PrintNode — generic FunctionConfigModal
// ---------------------------------------------------------------------------
addImportAfter(
  'components/dashboard/functions/FunctionConfigModal.tsx',
  `import { createClient } from '@/lib/supabase-browser';`,
  `import { getPrivateCompanyConfig } from '@/lib/company-private-config';`,
);

{
  const rel = 'components/dashboard/functions/FunctionConfigModal.tsx';
  let value = read(rel);
  const eol = eolOf(value);

  const sensitiveSelect = `whatsapp_number, instagram_username, website, facebook, email_contato, linkedin, groq_fallback_message, tiktok, twitter, telefone_fixo, receiving_pix_key, receiving_pix_key_type, system_prompt, orcamento_prompt, brand_description, business_hours, business_address, video_instrucoes_url, sequencia_videos_urls, infinitepay_handle, wifi_network_name, wifi_network_password, cardapio_url, cardapio_description, validar_cupom, qrcode_content, qrcode_label, manual_payment_enabled, print_price_per_page, print_max_pages_per_job, print_color_enabled, print_price_bw, print_price_color, printnode_computer_id, printnode_printer_id_bw, printnode_printer_id_color, thermal_printer_id, thermal_connection_type, youtube_channel_url, youtube_channel_name, youtube_channel_description, print_on_purchase, print_on_queue, print_on_payment, print_auto_type_purchase, print_auto_type_queue, print_auto_type_payment, consultas_payment_method`;
  const safeSelect = `whatsapp_number, instagram_username, website, facebook, email_contato, linkedin, groq_fallback_message, tiktok, twitter, telefone_fixo, system_prompt, orcamento_prompt, brand_description, business_hours, business_address, video_instrucoes_url, sequencia_videos_urls, infinitepay_handle, wifi_network_name, cardapio_url, cardapio_description, validar_cupom, qrcode_content, qrcode_label, manual_payment_enabled, print_price_per_page, print_max_pages_per_job, print_color_enabled, print_price_bw, print_price_color, printnode_computer_id, printnode_printer_id_bw, printnode_printer_id_color, thermal_printer_id, thermal_connection_type, youtube_channel_url, youtube_channel_name, youtube_channel_description, print_on_purchase, print_on_queue, print_on_payment, print_auto_type_purchase, print_auto_type_queue, print_auto_type_payment, consultas_payment_method`;

  assertCount(value, sensitiveSelect, 1, `${rel} / select list`);
  value = value.replace(sensitiveSelect, safeSelect);

  const queryStart = nl(`      const { data, error } = await supabase
        .from('companies')
        .select('whatsapp_number,`, eol);
  const replacementStart = nl(`      const [privatePayments, privateWifi, privatePrintNode] = await Promise.all([
        getPrivateCompanyConfig<any>(companyId, 'payments').catch(() => null),
        getPrivateCompanyConfig<any>(companyId, 'wifi').catch(() => null),
        getPrivateCompanyConfig<any>(companyId, 'printnode').catch(() => null),
      ]);

      const { data, error } = await supabase
        .from('companies')
        .select('whatsapp_number,`, eol);

  assertCount(value, queryStart, 1, `${rel} / company query`);
  value = value.replace(queryStart, replacementStart);

  const regex = /if \(data\) \{\s*\r?\n\s*setSettings\(data\);\s*\r?\n\s*\}/g;
  const matches = [...value.matchAll(regex)];
  if (matches.length !== 1) {
    throw new Error(`${rel}: setSettings(data) esperado 1, encontrado ${matches.length}`);
  }

  value = value.replace(
    regex,
    nl(`if (data) {
        setSettings({
          ...data,
          receiving_pix_key: privatePayments?.receiving_pix_key || '',
          receiving_pix_key_type: privatePayments?.receiving_pix_key_type || '',
          wifi_network_password: privateWifi?.wifi_network_password || '',
          printnode_api_key: privatePrintNode?.printnode_api_key || '',
        });
      }`, eol),
  );

  write(rel, value);
}

// ---------------------------------------------------------------------------
// R3B recovery 5 — Editar Assistente / SELECT *
// ---------------------------------------------------------------------------
addImportAfter(
  'app/dashboard/assistentes/[id]/page.tsx',
  `import { createClient } from '@/lib/supabase-browser';`,
  `import { getPrivateCompanyConfig } from '@/lib/company-private-config';`,
);

replaceLiteral(
  'app/dashboard/assistentes/[id]/page.tsx',
  `      const supabase = createClient();
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        setError('Erro ao carregar assistente');
      } else {
        setAssistant(data);
        setStartupFunctionKey(data.startup_function_key ?? '');
      }`,
  `      const supabase = createClient();
      try {
        const data = await getPrivateCompanyConfig<any>(id, 'safe');
        setAssistant(data);
        setStartupFunctionKey(data.startup_function_key ?? '');
      } catch {
        setError('Erro ao carregar assistente');
      }`,
  1,
);

// ---------------------------------------------------------------------------
// R3B recovery 6 — FAQ / SELECT *
// ---------------------------------------------------------------------------
replaceRegex(
  'app/dashboard/faqs/[id]/page.tsx',
  /\.from\('companies'\)\s*\r?\n\s*\.select\('\*'\)/g,
  `.from('companies')
          .select('id, name, user_id')`,
  1,
);

// ---------------------------------------------------------------------------
// R3B recovery 7 — Assistente privado / SELECT *
// ---------------------------------------------------------------------------
replaceRegex(
  'app/ia/private/[id]/page.tsx',
  /\.from\('companies'\)\s*\r?\n\s*\.select\('\*'\)\s*\r?\n\s*\.or\(`private_slug\.eq\.\$\{id\},id\.eq\.\$\{id\}`\)/g,
  `.from('companies')
    .select('id, user_id, name, wake_word, greeting_message, logo_url, assistant_role, hide_disabled_functions_carousel, carousel_auto_scroll')
    .or(\`private_slug.eq.\${id},id.eq.\${id}\`)`,
  1,
);

// ---------------------------------------------------------------------------
// R3B recovery 8 — página pública /ia não carrega a linha administrativa inteira
// ---------------------------------------------------------------------------
replaceLiteral(
  'app/ia/[slug]/page.tsx',
  `.from('companies')
    .select('*')
    .eq('slug', slug)
    .single();`,
  `.from('companies')
    .select('id, name, slug, assistant_type, webapp_enabled, webapp_home, website, modo_vendas_enabled, modo_fila_enabled, modo_links_enabled, wake_word, greeting_message, logo_url, assistant_role, hide_disabled_functions_carousel, carousel_auto_scroll')
    .eq('slug', slug)
    .single();`,
  1,
);

// ---------------------------------------------------------------------------
// R3C Fiscal dashboard: token/CSC por rota privada; demais campos direto.
// ---------------------------------------------------------------------------
addImportAfter(
  'app/dashboard/fiscal/page.tsx',
  `import { createClient } from '@/lib/supabase-browser';`,
  `import { getPrivateCompanyConfig } from '@/lib/company-private-config';`,
);

{
  const rel = 'app/dashboard/fiscal/page.tsx';
  let value = read(rel);
  const eol = eolOf(value);

  const old = nl(`    const { data } = await supabase
      .from('companies')
      .select(\`
        id, name, assistant_type,
        brasilnfe_token, brasilnfe_ambiente,
        nfe_plano, nfe_ativo, nfe_cert_expiracao,
        nfe_cnpj, nfe_crt, nfe_cnae,
        nfe_ie, nfe_im, nfe_csc_identificador, nfe_csc_codigo
      \`)
      .eq('id', companyId)
      .single();

    if (data) {
      setCompany(data as Company);
      setIsVendas(data.assistant_type === 'vendas');
    }`, eol);

  const replacement = nl(`    const [privateFiscal, { data }] = await Promise.all([
      getPrivateCompanyConfig<any>(companyId, 'fiscal').catch(() => null),
      supabase
        .from('companies')
        .select(\`
          id, name, assistant_type, brasilnfe_ambiente,
          nfe_plano, nfe_ativo, nfe_cert_expiracao,
          nfe_cnpj, nfe_crt, nfe_cnae,
          nfe_ie, nfe_im, nfe_ultimo_rps, nfe_serie_rps
        \`)
        .eq('id', companyId)
        .single(),
    ]);

    if (data) {
      const merged = {
        ...data,
        brasilnfe_token: privateFiscal?.brasilnfe_token ?? null,
        nfe_csc_identificador: privateFiscal?.nfe_csc_identificador ?? null,
        nfe_csc_codigo: privateFiscal?.nfe_csc_codigo ?? null,
      } as Company;
      setCompany(merged);
      setIsVendas(data.assistant_type === 'vendas');
    }`, eol);

  assertCount(value, old, 1, `${rel} / loadCompany`);
  value = value.replace(old, replacement);
  write(rel, value);
}

// ---------------------------------------------------------------------------
// R3C Fiscal voice/public assistant: never read provider token in browser.
// ---------------------------------------------------------------------------
{
  const rel = 'lib/functions-registry.ts';
  let value = read(rel);
  const eol = eolOf(value);

  const oldImport = `import { getPublicPaymentCompanyConfig, getPublicWifiConfig } from './public-company-capabilities';`;
  const newImport = `import { getPublicFiscalCompanyConfig, getPublicPaymentCompanyConfig, getPublicWifiConfig } from './public-company-capabilities';`;
  assertCount(value, oldImport, 1, `${rel} / public capabilities import`);
  value = value.replace(oldImport, newImport);

  const old = nl(`      const supabase = createClient();
      const { data: company } = await supabase
        .from('companies')
        .select('nfe_ativo, brasilnfe_token, nfe_plano')
        .eq('id', companyId)
        .single();

      if (!company?.brasilnfe_token || !company?.nfe_ativo) {`, eol);

  const replacement = nl(`      const company = await getPublicFiscalCompanyConfig(companyId);

      if (!company?.brasilnfe_token || !company?.nfe_ativo) {`, eol);

  assertCount(value, old, 1, `${rel} / fiscal direct secret read`);
  value = value.replace(old, replacement);

  write(rel, value);
}

console.log('\nR3C + recovery aplicada com sucesso.');
console.log('Agora execute:');
console.log('  node scripts/verify-funcionaria-r3c.mjs');
console.log('  git diff --check');
console.log('  npm run build');
console.log('  git status');
