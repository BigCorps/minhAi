// hooks/useGroqContext.ts
import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { getAllFunctions } from '@/lib/functions-registry';

interface SlugProfileBasic {
  nome: string;
  email?: string | null;
  identificador?: string | null;
}

export function useGroqContext(
  companyId: string,
  profile?: SlugProfileBasic | null
) {
  const groqContextRef    = useRef<string>('');
  const gptContextRef     = useRef<string>('');
  const fallbackMessageRef = useRef<string>(
    'Não tenho informações sobre isso. Entre em contato com a empresa.'
  );

  useEffect(() => {
    if (!companyId) return;

    async function buildContext() {
      const supabase = createClient();

      // Busca tudo em paralelo
      const [
        { data: enabled },
        { data: defaults },
        { data: company },
        { data: produtos },
        { data: faq },
      ] = await Promise.all([
        supabase
          .from('company_function_settings')
          .select('function_key')
          .eq('company_id', companyId)
          .eq('is_enabled', true),
        supabase
          .from('assistant_functions')
          .select('function_key, default_enabled')
          .eq('is_active', true),
        supabase
          .from('companies')
          .select('name, brand_description, business_hours, business_address, groq_fallback_message')
          .eq('id', companyId)
          .single(),
        supabase
          .from('produtos_venda')
          .select('nome, descricao, preco_venda, estoque_atual, controla_estoque, categoria')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .order('display_order')
          .limit(60),
        supabase
          .from('faq_entries')
          .select('question, answer')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .limit(20),
      ]);

      // ── GROQ context (funções habilitadas) ────────────────
      const registryFunctions = getAllFunctions().map(fn => ({
        key: fn.functionKey,
        name: fn.functionName,
        triggers: fn.voiceTriggers.slice(0, 3),
        example: fn.examplePhrases?.[0] ?? '',
      }));

      const enabledKeys = new Set(enabled?.map(r => r.function_key) ?? []);
      defaults?.forEach(r => { if (r.default_enabled) enabledKeys.add(r.function_key); });

      const functionLines = registryFunctions
        .filter(fn => enabledKeys.has(fn.key))
        .map(fn => `- ${fn.name} → diga: "${fn.triggers[0]}" (ex: "${fn.example}")`)
        .join('\n');

      const profileContext = profile
        ? `\nCliente logado: ${profile.nome}${profile.email ? ` (${profile.email})` : ''}${profile.identificador ? `, tel: ${profile.identificador}` : ''}`
        : '';

      groqContextRef.current = functionLines + profileContext;

      // ── GPT context (dados reais da empresa para RAG) ─────
      const produtosTexto = produtos?.map(p => {
        let linha = `- ${p.nome}`;
        if (p.categoria) linha += ` (${p.categoria})`;
        linha += `: R$${p.preco_venda}`;
        if (p.descricao) linha += ` — ${p.descricao}`;
        if (p.controla_estoque && p.estoque_atual === 0) linha += ' [ESGOTADO]';
        return linha;
      }).join('\n') ?? '';

      const faqTexto = faq?.map(f =>
        `P: ${f.question}\nR: ${f.answer}`
      ).join('\n\n') ?? '';

      gptContextRef.current = [
        company?.brand_description
          ? `Sobre a empresa: ${company.brand_description}`
          : '',
        company?.business_hours
          ? `Horário de funcionamento: ${company.business_hours}`
          : '',
        company?.business_address
          ? `Endereço: ${company.business_address}`
          : '',
        produtosTexto
          ? `Produtos disponíveis:\n${produtosTexto}`
          : '',
        faqTexto
          ? `Perguntas frequentes:\n${faqTexto}`
          : '',
      ].filter(Boolean).join('\n\n');

      // ── Fallback message ──────────────────────────────────
      fallbackMessageRef.current =
        company?.groq_fallback_message ??
        'Não tenho informações sobre isso. Entre em contato com a empresa.';

      console.log(
        `✅ GROQ context carregado: ${enabledKeys.size} funções | ${produtos?.length ?? 0} produtos | ${faq?.length ?? 0} FAQs${profile ? ` | Cliente: ${profile.nome}` : ''}`
      );
    }

    buildContext();
  }, [companyId, profile]);

  return { groqContextRef, gptContextRef, fallbackMessageRef };
}
