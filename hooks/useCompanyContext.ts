// Retorna dois contextos otimizados para cada IA
export function useCompanyContext(companyId: string) {
  const groqContextRef = useRef<string>('');  // curto, para orientar triggers
  const gptContextRef  = useRef<string>('');  // completo, para responder

  useEffect(() => {
    async function build() {
      const supabase = createClient();

      // 1. Info da empresa
      const { data: company } = await supabase
        .from('companies')
        .select('name, brand_description, business_hours, business_address')
        .eq('id', companyId).single();

      // 2. Produtos ativos com opcionais
      const { data: produtos } = await supabase
        .from('produtos_venda')
        .select(`
          nome, descricao, preco_venda, estoque_atual,
          controla_estoque, categoria,
          produto_opcoes_grupos (
            nome, obrigatorio,
            produto_opcoes_itens ( nome, preco_adicional )
          )
        `)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('display_order')
        .limit(60);

      // 3. FAQ
      const { data: faq } = await supabase
        .from('faq_entries')
        .select('question, answer')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .limit(20);

      // 4. Monta groqContext (curto)
      const produtoLines = produtos?.map(p =>
        `- ${p.nome}: R$${p.preco_venda}${p.controla_estoque && p.estoque_atual === 0 ? ' (esgotado)' : ''}`
      ).join('\n') ?? '';

      groqContextRef.current = `
Empresa: ${company?.name}
Horário: ${company?.business_hours ?? 'não informado'}
Produtos: ${produtoLines || 'não cadastrados'}
      `.trim();

      // 5. Monta gptContext (completo)
      const produtosCompleto = produtos?.map(p => {
        let linha = `- ${p.nome} (${p.categoria ?? 'geral'}): R$${p.preco_venda}`;
        if (p.descricao) linha += ` — ${p.descricao}`;
        if (p.controla_estoque && p.estoque_atual === 0) linha += ' [ESGOTADO]';
        if (p.produto_opcoes_grupos?.length) {
          const grupos = p.produto_opcoes_grupos.map((g: any) =>
            `  + ${g.nome}${g.obrigatorio ? ' (obrigatório)' : ''}: ${g.produto_opcoes_itens?.map((i: any) => `${i.nome}${i.preco_adicional > 0 ? ` +R$${i.preco_adicional}` : ''}`).join(', ')}`
          ).join('\n');
          linha += '\n' + grupos;
        }
        return linha;
      }).join('\n') ?? '';

      const faqCompleto = faq?.map(f =>
        `P: ${f.question}\nR: ${f.answer}`
      ).join('\n\n') ?? '';

      gptContextRef.current = `
## Informações da empresa
Nome: ${company?.name}
Descrição: ${company?.brand_description ?? ''}
Horário de funcionamento: ${company?.business_hours ?? 'não informado'}
Endereço: ${company?.business_address ?? 'não informado'}

## Produtos disponíveis
${produtosCompleto || 'Nenhum produto cadastrado'}

## Perguntas frequentes
${faqCompleto || 'Nenhuma FAQ cadastrada'}
      `.trim();

      console.log(`✅ Company context carregado: ${produtos?.length ?? 0} produtos, ${faq?.length ?? 0} FAQs`);
    }

    build();
  }, [companyId]);

  return { groqContextRef, gptContextRef };
}