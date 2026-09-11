import { createAdminClient } from '@/lib/supabase-admin';
import { redirect } from 'next/navigation';
import ClientePage from './cliente-page';

interface ClientePageWrapperProps {
  params: Promise<{ slug: string }>;
}

export default async function ClientePageWrapper({ params }: ClientePageWrapperProps) {
  const { slug } = await params;
  const supabase = createAdminClient();

  // Esta rota é pública no navegador, mas a leitura acontece no servidor.
  // Nunca repassar a linha inteira de `companies` para o Client Component.
  const { data: company, error } = await supabase
    .from('companies')
    .select(`
      id,
      slug,
      name,
      logo_url,
      assistant_role,
      webapp_enabled,
      webapp_home,
      website,
      modo_vendas_enabled,
      modo_fila_enabled,
      modo_links_enabled
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !company) {
    redirect('/');
  }

  return <ClientePage company={company} />;
}
