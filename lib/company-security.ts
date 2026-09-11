// lib/company-security.ts
// Campos administrativos que nunca devem sair em respostas "safe" da empresa.
// A lista é deliberadamente maior que a R3B: inclui segredos já identificados
// nas fases anteriores, mesmo quando ainda existem telas privadas legadas para eles.

export const COMPANY_SECRET_FIELDS = [
  'mp_access_token',
  'mp_terminal_id',
  'receiving_pix_key',
  'receiving_pix_key_type',
  'wifi_network_password',
  'fullscreen_password',
  'brasilnfe_token',
  'nfe_csc_codigo',
  'printnode_api_key',
  'tuya_access_token',
  'tuya_refresh_token',
] as const;

export function stripCompanySecrets<T extends Record<string, any> | null | undefined>(
  company: T,
): T extends null | undefined ? T : Record<string, any> {
  if (!company) return company as any;

  const safe: Record<string, any> = { ...company };
  for (const field of COMPANY_SECRET_FIELDS) delete safe[field];
  return safe as any;
}
