// app/dashboard/faqs/page.tsx (Server Component)
import { createClient, getUser } from '@/lib/supabase-browser';
import { redirect } from 'next/navigation';
import FAQsClient from './FAQsClient';

// Força renderização dinâmica para resolver erro de cookies
export const dynamic = 'force-dynamic';

export default async function FAQsPage() {
  const user = await getUser();
  
  if (!user) {
    redirect('/login');
  }

  const supabase = createClient();

  // Buscar empresas do usuário
  const { data: companies } = await supabase
    .from('companies')
    .select('*')
    .eq('user_id', user.id)
    .order('name', { ascending: true });

  return <FAQsClient companies={companies || []} user={user} />;
}