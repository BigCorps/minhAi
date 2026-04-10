// app/dashboard/DashboardView.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Sidebar } from '@/components/layout/Sidebar';

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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  
  const displayName = user?.user_metadata?.name || user?.email || 'Usuário';
  const userPhoto = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  return (
    <div className="min-h-screen bg-transparent transition-colors">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-30 border-b bg-white/95 dark:bg-slate-900/95 border-gray-200 dark:border-white/10 backdrop-blur-xl transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left */}
            <div className="flex items-center space-x-4">
              <Sidebar />
              
              <Link href="/dashboard">
                <Image src="/logo.png" alt="eAi" width={120} height={54} className="rounded-lg" />
              </Link>
            </div>

            {/* Right: Theme Toggle + User Menu */}
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 p-2 rounded-lg text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition"
                >
                  {userPhoto ? (
                    <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-primary-green">
                      <Image src={userPhoto} alt={displayName} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary-green flex items-center justify-center text-white font-bold border-2 border-primary-green">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm hidden sm:block">{displayName}</span>
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-white/10 py-2 z-50">
                      <Link href="/dashboard/perfil" className="block px-4 py-2 text-sm text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5" onClick={() => setUserMenuOpen(false)}>
                        Perfil
                      </Link>
                      <Link href="/dashboard/credits" className="block px-4 py-2 text-sm text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5" onClick={() => setUserMenuOpen(false)}>
                        Créditos
                      </Link>
                      <hr className="my-2 border-gray-200 dark:border-white/10" />
                      <form action="/api/auth/logout" method="POST">
                        <button className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-white/5">
                          Sair
                        </button>
                      </form>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Spacer */}
      <div className="h-16" />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">Olá, {displayName}!</h1>
            <p className="text-lg text-gray-600 dark:text-white/60">Bem-vindo ao seu painel de controle</p>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            <Link href="/dashboard/assistentes">
              <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-xl p-6 hover:border-blue-500 dark:hover:border-blue-500/50 transition cursor-pointer">
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

            <Link href="/dashboard/historico">
              <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-xl p-6 hover:border-cyan-500 dark:hover:border-cyan-500/50 transition cursor-pointer">
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

            <Link href="/dashboard/faqs">
              <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-xl p-6 hover:border-purple-500 dark:hover:border-purple-500/50 transition cursor-pointer">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-xl p-6 hover:border-gray-300 dark:hover:border-white/20 transition cursor-pointer">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Funções</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-white/60">Configure funções do assistente</p>
              </div>
            </Link>

            <Link href="/dashboard/saldo">
              <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-xl p-6 hover:border-gray-300 dark:hover:border-white/20 transition cursor-pointer">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Saldo</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-white/60">PIX recebidos e saques</p>
              </div>
            </Link>
          </div>

          {/* New Feature Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            <Link href="/dashboard/vendas">
              <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-xl p-6 hover:border-emerald-500 dark:hover:border-emerald-500/50 transition cursor-pointer">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Vendas e Produtos</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-white/60">Gerencie sua loja virtual e pedidos</p>
              </div>
            </Link>

            <Link href="/dashboard/cadastros">
              <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-xl p-6 hover:border-orange-500 dark:hover:border-orange-500/50 transition cursor-pointer">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Controle de Usuários</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-white/60">Gerencie perfis e permissões de acesso</p>
              </div>
            </Link>

            <Link href="/dashboard/agenda">
              <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-xl p-6 hover:border-blue-500 dark:hover:border-blue-500/50 transition cursor-pointer">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Serviços Google</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-white/60">Integração com Google Agenda e serviços</p>
              </div>
            </Link>

            <Link href="/dashboard/atendimentos">
              <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-xl p-6 hover:border-pink-500 dark:hover:border-pink-500/50 transition cursor-pointer">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-pink-100 dark:bg-pink-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-pink-600 dark:text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Serviços Meta</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-white/60">Integração com WhatsApp e Instagram</p>
              </div>
            </Link>
          </div>

          {/* CTA */}
          {totalCompanies === 0 && (
            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-6 flex flex-col items-center text-center md:items-start md:text-left">
              <h3 className="font-semibold text-blue-900 dark:text-white mb-1">Comece Agora</h3>
              <p className="text-sm text-blue-800 dark:text-white/70 mb-3">Crie seu primeiro assistente</p>
              <Link href="/dashboard/assistentes/create" className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm font-semibold">
                + Criar Assistente
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
