// lib/short-links.ts
import { createClient } from '@/lib/supabase-browser';

function generateSlug(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function createShortLink(
  originalUrl: string,
  companyId: string,
  userId?: string
): Promise<string> {
  const supabase = createClient();

  // Tenta até 3 vezes em caso de colisão de slug (extremamente raro, mas seguro)
  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = generateSlug();

    const { error } = await supabase.from('short_links').insert({
      slug,
      original_url: originalUrl,
      company_id: companyId,
      user_id: userId ?? null,
    });

    if (!error) {
      return `https://minhai.app/pay/${slug}`;
    }

    // Se foi colisão de slug (unique constraint), tenta de novo
    if (!error.message.includes('unique')) {
      throw new Error(`Erro ao criar link curto: ${error.message}`);
    }
  }

  // Fallback: retorna a URL original se não conseguir criar o link curto
  console.warn('[short-links] Não foi possível criar slug único. Retornando URL original.');
  return originalUrl;
}