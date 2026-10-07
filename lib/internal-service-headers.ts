import 'server-only';
import { getSupabaseServerKey } from './supabase-server-key';

// A credencial permanece no servidor, inclusive quando usa o formato moderno.
export function internalServiceHeaders(key: string = getSupabaseServerKey()): Record<string, string> {
  return key.startsWith('sb_secret_')
    ? { apikey: key }
    : { Authorization: `Bearer ${key}`, apikey: key };
}
