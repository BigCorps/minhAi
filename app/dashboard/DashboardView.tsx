// app/dashboard/DashboardView.tsx
'use client';

import Link from 'next/link';
import { DashboardHeader } from '@/components/layout/DashboardHeader';

interface DashboardViewProps {
  user: any;
  totalCompanies: number;
  totalConversations: number;
  totalFAQs: number;
}

export default function DashboardView({
  user,
  totalCompanies,
  totalConversations,
  totalFAQs
}: DashboardViewProps) {
  
  const displayName = user?.user_metadata?.name || user?.email || 'Usuário';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      
      {/* Header Unificado (Importado de components/layout) */}
      <DashboardHeader user={user} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Olá, {displayName}! 👋
            </h1>
            <p className="text-lg text-white/60">
              Bem-vindo ao seu painel de controle
            </p>
          </div>

          {/* Cards Principais */}
          <div className="grid md:grid-cols-3 gap-6">
            <Link href="/dashboard/assistentes"> 
              <div className="bg-slate-800/50 border border-white/10 rounded-xl p-6 hover:border-blue-500/50 transition cursor-pointer">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Assistentes</h3>
                    <p className="text-sm text-white/40">{totalCompanies} assistentes</p>
                  </div>
                </div>
                <p className="text-sm text-white/60">Gerencie seus assistentes virtuais</p>
              </div>
            </Link>

            <Link href="/dashboard/historico">
              <div className="bg-slate-800/50 border border-white/10 rounded-xl p-6 hover:border-cyan-500/50 transition cursor-pointer">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Histórico</h3>
                    <p className="text-sm text-white/40">{totalConversations} conversas</p>
                  </div>
                </div>
                <p className="text-sm text-white/60">Visualize conversas anteriores</p>
              </div>
            </Link>

            <Link href="/dashboard/faqs">
              <div className="bg-slate-800/50 border border-white/10 rounded-xl p-6 hover:border-purple-500/50 transition cursor-pointer">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">FAQs</h3>
                    <p className="text-sm text-white/40">{totalFAQs} respostas</p>
                  </div>
                </div>
                <p className="text-sm text-white/60">Respostas automáticas</p>
              </div>
            </Link>
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-2 gap-6">
            <Link href="/dashboard/funcoes">
              <div className="bg-slate-800/50 border border-white/10 rounded-xl p-6 hover:border-white/20 transition cursor-pointer">
                <h3 className="text-xl font-bold mb-2">⚙️ Funções</h3>
                <p className="text-sm text-white/60">Configure funções do assistente</p>
              </div>
            </Link>

            <Link href="/dashboard/saldo">
              <div className="bg-slate-800/50 border border-white/10 rounded-xl p-6 hover:border-white/20 transition cursor-pointer">
                <h3 className="text-xl font-bold mb-2">💰 Saldo</h3>
                <p className="text-sm text-white/60">PIX recebidos e saques</p>
              </div>
            </Link>
          </div>

          {/* CTA - Criar Assistente */}
          {totalCompanies === 0 && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
              <h3 className="font-semibold text-white mb-1">🚀 Comece Agora</h3>
              <p className="text-sm text-white/70 mb-3">Crie seu primeiro assistente</p>
              <Link href="/dashboard/assistentes/novo" className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm font-semibold">
                + Criar Assistente
              </Link>
            </div>
          )}

          {/* Sucesso */}
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-semibold text-green-400">✅ Dashboard pronto para produção!</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
