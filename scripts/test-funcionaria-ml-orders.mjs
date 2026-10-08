import assert from 'node:assert/strict';
import { normalizeMLOrder, uniqueMLOrders } from '../supabase/functions/funcionaria-ml-sync/normalize-order.mjs';

const base = {
  id: 2000003211234567,
  seller: { id: 12345 },
  buyer: { id: 888888, email: 'private@example.com', phone: { number: 'private' } },
  payments: [{ id: 12345, transaction_amount: 50 }],
  shipping: { id: 123, receiver_address: { street_name: 'Private' } },
  status: 'paid',
  currency_id: 'BRL',
  total_amount: 199.995,
  date_closed: '2026-10-07T13:10:00.000-03:00',
  order_items: [
    { item: { id: 'MLB12345678', title: 'Produto A' } },
    { item: { id: 'MLB12345678', title: 'Produto A repetido' } },
    { item: { id: 'MLB99999999', title: 'Produto B' } },
  ],
};
const valid = normalizeMLOrder(base, '12345');
assert.ok(valid);
assert.equal(valid.status, 'paid');
assert.equal(valid.currency, 'BRL');
assert.equal(valid.amount, 200);
assert.equal(valid.listings.length, 2);
assert.equal(valid.date, base.date_closed);
const serialized = JSON.stringify(valid);
for (const forbidden of ['buyer','email','private','payments','shipping','receiver_address','transaction_amount']) {
  assert.ok(!serialized.toLowerCase().includes(forbidden.toLowerCase()), `PII/payment leak: ${forbidden}`);
}

assert.equal(normalizeMLOrder(base, 'WRONG_SELLER'), null);
assert.equal(normalizeMLOrder({ ...base, seller: undefined }, '12345'), null);
assert.equal(normalizeMLOrder({ ...base, status: 'payment_in_process' }, '12345'), null);
assert.equal(normalizeMLOrder({ ...base, status: 'partially_refunded' }, '12345'), null);
assert.equal(normalizeMLOrder({ ...base, status: 'cancelled' }, '12345'), null);
assert.equal(normalizeMLOrder({ ...base, currency_id: 'USD' }, '12345'), null);
assert.equal(normalizeMLOrder({ ...base, total_amount: -1 }, '12345'), null);
assert.equal(normalizeMLOrder({ ...base, total_amount: Infinity }, '12345'), null);
assert.equal(normalizeMLOrder({ ...base, total_amount: 'NaN' }, '12345'), null);
assert.equal(normalizeMLOrder({ ...base, id: 'not-an-order' }, '12345'), null);

const result = uniqueMLOrders([
  base, base, { ...base, id: 2000003211234568, status: 'cancelled' },
  { ...base, id: 2000003211234569, total_amount: 10 },
], '12345');
assert.equal(result.length, 2);
assert.deepEqual(result.map(row => row.id), ['2000003211234567','2000003211234569']);
assert.equal(uniqueMLOrders([{ ...base, seller: { id: 99999 } }], '12345').length, 0);
assert.deepEqual(uniqueMLOrders(undefined, '12345'), []);
assert.deepEqual(normalizeMLOrder({ ...base, date_closed: 'invalid' }, '12345')?.date, null);

console.log('FuncionarIA 7J orders: sanitized paid BRL + seller isolation + deduplication PASS');
