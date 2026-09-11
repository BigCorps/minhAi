// lib/company-private-config.ts
// Cliente para configurações privadas de uma empresa.
// A autorização real acontece server-side em /api/company/private-config.

export type CompanyPrivateScope = 'safe' | 'payments' | 'wifi' | 'payment-status';

export async function getPrivateCompanyConfig<T = Record<string, any>>(
  companyId: string,
  scope: CompanyPrivateScope,
): Promise<T> {
  const response = await fetch(
    `/api/company/private-config?company_id=${encodeURIComponent(companyId)}&scope=${encodeURIComponent(scope)}`,
    {
      cache: 'no-store',
      credentials: 'same-origin',
    },
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String(payload?.error || `private_company_config_${response.status}`));
  }

  return (payload?.config ?? {}) as T;
}
