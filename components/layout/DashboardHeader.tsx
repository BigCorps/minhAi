// components/layout/DashboardHeader.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Sidebar } from '@/components/layout/Sidebar';
import { createClient } from '@/lib/supabase-browser';
import { User, CreditCard, LogOut, LifeBuoy } from 'lucide-react';

interface DashboardHeaderProps {
  user: any;
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const supabase = createClient();

  const displayName = user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário';
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const showImage = avatarUrl && !imageError;

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-30 border-b bg-white/95 dark:bg-slate-900/95 border-gray-200 dark:border-white/10 backdrop-blur-xl transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Hamburger (Sidebar Component) + Logo */}
            {/* CORREÇÃO: Garantindo que o container do Sidebar tenha cores explícitas para o ícone hambúrguer */}
            <div className="flex items-center space-x-4 text-gray-700 dark:text-white">
              <Sidebar />
              
              <Link href="/dashboard">
                <Image src="/logo.png" alt="Logo" width={100} height={45} className="rounded-lg" />
              </Link>
            </div>

            {/* Right: Theme Toggle + User Menu */}
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 p-1 pr-2 rounded-lg text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition"
                >
                  {showImage ? (
                    <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-lime-500">
                      <Image
                        src={avatarUrl}
                        alt={displayName}
                        width={32}
                        height={32}
                        className="w-full h-full object-cover"
                        onError={() => setImageError(true)}
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-xs">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm hidden sm:block font-medium">{displayName}</span>
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-white/10 py-2 z-50">
                      <div className="px-4 py-2 border-b border-gray-100 dark:border-white/5 mb-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                      </div>
                      <Link 
                        href="/dashboard/perfil" 
                        className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <User className="w-4 h-4" />
                        <span>Perfil</span>
                      </Link>
                      <Link
                        href="/dashboard/credits"
                        className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Créditos</span>
                      </Link>
                      <Link
                        href="/dashboard/ajuda"
                        className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <LifeBuoy className="w-4 h-4" />
                        <span>Ajuda</span>
                      </Link>
                      <hr className="my-1 border-gray-100 dark:border-white/5" />
                      <button 
                        onClick={handleLogout}
                        className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-white/5"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sair</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Spacer para o conteúdo não ficar embaixo do header fixo */}
      <div className="h-16" />
    </>
  );
}