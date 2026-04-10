// hooks/useBarcodeProductLookup.ts
import { useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';
import type { ProdutoVenda } from '@/lib/produtos-venda';

export function useBarcodeProductLookup(companyId: string) {
  const supabase = createClient();
  const cache = useRef<Map<string, ProdutoVenda | null>>(new Map());

  const lookup = useCallback(async (ean: string): Promise<ProdutoVenda | null> => {
    const normalized = ean.trim().replace(/\s/g, '');
    if (!normalized) return null;
    if (cache.current.has(normalized)) return cache.current.get(normalized)!;

    const { data, error } = await supabase
      .from('produtos_venda')
      .select(`
        id, company_id, nome, descricao, categoria, imagem_url, ean,
        preco_custo, preco_venda, unidade, estoque_atual, estoque_minimo,
        controla_estoque, is_active, display_order, created_at, updated_at,
        ingrediente_id, ficha_id
      `)
      .eq('company_id', companyId)
      .eq('ean', normalized)
      .eq('is_active', true)
      .maybeSingle();

    const result = error || !data ? null : (data as ProdutoVenda);
    cache.current.set(normalized, result);
    return result;
  }, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearCache = useCallback(() => {
    cache.current.clear();
  }, []);

  return { lookup, clearCache };
}
