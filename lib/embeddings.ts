// lib/embeddings.ts
//
// Helper para disparar a geração de embeddings em background (fire-and-forget).
// Nunca bloqueia a UI — erros são silenciosos no cliente, logados no servidor.
//
// Uso:
//   import { triggerEmbeddingUpdate } from '@/lib/embeddings';
//   triggerEmbeddingUpdate('product', companyId, produtoData);
//   triggerEmbeddingUpdate('faq', companyId, faqData);

export function triggerEmbeddingUpdate(
  type: 'product' | 'faq',
  companyId: string,
  data: Record<string, any>,
): void {
  // Validação mínima antes de disparar
  if (!companyId || !data?.id) {
    console.warn('[embeddings] Dados insuficientes para gerar embedding:', { type, companyId, id: data?.id });
    return;
  }

  fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-embeddings`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ type, company_id: companyId, data }),
    },
  ).catch((err) => {
    // Silencioso no cliente — não deve travar nenhum fluxo
    console.error('[embeddings] Erro ao disparar embedding:', err);
  });
}

/**
 * Dispara reindexação bulk para uma empresa inteira.
 * Usar após importações CSV ou importações de ingredientes.
 */
export function triggerBulkEmbeddingSync(companyId: string, force = false): void {
  if (!companyId) return;

  fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sync-embeddings`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ company_id: companyId, force }),
    },
  ).catch((err) => {
    console.error('[embeddings] Erro ao disparar sync bulk:', err);
  });
}
