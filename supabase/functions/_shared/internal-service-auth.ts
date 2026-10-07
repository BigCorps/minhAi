// Somente credenciais internas configuradas; não valida JWTs de usuários.
export function isInternalServiceRequest(request: Request): boolean {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (legacy && !legacy.startsWith('sb_') && request.headers.get('authorization') === `Bearer ${legacy}`) return true;
  const supplied = request.headers.get('apikey');
  if (!supplied?.startsWith('sb_secret_') || supplied.length <= 'sb_secret_'.length) return false;
  try {
    const configured = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || 'null');
    if (!configured || typeof configured !== 'object' || Array.isArray(configured)) return false;
    return Object.values(configured).some(value => typeof value === 'string'
      && value.startsWith('sb_secret_') && value.length > 'sb_secret_'.length && value === supplied);
  } catch {
    return false;
  }
}
