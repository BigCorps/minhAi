import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { AdminFinanceSnapshot } from "@/types/platform-admin-business";
export async function monitoriaSnapshot() {
  const url = process.env.MONITORIA_SUPABASE_URL,
    key = process.env.MONITORIA_SUPABASE_SECRET_KEY;
  if (!url || !key)
    return { available: false, error: "not_configured", data: null };
  try {
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (url, init) =>
          fetch(url, {
            ...init,
            signal: AbortSignal.timeout(8000),
            cache: "no-store",
          }),
      },
    });
    const { data, error } = await client.rpc("bigcorps_admin_snapshot");
    if (error || !data || !Array.isArray(data.products))
      throw new Error("snapshot_unavailable");
    return { available: true, error: null, data };
  } catch {
    return { available: false, error: "snapshot_unavailable", data: null };
  }
}
export async function includeMonitoria(snapshot: AdminFinanceSnapshot) {
  const external = await monitoriaSnapshot();
  const result = {
    ...snapshot,
    external: {
      monitoria: {
        available: external.available,
        error: external.error,
        generatedAt: external.data?.generatedAt || null,
      },
    },
  };
  if (!external.available) return result;
  const rows = external.data.products;
  const sum = (key: string) =>
    rows.reduce(
      (s: number, r: Record<string, number>) => s + Number(r[key] || 0),
      0,
    );
  result.products = [...snapshot.products, ...rows];
  result.summary = { ...snapshot.summary };
  for (const key of [
    "revenueMonthCents",
    "revenueTodayCents",
    "revenue30dCents",
    "mrrCents",
  ] as const)
    result.summary[key] += sum(key);
  result.summary.paidPaymentsMonth += sum("paymentsMonth");
  // Cross-project user IDs cannot be deduplicated: retain original customer metric.
  result.summary.avgTicketCents = result.summary.paidPaymentsMonth
    ? Math.round(
        result.summary.revenueMonthCents / result.summary.paidPaymentsMonth,
      )
    : 0;
  result.daily = snapshot.daily.map((d) => {
    const extra = external.data.daily.find((x: any) => x.date === d.date);
    return extra
      ? {
          ...d,
          revenueCents: d.revenueCents + Number(extra.revenueCents),
          payments: d.payments + Number(extra.payments),
        }
      : d;
  });
  result.recentPayments = [
    ...snapshot.recentPayments,
    ...external.data.recentPayments,
  ]
    .sort((a, b) => b.paidAt.localeCompare(a.paidAt))
    .slice(0, 50);
  return result;
}
