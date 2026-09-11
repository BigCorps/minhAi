#!/usr/bin/env node
/**
 * minhAi / FuncionarIA — R4A.2.2
 * Base exata: a387cc7352977377b183ec12fedefff6ea86a593
 *
 * Aplicador tolerante a LF/CRLF e pequenas diferenças de formatação.
 * Faz todas as alterações em memória e só grava CheckoutFlow.tsx
 * depois que TODOS os patches e validações passam.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const EXPECTED = 'a387cc7352977377b183ec12fedefff6ea86a593';
const REL = 'components/VoiceAssistant/modals/SaleModeModal/CheckoutFlow.tsx';

function git(cmd, { trim = true } = {}) {
  const output = execSync(`git ${cmd}`, { cwd: ROOT, encoding: 'utf8' });
  return trim ? output.trim() : output;
}

function fullPath(rel) {
  return path.join(ROOT, rel);
}

function read(rel = REL) {
  const p = fullPath(rel);
  if (!fs.existsSync(p)) throw new Error(`Arquivo ausente: ${rel}`);
  return fs.readFileSync(p, 'utf8');
}

function write(rel, value) {
  fs.writeFileSync(fullPath(rel), value, 'utf8');
  console.log(`✓ ${rel}`);
}

function replaceRegex(value, regex, replacement, label) {
  const matches = [...value.matchAll(regex)];
  if (matches.length !== 1) {
    throw new Error(`${label}: esperado 1, encontrado ${matches.length}`);
  }
  return value.replace(regex, replacement);
}

const head = git('rev-parse HEAD');
if (head !== EXPECTED) {
  throw new Error(
    `Commit inesperado.\nEsperado: ${EXPECTED}\nAtual:    ${head}\n` +
    'A R4A.2.2 foi preparada sobre o commit R3C validado.'
  );
}

{
  const allowedDirty = new Set([
    'README-R4A2.md',
    'app/api/orders/confirm-payment/route.ts',
    'scripts/apply-funcionaria-r4a2.mjs',
    'scripts/verify-funcionaria-r4a2.mjs',
    'supabase/migrations-manual/20260911_funcionaria_hardening_phase4a2.sql',
  ]);

  const isAllowedDirty = (rel) =>
    allowedDirty.has(rel) ||
    rel === 'app/api/orders/' ||
    rel.startsWith('app/api/orders/');

  const status = git('status --porcelain', { trim: false });
  const unexpected = status
    ? status.split(/\r?\n/).filter(Boolean)
        .map((line) => line.length >= 4 ? line.slice(3).trim() : '')
        .filter(Boolean)
        .filter((rel) => !isAllowedDirty(rel))
    : [];

  if (unexpected.length) {
    throw new Error(
      'Há alterações locais fora da R4A.2:\n' +
      unexpected.map((rel) => ` - ${rel}`).join('\n')
    );
  }
}

let value = read();

// ---------------------------------------------------------------------------
// 1) Helper server-side.
// Não depende mais do texto de formatTime(), que causou a falha anterior.
// ---------------------------------------------------------------------------
if (!value.includes('async function confirmOrderPayment(input:')) {
  const anchor = 'export default function CheckoutFlow';
  const count = value.split(anchor).length - 1;
  if (count !== 1) {
    throw new Error(`helper confirmOrderPayment / anchor export: esperado 1, encontrado ${count}`);
  }

  const helper = `async function confirmOrderPayment(input: {
  pedidoId: string;
  companyId: string;
  provider: 'infinitepay' | 'mp_point';
  providerId: string;
}) {
  const response = await fetch('/api/orders/confirm-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      pedido_id: input.pedidoId,
      company_id: input.companyId,
      provider: input.provider,
      provider_id: input.providerId,
    }),
  });

  const data = await response.json().catch(() => ({}));
  return { ok: response.ok && data?.success === true, status: response.status, data };
}

`;

  value = value.replace(anchor, helper + anchor);
  console.log('✓ helper confirmOrderPayment');
} else {
  console.log('↷ helper confirmOrderPayment já aplicado');
}

// ---------------------------------------------------------------------------
// 2) Polling NFC / InfinitePay.
// ---------------------------------------------------------------------------
if (value.includes("from('cobrancas').select('status')")) {
  const nfcRegex =
    /          const \{ data: cob \} = await supabase\.from\('cobrancas'\)\.select\('status'\)\.eq\('id', cobrancaId\)\.single\(\);\r?\n          if \(cob\?\.status === 'PAGA'\) \{\r?\n            const \{ data: p \} = await supabase\.from\('pedidos'\)\.select\('status'\)\.eq\('id', pedidoId\)\.single\(\);\r?\n            if \(p\?\.status !== 'pago'\) await supabase\.rpc\('confirmar_pedido_pago', \{ p_pedido_id: pedidoId \}\);\r?\n            clearInterval\(interval\); setPolling\(false\);\r?\n            setTotalConfirmado\(totalFinalRef\.current\);\r?\n            await dispatchDelivery\(pedidoId!\);\r?\n            setStep\('confirmado'\);\r?\n            playText\?\.\('Pagamento confirmado! Obrigado pela sua compra\.'\)\.catch\(\(\) => \{\}\); clear\(\);\r?\n          \}/g;

  value = replaceRegex(
    value,
    nfcRegex,
    `          const confirmed = await confirmOrderPayment({
            pedidoId,
            companyId,
            provider: 'infinitepay',
            providerId: cobrancaId,
          });
          if (confirmed.ok) {
            clearInterval(interval); setPolling(false);
            setTotalConfirmado(totalFinalRef.current);
            await dispatchDelivery(pedidoId!);
            setStep('confirmado');
            playText?.('Pagamento confirmado! Obrigado pela sua compra.').catch(() => {}); clear();
          }`,
    'poll NFC',
  );
  console.log('✓ poll NFC');
} else if (value.includes("provider: 'infinitepay'")) {
  console.log('↷ poll NFC já aplicado');
} else {
  throw new Error('poll NFC: estado não reconhecido');
}

// ---------------------------------------------------------------------------
// 3) Polling TEF / Mercado Pago Point.
// ---------------------------------------------------------------------------
if (value.includes("supabase.functions.invoke('consultar-order-mp-point'")) {
  const tefRegex =
    /const \{ data: od \} = await supabase\.functions\.invoke\('consultar-order-mp-point', \{\r?\n  body: \{ order_id: mpOrderId \},\r?\n\}\);\r?\nif \(od\?\.status === 'paid'\) \{\r?\n            const \{ data: p \} = await supabase\.from\('pedidos'\)\.select\('status'\)\.eq\('id', pedidoId\)\.single\(\);\r?\n            if \(p\?\.status !== 'pago'\) await supabase\.rpc\('confirmar_pedido_pago', \{ p_pedido_id: pedidoId \}\);\r?\n            clearInterval\(interval\); setPolling\(false\);\r?\n            setTotalConfirmado\(totalFinalRef\.current\);\r?\n            await dispatchDelivery\(pedidoId!\);\r?\n            setStep\('confirmado'\);\r?\n            playText\?\.\('Pagamento confirmado! Obrigado pela sua compra\.'\)\.catch\(\(\) => \{\}\); clear\(\);\r?\n          \}/g;

  value = replaceRegex(
    value,
    tefRegex,
    `const confirmed = await confirmOrderPayment({
  pedidoId,
  companyId,
  provider: 'mp_point',
  providerId: mpOrderId,
});
if (confirmed.ok) {
            clearInterval(interval); setPolling(false);
            setTotalConfirmado(totalFinalRef.current);
            await dispatchDelivery(pedidoId!);
            setStep('confirmado');
            playText?.('Pagamento confirmado! Obrigado pela sua compra.').catch(() => {}); clear();
          }`,
    'poll TEF',
  );
  console.log('✓ poll TEF');
} else if (value.includes("provider: 'mp_point'")) {
  console.log('↷ poll TEF já aplicado');
} else {
  throw new Error('poll TEF: estado não reconhecido');
}

// ---------------------------------------------------------------------------
// 4) Confirmação manual de Link InfinitePay.
// Substitui a função inteira para não depender de formatação interna.
// ---------------------------------------------------------------------------
if (value.includes('const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;')) {
  const linkRegex =
    /  \/\/ Confirmação manual do Link InfinitePay\r?\n  async function handleConfirmarLink\(\) \{[\s\S]*?\r?\n  \}\r?\n\r?\n  \/\/ Calcular frete Lalamove/g;

  const replacement = `  // Confirmação manual do Link InfinitePay
  async function handleConfirmarLink() {
    if (!cobrancaId || isConfirmingLink) return;
    setIsConfirmingLink(true);
    setLinkPendingMsg(null);
    try {
      if (!pedidoId) {
        setLinkPendingMsg('Pedido não encontrado para esta cobrança.');
        return;
      }

      const confirmed = await confirmOrderPayment({
        pedidoId,
        companyId,
        provider: 'infinitepay',
        providerId: cobrancaId,
      });

      if (!confirmed.ok) {
        if (confirmed.data?.pending || confirmed.status === 409) {
          setLinkPendingMsg(
            confirmed.data?.error ||
              'Pagamento ainda não identificado. Aguarde o cliente pagar e tente novamente.',
          );
        } else {
          setLinkPendingMsg(confirmed.data?.error || 'Erro ao confirmar. Tente novamente.');
        }
        return;
      }

      setTotalConfirmado(totalFinalRef.current);
      await dispatchDelivery(pedidoId);
      setStep('confirmado');
      playText?.('Pagamento confirmado! Obrigado pela sua compra.').catch(() => {});
      clear();
    } catch {
      setLinkPendingMsg('Erro de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setIsConfirmingLink(false);
    }
  }

  // Calcular frete Lalamove`;

  value = replaceRegex(value, linkRegex, replacement, 'confirm link InfinitePay');
  console.log('✓ confirm link InfinitePay');
} else if (
  value.includes('async function handleConfirmarLink()') &&
  value.includes("providerId: cobrancaId")
) {
  console.log('↷ confirm link InfinitePay já aplicado');
} else {
  throw new Error('confirm link InfinitePay: estado não reconhecido');
}

// ---------------------------------------------------------------------------
// 5) mp_orders.pedido_id não é mais escrito diretamente pelo browser.
// ---------------------------------------------------------------------------
if (value.includes("await supabase.from('mp_orders').update({ pedido_id: pedido.id })")) {
  const mpLinkRegex =
    /  await supabase\.from\('mp_orders'\)\.update\(\{ pedido_id: pedido\.id \}\)\.eq\('id', orderData\.order_id\);\r?\n/g;

  value = replaceRegex(value, mpLinkRegex, '', 'link mp_order client');
  console.log('✓ link mp_order client');
} else {
  console.log('↷ link mp_order client já removido');
}

// ---------------------------------------------------------------------------
// 6) Auditoria em memória ANTES de gravar.
// ---------------------------------------------------------------------------
const forbidden = [
  ["rpc('confirmar_pedido_pago'", 'RPC pública confirmar_pedido_pago'],
  ["from('cobrancas').select('status')", 'leitura client-side de cobrancas.status'],
  ["from('mp_orders').update({ pedido_id", 'vínculo client-side de mp_orders'],
  ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'confirmação InfinitePay com anon key'],
];

const required = [
  ["fetch('/api/orders/confirm-payment'", 'rota server-side'],
  ["provider: 'infinitepay'", 'provider InfinitePay'],
  ["provider: 'mp_point'", 'provider MP Point'],
];

for (const [needle, label] of forbidden) {
  if (value.includes(needle)) {
    throw new Error(`Auditoria final falhou: ainda existe ${label}`);
  }
}

for (const [needle, label] of required) {
  if (!value.includes(needle)) {
    throw new Error(`Auditoria final falhou: ausente ${label}`);
  }
}

// Só grava depois que tudo passou.
write(REL, value);

console.log('\nR4A.2.2 aplicada com sucesso.');
console.log('Agora execute:');
console.log('  node scripts/verify-funcionaria-r4a2.mjs');
console.log('  git -c core.whitespace=cr-at-eol diff --check');
console.log('  npm ci   # somente se ainda aparecer "next: not found"');
console.log('  npm run build');
console.log('  git status');
