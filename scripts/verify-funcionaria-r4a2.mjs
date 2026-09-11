#!/usr/bin/env node
import fs from 'node:fs';

const checkout = 'components/VoiceAssistant/modals/SaleModeModal/CheckoutFlow.tsx';
const route = 'app/api/orders/confirm-payment/route.ts';

function text(path) {
  if (!fs.existsSync(path)) throw new Error(`Arquivo ausente: ${path}`);
  return fs.readFileSync(path, 'utf8');
}

const c = text(checkout);
const r = text(route);

const checks = [
  [!c.includes("rpc('confirmar_pedido_pago'"), 'Checkout não chama confirmar_pedido_pago diretamente'],
  [!c.includes("from('cobrancas').select('status')"), 'Checkout não confia em cobrancas.status no browser'],
  [!c.includes("from('mp_orders').update({ pedido_id"), 'Checkout não vincula mp_orders pelo browser'],
  [c.includes("fetch('/api/orders/confirm-payment'"), 'Checkout usa rota server-side'],
  [c.includes("provider: 'infinitepay'"), 'Checkout usa confirmação server-side InfinitePay'],
  [c.includes("provider: 'mp_point'"), 'Checkout usa confirmação server-side MP Point'],
  [r.includes("SUPABASE_SERVICE_ROLE_KEY"), 'Rota usa service role para Edge Functions'],
  [r.includes("confirmar-pagamento-infinitepay"), 'Rota revalida InfinitePay'],
  [r.includes("consultar-order-mp-point"), 'Rota revalida Mercado Pago Point'],
  [r.includes("admin.rpc('confirmar_pedido_pago'"), 'Rota chama RPC interna'],
  [r.includes("payment_amount_mismatch"), 'Rota valida valor do pagamento'],
  [r.includes("mp_order_already_linked"), 'Rota impede relink de MP order'],
];

let failed = 0;
for (const [ok, label] of checks) {
  console.log(`${ok ? '✓' : '✗'} ${label}`);
  if (!ok) failed++;
}

if (failed) {
  console.error(`\nR4A.2 VERIFY: FAIL (${failed})`);
  process.exit(1);
}

console.log(`\nR4A.2 VERIFY: PASS (${checks.length} checks)`);
