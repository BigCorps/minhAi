// hooks/useGroqContext.ts — v2: groqContextRef inclui functionKey para execução
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
  const groqContextRef     = useRef<string>('');
  const gptContextRef      = useRef<string>('');
  const fallbackMessageRef = useRef<string>(
    'Não tenho informações sobre isso. Entre em contato com a empresa.'
  );

  useEffect(() => {
    if (!companyId) return;

    async function buildContext() {
      const supabase = createClient();

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
          .select('name, brand_description, business_hours, business_address, groq_fallback_message, whatsapp_number, email_contato, telefone_fixo, website, instagram_username')
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

      // ── Funções habilitadas ───────────────────────────────
      const enabledKeys = new Set(enabled?.map(r => r.function_key) ?? []);
      defaults?.forEach(r => { if (r.default_enabled) enabledKeys.add(r.function_key); });

      const registryFunctions = getAllFunctions();
      const enabledFunctions = registryFunctions.filter(fn => enabledKeys.has(fn.functionKey));

      // ── GROQ context — compacto com functionKey ───────────
      // Formato: "Nome da Função | function_key | quando usar"
      // O Groq precisa do functionKey para poder retorná-lo quando identificar a função
      // ~600 tokens para 100 funções (vs ~5.000 tokens antes)
      const categoryLabels: Record<string, string> = {
        payment:       'Pagamentos',
        contact:       'Contato e redes sociais',
        information:   'Informações',
        knowledge:     'Consultas (CPF, CNPJ, placa)',
        schedule:      'Agenda e agendamentos',
        productivity:  'Produtividade',
        ai_assistant:  'Assistente IA',
        video:         'Vídeo e mídia',
        images:        'Imagens e arquivos',
        codes:         'Códigos QR e barras',
        services:      'Serviços',
        utylities:     'Utilitários',
        biometry:      'Cadastro e fila',
        products:      'Produtos e vendas',
        configuration: 'Configurações',
      };

      // Agrupa por categoria, incluindo functionKey para o Groq poder retornar
      const byCategory = enabledFunctions.reduce<Record<string, Array<{ name: string; key: string; trigger: string }>>>((acc, fn) => {
        const cat = fn.category ?? 'outros';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push({
          name: fn.functionName,
          key: fn.functionKey,
          // Primeiro trigger como dica de quando usar — bem mais curto que antes
          trigger: fn.voiceTriggers[0] ?? '',
        });
        return acc;
      }, {});

      const functionLines = Object.entries(byCategory)
        .map(([cat, fns]) => {
          const label = categoryLabels[cat] ?? cat;
          const fnLines = fns
            .map(f => `  - ${f.name} | ${f.key} | quando: "${f.trigger}"`)
            .join('\n');
          return `${label}:\n${fnLines}`;
        })
        .join('\n\n');

      const profileContext = profile
        ? `\n\nCliente logado: ${profile.nome}`
        : '';

      groqContextRef.current = functionLines + profileContext;

      // ── GPT context — dados reais da empresa ─────────────
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

      const contatos: string[] = [];
      if (company?.whatsapp_number)   contatos.push(`WhatsApp: ${company.whatsapp_number}`);
      if (company?.email_contato)     contatos.push(`Email: ${company.email_contato}`);
      if (company?.telefone_fixo)     contatos.push(`Telefone: ${company.telefone_fixo}`);
      if (company?.website)           contatos.push(`Site: ${company.website}`);
      if (company?.instagram_username) contatos.push(`Instagram: @${company.instagram_username}`);

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
        contatos.length
          ? `Contatos:\n${contatos.map(c => `- ${c}`).join('\n')}`
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
        `✅ Contexto carregado: ${enabledKeys.size} funções | ${produtos?.length ?? 0} produtos | ${faq?.length ?? 0} FAQs${profile ? ` | Cliente: ${profile.nome}` : ''}`
      );
      console.log(
        `📊 groqContext: ~${Math.round(groqContextRef.current.length / 4)} tokens | gptContext: ~${Math.round(gptContextRef.current.length / 4)} tokens`
      );
    }

    buildContext();
  }, [companyId, profile]);

  return { groqContextRef, gptContextRef, fallbackMessageRef };
}
