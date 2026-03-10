import { createClient, getUser } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import ProducaoCompanyClient from './ProducaoCompanyClient';

export const dynamic = 'force-dynamic';

export default async function ProducaoCompanyPage({
  params,
}: {
  params: { companyId: string };
}) {
  const user = await getUser();
  if (!user) redirect('/login');

  const supabase = createClient();

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, slug')
    .eq('id', params.companyId)
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
    .eq('company_id', params.companyId)
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
