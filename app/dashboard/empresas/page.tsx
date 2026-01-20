// app/dashboard/empresas/page.tsx (Server Component)
import { createClient, getUser } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import EmpresasClient from './EmpresasClient';

export const revalidate = 0;

export default async function EmpresasPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  const supabase = createClient();
  const { data: companies } = await supabase
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false });

  return <EmpresasClient companies={companies || []} />;
}
