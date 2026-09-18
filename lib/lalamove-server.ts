import 'server-only';

export async function invokeLalamoveDelivery(body: Record<string, unknown>) {
  const base = String(process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
  const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '');

  if (!base || !serviceKey) {
    return { ok: false, status: 500, data: { success: false, error: 'server_not_configured' } };
  }

  try {
    const response = await fetch(`${base}/functions/v1/lalamove-delivery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, data };
  } catch (error: any) {
    return {
      ok: false,
      status: 502,
      data: { success: false, error: error?.message || 'lalamove_edge_unreachable' },
    };
  }
}
