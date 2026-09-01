import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import ClientePage from './cliente-page';

interface ClientePageWrapperProps {
  params: Promise<{ slug: string }>;
}

export default async function ClientePageWrapper({ params }: ClientePageWrapperProps) {
  const { slug } = await params;
  const supabase = createClient();

  // Buscar dados da empresa
  const { data: company, error } = await supabase
    .from('companies')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !company) {
    redirect('/');
  }

  return <ClientePage company={company} />;
}
