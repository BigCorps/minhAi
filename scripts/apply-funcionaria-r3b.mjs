#!/usr/bin/env node
/**
 * minhAi / FuncionarIA — R3B
 *
 * Aplica somente alterações coordenadas para retirar o SELECT global de
 * public.companies do papel authenticated sem quebrar telas administrativas.
 *
 * BASE EXATA esperada:
 * a97ae3a7c93fc55f59a161130098de145c2b6681
 *
 * O script aborta se:
 * - o commit não for o esperado;
 * - um trecho não existir;
 * - houver mais/menos ocorrências do que o previsto.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const EXPECTED = 'a97ae3a7c93fc55f59a161130098de145c2b6681';

function git(cmd) {
  return execSync(`git ${cmd}`, { cwd: ROOT, encoding: 'utf8' }).trim();
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

function withEol(value, eol) {
  return value.replace(/\n/g, eol);
}

function replaceExact(rel, from, to, expected = 1) {
  let value = read(rel);
  const eol = eolOf(value);
  const fromEol = withEol(from, eol);
  const toEol = withEol(to, eol);
  const count = value.split(fromEol).length - 1;
  if (count !== expected) {
    throw new Error(`${rel}: esperado ${expected} ocorrência(s), encontrado ${count}`);
  }
  value = value.split(fromEol).join(toEol);
  write(rel, value);
}

function replaceRegex(rel, regex, replacement, expected = 1) {
  let value = read(rel);
  const matches = [...value.matchAll(regex)];
  if (matches.length !== expected) {
    throw new Error(`${rel}: esperado ${expected} match(es), encontrado ${matches.length}`);
  }
  const eol = eolOf(value);
  value = value.replace(regex, withEol(replacement, eol));
  write(rel, value);
}

const head = git('rev-parse HEAD');
if (head !== EXPECTED) {
  throw new Error(
    `Commit inesperado.\nEsperado: ${EXPECTED}\nAtual:    ${head}\n` +
    'Não apliquei nada. Atualize este pacote antes de continuar.'
  );
}

{
  // Ao extrair o ZIP, alguns arquivos da própria R3B já aparecem como
  // modificados/novos. Permitimos somente esses caminhos; qualquer outra
  // alteração local faz o script abortar.
  const allowedDirty = new Set([
    'README-R3B.md',
    'app/api/assistentes/duplicate/route.ts',
    'app/api/company/private-config/route.ts',
    'app/dashboard/assistentes/page.tsx',
    'lib/company-private-config.ts',
    'lib/company-security.ts',
    'scripts/apply-funcionaria-r3b.mjs',
    'supabase/migrations-manual/20260911_funcionaria_hardening_phase3b.sql',
  ]);

  const status = git('status --porcelain');
  const unexpected = status
    ? status.split(/\r?\n/).filter(Boolean).map((line) => line.slice(3).trim())
        .filter((rel) => !allowedDirty.has(rel))
    : [];

  if (unexpected.length) {
    throw new Error(
      'Há alterações locais fora da R3B:\n' +
      unexpected.map((rel) => ` - ${rel}`).join('\n') +
      '\nFaça commit/stash dessas alterações antes de continuar.'
    );
  }
}

// ---------------------------------------------------------------------------
// 1) FAQ: não usar SELECT * em companies.
// ---------------------------------------------------------------------------
replaceRegex(
  'app/dashboard/faqs/[id]/page.tsx',
  /\.from\('companies'\)\s*\r?\n\s*\.select\('\*'\)/g,
  `.from('companies')
          .select('id, name, user_id')`,
  1,
);

// ---------------------------------------------------------------------------
// 2) Assistente privado: selecionar somente campos realmente usados.
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
// 3) Editor de assistente: carregar a linha "safe" via rota privada.
// ---------------------------------------------------------------------------
{
  const rel = 'app/dashboard/assistentes/[id]/page.tsx';
  let value = read(rel);
  const eol = eolOf(value);

  const importNeedle = `import { createClient } from '@/lib/supabase-browser';`;
  if (!value.includes(`@/lib/company-private-config`)) {
    const count = value.split(importNeedle).length - 1;
    if (count !== 1) throw new Error(`${rel}: import base inesperado`);
    value = value.replace(
      importNeedle,
      importNeedle + eol + `import { getPrivateCompanyConfig } from '@/lib/company-private-config';`,
    );
  }

  const old = withEol(`      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        setError('Erro ao carregar assistente');
      } else {
        setAssistant(data);
        setStartupFunctionKey(data.startup_function_key ?? '');
      }`, eol);

  const replacement = withEol(`      try {
        const data = await getPrivateCompanyConfig<any>(id, 'safe');
        setAssistant(data);
        setStartupFunctionKey(data.startup_function_key ?? '');
      } catch {
        setError('Erro ao carregar assistente');
      }`, eol);

  const count = value.split(old).length - 1;
  if (count !== 1) throw new Error(`${rel}: bloco loadAssistant inesperado (${count})`);
  value = value.replace(old, replacement);
  write(rel, value);
}

// ---------------------------------------------------------------------------
// 4) Mercado Pago: painel privado lê token/terminal pela rota autenticada.
//    Escrita permanece com RLS atual.
// ---------------------------------------------------------------------------
{
  const rel = 'components/dashboard/functions/MpPointConfigModal.tsx';
  let value = read(rel);
  const eol = eolOf(value);

  const importNeedle = `import { createClient } from '@/lib/supabase-browser';`;
  if (!value.includes(`@/lib/company-private-config`)) {
    if ((value.split(importNeedle).length - 1) !== 1) throw new Error(`${rel}: import base inesperado`);
    value = value.replace(
      importNeedle,
      importNeedle + eol + `import { getPrivateCompanyConfig } from '@/lib/company-private-config';`,
    );
  }

  const regex = /const \{ data: company \} = await supabase\s*\r?\n\s*\.from\('companies'\)\s*\r?\n\s*\.select\('mp_access_token, mp_terminal_id'\)\s*\r?\n\s*\.eq\('id', companyId\)\s*\r?\n\s*\.single\(\)/g;
  const matches = [...value.matchAll(regex)];
  if (matches.length !== 1) throw new Error(`${rel}: leitura MP esperada 1, encontrada ${matches.length}`);

  value = value.replace(
    regex,
    withEol(`const company = await getPrivateCompanyConfig<{
        mp_access_token: string | null;
        mp_terminal_id: string | null;
      }>(companyId, 'payments').catch(() => null)`, eol),
  );

  write(rel, value);
}

// ---------------------------------------------------------------------------
// 5) Painel Caixa FuncionarIA: só precisa de capacidades, nunca tokens.
// ---------------------------------------------------------------------------
{
  const rel = 'components/funcionaria/management/FuncionarIACashierPanel.tsx';
  let value = read(rel);
  const eol = eolOf(value);

  const importNeedle = `import { createClient } from '@/lib/supabase-browser';`;
  if (!value.includes(`@/lib/company-private-config`)) {
    if ((value.split(importNeedle).length - 1) !== 1) throw new Error(`${rel}: import base inesperado`);
    value = value.replace(
      importNeedle,
      importNeedle + eol + `import { getPrivateCompanyConfig } from '@/lib/company-private-config';`,
    );
  }

  const old = `const [{data:c},{data:p}]=await Promise.all([supabase.from('companies').select('mp_access_token,mp_terminal_id,infinitepay_handle').eq('id',companyId).maybeSingle(),supabase.from('pix_payment_preferences').select('mode').eq('company_id',companyId).eq('product','funcionaria').maybeSingle()]);if(alive){setInfo({mp:!!c?.mp_access_token&&!!c?.mp_terminal_id,infinite:!!c?.infinitepay_handle,pix:p?.mode||'free'});setLoading(false)}`;
  const replacement = `const [caps,{data:p}]=await Promise.all([getPrivateCompanyConfig<any>(companyId,'payment-status').catch(()=>null),supabase.from('pix_payment_preferences').select('mode').eq('company_id',companyId).eq('product','funcionaria').maybeSingle()]);if(alive){setInfo({mp:!!caps?.mp_point_configured,infinite:!!caps?.infinitepay_configured,pix:p?.mode||'free'});setLoading(false)}`;

  const count = value.split(old).length - 1;
  if (count !== 1) throw new Error(`${rel}: bloco de capacidades inesperado (${count})`);
  value = value.replace(old, replacement);
  write(rel, value);
}

// ---------------------------------------------------------------------------
// 6) VendasConfigPanel: PIX privado é carregado pela rota autenticada.
// ---------------------------------------------------------------------------
{
  const rel = 'components/dashboard/functions/VendasConfigPanel.tsx';
  let value = read(rel);
  const eol = eolOf(value);

  const importNeedle = `import { createClient } from '@/lib/supabase-browser';`;
  if (!value.includes(`@/lib/company-private-config`)) {
    if ((value.split(importNeedle).length - 1) !== 1) throw new Error(`${rel}: import base inesperado`);
    value = value.replace(
      importNeedle,
      importNeedle + eol + `import { getPrivateCompanyConfig } from '@/lib/company-private-config';`,
    );
  }

  const oldFields = `'system_prompt, assistant_role, greeting_message, wake_word, business_address, business_hours, telefone_fixo, whatsapp_number, email_contato, website, receiving_pix_key, receiving_pix_key_type'`;
  const newFields = `'system_prompt, assistant_role, greeting_message, wake_word, business_address, business_hours, telefone_fixo, whatsapp_number, email_contato, website'`;
  if ((value.split(oldFields).length - 1) !== 1) throw new Error(`${rel}: SELECT de empresa inesperado`);
  value = value.replace(oldFields, newFields);

  const tryNeedle = withEol(`      try {
        const { data: company } = await supabase.from('companies').select(`, eol);
  if ((value.split(tryNeedle).length - 1) !== 1) throw new Error(`${rel}: início load inesperado`);
  value = value.replace(
    tryNeedle,
    withEol(`      try {
        const privatePayments = await getPrivateCompanyConfig<any>(companyId, 'payments').catch(() => null);
        const { data: company } = await supabase.from('companies').select(`, eol),
  );

  const oldSet = `setReceivingPixKey(company.receiving_pix_key || ''); setReceivingPixKeyType(company.receiving_pix_key_type || '');`;
  const newSet = `setReceivingPixKey(privatePayments?.receiving_pix_key || ''); setReceivingPixKeyType(privatePayments?.receiving_pix_key_type || '');`;
  if ((value.split(oldSet).length - 1) !== 1) throw new Error(`${rel}: setters PIX inesperados`);
  value = value.replace(oldSet, newSet);

  write(rel, value);
}

// ---------------------------------------------------------------------------
// 7) Dashboard Vendas / Pagamentos: usar apenas status privado.
// ---------------------------------------------------------------------------
{
  const rel = 'app/dashboard/vendas/page.tsx';
  let value = read(rel);
  const eol = eolOf(value);

  const importNeedle = `import { createClient } from '@/lib/supabase-browser';`;
  if (!value.includes(`@/lib/company-private-config`)) {
    if ((value.split(importNeedle).length - 1) !== 1) throw new Error(`${rel}: import base inesperado`);
    value = value.replace(
      importNeedle,
      importNeedle + eol + `import { getPrivateCompanyConfig } from '@/lib/company-private-config';`,
    );
  }

  const regex = /const \{ data \} = await supabase\s*\r?\n\s*\.from\('companies'\)\s*\r?\n\s*\.select\('receiving_pix_key, infinitepay_handle, mp_access_token, mp_terminal_id, \\\r?\n\s*print_auto_type_purchase, print_auto_type_queue, print_auto_type_payment, print_auto_type'\)\s*\r?\n\s*\.eq\('id', companyId\)\s*\r?\n\s*\.single\(\);\s*\r?\n\s*setConfig\(data \?\? \{\}\);/g;

  const matches = [...value.matchAll(regex)];
  if (matches.length !== 1) throw new Error(`${rel}: bloco AbaPagamentos esperado 1, encontrado ${matches.length}`);

  value = value.replace(
    regex,
    withEol(`const [{ data }, paymentStatus] = await Promise.all([
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
      });`, eol),
  );

  write(rel, value);
}

// ---------------------------------------------------------------------------
// 8) FunctionConfigModal: retirar PIX e senha Wi-Fi do SELECT direto.
//    A escrita segue com a RLS já existente; somente a leitura muda.
// ---------------------------------------------------------------------------
{
  const rel = 'components/dashboard/functions/FunctionConfigModal.tsx';
  let value = read(rel);
  const eol = eolOf(value);

  const importNeedle = `import { createClient } from '@/lib/supabase-browser';`;
  if (!value.includes(`@/lib/company-private-config`)) {
    if ((value.split(importNeedle).length - 1) !== 1) throw new Error(`${rel}: import base inesperado`);
    value = value.replace(
      importNeedle,
      importNeedle + eol + `import { getPrivateCompanyConfig } from '@/lib/company-private-config';`,
    );
  }

  const sensitiveSelect = `whatsapp_number, instagram_username, website, facebook, email_contato, linkedin, groq_fallback_message, tiktok, twitter, telefone_fixo, receiving_pix_key, receiving_pix_key_type, system_prompt, orcamento_prompt, brand_description, business_hours, business_address, video_instrucoes_url, sequencia_videos_urls, infinitepay_handle, wifi_network_name, wifi_network_password, cardapio_url, cardapio_description, validar_cupom, qrcode_content, qrcode_label, manual_payment_enabled, print_price_per_page, print_max_pages_per_job, print_color_enabled, print_price_bw, print_price_color, printnode_computer_id, printnode_printer_id_bw, printnode_printer_id_color, thermal_printer_id, thermal_connection_type, youtube_channel_url, youtube_channel_name, youtube_channel_description, print_on_purchase, print_on_queue, print_on_payment, print_auto_type_purchase, print_auto_type_queue, print_auto_type_payment, consultas_payment_method`;
  const safeSelect = `whatsapp_number, instagram_username, website, facebook, email_contato, linkedin, groq_fallback_message, tiktok, twitter, telefone_fixo, system_prompt, orcamento_prompt, brand_description, business_hours, business_address, video_instrucoes_url, sequencia_videos_urls, infinitepay_handle, wifi_network_name, cardapio_url, cardapio_description, validar_cupom, qrcode_content, qrcode_label, manual_payment_enabled, print_price_per_page, print_max_pages_per_job, print_color_enabled, print_price_bw, print_price_color, printnode_computer_id, printnode_printer_id_bw, printnode_printer_id_color, thermal_printer_id, thermal_connection_type, youtube_channel_url, youtube_channel_name, youtube_channel_description, print_on_purchase, print_on_queue, print_on_payment, print_auto_type_purchase, print_auto_type_queue, print_auto_type_payment, consultas_payment_method`;

  if ((value.split(sensitiveSelect).length - 1) !== 1) {
    throw new Error(`${rel}: lista de SELECT administrativo inesperada`);
  }
  value = value.replace(sensitiveSelect, safeSelect);

  const queryStart = withEol(`      const { data, error } = await supabase
        .from('companies')
        .select('whatsapp_number,`, eol);
  if ((value.split(queryStart).length - 1) !== 1) {
    throw new Error(`${rel}: query principal da empresa inesperada`);
  }
  value = value.replace(
    queryStart,
    withEol(`      const [privatePayments, privateWifi] = await Promise.all([
        getPrivateCompanyConfig<any>(companyId, 'payments').catch(() => null),
        getPrivateCompanyConfig<any>(companyId, 'wifi').catch(() => null),
      ]);

      const { data, error } = await supabase
        .from('companies')
        .select('whatsapp_number,`, eol),
  );

  const setSettingsRegex = /if \(data\) \{\s*\r?\n\s*setSettings\(data\);\s*\r?\n\s*\}/g;
  const settingsMatches = [...value.matchAll(setSettingsRegex)];
  if (settingsMatches.length !== 1) {
    throw new Error(`${rel}: setSettings(data) esperado 1, encontrado ${settingsMatches.length}`);
  }
  value = value.replace(
    setSettingsRegex,
    withEol(`if (data) {
        setSettings({
          ...data,
          receiving_pix_key: privatePayments?.receiving_pix_key || '',
          receiving_pix_key_type: privatePayments?.receiving_pix_key_type || '',
          wifi_network_password: privateWifi?.wifi_network_password || '',
        });
      }`, eol),
  );

  write(rel, value);
}

// ---------------------------------------------------------------------------
// 9) Página pública /ia/[slug]: service role continua, mas não há motivo para
//    carregar segredos no objeto server-side.
// ---------------------------------------------------------------------------
replaceExact(
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

console.log('\nR3B aplicada com sucesso.');
console.log('Próximos comandos:');
console.log('  git diff --check');
console.log('  npm run build');
console.log('  git status');
