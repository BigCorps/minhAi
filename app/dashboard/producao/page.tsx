import { createClient, getUser } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import ProducaoClient from './ProducaoClient';
import ProducaoCompanyClient from './ProducaoCompanyClient';

export const dynamic = 'force-dynamic';

export default async function ProducaoPage({
  searchParams,
}: {
  searchParams: { companyId?: string };
}) {
  const user = await getUser();
  if (!user) redirect('/login');

  const supabase = createClient();

  // Se tem companyId, mostra as fichas da empresa
  if (searchParams.companyId) {
    const { data: company } = await supabase
      .from('companies')
      .select('id, name, slug')
      .eq('id', searchParams.companyId)
      .eq('user_id', user.id)
      .single();

    if (!company) redirect('/dashboard/producao');

    const { data: fichas } = await supabase
      .from('producao_fichas')
      .select(`
        id,
        nome,
        descricao,
        rendimento,
        unidade_rendimento,
        preco_venda_sugerido,
        custo_total,
        margem_lucro,
        is_active,
        created_at,
        producao_ingredientes (
          id,
          nome,
          quantidade,
          unidade,
          custo_unitario,
          custo_estimado
        )
      `)
      .eq('company_id', searchParams.companyId)
      .order('created_at', { ascending: false });

    const totalFichas = fichas?.length ?? 0;
    const ativas = fichas?.filter(f => f.is_active).length ?? 0;
    const comCusto = fichas?.filter(f => f.custo_total !== null).length ?? 0;

    return (
      <ProducaoCompanyClient
        company={company}
        fichas={fichas || []}
        stats={{ totalFichas, ativas, comCusto }}
      />
    );
  }

  // Sem companyId, mostra a lista de assistentes
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name, wake_word, slug')
    .eq('user_id', user.id)
    .order('name', { ascending: true });

  return <ProducaoClient companies={companies || []} user={user} />;
}
