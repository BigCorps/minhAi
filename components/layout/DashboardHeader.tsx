// components/layout/DashboardHeader.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

interface DashboardHeaderProps {
  user: any;
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const displayName = user?.user_metadata?.name || user?.email || 'Usuário';

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-30 border-b bg-slate-900/95 border-white/10 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-white/5 text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              <Link href="/dashboard">
                <Image src="/logo.png" alt="Logo" width={100} height={45} className="rounded-lg" />
              </Link>
            </div>

            {/* Right Side */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-white/5 text-white"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm hidden sm:block">{displayName}</span>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-slate-800 rounded-lg shadow-lg border border-white/10 py-2">
                    <Link href="/dashboard/perfil" className="block px-4 py-2 text-sm text-white hover:bg-white/5">
                      👤 Perfil
                    </Link>
                    <hr className="my-2 border-white/10" />
                    <form action="/api/auth/logout" method="POST">
                      <button className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/5">
                        🚪 Sair
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar Mobile */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />
          <div className="fixed top-0 left-0 bottom-0 w-64 bg-slate-900 border-r border-white/10 z-50 p-6">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-white">Menu</h2>
              <button onClick={() => setSidebarOpen(false)} className="text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="space-y-2">
              <Link href="/dashboard" className="block px-4 py-2 rounded-lg text-white hover:bg-white/5" onClick={() => setSidebarOpen(false)}>
                🏠 Dashboard
              </Link>
              <Link href="/dashboard/empresas" className="block px-4 py-2 rounded-lg text-white hover:bg-white/5" onClick={() => setSidebarOpen(false)}>
                🤖 Assistentes
              </Link>
              <Link href="/dashboard/historico" className="block px-4 py-2 rounded-lg text-white hover:bg-white/5" onClick={() => setSidebarOpen(false)}>
                💬 Histórico
              </Link>
            </nav>
          </div>
        </>
      )}

      {/* Spacer para o conteúdo não ficar embaixo do header fixo */}
      <div className="h-16" />
    </>
  );
}
