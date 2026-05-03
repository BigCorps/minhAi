'use client';

// components/landing/PrecosSection.tsx

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
  package_type: 'credits' | 'monthly';
  unlocks_features: boolean;
  has_consultoria: boolean;
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
        setPackages(data || []);
      } catch (err) {
        console.error('Erro ao carregar pacotes:', err);
      } finally {
        setLoading(false);
      }
    };
    loadPackages();
  }, []);

  const monthlyPlans = packages.filter(p => p.package_type === 'monthly');
  const creditPlans  = packages.filter(p => p.package_type === 'credits');

  return (
    <div
      className={`
        relative flex flex-col items-center justify-center
        h-full w-full overflow-hidden
        transition-colors duration-500
        ${isDark
          ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
          : 'bg-gradient-to-br from-white via-blue-50/50 to-white'
        }
      `}
    >
      {/* Decorativo */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className={`absolute top-1/4 left-1/3 w-[35%] h-[35%] rounded-full blur-[100px] ${isDark ? 'bg-blue-500/5' : 'bg-blue-200/20'}`} />
      </div>

      <div
        className={`
          relative z-10 flex flex-col items-center
          w-full max-w-5xl mx-auto
          px-4 sm:px-6 lg:px-10
          pt-[68px] pb-[52px] md:pt-4 md:pb-4
          gap-2 sm:gap-3
        `}
      >

        {/* ── Título ─────────────────────────────────────────── */}
        <div className="text-center">
          <p className={`text-[10px] font-semibold uppercase tracking-widest mb-1 ${isDark ? 'text-blue-400/70' : 'text-blue-600/70'}`}>
            Planos e Preços
          </p>
          <h2
            className={`
              font-semibold transition-colors
              text-lg sm:text-2xl md:text-3xl
              ${isDark ? 'text-white' : 'text-gray-900'}
            `}
          >
            Escolha o pacote ideal
          </h2>
        </div>

        {/* ── Card grátis ────────────────────────────────────── */}
        <div className="w-full">
          <div className={`rounded-xl border px-4 py-2 flex items-center justify-center gap-3 ${
            isDark ? 'bg-green-500/5 border-green-500/15' : 'bg-green-50 border-green-100'
          }`}>
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-green-500/15' : 'bg-green-100'}`}>
              <svg className={`w-3.5 h-3.5 ${isDark ? 'text-green-400' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
            </div>
            <span className={`text-xs font-semibold ${isDark ? 'text-green-400' : 'text-green-700'}`}>Comece grátis!</span>
            <span className={`text-[10px] ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
              Receba 20 créditos grátis para usar à vontade.
            </span>
          </div>
        </div>

        {/* ── Conteúdo (loading / planos) ────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <div className={`w-6 h-6 border-2 border-t-transparent rounded-full animate-spin ${isDark ? 'border-blue-400' : 'border-blue-600'}`} />
          </div>
        ) : (
          <div className="w-full flex flex-col gap-2.5 sm:gap-4">

            {/* ── Planos Mensais ──────────────────────────────── */}
            {monthlyPlans.length > 0 && (
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 text-center ${isDark ? 'text-blue-400/60' : 'text-blue-600/60'}`}>
                  Planos Mensais
                </p>

                {/* Mobile */}
                <div className="flex flex-col gap-2 sm:hidden">
                  {monthlyPlans.map((pkg) => (
                    <div
                      key={pkg.id}
                      className={`relative rounded-xl transition-all duration-300 ${
                        pkg.is_highlighted
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/10'
                          : isDark
                            ? 'bg-slate-800/40 border border-white/5'
                            : 'bg-white/80 border border-gray-100 shadow-sm'
                      }`}
                    >
                      {pkg.is_highlighted && (
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-950 text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest shadow-lg whitespace-nowrap">
                          Recomendado
                        </div>
                      )}
                      <div className="px-4 py-2.5 flex items-center justify-between gap-4">
                        <div>
                          <p className={`text-xs font-semibold mb-0.5 ${!pkg.is_highlighted && (isDark ? 'text-white/70' : 'text-gray-500')}`}>
                            {pkg.name}
                          </p>
                          <p className="text-base font-bold">
                            R$ {(pkg.price_cents / 100).toFixed(2).replace('.', ',')}<span className="text-xs font-normal opacity-70">/mês</span>
                          </p>
                        </div>
                        <div className="text-right text-xs">
                          <p className="font-semibold">{pkg.interactions.toLocaleString('pt-BR')} interações</p>
                          <p className={`text-[10px] opacity-70`}>R$ {(pkg.price_per_interaction / 100).toFixed(2).replace('.', ',')} cada</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop */}
                <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {monthlyPlans.map((pkg) => (
                    <div
                      key={pkg.id}
                      className={`relative rounded-2xl flex flex-col transition-all duration-300 ${
                        pkg.is_highlighted
                          ? isDark
                            ? 'bg-gradient-to-b from-blue-600 to-blue-800 text-white shadow-xl shadow-blue-500/10 scale-[1.02] z-10'
                            : 'bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-xl shadow-blue-300/20 scale-[1.02] z-10'
                          : isDark
                            ? 'bg-slate-800/40 border border-white/5'
                            : 'bg-white/80 border border-gray-100 shadow-sm'
                      }`}
                    >
                      {pkg.is_highlighted && (
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-950 text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-widest shadow-lg whitespace-nowrap">
                          Recomendado
                        </div>
                      )}
                      <div className="p-4 flex flex-col items-center text-center gap-2">
                        <h3 className={`text-sm font-semibold ${!pkg.is_highlighted && (isDark ? 'text-white' : 'text-gray-900')}`}>
                          {pkg.name}
                        </h3>
                        <div>
                          <span className="text-xl font-bold">R$ {(pkg.price_cents / 100).toFixed(2).replace('.', ',')}</span>
                          <span className="text-xs opacity-70">/mês</span>
                        </div>
                        <p className="text-xs font-medium">{pkg.interactions.toLocaleString('pt-BR')} interações</p>
                        <p className={`text-[11px] opacity-70`}>R$ {(pkg.price_per_interaction / 100).toFixed(2).replace('.', ',')} por interação</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Plano Full (consultoria) — some em telas baixas */}
            <div className={`[@media(max-height:650px)_and_(max-width:767px)]:hidden`}>
              <div className={`rounded-xl border px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap ${
                isDark ? 'bg-white/[0.02] border-white/5' : 'bg-white/80 border-gray-100 shadow-sm'
              }`}>
                <div className="flex flex-col gap-0.5">
                  <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Plano Full com Consultoria</span>
                  {['Assistente personalizado', 'Suporte prioritário', 'Treinamento da equipe', 'Integração dedicada'].map(item => (
                    <div key={item} className="flex items-center gap-1.5">
                      <svg className={`w-2.5 h-2.5 flex-shrink-0 ${isDark ? 'text-green-400' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className={`text-[10px] ${isDark ? 'text-white/60' : 'text-gray-500'}`}>{item}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => window.open('https://wa.me/5511926828418?text=Olá!%20Tenho%20interesse%20no%20Plano%20Full%20e%20gostaria%20de%20saber%20mais%20detalhes.', '_blank')}
                  className="py-2 px-4 rounded-xl text-xs font-bold transition-all active:scale-95 bg-lime-600 text-white hover:bg-lime-500 whitespace-nowrap"
                >
                  Falar com consultor
                </button>
              </div>
            </div>

            {/* ── Pacotes de Créditos ─────────────────────────── */}
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 text-center ${isDark ? 'text-blue-400/60' : 'text-blue-600/60'}`}>
                Pacotes de Créditos
              </p>

              {/* Mobile */}
              <div className="flex flex-col gap-2 sm:hidden">
                {creditPlans.map((pkg) => (
                  <div
                    key={pkg.id}
                    className={`relative rounded-xl transition-all duration-300 ${
                      pkg.is_highlighted
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/10'
                        : isDark
                          ? 'bg-slate-800/40 border border-white/5'
                          : 'bg-white/80 border border-gray-100 shadow-sm'
                    }`}
                  >
                    {pkg.is_highlighted && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-950 text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest shadow-lg whitespace-nowrap">
                        Mais Popular
                      </div>
                    )}
                    <div className="px-4 py-2.5 flex items-center justify-between gap-4">
                      <div>
                        <p className={`text-xs font-semibold mb-0.5 ${!pkg.is_highlighted && (isDark ? 'text-white/70' : 'text-gray-500')}`}>
                          {pkg.name}
                        </p>
                        <p className="text-base font-bold">R$ {(pkg.price_cents / 100).toFixed(2).replace('.', ',')}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-xs">{pkg.interactions.toLocaleString('pt-BR')} interações</p>
                        <p className={`text-[10px] opacity-70`}>R$ {(pkg.price_per_interaction / 100).toFixed(2).replace('.', ',')} cada</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop */}
              <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {creditPlans.map((pkg) => (
                  <div
                    key={pkg.id}
                    className={`relative rounded-2xl flex flex-col transition-all duration-300 ${
                      pkg.is_highlighted
                        ? isDark
                          ? 'bg-gradient-to-b from-blue-600 to-blue-800 text-white shadow-xl shadow-blue-500/10 scale-[1.02] z-10'
                          : 'bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-xl shadow-blue-300/20 scale-[1.02] z-10'
                        : isDark
                          ? 'bg-slate-800/40 border border-white/5'
                          : 'bg-white/80 border border-gray-100 shadow-sm'
                    }`}
                  >
                    {pkg.is_highlighted && (
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-950 text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-widest shadow-lg whitespace-nowrap">
                        Mais Popular
                      </div>
                    )}
                    <div className="p-4 md:p-5 flex flex-col items-center text-center gap-2">
                      <h3 className={`text-sm font-semibold ${!pkg.is_highlighted && (isDark ? 'text-white' : 'text-gray-900')}`}>
                        {pkg.name}
                      </h3>
                      <span className="text-2xl font-bold">R$ {(pkg.price_cents / 100).toFixed(2).replace('.', ',')}</span>
                      <div className="space-y-1.5">
                        {[
                          { label: `${pkg.interactions.toLocaleString('pt-BR')} interações`, icon: 'bolt' },
                          { label: `R$ ${(pkg.price_per_interaction / 100).toFixed(2).replace('.', ',')} por interação`, icon: 'check' },
                          { label: 'Pagamento via PIX', icon: 'check' },
                        ].map(({ label, icon }) => (
                          <div key={label} className="flex items-center justify-center gap-2">
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${pkg.is_highlighted ? 'bg-white/20' : isDark ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
                              <svg className={`w-2.5 h-2.5 ${pkg.is_highlighted ? 'text-white' : isDark ? 'text-blue-400' : 'text-blue-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {icon === 'bolt'
                                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                }
                              </svg>
                            </div>
                            <span className={`text-xs ${pkg.is_highlighted ? 'opacity-90' : isDark ? 'text-white/55' : 'text-gray-500'}`}>{label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}