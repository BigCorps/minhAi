// app/dashboard/page.tsx
import { createClient } from '@/lib/supabase-server';
import Link from 'next/link';
import { Settings, Wallet } from 'lucide-react';
import { CreditsCard } from '@/components/CreditsCard';
import { CreditsProgressChartWrapper } from '@/components/CreditsProgressChartWrapper';

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let totalCompanies = 0;
  let totalConversations = 0;
  let totalFAQs = 0;

  // Busca IDs das empresas do usuário (usado em múltiplas queries)
  const { data: userCompanies } = await supabase
    .from('companies')
    .select('id')
    .eq('user_id', user.id);
  const companyIds = (userCompanies || []).map(c => c.id);

  try {
    totalCompanies = companyIds.length;
  } catch (e) {
    console.error('Error loading companies:', e);
  }

  try {
    if (companyIds.length > 0) {
      const { count } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .in('company_id', companyIds);
      totalConversations = count || 0;
    }
  } catch (e) {
    console.error('Error loading conversations:', e);
  }

  try {
    if (companyIds.length > 0) {
      const { count } = await supabase
        .from('faq_entries')
        .select('*', { count: 'exact', head: true })
        .in('company_id', companyIds);
      totalFAQs = count || 0;
    }
  } catch (e) {
    console.error('Error loading FAQs:', e);
  }

  const displayName = user?.user_metadata?.name || user?.email || 'Usuário';

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Olá, {displayName}!
          </h1>
          <p className="text-lg text-gray-600 dark:text-white/60">
            Bem-vindo ao seu painel de controle
          </p>
        </div>
      </div>

      {/* Credit Card */}
      {user && (
        <CreditsCard userId={user.id} />
      )}

      {/* Credits Progress Chart - Wrapper que carrega apenas no cliente */}
      {user && (
        <CreditsProgressChartWrapper userId={user.id} />
      )}

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Assistentes */}
        <Link href="/dashboard/assistentes">
          <div className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-white/10 rounded-xl p-6 hover:border-blue-500 dark:hover:border-blue-500/50 transition cursor-pointer h-full">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Assistentes</h3>
                <p className="text-sm text-gray-500 dark:text-white/40">{totalCompanies} assistentes</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-white/60">Gerencie seus assistentes virtuais</p>
          </div>
        </Link>

        {/* Histórico */}
        <Link href="/dashboard/historico">
          <div className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-white/10 rounded-xl p-6 hover:border-cyan-500 dark:hover:border-cyan-500/50 transition cursor-pointer h-full">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 rounded-lg bg-cyan-100 dark:bg-cyan-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Histórico</h3>
                <p className="text-sm text-gray-500 dark:text-white/40">{totalConversations} conversas</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-white/60">Visualize conversas anteriores</p>
          </div>
        </Link>

        {/* FAQs */}
        <Link href="/dashboard/faqs">
          <div className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-white/10 rounded-xl p-6 hover:border-green-500 dark:hover:border-green-500/50 transition cursor-pointer h-full">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">FAQs</h3>
                <p className="text-sm text-gray-500 dark:text-white/40">{totalFAQs} respostas</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-white/60">Respostas automáticas</p>
          </div>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <Link href="/dashboard/functions">
          <div className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-white/10 rounded-xl p-6 hover:border-gray-300 dark:hover:border-white/20 transition cursor-pointer">
            <div className="flex items-center space-x-3 mb-2">
              <Settings className="w-5 h-5 text-gray-600 dark:text-white/70" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Funções</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-white/60">Configure funções do assistente</p>
          </div>
        </Link>

        <Link href="/dashboard/saldo">
          <div className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-white/10 rounded-xl p-6 hover:border-gray-300 dark:hover:border-white/20 transition cursor-pointer">
            <div className="flex items-center space-x-3 mb-2">
              <Wallet className="w-5 h-5 text-gray-600 dark:text-white/70" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Saldo</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-white/60">PIX recebidos e saques</p>
          </div>
        </Link>
      </div>

      {/* CTA */}
      {totalCompanies === 0 && (
        <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 dark:text-white mb-1">🚀 Comece Agora</h3>
          <p className="text-sm text-blue-800 dark:text-white/70 mb-3">Crie seu primeiro assistente</p>
          <Link href="/dashboard/assistentes/novo" className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm font-semibold">
            + Criar Assistente
          </Link>
        </div>
      )}
    </div>
  );
}
