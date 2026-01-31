// app/(dashboard)/page.tsx
import { createClient } from '@/lib/supabase-server';
import HomeClient from './HomeClient';

export default async function DashboardPage() {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null; // Layout vai redirecionar
  }

  // Buscar estatísticas
  const [
    { count: totalCompanies },
    { count: totalConversations },
    { count: totalFAQs }
  ] = await Promise.all([
    supabase.from('companies').select('*', { count: 'exact', head: true }),
    supabase.from('conversations').select('*', { count: 'exact', head: true }),
    supabase.from('faq_entries').select('*', { count: 'exact', head: true })
  ]);

  return (
    <HomeClient
      user={user}
      userId={user.id}
      totalCompanies={totalCompanies || 0}
      totalConversations={totalConversations || 0}
      totalFAQs={totalFAQs || 0}
    />
  );
}