// app/dashboard/page.tsx (Server Component)
import { createClient, getUser } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const user = await getUser();

  if (!user) {
    redirect('/login');
  }

  const supabase = createClient();

  // Buscar estatísticas
  const { data: companies } = await supabase
    .from('companies')
    .select('id')
    .limit(10);

  const totalCompanies = companies?.length || 0;

  // Buscar ID da primeira empresa do usuário (para o CreditsCard)
  const { data: userCompany } = await supabase
    .from('companies')
    .select('id')
    .limit(1)
    .single();

  const companyId = userCompany?.id || null;

  // Buscar total de conversas
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id')
    .limit(100);

  const totalConversations = conversations?.length || 0;

  // Buscar total de FAQs
  const { data: faqs } = await supabase
    .from('faq_entries')
    .select('id')
    .eq('is_active', true);

  const totalFAQs = faqs?.length || 0;

  return (
    <DashboardClient 
      user={user}
      companyId={companyId}
      totalCompanies={totalCompanies}
      totalConversations={totalConversations}
      totalFAQs={totalFAQs}
    />
  );
}