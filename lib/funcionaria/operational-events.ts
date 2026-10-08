/**
 * Event contract for financial operations. Emits strictly allowlisted metadata.
 * NEVER include payment tokens, request bodies, company/client IDs, Pix codes,
 * provider responses or raw exceptions in operational logs.
 */
export type FuncionariaOperationalEvent =
  | 'payment_edge_configuration_missing'
  | 'payment_edge_transport_failed'
  | 'payment_edge_upstream_unavailable'
  | 'order_checkout_preparation_failed'
  | 'order_entitlement_failed'
  | 'order_creation_failed'
  | 'order_items_failed';

type Action = 'create_pix' | 'create_card' | 'status' | 'other';
type Fields = { action?: string; status?: number; elapsedMs?: number };

export function logFuncionariaOperationalError(
  event: FuncionariaOperationalEvent,
  fields: Fields = {},
) {
  const action: Action =
    fields.action === 'create_pix' || fields.action === 'create_card' || fields.action === 'status'
      ? fields.action
      : 'other';
  const status =
    typeof fields.status === 'number' &&
    Number.isInteger(fields.status) &&
    fields.status >= 400 &&
    fields.status <= 599
      ? fields.status
      : null;
  const elapsedMs =
    typeof fields.elapsedMs === 'number' && Number.isFinite(fields.elapsedMs)
      ? Math.min(120000, Math.max(0, Math.round(fields.elapsedMs)))
      : null;

  // Static keys and primitive allowlisted fields only.
  console.error(JSON.stringify({
    area: 'funcionaria',
    category: 'financial_operation',
    severity: 'error',
    event,
    action,
    http_status: status,
    elapsed_ms: elapsedMs,
  }));
}
