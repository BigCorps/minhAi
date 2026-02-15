'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';

interface PrecosProps {
  theme?: 'dark' | 'light';
}

interface Package {
  id: string;
  name: string;
  description: string | null;
  interactions: number;
  price_cents: number;
  price_per_interaction: number;
  is_highlighted: boolean;
  display_order: number;
}

export default function PrecosSection({ theme = 'dark' }: PrecosProps) {
  const isDark = theme === 'dark';
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPackages = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('credits_packages')
          .select('*')
          .eq('is_active', true)
          .gt('price_cents', 0)
          .order('display_order');

        setPackages((data || []).filter((p: Package) => p.display_order < 10));
      } catch (err) {
        console.error('Erro ao carregar pacotes:', err);
      } finally {
        setLoading(false);
      }
    };
    loadPackages();
  }, []);

  return (
    <div
      className={`relative flex flex-col items-center justify-center h-full w-full px-4 sm:px-6 lg:px-12 overflow-hidden transition-colors duration-500 ${
        isDark
          ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
          : 'bg-gradient-to-br from-white via-blue-50/50 to-white'
      }`}
    >
      {/* Fundo decorativo */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute top-1/4 left-1/3 w-[35%] h-[35%] rounded-full blur-[100px] ${
          isDark ? 'bg-blue-500/5' : 'bg-blue-200/20'
        }`} />
      </div>

      {/* Título */}
      <div className="relative z-10 text-center mb-3 sm:mb-5 md:mb-6">
        <p className={`text-xs font-semibold uppercase tracking-widest mb-2 transition-colors ${
          isDark ? 'text-blue-400/70' : 'text-blue-600/70'
        }`}>
          Planos e Preços
        </p>
        <h2
          style={{ fontFamily: "'Nunito', sans-serif" }}
          className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold mb-1.5 transition-colors ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}
        >
          Escolha o pacote ideal
        </h2>
        <p className={`text-xs sm:text-sm max-w-md mx-auto transition-colors ${
          isDark ? 'text-white/40' : 'text-gray-400'
        }`}>
          Créditos compartilhados entre todos os seus assistentes. Sem expiração.
        </p>
      </div>

      {/* Card Grátis */}
      <div className="relative z-10 w-full max-w-5xl mb-3 sm:mb-4">
        <div className={`rounded-xl border px-4 py-2.5 sm:py-3 flex items-center justify-center gap-3 sm:gap-4 transition-colors ${
          isDark
            ? 'bg-green-500/5 border-green-500/15'
            : 'bg-green-50 border-green-100'
        }`}>
          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isDark ? 'bg-green-500/15' : 'bg-green-100'
          }`}>
            <svg className={`w-4 h-4 ${isDark ? 'text-green-400' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
          </div>
          <div className="text-center sm:text-left">
            <span className={`text-xs sm:text-sm font-semibold ${isDark ? 'text-green-400' : 'text-green-700'}`}>
              Comece grátis!
            </span>
            <span className={`text-[10px] sm:text-xs ml-1.5 sm:ml-2 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
              Todo novo cadastro recebe 20 créditos gratuitos para testar.
            </span>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="relative z-10 w-full max-w-5xl">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className={`w-6 h-6 border-2 border-t-transparent rounded-full animate-spin ${
              isDark ? 'border-blue-400' : 'border-blue-600'
            }`} />
          </div>
        ) : packages.length === 0 ? (
          <p className={`text-center py-8 text-sm ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
            Pacotes em breve disponíveis.
          </p>
        ) : (
          <>
            {/* MOBILE: lista compacta empilhada */}
            <div className="flex flex-col gap-3 sm:hidden">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`relative rounded-xl transition-all duration-300 ${
                    pkg.is_highlighted
                      ? isDark
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/10'
                        : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-300/20'
                      : isDark
                        ? 'bg-slate-800/40 border border-white/5 backdrop-blur-sm'
                        : 'bg-white/80 border border-gray-100 backdrop-blur-sm shadow-sm'
                  }`}
                >
                  {/* Badge */}
                  {pkg.is_highlighted && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-950 text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest shadow-lg whitespace-nowrap">
                      Mais Popular
                    </div>
                  )}

                  <div className="px-4 py-3.5 flex items-center justify-between gap-4">
                    {/* Esquerda: nome + preço */}
                    <div className="flex-shrink-0">
                      <p
                        style={{ fontFamily: "'Nunito', sans-serif" }}
                        className={`text-xs font-semibold mb-0.5 ${
                          !pkg.is_highlighted && (isDark ? 'text-white/70' : 'text-gray-500')
                        }`}
                      >
                        {pkg.name}
                      </p>
                      <p className="text-xl font-bold leading-tight">
                        R$ {(pkg.price_cents / 100).toFixed(2).replace('.', ',')}
                      </p>
                    </div>

                    {/* Direita: detalhes */}
                    <div className="flex flex-col items-end gap-1 text-right">
                      <div className="flex items-center gap-1.5">
                        <svg className={`w-3 h-3 ${pkg.is_highlighted ? 'text-white/70' : isDark ? 'text-blue-400' : 'text-blue-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span className="font-semibold text-xs">
                          {pkg.interactions.toLocaleString('pt-BR')} interações
                        </span>
                      </div>
                      <span className={`text-[11px] ${pkg.is_highlighted ? 'text-white/70' : isDark ? 'text-white/40' : 'text-gray-400'}`}>
                        R$ {pkg.price_per_interaction.toFixed(2).replace('.', ',')} por interação
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* DESKTOP (sm+): grid de cards verticais centralizados */}
            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`relative rounded-2xl transition-all duration-300 flex flex-col ${
                    pkg.is_highlighted
                      ? isDark
                        ? 'bg-gradient-to-b from-blue-600 to-blue-800 text-white shadow-xl shadow-blue-500/10 scale-[1.02] z-10'
                        : 'bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-xl shadow-blue-300/20 scale-[1.02] z-10'
                      : isDark
                        ? 'bg-slate-800/40 border border-white/5 backdrop-blur-sm'
                        : 'bg-white/80 border border-gray-100 backdrop-blur-sm shadow-sm'
                  }`}
                >
                  {/* Badge */}
                  {pkg.is_highlighted && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-950 text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-widest shadow-lg whitespace-nowrap">
                      Mais Popular
                    </div>
                  )}

                  <div className="p-5 md:p-6 flex-1 flex flex-col items-center text-center">
                    {/* Nome */}
                    <h3
                      style={{ fontFamily: "'Nunito', sans-serif" }}
                      className={`text-sm md:text-base font-semibold mb-2 ${
                        !pkg.is_highlighted && (isDark ? 'text-white' : 'text-gray-900')
                      }`}
                    >
                      {pkg.name}
                    </h3>

                    {/* Preço */}
                    <div className="mb-4">
                      <span className="text-2xl md:text-3xl font-bold">
                        R$ {(pkg.price_cents / 100).toFixed(2).replace('.', ',')}
                      </span>
                    </div>

                    {/* Features centralizadas */}
                    <div className="space-y-2.5 flex-1">
                      <div className="flex items-center justify-center gap-2">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                          pkg.is_highlighted ? 'bg-white/20' : isDark ? 'bg-blue-500/10' : 'bg-blue-50'
                        }`}>
                          <svg className={`w-2.5 h-2.5 ${pkg.is_highlighted ? 'text-white' : isDark ? 'text-blue-400' : 'text-blue-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <span className="font-semibold text-xs md:text-sm">
                          {pkg.interactions.toLocaleString('pt-BR')} interações
                        </span>
                      </div>

                      <div className="flex items-center justify-center gap-2">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                          pkg.is_highlighted ? 'bg-white/20' : isDark ? 'bg-green-500/10' : 'bg-green-50'
                        }`}>
                          <svg className={`w-2.5 h-2.5 ${pkg.is_highlighted ? 'text-white' : isDark ? 'text-green-400' : 'text-green-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className={`text-xs md:text-sm ${pkg.is_highlighted ? 'opacity-90' : isDark ? 'text-white/55' : 'text-gray-500'}`}>
                          R$ {pkg.price_per_interaction.toFixed(2).replace('.', ',')} por interação
                        </span>
                      </div>

                      <div className="flex items-center justify-center gap-2">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                          pkg.is_highlighted ? 'bg-white/20' : isDark ? 'bg-blue-500/10' : 'bg-blue-50'
                        }`}>
                          <svg className={`w-2.5 h-2.5 ${pkg.is_highlighted ? 'text-white' : isDark ? 'text-blue-400' : 'text-blue-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className={`text-xs md:text-sm ${pkg.is_highlighted ? 'opacity-90' : isDark ? 'text-white/55' : 'text-gray-500'}`}>
                          Pagamento via PIX
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Info Banner */}
      <div className="relative z-10 mt-3 sm:mt-5 max-w-xl w-full">
        <div className={`rounded-lg px-3 py-2 border text-center transition-colors ${
          isDark ? 'bg-blue-500/5 border-blue-500/15' : 'bg-blue-50 border-blue-100'
        }`}>
          <p className={`text-[10px] sm:text-xs ${isDark ? 'text-blue-300/60' : 'text-blue-600'}`}>
            Créditos compartilhados automaticamente entre todos os seus assistentes.
          </p>
        </div>
      </div>
    </div>
  );
}
