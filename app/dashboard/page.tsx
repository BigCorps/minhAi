// app/dashboard/page.tsx
// ✅ MUDANÇA: Agora em app/dashboard/ (não mais em app/(dashboard)/)

import { createClient } from '@/lib/supabase-server';
import HomeClient from './HomeClient';

export default async function DashboardPage() {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null; // Middleware vai redirecionar
  }

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
    <HomeClient
      user={user}
      userId={user.id}
      totalCompanies={totalCompanies}
      totalConversations={totalConversations}
      totalFAQs={totalFAQs}
    />
  );
}