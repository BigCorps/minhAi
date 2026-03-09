// app/dashboard/arquivos/[companyId]/page.tsx
import { createClient, getUser } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import ArquivosCompanyClient from './ArquivosCompanyClient';

export const dynamic = 'force-dynamic';

export default async function ArquivosCompanyPage({
  params,
}: {
  params: { companyId: string };
}) {
  const user = await getUser();
  if (!user) redirect('/login');

  const supabase = createClient();

  // Verificar acesso
  const { data: company } = await supabase
    .from('companies')
    .select('id, name, slug')
    .eq('id', params.companyId)
    .eq('user_id', user.id)
    .single();

  if (!company) redirect('/dashboard/arquivos');

  // Buscar cupons com resgates
  const { data: cupons } = await supabase
    .from('cupons')
    .select(`
      id,
      code,
      type,
      discount_type,
      discount_value,
      times_used,
      max_uses,
      is_active,
      expires_at,
      created_at,
      metadata
    `)
    .eq('company_id', params.companyId)
    .order('created_at', { ascending: false });

  // Estatísticas
  const totalCupons = cupons?.length ?? 0;
  const ativos = cupons?.filter(c => c.is_active && (!c.expires_at || new Date(c.expires_at) > new Date())).length ?? 0;
  const totalResgates = cupons?.reduce((sum, c) => sum + (c.times_used || 0), 0) ?? 0;

  return (
    <ArquivosCompanyClient
      company={company}
      cupons={cupons || []}
      stats={{ totalCupons, ativos, totalResgates }}
    />
  );
}