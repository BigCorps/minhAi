import { createClient } from '@/lib/supabase-browser';

/**
 * Gera um short link para upload ou download.
 * Usar nos hooks do lado do cliente (browser).
 *
 */
export async function createShortLink(
  type: 'upload' | 'download',
  targetToken: string,
  companyId: string,
  expiresAt: string,
): Promise<string> {
  const supabase = createClient();

  const { data: slug, error } = await supabase.rpc('generate_short_slug');

  if (error || !slug) {
    throw new Error('Erro ao gerar slug: ' + (error?.message ?? 'resposta vazia'));
  }

  const { error: insertError } = await supabase.from('short_links').insert({
    slug,
    type,
    target_token: targetToken,
    company_id: companyId,
    expires_at: expiresAt,
  });

  if (insertError) {
    throw new Error('Erro ao salvar short link: ' + insertError.message);
  }

  return `https://minhai.app/link/${slug}`;
}

/**
 * Versão server-side para Edge Functions Deno.
 * Recebe o supabase client já inicializado com service_role_key.
 */
export async function createShortLinkServer(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  type: 'upload' | 'download',
  targetToken: string,
  companyId: string,
  expiresAt: string,
): Promise<string> {
  const { data: slug, error } = await supabase.rpc('generate_short_slug');

  if (error || !slug) {
    throw new Error('Erro ao gerar slug: ' + (error?.message ?? 'resposta vazia'));
  }

  await supabase.from('short_links').insert({
    slug,
    type,
    target_token: targetToken,
    company_id: companyId,
    expires_at: expiresAt,
  });

  return `https://minhai.app/link/${slug}`;
}
