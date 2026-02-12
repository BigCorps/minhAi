// app/dashboard/page.tsx
import { createClient } from '@/lib/supabase-server';
import { CreditsCard } from '@/components/CreditsCard';
import { CreditsProgressChartWrapper } from '@/components/CreditsProgressChartWrapper';
import { WelcomeSection } from '@/components/WelcomeSection';
import { StatsCards } from '@/components/StatsCards';
import { QuickActions } from '@/components/QuickActions';
import { CTASection } from '@/components/CTASection';

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let totalCompanies = 0;
  let totalConversations = 0;
  let totalFAQs = 0;

  // Carregamento de dados com tratamento de erro
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

  const displayName = user?.user_metadata?.name || user?.email || 'Usuário';

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <WelcomeSection displayName={displayName} />

      {/* Credit Card */}
      {user && (
        <CreditsCard userId={user.id} />
      )}

      {/* Credits Progress Chart */}
      {user && (
        <CreditsProgressChartWrapper userId={user.id} />
      )}

      {/* Stats Cards */}
      <StatsCards 
        totalCompanies={totalCompanies}
        totalConversations={totalConversations}
        totalFAQs={totalFAQs}
      />

      {/* Quick Actions */}
      <QuickActions />

      {/* CTA */}
      <CTASection totalCompanies={totalCompanies} />
    </div>
  );
}