import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const sales=readFileSync('components/funcionaria/public/FuncionarIAPublicSales.tsx','utf8');
const payment=readFileSync('components/funcionaria/public/FuncionarIAStorefrontPaymentPanel.tsx','utf8');
const delivery=readFileSync('app/api/delivery/quote/route.ts','utf8');
const order=readFileSync('app/api/funcionaria/public-order/route.ts','utf8');

assert.ok(sales.includes('const cartQuantity = useMemo('),'cart quantity must count units');
assert.ok(sales.includes('id="funcionaria-public-order"'),'order anchor missing');
assert.ok(sales.includes('scrollIntoView({ behavior: \'smooth\''),'mobile cart navigation missing');
assert.ok(sales.includes('lg:hidden'),'mobile-only order shortcut missing');
assert.ok(sales.includes('env(safe-area-inset-bottom)'),'mobile safe area missing');
assert.ok(sales.includes('min-h-12'),'mobile cart shortcut touch target too small');
assert.ok(sales.includes('Ver pedido · {cartQuantity}'),'mobile cart summary missing');
assert.ok(sales.includes("deliveryMode === 'delivery' && deliveryQuote?.customer_pays"),'delivery total contract missing');
assert.ok(sales.includes("if (!deliveryQuote) { setError('Calcule o frete"),'delivery quote gate missing');
assert.ok(sales.includes("phone.length !== 10 && phone.length !== 11"),'delivery phone validation missing');

assert.ok(payment.includes("action:'create_pix'|'create_card'|'status'"),'payment actions changed');
assert.ok(payment.includes("url.startsWith('https://checkout.bigcorps.com.br/')"),'card checkout allowlist missing');
assert.ok(payment.includes("if(data?.status==='paid')"),'paid state handling missing');
assert.ok(delivery.includes("if (items.length)"),'public delivery quote item verification missing');
assert.ok(order.includes('public_order_idempotency_key'),'public order idempotency missing');
assert.ok(order.includes("delivery_quote_mismatch"),'delivery quote binding missing');

console.log('FuncionarIA 9B: mobile cart + delivery + checkout UX contracts PASS');
