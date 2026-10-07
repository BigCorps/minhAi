import 'server-only';

// A credencial permanece no servidor, inclusive quando usa o formato moderno.
export function internalServiceHeaders(key: string): Record<string, string> {
  return key.startsWith('sb_secret_')
    ? { apikey: key }
    : { Authorization: `Bearer ${key}`, apikey: key };
}
