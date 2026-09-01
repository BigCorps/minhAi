// ============================================================
// hooks/useFAQs.ts
// Caminho: components/assistant/VoiceAssistant/hooks/useFAQs.ts
// ============================================================

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';

export interface FAQEntry {
  id: string;
  question: string;
  answer: string;
  variations: string[];
  category: string | null;
  is_active: boolean;
  usage_count: number;
  function_key?: string | null;
  function_params?: Record<string, unknown> | null;
}

export function useFAQs(companyId: string) {
  const [faqs, setFaqs] = useState<FAQEntry[]>([]);

  useEffect(() => {
    if (!companyId) return;

    async function fetchFAQs() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('faq_entries')
          .select('*')
          .eq('company_id', companyId)
          .eq('is_active', true);

        if (!error && data) {
          setFaqs(data);
          console.log(`📚 FAQs carregadas: ${data.length} entradas`);
        }
      } catch (err) {
        console.warn('⚠️ Erro ao carregar FAQs:', err);
      }
    }

    fetchFAQs();
  }, [companyId]);

  return faqs;
}
