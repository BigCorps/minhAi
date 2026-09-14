type RegisterPublicFunctionUsageInput = {
  companyId: string;
  functionKey: string;
  source?: string;
};

type RegisterPublicFunctionUsageResult = {
  ok: boolean;
  error: string | null;
};

/**
 * Registra uma execução de função em contexto público/compartilhado.
 *
 * IMPORTANTE:
 * - nenhum custo é enviado pelo browser;
 * - o endpoint resolve catálogo, habilitação e custo no servidor;
 * - empresas privadas só são aceitas quando a sessão atual é owner/manager;
 * - chamadas anônimas passam por rate limit persistente + local.
 */
export async function registerPublicFunctionUsage(
  input: RegisterPublicFunctionUsageInput,
): Promise<RegisterPublicFunctionUsageResult> {
  try {
    const response = await fetch('/api/function-usage/register-public', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        company_id: input.companyId,
        function_key: input.functionKey,
        source: input.source ?? 'public_assistant',
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
