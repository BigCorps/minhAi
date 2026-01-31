'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Sidebar } from './Sidebar';
import { UserMenu } from './UserMenu';
import { useTheme } from '@/contexts/ThemeContext';

interface DashboardHeaderProps {
  user: any;
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const { theme, toggleTheme } = useTheme();

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
              <Sidebar theme={theme} />
              
              <Link href="/dashboard" className="flex items-center space-x-3">
                <Image 
                  src="/logo.png" 
                  alt="eAi" 
                  width={100} 
                  height={45}
                  className="rounded-lg object-contain"
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
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              {/* User Menu (Com a lógica da foto) */}
              <UserMenu user={user} theme={theme} />
            </div>
          </div>
        </div>
      </header>

      {/* Spacer para compensar o header fixo e não esconder conteúdo */}
      <div className="h-16" />
    </>
  );
}
