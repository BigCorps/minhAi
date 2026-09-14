type RegisterAuthenticatedFunctionUsageInput = {
  companyId: string;
  functionKey: string;
  fallbackCredits: number;
  metadata?: Record<string, unknown> | null;
};

type RegisterAuthenticatedFunctionUsageResult = {
  ok: boolean;
  error: string | null;
};

export async function registerAuthenticatedFunctionUsage(
  input: RegisterAuthenticatedFunctionUsageInput,
): Promise<RegisterAuthenticatedFunctionUsageResult> {
  try {
    const response = await fetch('/api/function-usage/register-authenticated', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        company_id: input.companyId,
        function_key: input.functionKey,
        fallback_credits: input.fallbackCredits,
        metadata: input.metadata ?? null,
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        ok: false,
        error: String(payload?.error || `http_${response.status}`),
      };
    }

    return { ok: true, error: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'request_failed',
    };
  }
}
