// app/dashboard/empresas/page.tsx (Server Component)
import { createClient, getUser } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import EmpresasClient from './EmpresasClient';

export const revalidate = 0;

export default async function EmpresasPage() {
  const user = await getUser();
  
  // Se não houver usuário, redireciona para login
  if (!user) redirect('/login');

  const supabase = createClient();
  const { data: companies } = await supabase
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false });

  // Agora passamos o 'user' para o Client Component
  return <EmpresasClient companies={companies || []} user={user} />;
}