import "server-only";
import { checked, db } from "./server";
import { isProduct, type Product } from "./catalog";

export const ROLLOUT_STATUSES = ["draft", "pilot", "ready", "active", "paused"] as const;

export async function rolloutSnapshot() {
  const result = await db().from("sdr_product_rollouts").select("*").order("product");
  if (result.error && ["42P01", "PGRST205"].includes(result.error.code)) return { available: false, rows: [] };
  const usage = await db().from("sdr_manual_pilot_opportunities").select("product,opportunity_id");
  const migrationPending = !!usage.error && ["42P01", "PGRST205"].includes(usage.error.code);
  const slots = migrationPending ? [] : checked(usage) || [];
  return { available: true, manualPilotAvailable: !migrationPending, rows: (checked(result) || []).map(r => ({ ...r, manual_pilot_used: slots.filter(s => s.product === r.product).length, manual_pilot_available: !migrationPending })) };
}

function integer(v: unknown, min: number, max: number) {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error("invalid_rollout_number");
  return n;
}

export async function updateProductRollout(productValue: unknown, input: any) {
  if (!isProduct(productValue)) throw new Error("invalid_product");
  const product = productValue as Product;
  const status = String(input.status || "");
  if (!(ROLLOUT_STATUSES as readonly string[]).includes(status)) throw new Error("invalid_rollout_status");
  const autoDiscovery = input.auto_discovery_enabled === true;
  const autoOutreach = input.auto_outreach_enabled === true;
  const liveSend = input.live_send_enabled === true;
  const pilotLimit = integer(input.pilot_limit, 1, 25);
  const dailyCap = integer(input.daily_send_cap, 0, 100);
  return checked(await db().rpc("sdr_set_product_rollout", {
    p_product: product,
    p_status: status,
    p_auto_discovery: autoDiscovery,
    p_auto_outreach: autoOutreach,
    p_live_send: liveSend,
    p_pilot_limit: pilotLimit,
    p_daily_send_cap: dailyCap,
  }));
}

export async function updateManualPilotGate(product: unknown, enabled: unknown) {
  if (!isProduct(product) || typeof enabled !== "boolean") throw new Error("invalid_manual_pilot_gate");
  return checked(await db().rpc("sdr_set_manual_pilot_gate", { p_product: product, p_enabled: enabled }));
}
