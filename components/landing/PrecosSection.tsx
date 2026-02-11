'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';

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
      className={`relative flex flex-col items-center justify-center h-full w-full px-6 sm:px-8 lg:px-12 overflow-hidden transition-colors duration-500 ${
        isDark
          ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
          : 'bg-gradient-to-br from-white via-blue-50/50 to-white'
      }`}
    >
      {/* Fundo decorativo */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className={`absolute top-1/4 left-1/3 w-[35%] h-[35%] rounded-full blur-[100px] ${
            isDark ? 'bg-blue-500/5' : 'bg-blue-200/20'
          }`}
        />
        <div
          className={`absolute bottom-1/4 right-1/4 w-[30%] h-[30%] rounded-full blur-[100px] ${
            isDark ? 'bg-green-500/5' : 'bg-green-200/15'
          }`}
        />
      </div>

      {/* Título */}
      <div className="relative z-10 text-center mb-8 md:mb-10">
        <p
          className={`text-xs sm:text-sm font-semibold uppercase tracking-widest mb-3 transition-colors ${
            isDark ? 'text-blue-400/70' : 'text-blue-600/70'
          }`}
        >
          Planos e Preços
        </p>
        <h2
          style={{ fontFamily: "'Nunito', sans-serif" }}
          className={`text-2xl sm:text-3xl md:text-4xl font-semibold mb-3 transition-colors ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}
        >
          Escolha o pacote ideal
        </h2>
        <p
          className={`text-sm max-w-md mx-auto transition-colors ${
            isDark ? 'text-white/40' : 'text-gray-400'
          }`}
        >
          Créditos compartilhados entre todas as suas empresas e sem prazo de expiração.
        </p>
      </div>

      {/* Cards de Preço */}
      <div className="relative z-10 w-full max-w-5xl">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className={`w-8 h-8 border-2 border-t-transparent rounded-full animate-spin ${
              isDark ? 'border-blue-400' : 'border-blue-600'
            }`} />
          </div>
        ) : packages.length === 0 ? (
          <p className={`text-center py-12 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
            Pacotes em breve disponíveis.
          </p>
        ) : (
          <div className={`grid gap-4 md:gap-5 ${
            packages.length <= 3
              ? 'grid-cols-1 md:grid-cols-3'
              : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
          }`}>
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative rounded-2xl transition-all duration-300 flex flex-col ${
                  pkg.is_highlighted
                    ? isDark
                      ? 'bg-gradient-to-b from-blue-600 to-blue-800 text-white shadow-xl shadow-blue-500/10 scale-[1.03] z-10'
                      : 'bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-xl shadow-blue-300/20 scale-[1.03] z-10'
                    : isDark
                      ? 'bg-slate-800/40 border border-white/5 hover:border-white/15 backdrop-blur-sm'
                      : 'bg-white/80 border border-gray-100 hover:border-gray-200 backdrop-blur-sm shadow-sm'
                }`}
              >
                {/* Badge "Mais Popular" */}
                {pkg.is_highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-950 text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-widest shadow-lg">
                    Mais Popular
                  </div>
                )}

                <div className="p-6 md:p-7 flex-1 flex flex-col">
                  {/* Nome do pacote */}
                  <h3
                    style={{ fontFamily: "'Nunito', sans-serif" }}
                    className={`text-lg font-semibold mb-3 ${
                      !pkg.is_highlighted && (isDark ? 'text-white' : 'text-gray-900')
                    }`}
                  >
                    {pkg.name}
                  </h3>

                  {/* Preço */}
                  <div className="mb-5">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl md:text-4xl font-bold">
                        R$ {(pkg.price_cents / 100).toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-3 mb-6 flex-1">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                          pkg.is_highlighted ? 'bg-white/20' : isDark ? 'bg-blue-500/10' : 'bg-blue-50'
                        }`}
                      >
                        <svg className={`w-3 h-3 ${pkg.is_highlighted ? 'text-white' : isDark ? 'text-blue-400' : 'text-blue-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <span className="font-semibold text-sm">
                        {pkg.interactions.toLocaleString('pt-BR')} Interações
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                          pkg.is_highlighted ? 'bg-white/20' : isDark ? 'bg-blue-500/10' : 'bg-blue-50'
                        }`}
                      >
                        <svg className={`w-3 h-3 ${pkg.is_highlighted ? 'text-white' : isDark ? 'text-blue-400' : 'text-blue-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className={`text-sm ${pkg.is_highlighted ? 'opacity-90' : isDark ? 'text-white/60' : 'text-gray-500'}`}>
                        R$ {pkg.price_per_interaction.toFixed(2).replace('.', ',')} / interação
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                          pkg.is_highlighted ? 'bg-white/20' : isDark ? 'bg-blue-500/10' : 'bg-blue-50'
                        }`}
                      >
                        <svg className={`w-3 h-3 ${pkg.is_highlighted ? 'text-white' : isDark ? 'text-blue-400' : 'text-blue-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <span className={`text-sm ${pkg.is_highlighted ? 'opacity-90' : isDark ? 'text-white/60' : 'text-gray-500'}`}>
                        Créditos não expiram
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                          pkg.is_highlighted ? 'bg-white/20' : isDark ? 'bg-green-500/10' : 'bg-green-50'
                        }`}
                      >
                        <svg className={`w-3 h-3 ${pkg.is_highlighted ? 'text-white' : isDark ? 'text-green-400' : 'text-green-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className={`text-sm ${pkg.is_highlighted ? 'opacity-90' : isDark ? 'text-white/60' : 'text-gray-500'}`}>
                        Pagamento via PIX
                      </span>
                    </div>
                  </div>

                  {/* CTA → vai pro login */}
                  <Link
                    href="/login"
                    className={`block w-full py-3 rounded-xl font-semibold text-sm text-center transition-all duration-300 hover:scale-[1.02] active:scale-95 ${
                      pkg.is_highlighted
                        ? 'bg-white text-blue-700 hover:bg-blue-50 shadow-lg'
                        : isDark
                          ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                          : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                    }`}
                  >
                    Selecionar Plano
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Banner */}
      <div className="relative z-10 mt-6 md:mt-8 max-w-2xl w-full">
        <div
          className={`rounded-xl px-4 py-3 border text-center transition-colors ${
            isDark ? 'bg-blue-500/5 border-blue-500/15' : 'bg-blue-50 border-blue-100'
          }`}
        >
          <p className={`text-xs ${isDark ? 'text-blue-300/70' : 'text-blue-700'}`}>
            <strong>Compartilhamento Inteligente:</strong> Seus créditos são automaticamente compartilhados entre todas as suas empresas.
          </p>
        </div>
      </div>
    </div>
  );
}
