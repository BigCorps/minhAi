// app/dashboard/page.tsx
// PAGE SIMPLES - SERVER SIDE

import { createClient } from '@/lib/supabase-server';
import DashboardView from './DashboardView';

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let totalCompanies = 0;
  let totalConversations = 0;
  let totalFAQs = 0;

  try {
    const { count } = await supabase.from('companies').select('*', { count: 'exact', head: true });
    totalCompanies = count || 0;
  } catch (e) {
    console.error('Error loading companies:', e);
  }

  try {
    const { count } = await supabase.from('conversations').select('*', { count: 'exact', head: true });
    totalConversations = count || 0;
  } catch (e) {
    console.error('Error loading conversations:', e);
  }

  try {
    const { count } = await supabase.from('faq_entries').select('*', { count: 'exact', head: true });
    totalFAQs = count || 0;
  } catch (e) {
    console.error('Error loading FAQs:', e);
  }

  return (
    <DashboardView
      user={user}
      totalCompanies={totalCompanies}
      totalConversations={totalConversations}
      totalFAQs={totalFAQs}
    />
  );
}