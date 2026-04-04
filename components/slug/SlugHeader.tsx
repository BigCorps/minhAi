'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { navigateContextual } from '@/lib/routing-utils';
import { useProfile } from '@/hooks/useProfile';
import dynamic from 'next/dynamic';

// Importação dinâmica do LoginClienteDisplay
const LoginClienteDisplay = dynamic(
  () => import('@/components/assistant/LoginClienteDisplay'),
  { ssr: false }
);

export interface SlugHeaderProps {
  company: any;
  slug?: string;
  pageType?: 'ia' | 'vendas' | 'fila' | 'cliente';
  theme?: 'dark' | 'light';
  modo_vendas_enabled?: boolean;
  modo_fila_enabled?: boolean;
}

export default function SlugHeader({
  company,
  slug,
  pageType = 'ia',
  theme = 'dark',
  modo_vendas_enabled = true,
  modo_fila_enabled = false,
}: SlugHeaderProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  // Hook de perfil do usuário
  const { profile, logout } = useProfile(slug ?? '');
  const isLoggedIn = !!profile;

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isDark = theme === 'dark';

  // Lógica de visibilidade dos botões
  const showAssistantButton = !isLoggedIn || pageType === 'ia';
  const showVendasButton = modo_vendas_enabled && pageType !== 'vendas';
  const showFilaButton = modo_fila_enabled && pageType !== 'fila';

  // Handlers de navegação
  const handleNavigateToIA = () => {
    navigateContextual(router, 'ia', slug);
  };

  const handleNavigateToVendas = () => {
    navigateContextual(router, 'vendas', slug);
  };

  const handleNavigateToFila = () => {
    navigateContextual(router, 'fila', slug);
  };

  const handleClientesClick = () => {
    if (isLoggedIn) {
      // Usuário logado → vai para dashboard de cliente
      navigateContextual(router, 'cliente', slug);
    } else {
      // Usuário não logado → abre modal de login
      setShowLoginModal(true);
    }
  };

  const handleCloseLoginModal = () => {
    setShowLoginModal(false);
  };

  // Função para obter iniciais do nome
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <header
        className="sticky top-0 z-[400] border-b backdrop-blur-md"
        style={{
          background: isDark
            ? 'rgba(15, 23, 42, 0.8)'
            : 'rgba(255, 255, 255, 0.8)',
          borderColor: isDark
            ? 'rgba(148, 163, 184, 0.1)'
            : 'rgba(203, 213, 225, 0.3)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo e Nome da Empresa */}
            <div className="flex items-center gap-3">
              {company?.logo_url && (
                <img
                  src={company.logo_url}
                  alt={company.name}
                  className="h-10 w-10 rounded-lg object-cover"
                />
              )}
              <h1
                className="text-lg font-bold truncate max-w-[200px] sm:max-w-none"
                style={{
                  color: isDark ? 'rgb(241, 245, 249)' : 'rgb(15, 23, 42)',
                }}
              >
                {company?.name}
              </h1>
            </div>

            {/* Botões de Navegação */}
            <nav className="flex items-center gap-2">
              {/* Botão Assistente (oculto quando logado em Vendas/Fila) */}
              {showAssistantButton && (
                <button
                  onClick={handleNavigateToIA}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: isDark
                      ? 'rgba(59, 130, 246, 0.1)'
                      : 'rgba(59, 130, 246, 0.05)',
                    color: isDark ? 'rgb(147, 197, 253)' : 'rgb(29, 78, 216)',
                    border: `1px solid ${
                      isDark
                        ? 'rgba(59, 130, 246, 0.3)'
                        : 'rgba(59, 130, 246, 0.2)'
                    }`,
                  }}
                >
                  <span className="text-lg">🤖</span>
                  <span className="hidden sm:inline">Assistente</span>
                </button>
              )}

              {/* Botão Vendas */}
              {showVendasButton && (
                <button
                  onClick={handleNavigateToVendas}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: isDark
                      ? 'rgba(16, 185, 129, 0.1)'
                      : 'rgba(16, 185, 129, 0.05)',
                    color: isDark ? 'rgb(110, 231, 183)' : 'rgb(5, 150, 105)',
                    border: `1px solid ${
                      isDark
                        ? 'rgba(16, 185, 129, 0.3)'
                        : 'rgba(16, 185, 129, 0.2)'
                    }`,
                  }}
                >
                  <span className="text-lg">🛒</span>
                  <span className="hidden sm:inline">Vendas</span>
                </button>
              )}

              {/* Botão Fila */}
              {showFilaButton && (
                <button
                  onClick={handleNavigateToFila}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: isDark
                      ? 'rgba(251, 146, 60, 0.1)'
                      : 'rgba(251, 146, 60, 0.05)',
                    color: isDark ? 'rgb(253, 186, 116)' : 'rgb(194, 65, 12)',
                    border: `1px solid ${
                      isDark
                        ? 'rgba(251, 146, 60, 0.3)'
                        : 'rgba(251, 146, 60, 0.2)'
                    }`,
                  }}
                >
                  <span className="text-lg">👥</span>
                  <span className="hidden sm:inline">Fila</span>
                </button>
              )}

              {/* Botão Clientes/Perfil */}
              <button
                onClick={handleClientesClick}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all hover:scale-105 active:scale-95"
                style={{
                  background: isLoggedIn
                    ? isDark
                      ? 'rgba(168, 85, 247, 0.1)'
                      : 'rgba(168, 85, 247, 0.05)'
                    : isDark
                    ? 'rgba(148, 163, 184, 0.1)'
                    : 'rgba(148, 163, 184, 0.05)',
                  color: isLoggedIn
                    ? isDark
                      ? 'rgb(216, 180, 254)'
                      : 'rgb(107, 33, 168)'
                    : isDark
                    ? 'rgb(203, 213, 225)'
                    : 'rgb(51, 65, 85)',
                  border: `1px solid ${
                    isLoggedIn
                      ? isDark
                        ? 'rgba(168, 85, 247, 0.3)'
                        : 'rgba(168, 85, 247, 0.2)'
                      : isDark
                      ? 'rgba(148, 163, 184, 0.3)'
                      : 'rgba(148, 163, 184, 0.2)'
                  }`,
                }}
              >
                {isLoggedIn ? (
                  <>
                    {/* Avatar com iniciais */}
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{
                        background: isDark
                          ? 'rgba(168, 85, 247, 0.3)'
                          : 'rgba(168, 85, 247, 0.2)',
                        color: isDark ? 'rgb(216, 180, 254)' : 'rgb(107, 33, 168)',
                      }}
                    >
                      {getInitials(profile.nome)}
                    </div>
                    <span className="hidden sm:inline truncate max-w-[100px]">
                      {profile.nome.split(' ')[0]}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-lg">👤</span>
                    <span className="hidden sm:inline">Login</span>
                  </>
                )}
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Modal de Login */}
      {showLoginModal && (
        <LoginClienteDisplay
          data={{
            companyId: company.id,
            slug: slug ?? '',
            profile,
          }}
          onClose={handleCloseLoginModal}
          theme={theme}
          playText={async () => {}} // Função vazia para compatibilidade
        />
      )}
    </>
  );
}
