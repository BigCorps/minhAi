// app/dashboard/page.tsx
import { createClient } from '@/lib/supabase-server';
import Link from 'next/link';
import { Settings, Wallet, ShoppingCart, UserPlus, Bot, HelpCircle } from 'lucide-react';
import { CreditsOrVendasCard } from '@/components/CreditsOrVendasCard';
import { WebAppButton } from '@/components/WebAppButton';
import { CreditsProgressChartWrapper } from '@/components/CreditsProgressChartWrapper';
import SetupBanner from '@/components/dashboard/SetupBanner';
import { PushNotificationSetup } from '@/components/dashboard/PushNotificationSetup';
import { NotificationBanner } from '@/components/dashboard/NotificationBanner';
import ModoToggle from '@/components/dashboard/ModoToggle';
import LinkNaBioContextWrapper from '@/components/dashboard/LinkNaBioContextWrapper';

function BotIA({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="96 96 320 320"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="256" cy="256" r="145" stroke="currentColor" strokeWidth="18" />
      <circle cx="256" cy="256" r="122" stroke="currentColor" strokeWidth="18" />
      <ellipse cx="218" cy="230" rx="18" ry="24" fill="currentColor" />
      <ellipse cx="294" cy="230" rx="18" ry="24" fill="currentColor" />
      <path
        d="M216 296C237 314 275 314 296 296"
        stroke="currentColor"
        strokeWidth="16"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function MetaIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M6.2 7.8C7.9 7.8 9.5 9.8 12 13.2C14.5 9.8 16.1 7.8 17.8 7.8C19.6 7.8 21 9.6 21 12C21 14.4 19.6 16.2 17.8 16.2C16.1 16.2 14.5 14.2 12 10.8C9.5 14.2 7.9 16.2 6.2 16.2C4.4 16.2 3 14.4 3 12C3 9.6 4.4 7.8 6.2 7.8Z"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let totalCompanies = 0;
  let totalConversations = 0;
  let totalFAQs = 0;

  const { data: userCompanies } = await supabase
    .from('companies')
    .select('id')
    .eq('user_id', user.id);
  const companyIds = (userCompanies || []).map(c => c.id);

  try { totalCompanies = companyIds.length; } catch (e) { console.error(e); }

  try {
    if (companyIds.length > 0) {
      const { count } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .in('company_id', companyIds);
      totalConversations = count || 0;
    }
  } catch (e) { console.error(e); }

  try {
    if (companyIds.length > 0) {
      const { count } = await supabase
        .from('faq_entries')
        .select('*', { count: 'exact', head: true })
        .in('company_id', companyIds);
      totalFAQs = count || 0;
    }
  } catch (e) { console.error(e); }

  const displayName = user?.user_metadata?.name || user?.email || 'Usuário';

  return (
    <div className="space-y-8">

      {/* Welcome */}
      <div className="flex flex-col items-center md:flex-row md:items-start justify-between gap-4">
        <div className="text-center md:text-left">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Olá, {displayName}!
          </h1>
          <p className="text-lg text-gray-600 dark:text-white/60">
            Bem-vindo ao seu painel de controle.
          </p>
          <p className="text-lg text-gray-600 dark:text-white/60">
            Navegue pelo menu à direita ou seu perfil à esquerda.
          </p>
        </div>

        <div className="flex flex-col gap-2 flex-shrink-0 min-w-[260px]">
          <WebAppButton
            userId={user.id}
            className="bg-[#ADFF2F] hover:bg-[#96e028] text-black border-none"
          />
          <LinkNaBioContextWrapper />
        </div>
      </div>

      {user && <NotificationBanner userId={user.id} />}

      {/* Credit Card */}
      {user && <CreditsOrVendasCard userId={user.id} />}

      {/* Banner — entre créditos e gráfico */}
      <SetupBanner />

      {/* Banner de notificações */}
      {user && <PushNotificationSetup userId={user.id} />}

      {/* Credits Progress Chart */}
      {user && <CreditsProgressChartWrapper userId={user.id} />}

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-6">

        {/* Assistentes — azul */}
        <Link href="/dashboard/assistentes">
          <div className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-white/10 rounded-xl p-6 hover:border-blue-500 dark:hover:border-blue-500/50 transition cursor-pointer h-full">
            <div className="flex flex-col items-center text-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                <BotIA className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Assistentes</h3>
                <p className="text-sm text-gray-500 dark:text-white/40">{totalCompanies} assistentes</p>
              </div>
            </div>
            <p className="text-sm text-center text-gray-600 dark:text-white/60">Gerencie seus assistentes minhAi</p>
          </div>
        </Link>

        {/* Histórico — verde */}
        <Link href="/dashboard/historico">
          <div className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-white/10 rounded-xl p-6 hover:border-green-500 dark:hover:border-green-500/50 transition cursor-pointer h-full">
            <div className="flex flex-col items-center text-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Histórico</h3>
                <p className="text-sm text-gray-500 dark:text-white/40">{totalConversations} interações</p>
              </div>
            </div>
            <p className="text-sm text-center text-gray-600 dark:text-white/60">Visualize interações anteriores</p>
          </div>
        </Link>

        {/* Respostas Rápidas — azul */}
        <Link href="/dashboard/faqs">
          <div className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-white/10 rounded-xl p-6 hover:border-blue-500 dark:hover:border-blue-500/50 transition cursor-pointer h-full">
            <div className="flex flex-col items-center text-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                <HelpCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Respostas Rápidas</h3>
                <p className="text-sm text-gray-500 dark:text-white/40">{totalFAQs} respostas</p>
              </div>
            </div>
            <p className="text-sm text-center text-gray-600 dark:text-white/60">Configure respostas a perguntas automaticamente</p>
          </div>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">

        {/* Funções — verde */}
        <Link href="/dashboard/functions">
          <div className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-white/10 rounded-xl p-6 hover:border-green-500 dark:hover:border-green-500/50 transition cursor-pointer">
            <div className="flex flex-col items-center text-center gap-2 mb-2">
              <Bot className="w-5 h-5 text-green-600 dark:text-green-400" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Funções</h3>
            </div>
            <p className="text-sm text-center text-gray-600 dark:text-white/60">Configure e habilite funções</p>
          </div>
        </Link>

        {/* Saldo — azul */}
        <Link href="/dashboard/saldo">
          <div className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-white/10 rounded-xl p-6 hover:border-blue-500 dark:hover:border-blue-500/50 transition cursor-pointer">
            <div className="flex flex-col items-center text-center gap-2 mb-2">
              <Wallet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Recebimentos</h3>
            </div>
            <p className="text-sm text-center text-gray-600 dark:text-white/60">Pix, pagamentos e saques</p>
          </div>
        </Link>
      </div>

      {/* New Feature Cards */}
      <div className="grid md:grid-cols-2 gap-6">

        {/* Vendas — verde */}
        <Link href="/dashboard/vendas">
          <div className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-white/10 rounded-xl p-6 hover:border-green-500 dark:hover:border-green-500/50 transition cursor-pointer">
            <div className="flex flex-col items-center text-center gap-2 mb-2">
              <ShoppingCart className="w-5 h-5 text-green-600 dark:text-green-400" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Vendas e Produtos</h3>
            </div>
            <p className="text-sm text-center text-gray-600 dark:text-white/60">Gerencie sueus produtos e pedidos</p>
          </div>
        </Link>

        {/* Controle de Usuários — azul */}
        <Link href="/dashboard/cadastros">
          <div className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-white/10 rounded-xl p-6 hover:border-blue-500 dark:hover:border-blue-500/50 transition cursor-pointer">
            <div className="flex flex-col items-center text-center gap-2 mb-2">
              <UserPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Controle de Usuários</h3>
            </div>
            <p className="text-sm text-center text-gray-600 dark:text-white/60">Gerencie perfis e permissões de acesso</p>
          </div>
        </Link>

        {/* Serviços Google — verde */}
        <Link href="/dashboard/agenda">
          <div className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-white/10 rounded-xl p-6 hover:border-green-500 dark:hover:border-green-500/50 transition cursor-pointer">
            <div className="flex flex-col items-center text-center gap-2 mb-2">
              <GoogleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Serviços Google</h3>
            </div>
            <p className="text-sm text-center text-gray-600 dark:text-white/60">Integração com Agenda, Gmail, Drive e outros</p>
          </div>
        </Link>

        {/* Serviços Meta — azul */}
        <Link href="/dashboard/atendimentos">
          <div className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-white/10 rounded-xl p-6 hover:border-blue-500 dark:hover:border-blue-500/50 transition cursor-pointer">
            <div className="flex flex-col items-center text-center gap-2 mb-2">
              <MetaIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Serviços Meta</h3>
            </div>
            <p className="text-sm text-center text-gray-600 dark:text-white/60">Integração com WhatsApp, Instagram e Facebook</p>
          </div>
        </Link>
      </div>

      {/* CTA para quem não tem assistente */}
      {totalCompanies === 0 && (
        <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-6 flex flex-col items-center text-center">
          <h3 className="font-semibold text-blue-900 dark:text-white mb-1">Comece Agora</h3>
          <p className="text-sm text-blue-800 dark:text-white/70 mb-3">Crie seu primeiro assistente</p>
          <Link
            href="/dashboard/assistentes/create"
            className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm font-semibold"
          >
            + Criar Assistente
          </Link>
        </div>
      )}
    </div>
  );
}