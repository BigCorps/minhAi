import 'server-only';

// Uma configuração moderna inválida nunca pode selecionar outra credencial.
export function getSupabaseServerKey(): string {
  const modern = process.env.SUPABASE_SECRET_KEY;
  if (modern !== undefined) {
    if (!/^sb_secret_[A-Za-z0-9_-]+$/.test(modern)) {
      throw new Error('supabase_server_key_unavailable');
    }
    return modern;
  }
  const legacy = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!legacy || /[\s\x00-\x1f\x7f]/.test(legacy)) {
    throw new Error('supabase_server_key_unavailable');
  }
  return legacy;
}
