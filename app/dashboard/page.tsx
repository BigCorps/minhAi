// app/dashboard/page.tsx
// SERVER-SIDE - Busca dados e passa para client component

import { createClient } from '@/lib/supabase-server';
import DashboardContent from './DashboardContent';

export default async function DashboardPage() {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  // Buscar estatísticas
  let totalCompanies = 0;
  let totalConversations = 0;
  let totalFAQs = 0;

  try {
    const { count: companies } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true });
    totalCompanies = companies || 0;
  } catch (e) {
    console.error('Erro ao buscar companies:', e);
  }

  try {
    const { count: conversations } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true });
    totalConversations = conversations || 0;
  } catch (e) {
    console.error('Erro ao buscar conversations:', e);
  }

  try {
    const { count: faqs } = await supabase
      .from('faq_entries')
      .select('*', { count: 'exact', head: true });
    totalFAQs = faqs || 0;
  } catch (e) {
    console.error('Erro ao buscar FAQs:', e);
  }

  return (
    <DashboardContent
      user={user}
      totalCompanies={totalCompanies}
      totalConversations={totalConversations}
      totalFAQs={totalFAQs}
    />
  );
}