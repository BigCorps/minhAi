/**
 * Mercado Livre order summary - intentionally excludes buyer, shipping,
 * billing, payment, address and personal identifiers.
 * The caller authenticates the seller using its stored OAuth connection.
 */
export function normalizeMLOrder(raw, expectedSellerId) {
  if (!raw || typeof raw !== 'object') return null;
  if (String(raw.seller?.id ?? '') !== String(expectedSellerId)) return null;
  if (raw.status !== 'paid' || raw.currency_id !== 'BRL') return null;
  const orderId = String(raw.id ?? '').trim();
  if (!/^\d{1,30}$/.test(orderId)) return null;
  const amount = Number(raw.total_amount);
  if (!Number.isFinite(amount) || amount < 0 || amount > 1000000000) return null;

  const items = Array.isArray(raw.order_items) ? raw.order_items.slice(0, 30) : [];
  const listings = [];
  const seen = new Set();
  for (const row of items) {
    const id = String(row?.item?.id ?? '').trim().toUpperCase();
    if (!/^[A-Z]{2,5}\d{5,24}$/.test(id) || seen.has(id)) continue;
    seen.add(id);
    listings.push({
      item_id: id,
      title: String(row?.item?.title ?? '').slice(0, 160),
    });
  }
  const date = String(raw.date_closed || raw.date_created || '');
  const validDate = date && Number.isFinite(Date.parse(date)) ? date.slice(0, 40) : null;

  return {
    id: orderId,
    status: 'paid',
    currency: 'BRL',
    amount: Math.round(amount * 100) / 100,
    date: validDate,
    listings,
  };
}

export function uniqueMLOrders(rows, sellerId) {
  const result = [];
  const seen = new Set();
  for (const raw of Array.isArray(rows) ? rows : []) {
    const normalized = normalizeMLOrder(raw, sellerId);
    if (!normalized || seen.has(normalized.id)) continue;
    seen.add(normalized.id);
    result.push(normalized);
  }
  return result;
}
