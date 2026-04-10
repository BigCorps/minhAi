// app/dashboard/DashboardContent.tsx
// CLIENT COMPONENT - Usa theme do contexto

'use client';

import { useTheme } from '@/contexts/ThemeContext';
import Link from 'next/link';

interface DashboardContentProps {
  user: any;
  totalCompanies: number;
  totalConversations: number;
  totalFAQs: number;
}

export default function DashboardContent({
  user,
  totalCompanies,
  totalConversations,
  totalFAQs
}: DashboardContentProps) {
  const { theme } = useTheme();
  
  const displayName = user?.user_metadata?.name || user?.email || 'Usuário';

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className={`text-3xl font-bold mb-2 transition-colors ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          Olá, {displayName}! 👋
        </h1>
        <p className={`text-lg transition-colors ${
          theme === 'dark' ? 'text-white/60' : 'text-gray-600'
        }`}>
          Bem-vindo ao seu painel de controle
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Assistentes */}
        <Link href="/dashboard/assistentes">
          <div className={`rounded-xl p-6 border transition cursor-pointer ${
            theme === 'dark'
              ? 'bg-slate-800/50 border-white/10 hover:border-blue-500/50'
              : 'bg-white border-gray-200 hover:border-blue-500'
          }`}>
            <div className="flex items-center space-x-4 mb-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-100'
              }`}>
                <svg className={`w-6 h-6 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Assistentes
                </h3>
                <p className={`text-sm ${theme === 'dark' ? 'text-white/40' : 'text-gray-500'}`}>
                  {totalCompanies} assistentes
                </p>
              </div>
            </div>
            <p className={`text-sm ${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}>
              Gerencie seus assistentes virtuais
            </p>
          </div>
        </Link>

        {/* Histórico */}
        <Link href="/dashboard/historico">
          <div className={`rounded-xl p-6 border transition cursor-pointer ${
            theme === 'dark'
              ? 'bg-slate-800/50 border-white/10 hover:border-cyan-500/50'
              : 'bg-white border-gray-200 hover:border-cyan-500'
          }`}>
            <div className="flex items-center space-x-4 mb-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                theme === 'dark' ? 'bg-cyan-500/20' : 'bg-cyan-100'
              }`}>
                <svg className={`w-6 h-6 ${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Histórico
                </h3>
                <p className={`text-sm ${theme === 'dark' ? 'text-white/40' : 'text-gray-500'}`}>
                  {totalConversations} conversas
                </p>
              </div>
            </div>
            <p className={`text-sm ${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}>
              Visualize conversas anteriores
            </p>
          </div>
        </Link>

        {/* FAQs */}
        <Link href="/dashboard/faqs">
          <div className={`rounded-xl p-6 border transition cursor-pointer ${
            theme === 'dark'
              ? 'bg-slate-800/50 border-white/10 hover:border-purple-500/50'
              : 'bg-white border-gray-200 hover:border-purple-500'
          }`}>
            <div className="flex items-center space-x-4 mb-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                theme === 'dark' ? 'bg-purple-500/20' : 'bg-purple-100'
              }`}>
                <svg className={`w-6 h-6 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  FAQs
                </h3>
                <p className={`text-sm ${theme === 'dark' ? 'text-white/40' : 'text-gray-500'}`}>
                  {totalFAQs} respostas
                </p>
              </div>
            </div>
            <p className={`text-sm ${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}>
              Respostas automáticas
            </p>
          </div>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <Link href="/dashboard/funcoes">
          <div className={`rounded-xl p-6 border transition cursor-pointer ${
            theme === 'dark'
              ? 'bg-slate-800/50 border-white/10 hover:border-white/20'
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}>
            <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              ⚙️ Funções
            </h3>
            <p className={`text-sm ${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}>
              Configure funções do assistente
            </p>
          </div>
        </Link>

        <Link href="/dashboard/saldo">
          <div className={`rounded-xl p-6 border transition cursor-pointer ${
            theme === 'dark'
              ? 'bg-slate-800/50 border-white/10 hover:border-white/20'
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}>
            <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              💰 Saldo
            </h3>
            <p className={`text-sm ${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}>
              PIX recebidos e saques
            </p>
          </div>
        </Link>
      </div>

      {/* New Feature Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Vendas e Produtos */}
        <Link href="/dashboard/vendas">
          <div className={`rounded-xl p-6 border transition cursor-pointer ${
            theme === 'dark'
              ? 'bg-slate-800/50 border-white/10 hover:border-emerald-500/50'
              : 'bg-white border-gray-200 hover:border-emerald-500'
          }`}>
            <div className="flex items-center space-x-3 mb-2">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                theme === 'dark' ? 'bg-emerald-500/20' : 'bg-emerald-100'
              }`}>
                <svg className={`w-5 h-5 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Vendas e Produtos
              </h3>
            </div>
            <p className={`text-sm ${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}>
              Gerencie sua loja virtual e pedidos
            </p>
          </div>
        </Link>

        {/* Controle de Usuários */}
        <Link href="/dashboard/cadastros">
          <div className={`rounded-xl p-6 border transition cursor-pointer ${
            theme === 'dark'
              ? 'bg-slate-800/50 border-white/10 hover:border-orange-500/50'
              : 'bg-white border-gray-200 hover:border-orange-500'
          }`}>
            <div className="flex items-center space-x-3 mb-2">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                theme === 'dark' ? 'bg-orange-500/20' : 'bg-orange-100'
              }`}>
                <svg className={`w-5 h-5 ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Controle de Usuários
              </h3>
            </div>
            <p className={`text-sm ${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}>
              Gerencie perfis e permissões de acesso
            </p>
          </div>
        </Link>

        {/* Serviços Google */}
        <Link href="/dashboard/agenda">
          <div className={`rounded-xl p-6 border transition cursor-pointer ${
            theme === 'dark'
              ? 'bg-slate-800/50 border-white/10 hover:border-blue-500/50'
              : 'bg-white border-gray-200 hover:border-blue-500'
          }`}>
            <div className="flex items-center space-x-3 mb-2">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-100'
              }`}>
                <svg className={`w-5 h-5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Serviços Google
              </h3>
            </div>
            <p className={`text-sm ${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}>
              Integração com Google Agenda e serviços
            </p>
          </div>
        </Link>

        {/* Serviços Meta */}
        <Link href="/dashboard/atendimentos">
          <div className={`rounded-xl p-6 border transition cursor-pointer ${
            theme === 'dark'
              ? 'bg-slate-800/50 border-white/10 hover:border-pink-500/50'
              : 'bg-white border-gray-200 hover:border-pink-500'
          }`}>
            <div className="flex items-center space-x-3 mb-2">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                theme === 'dark' ? 'bg-pink-500/20' : 'bg-pink-100'
              }`}>
                <svg className={`w-5 h-5 ${theme === 'dark' ? 'text-pink-400' : 'text-pink-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </div>
              <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Serviços Meta
              </h3>
            </div>
            <p className={`text-sm ${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}>
              Integração com WhatsApp e Instagram
            </p>
          </div>
        </Link>
      </div>

      {/* CTA */}
      {totalCompanies === 0 && (
        <div className={`rounded-xl p-6 border flex flex-col items-center text-center md:items-start md:text-left ${
          theme === 'dark'
            ? 'bg-blue-500/10 border-blue-500/20'
            : 'bg-blue-50 border-blue-200'
        }`}>
          <h3 className={`font-semibold mb-1 ${theme === 'dark' ? 'text-white' : 'text-blue-900'}`}>
            🚀 Comece Agora
          </h3>
          <p className={`text-sm mb-3 ${theme === 'dark' ? 'text-white/70' : 'text-blue-800'}`}>
            Crie seu primeiro assistente
          </p>
          <Link
            href="/dashboard/assistentes/novo"
            className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm font-semibold"
          >
            + Criar Assistente
          </Link>
        </div>
      )}

      {/* Success */}
      <div className={`rounded-xl p-4 border ${
        theme === 'dark'
          ? 'bg-green-500/10 border-green-500/20'
          : 'bg-green-50 border-green-200'
      }`}>
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className={`font-semibold ${
            theme === 'dark' ? 'text-green-400' : 'text-green-700'
          }`}>
            ✅ Dashboard funcionando com tema {theme === 'dark' ? 'escuro' : 'claro'}!
          </span>
        </div>
      </div>
    </div>
  );
}
