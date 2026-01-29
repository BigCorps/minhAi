// app/(dashboard)/page.tsx
import { createClient } from '@/lib/supabase-server';
import { getUser } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import HomeClient from './HomeClient';

export default async function HomePage() {
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
    <HomeClient 
      user={user}
      userId={user.id}
      totalCompanies={totalCompanies}
      totalConversations={totalConversations}
      totalFAQs={totalFAQs}
    />
  );
}
