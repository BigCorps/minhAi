// components/layout/DashboardHeader.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Sidebar } from '@/components/layout/Sidebar';
import { createClient } from '@/lib/supabase-browser';
import { User, CreditCard, LogOut, LifeBuoy, Users, Wallet, Download } from 'lucide-react';
import { AssistantSelectorHeader } from '@/components/layout/AssistantSelectorHeader';

// ─── Ícone SVG customizado ────────────────────────────────────────────────

function HistoricoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

interface DashboardHeaderProps {
  user: any;
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const supabase = createClient();

  // ── oculta o seletor nas seções do menu de usuário ──────────────────────────
const USER_MENU_ROUTES = [
  '/dashboard/perfil',
  '/dashboard/credits',
  '/dashboard/saldo',
  '/dashboard/historico',
  '/dashboard/indicacoes',
  '/dashboard/ajuda',
];
const pathname = usePathname();
const hideAssistantSelector = USER_MENU_ROUTES.some(r => pathname.startsWith(r));

  const displayName = user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário';
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const showImage = avatarUrl && !imageError;

  // Lógica de Instalação PWA
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const alreadyInstalled = localStorage.getItem('minhai_pwa_installed') === 'true';
      
      if (!isStandalone && !alreadyInstalled) {
        setShowInstallButton(true);
      }
    };

    const handleAppInstalled = () => {
      setShowInstallButton(false);
      setDeferredPrompt(null);
      localStorage.setItem('minhai_pwa_installed', 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      localStorage.setItem('minhai_pwa_installed', 'true');
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowInstallButton(false);
      setDeferredPrompt(null);
    }
  };

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
            <div className="flex items-center space-x-4 text-gray-700 dark:text-white">
              <Sidebar />
              
              <Link href="/dashboard">
                <Image src="/logo.png" alt="Logo" width={100} height={45} className="rounded-lg" />
              </Link>
            </div>

            {/* Right: Theme Toggle + User Menu */}
            <div className="flex items-center space-x-4">
              {showInstallButton && (
                <button
                  onClick={handleInstallClick}
                  className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-600/20 rounded-lg hover:bg-blue-600 hover:text-white transition-all duration-300 text-sm font-medium"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar App</span>
                </button>
              )}
              
              {/* Ícone de download para mobile */}
              {showInstallButton && (
                <button
                  onClick={handleInstallClick}
                  className="sm:hidden p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-white/5 rounded-lg transition"
                  title="Baixar App"
                >
                  <Download className="w-5 h-5" />
                </button>
              )}

              {!hideAssistantSelector && <AssistantSelectorHeader />}
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
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Menu Usuário</p>
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
                        href="/dashboard/saldo"
                        className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Wallet className="w-4 h-4" />
                        <span>Recebimentos</span>
                      </Link>
                      <Link
                        href="/dashboard/historico"
                        className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <HistoricoIcon className="w-4 h-4" />
                        <span>Histórico</span>
                      </Link>
                      <Link
                        href="/dashboard/indicacoes"
                        className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Users className="w-4 h-4" />
                        <span>Indique e Ganhe</span>
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
