type OpenAICostBucket = {
  start_time?: number;
  results?: Array<{
    amount?: { value?: number; currency?: string };
    line_item?: string | null;
  }>;
};

type OpenAICostResponse = {
  data?: OpenAICostBucket[];
};

type OpenAISpendLimitResponse = {
  threshold_amount?: number | null;
  currency?: string | null;
  interval?: string | null;
  enforcement?: { status?: string | null } | null;
};

export type OpenAIAdminSnapshot = {
  configured: boolean;
  available: boolean;
  costMonthUsdCents: number | null;
  spendLimitUsdCents: number | null;
  remainingUntilLimitUsdCents: number | null;
  enforcementStatus: string | null;
  currency: 'usd';
  daily: Array<{ date: string; costUsdCents: number }>;
  lineItems: Array<{ label: string; costUsdCents: number }>;
  errorCode?: string;
};

function empty(configured: boolean, errorCode?: string): OpenAIAdminSnapshot {
  return {
    configured,
    available: false,
    costMonthUsdCents: null,
    spendLimitUsdCents: null,
    remainingUntilLimitUsdCents: null,
    enforcementStatus: null,
    currency: 'usd',
    daily: [],
    lineItems: [],
    ...(errorCode ? { errorCode } : {}),
  };
}

function saoPauloMonthStartUnix() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
  });
  const parts = Object.fromEntries(formatter.formatToParts(new Date()).map((p) => [p.type, p.value]));
  // São Paulo é UTC-03 em setembro; ao construir por offset explícito não
  // dependemos do timezone do runtime da Vercel.
  return Math.floor(new Date(`${parts.year}-${parts.month}-01T00:00:00-03:00`).getTime() / 1000);
}

async function openAIGet(path: string, key: string, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`https://api.openai.com${path}`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: 'no-store',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function getOpenAIAdminSnapshot(): Promise<OpenAIAdminSnapshot> {
  const key = process.env.OPENAI_ADMIN_KEY?.trim();
  if (!key) return empty(false, 'not_configured');

  try {
    const startTime = saoPauloMonthStartUnix();
    const endTime = Math.floor(Date.now() / 1000);
    const query = new URLSearchParams({
      start_time: String(startTime),
      end_time: String(endTime),
      bucket_width: '1d',
      limit: '60',
    });
    query.append('group_by', 'line_item');

    const [costResponse, limitResponse] = await Promise.all([
      openAIGet(`/v1/organization/costs?${query.toString()}`, key),
      openAIGet('/v1/organization/spend_limit', key),
    ]);

    if (costResponse.status === 401 || costResponse.status === 403 || limitResponse.status === 401 || limitResponse.status === 403) {
      return empty(true, 'admin_key_invalid');
    }
    if (!costResponse.ok) return empty(true, `costs_http_${costResponse.status}`);

    const costs = (await costResponse.json()) as OpenAICostResponse;
    const spend = limitResponse.ok ? ((await limitResponse.json()) as OpenAISpendLimitResponse) : null;

    const dailyMap = new Map<string, number>();
    const lines = new Map<string, number>();
    let totalCents = 0;

    for (const bucket of costs.data ?? []) {
      const date = bucket.start_time ? new Date(bucket.start_time * 1000).toISOString().slice(0, 10) : 'unknown';
      for (const result of bucket.results ?? []) {
        if ((result.amount?.currency ?? 'usd').toLowerCase() !== 'usd') continue;
        const cents = Math.round((Number(result.amount?.value) || 0) * 100);
        totalCents += cents;
        dailyMap.set(date, (dailyMap.get(date) ?? 0) + cents);
        const label = result.line_item?.trim() || 'Outros';
        lines.set(label, (lines.get(label) ?? 0) + cents);
      }
    }

    const spendLimitUsdCents =
      spend && Number.isFinite(Number(spend.threshold_amount))
        ? Math.max(0, Math.round(Number(spend.threshold_amount)))
        : null;

    return {
      configured: true,
      available: true,
      costMonthUsdCents: totalCents,
      spendLimitUsdCents,
      remainingUntilLimitUsdCents:
        spendLimitUsdCents == null ? null : Math.max(0, spendLimitUsdCents - totalCents),
      enforcementStatus: spend?.enforcement?.status ?? null,
      currency: 'usd',
      daily: [...dailyMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, costUsdCents]) => ({ date, costUsdCents })),
      lineItems: [...lines.entries()].sort((a, b) => b[1] - a[1]).map(([label, costUsdCents]) => ({ label, costUsdCents })),
    };
  } catch (error) {
    console.error('[platform-admin] Falha ao consultar custos OpenAI:', error instanceof Error ? error.message : 'unknown');
    return empty(true, error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'unavailable');
  }
}
