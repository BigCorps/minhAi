// app/dashboard/DashboardLayoutClient.tsx
'use client';

import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

interface DashboardLayoutClientProps {
  user: any;
  children: React.ReactNode;
}

// Header Component (dentro do mesmo arquivo para evitar problemas)
function DashboardHeader({ user }: { user: any }) {
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  
  const displayName = user?.user_metadata?.name || user?.email || 'Usuário';

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-30 border-b transition-colors ${
        theme === 'dark' 
          ? 'bg-slate-900/95 border-white/10 backdrop-blur-xl' 
          : 'bg-white/95 border-gray-200 backdrop-blur-xl'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Hamburger + Logo */}
            <div className="flex items-center space-x-4">
              {/* Hamburger */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className={`p-2 rounded-lg transition ${
                  theme === 'dark'
                    ? 'hover:bg-white/5 text-white'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              {/* Logo */}
              <Link href="/dashboard">
                <Image 
                  src="/logo.png" 
                  alt="eAi" 
                  width={120} 
                  height={54}
                  className="rounded-lg"
                />
              </Link>
            </div>

            {/* Right: Theme Toggle + User Menu */}
            <div className="flex items-center space-x-4">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg transition ${
                  theme === 'dark'
                    ? 'hover:bg-white/5 text-white'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
                aria-label="Alternar tema"
              >
                {theme === 'dark' ? (
                  // Sol (modo claro)
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  // Lua (modo escuro)
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className={`flex items-center space-x-2 p-2 rounded-lg transition ${
                    theme === 'dark'
                      ? 'hover:bg-white/5 text-white'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-primary-green flex items-center justify-center text-white font-bold">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm hidden sm:block">{displayName}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown */}
                {userMenuOpen && (
                  <div className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg border py-2 ${
                    theme === 'dark'
                      ? 'bg-slate-800 border-white/10'
                      : 'bg-white border-gray-200'
                  }`}>
                    <Link
                      href="/dashboard/perfil"
                      className={`block px-4 py-2 text-sm ${
                        theme === 'dark'
                          ? 'text-white hover:bg-white/5'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      onClick={() => setUserMenuOpen(false)}
                    >
                      👤 Perfil
                    </Link>
                    <Link
                      href="/dashboard/credits"
                      className={`block px-4 py-2 text-sm ${
                        theme === 'dark'
                          ? 'text-white hover:bg-white/5'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      onClick={() => setUserMenuOpen(false)}
                    >
                      💳 Créditos
                    </Link>
                    <hr className={`my-2 ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'}`} />
                    <form action="/api/auth/logout" method="POST">
                      <button
                        type="submit"
                        className={`w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10`}
                      >
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
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setSidebarOpen(false)}
          />
          <div className={`fixed top-0 left-0 bottom-0 w-64 border-r z-50 p-6 ${
            theme === 'dark'
              ? 'bg-slate-900 border-white/10'
              : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-8">
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Menu
              </h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className={`p-2 rounded-lg ${
                  theme === 'dark'
                    ? 'hover:bg-white/5 text-white'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="space-y-2">
              <Link
                href="/dashboard"
                className={`block px-4 py-2 rounded-lg ${
                  theme === 'dark'
                    ? 'text-white hover:bg-white/5'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                🏠 Dashboard
              </Link>
              <Link
                href="/dashboard/assistentes"
                className={`block px-4 py-2 rounded-lg ${
                  theme === 'dark'
                    ? 'text-white hover:bg-white/5'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                🤖 Assistentes
              </Link>
              <Link
                href="/dashboard/funcoes"
                className={`block px-4 py-2 rounded-lg ${
                  theme === 'dark'
                    ? 'text-white hover:bg-white/5'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                ⚙️ Funções
              </Link>
              <Link
                href="/dashboard/historico"
                className={`block px-4 py-2 rounded-lg ${
                  theme === 'dark'
                    ? 'text-white hover:bg-white/5'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                💬 Histórico
              </Link>
              <Link
                href="/dashboard/faqs"
                className={`block px-4 py-2 rounded-lg ${
                  theme === 'dark'
                    ? 'text-white hover:bg-white/5'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                ⚡ FAQs
              </Link>
              <Link
                href="/dashboard/saldo"
                className={`block px-4 py-2 rounded-lg ${
                  theme === 'dark'
                    ? 'text-white hover:bg-white/5'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                💰 Saldo
              </Link>
            </nav>
          </div>
        </>
      )}

      {/* Spacer */}
      <div className="h-16" />
    </>
  );
}

// Layout Content Component
function DashboardContent({ user, children }: DashboardLayoutClientProps) {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      theme === 'dark' ? 'bg-slate-950' : 'bg-gray-50'
    }`}>
      <DashboardHeader user={user} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

// Main Export - Envolve tudo no ThemeProvider
export default function DashboardLayoutClient({ user, children }: DashboardLayoutClientProps) {
  return (
    <ThemeProvider>
      <DashboardContent user={user}>
        {children}
      </DashboardContent>
    </ThemeProvider>
  );
}