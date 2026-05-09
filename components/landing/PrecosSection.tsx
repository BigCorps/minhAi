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

// Funções disponíveis na versão Vendas
const FUNCOES_VENDAS = [
  { label: 'Modo Venda',          desc: 'Catálogo com carrinho de compras' },
  { label: 'Ver Produtos',        desc: 'Consulta por voz' },
  { label: 'Fazer Pedido',        desc: 'Pedido por voz' },
  { label: 'Registrar Venda',     desc: 'Venda manual por voz' },
  { label: 'Cardápio',            desc: 'Cardápio digital' },
  { label: 'PIX',                 desc: 'Cobrança via Banco Inter' },
  { label: 'NFC Débito',          desc: 'Aproximação — InfinitePay' },
  { label: 'NFC Crédito',         desc: 'Aproximação — InfinitePay' },
  { label: 'Link de Pagamento',   desc: 'Link — InfinitePay' },
  { label: 'TEF Débito',          desc: 'Maquininha — Mercado Pago' },
  { label: 'TEF Crédito',         desc: 'Maquininha — Mercado Pago' },
  { label: 'Agendar',             desc: 'Google Calendar por voz' },
  { label: 'Ver Agenda',          desc: 'Consulta Google Calendar' },
  { label: 'Perguntas Gerais',    desc: 'Assistente IA geral' },
  { label: 'Nossa Marca',         desc: 'Infos, endereço e horários' },
  { label: 'Minha Conta',         desc: 'Saldo e dados da conta' },
  { label: 'Cadastrar Produto',   desc: 'Adiciona produto por voz' },
  { label: 'Sobre o Sistema',     desc: 'Informações sobre a minhAi' },
];

export default function PrecosSection({ theme = 'dark' }: PrecosProps) {
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState<'smart' | 'vendas'>('smart');
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
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className={`absolute top-1/4 left-1/3 w-[35%] h-[35%] rounded-full blur-[100px] ${
          activeTab === 'smart'
            ? isDark ? 'bg-blue-500/5' : 'bg-blue-200/20'
            : isDark ? 'bg-lime-500/5' : 'bg-lime-200/20'
        } transition-colors duration-500`} />
      </div>

      <div
        className={`
          relative z-10 flex flex-col items-center
          w-full max-w-5xl mx-auto
          px-4 sm:px-6 lg:px-10
          pt-[68px] pb-[52px]
          [@media(max-height:700px)_and_(max-width:767px)]:pt-[64px]
          [@media(max-height:700px)_and_(max-width:767px)]:pb-[44px]
          md:pt-4 md:pb-4
          gap-2 sm:gap-3
        `}
      >

        {/* ── Título ─────────────────────────────────────────── */}
        <div className="text-center">
          <p className={`text-[10px] font-semibold uppercase tracking-widest mb-1 ${
            isDark ? 'text-blue-400/70' : 'text-blue-600/70'
          }`}>
            Planos e Preços
          </p>
          {/* CORREÇÃO 1: título igual ao código 2 */}
          <h2 className={`text-lg sm:text-2xl md:text-3xl font-semibold transition-colors ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            Escolha o pacote ideal
          </h2>
        </div>

        {/* ── Seletor Smart / Vendas ─────────────────────────── */}
        <div className={`flex items-center gap-1 p-1 rounded-2xl ${
          isDark ? 'bg-white/5' : 'bg-gray-100'
        }`}>
          {/* Smart */}
          <button
            onClick={() => setActiveTab('smart')}
            className={`
              relative flex items-center gap-2 px-4 sm:px-6 py-2 rounded-xl
              text-xs sm:text-sm font-bold transition-all duration-300
              ${activeTab === 'smart'
                ? isDark
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-blue-600 text-white shadow-lg shadow-blue-300/30'
                : isDark
                  ? 'text-white/40 hover:text-white/70'
                  : 'text-gray-400 hover:text-gray-600'
              }
            `}
          >
            <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
            minhAi Smart
            <span className={`text-[9px] font-normal hidden sm:inline ${
              activeTab === 'smart' ? 'opacity-70' : 'opacity-50'
            }`}>
              créditos por uso
            </span>
          </button>

          {/* Vendas */}
          <button
            onClick={() => setActiveTab('vendas')}
            className={`
              relative flex items-center gap-2 px-4 sm:px-6 py-2 rounded-xl
              text-xs sm:text-sm font-bold transition-all duration-300
              ${activeTab === 'vendas'
                ? isDark
                  ? 'bg-lime-600 text-white shadow-lg shadow-lime-500/20'
                  : 'bg-lime-600 text-white shadow-lg shadow-lime-300/30'
                : isDark
                  ? 'text-white/40 hover:text-white/70'
                  : 'text-gray-400 hover:text-gray-600'
              }
            `}
          >
            <span className="w-2 h-2 rounded-full bg-lime-400 flex-shrink-0" />
            minhAi Vendas
            <span className={`
              text-[9px] font-bold px-1.5 py-0.5 rounded-full hidden sm:inline
              ${activeTab === 'vendas'
                ? 'bg-white/20 text-white'
                : isDark ? 'bg-lime-500/20 text-lime-400' : 'bg-lime-100 text-lime-700'
              }
            `}>
              GRÁTIS
            </span>
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════
            ABA SMART
        ══════════════════════════════════════════════════════ */}
        {activeTab === 'smart' && (
          <div className="w-full flex flex-col gap-2 sm:gap-3 animate-in fade-in duration-200">

            {/* CORREÇÃO 2: Card grátis com cor verde (igual ao código 2) */}
            <div className={`rounded-xl border px-4 py-2 flex items-center justify-center gap-3 ${
              isDark ? 'bg-green-500/5 border-green-500/15' : 'bg-green-50 border-green-100'
            }`}>
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                isDark ? 'bg-green-500/15' : 'bg-green-100'
              }`}>
                <svg className={`w-3.5 h-3.5 ${isDark ? 'text-green-400' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
              <span className={`text-xs font-semibold ${isDark ? 'text-green-400' : 'text-green-700'}`}>Comece grátis!</span>
              <span className={`text-[10px] ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                20 créditos grátis para testar à vontade.
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-6">
                <div className={`w-6 h-6 border-2 border-t-transparent rounded-full animate-spin ${
                  isDark ? 'border-blue-400' : 'border-blue-600'
                }`} />
              </div>
            ) : (
              <div className="flex flex-col gap-2 sm:gap-3">

                {/* Planos Mensais */}
                {monthlyPlans.length > 0 && (
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 text-center ${
                      isDark ? 'text-blue-400/60' : 'text-blue-600/60'
                    }`}>Planos Mensais</p>

                    {/* Mobile — igual ao código 1 original */}
                    <div className="flex flex-col gap-1.5 sm:hidden">
                      {monthlyPlans.map((pkg) => (
                        <div key={pkg.id} className={`relative rounded-xl ${
                          pkg.is_highlighted
                            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                            : isDark ? 'bg-slate-800/40 border border-white/5' : 'bg-white/80 border border-gray-100 shadow-sm'
                        }`}>
                          {pkg.is_highlighted && (
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-950 text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest shadow-lg whitespace-nowrap">
                              Recomendado
                            </div>
                          )}
                          <div className="px-4 py-3 flex items-center justify-between gap-4">
                            <div className="flex-shrink-0">
                              <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${
                                pkg.is_highlighted ? 'text-blue-200' : isDark ? 'text-white/40' : 'text-gray-400'
                              }`}>Mensal</p>
                              <p className={`text-xs font-semibold mb-0.5 ${!pkg.is_highlighted && (isDark ? 'text-white/70' : 'text-gray-500')}`}>{pkg.name}</p>
                              <div className="flex items-baseline gap-0.5">
                                <p className="text-lg font-bold leading-tight">R$ {(pkg.price_cents / 100).toFixed(2).replace('.', ',')}</p>
                                <span className={`text-[10px] ${pkg.is_highlighted ? 'text-white/60' : isDark ? 'text-white/30' : 'text-gray-400'}`}>/mês</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 text-right">
                              <div className="flex items-center gap-1.5">
                                <svg className={`w-3 h-3 ${pkg.is_highlighted ? 'text-white/70' : isDark ? 'text-blue-400' : 'text-blue-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                <span className="font-semibold text-xs">{pkg.interactions} créditos/mês</span>
                              </div>
                              <span className={`text-[10px] ${pkg.is_highlighted ? 'text-white/60' : isDark ? 'text-white/40' : 'text-gray-400'}`}>
                                Google · Meta · Produção
                              </span>
                              {pkg.has_consultoria && (
                                <span className={`text-[10px] ${pkg.is_highlighted ? 'text-white/60' : isDark ? 'text-white/40' : 'text-gray-400'}`}>
                                  + Webapp · Consultoria
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* CORREÇÃO 3: Desktop — 2 colunas com features (igual ao código 2) */}
                    <div className="hidden sm:grid sm:grid-cols-2 gap-3">
                      {monthlyPlans.map((pkg) => (
                        <div
                          key={pkg.id}
                          className={`relative rounded-2xl transition-all duration-300 ${
                            pkg.is_highlighted
                              ? isDark
                                ? 'bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-xl shadow-blue-500/10'
                                : 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-xl shadow-blue-300/20'
                              : isDark
                                ? 'bg-slate-800/40 border border-white/5 backdrop-blur-sm'
                                : 'bg-white/80 border border-gray-100 backdrop-blur-sm shadow-sm'
                          }`}
                        >
                          {pkg.is_highlighted && (
                            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-950 text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-widest shadow-lg whitespace-nowrap">
                              Recomendado
                            </div>
                          )}

                          <div className="p-4 md:p-5 flex gap-4">
                            {/* Esquerda: nome + preço */}
                            <div className="flex flex-col justify-center min-w-[120px]">
                              <p className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${
                                pkg.is_highlighted ? 'text-blue-200' : isDark ? 'text-white/40' : 'text-gray-400'
                              }`}>Mensal</p>
                              <h3 className={`text-base font-bold mb-1 ${!pkg.is_highlighted && (isDark ? 'text-white' : 'text-gray-900')}`}>
                                {pkg.name}
                              </h3>
                              <div className="flex items-baseline gap-1">
                                <span className="text-xl font-bold">
                                  R$ {(pkg.price_cents / 100).toFixed(2).replace('.', ',')}
                                </span>
                                <span className={`text-xs ${pkg.is_highlighted ? 'text-white/60' : isDark ? 'text-white/30' : 'text-gray-400'}`}>/mês</span>
                              </div>
                            </div>

                            {/* Divisor vertical */}
                            <div className={`w-px self-stretch ${pkg.is_highlighted ? 'bg-white/15' : isDark ? 'bg-white/5' : 'bg-gray-100'}`} />

                            {/* Direita: features */}
                            <div className="flex-1 flex flex-col justify-center gap-1.5">
                              {[
                                `${pkg.interactions} créditos por mês`,
                                'Serviços Google',
                                'Serviços Meta',
                                'Linha de Produção',
                                'QR Codes com seu logo',
                                'Impressão Remota, Bluetooth ou Local',
                                ...(pkg.has_consultoria ? ['Webapp com subdomínio', 'Consultoria incluída'] : []),
                              ].map((feature, idx) => (
                                <div key={idx} className="flex items-center gap-1.5">
                                  <svg className={`w-3 h-3 flex-shrink-0 ${pkg.is_highlighted ? 'text-white' : isDark ? 'text-blue-400' : 'text-blue-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span className={`text-xs ${pkg.is_highlighted ? 'text-white/90' : isDark ? 'text-white/60' : 'text-gray-600'}`}>
                                    {feature}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CORREÇÃO 4: Card Plano Full — versão código 2 (gradient lime/purple com ícone e lista horizontal) */}
                <div className={`[@media(max-height:650px)_and_(max-width:767px)]:hidden`}>
                  <div className={`rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 transition-colors ${
                    isDark
                      ? 'bg-gradient-to-r from-lime-900/25 to-purple-900/15 border-lime-500/20'
                      : 'bg-gradient-to-r from-lime-50 to-purple-50 border-lime-200'
                  }`}>
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isDark ? 'bg-lime-500/20' : 'bg-lime-100'
                      }`}>
                        <svg className={`w-4 h-4 ${isDark ? 'text-lime-400' : 'text-lime-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
                        </svg>
                      </div>
                      <div>
                        <p className={`text-[9px] font-bold uppercase tracking-widest leading-none mb-0.5 ${isDark ? 'text-lime-400' : 'text-lime-600'}`}>
                          Plano Full
                        </p>
                        <p className={`text-[11px] font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                          Solução completa personalizada
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 flex-1">
                      {[
                        'Créditos Ilimitados',
                        'Landing Page Personalizada',
                        'Implementação incluída',
                        'White Label',
                        'Domínio e Subdomínios próprios',
                        'Configuração completa',
                        'Suporte 24 horas',
                      ].map((item) => (
                        <div key={item} className="flex items-center gap-1">
                          <svg className={`w-3 h-3 flex-shrink-0 ${isDark ? 'text-lime-400' : 'text-lime-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className={`text-[10px] ${isDark ? 'text-white/60' : 'text-gray-500'}`}>{item}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => window.open('https://wa.me/5511926828418?text=Olá!%20Tenho%20interesse%20no%20Plano%20Full%20e%20gostaria%20de%20saber%20mais%20detalhes.', '_blank')}
                      className={`flex-shrink-0 py-2 px-5 rounded-xl text-sm font-bold transition-all active:scale-95 whitespace-nowrap ${
                        isDark
                          ? 'bg-lime-600 text-white hover:bg-lime-500'
                          : 'bg-lime-600 text-white hover:bg-lime-700'
                      }`}
                    >
                      Falar com consultor
                    </button>
                  </div>
                </div>

                {/* Pacotes de Créditos */}
                <div>
                  <p className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 text-center ${
                    isDark ? 'text-blue-400/60' : 'text-blue-600/60'
                  }`}>Pacotes de Créditos</p>

                  {/* Mobile */}
                  <div className="flex flex-col gap-1.5 sm:hidden">
                    {creditPlans.map((pkg) => (
                      <div key={pkg.id} className={`relative rounded-xl ${
                        pkg.is_highlighted
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                          : isDark ? 'bg-slate-800/40 border border-white/5' : 'bg-white/80 border border-gray-100 shadow-sm'
                      }`}>
                        {pkg.is_highlighted && (
                          <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-950 text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest shadow-lg whitespace-nowrap">
                            Mais Popular
                          </div>
                        )}
                        <div className="px-4 py-2.5 flex items-center justify-between gap-4">
                          <div>
                            <p className={`text-xs font-semibold mb-0.5 ${!pkg.is_highlighted && (isDark ? 'text-white/70' : 'text-gray-500')}`}>{pkg.name}</p>
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
                      <div key={pkg.id} className={`relative rounded-2xl flex flex-col transition-all duration-300 ${
                        pkg.is_highlighted
                          ? isDark ? 'bg-gradient-to-b from-blue-600 to-blue-800 text-white shadow-xl scale-[1.02] z-10' : 'bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-xl scale-[1.02] z-10'
                          : isDark ? 'bg-slate-800/40 border border-white/5' : 'bg-white/80 border border-gray-100 shadow-sm'
                      }`}>
                        {pkg.is_highlighted && (
                          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-950 text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-widest shadow-lg whitespace-nowrap">
                            Mais Popular
                          </div>
                        )}
                        <div className="p-4 flex flex-col items-center text-center gap-2">
                          <h3 className={`text-sm font-semibold ${!pkg.is_highlighted && (isDark ? 'text-white' : 'text-gray-900')}`}>{pkg.name}</h3>
                          <span className="text-2xl font-bold">R$ {(pkg.price_cents / 100).toFixed(2).replace('.', ',')}</span>
                          <div className="space-y-1.5">
                            {/* Item 1: interações */}
                            <div className="flex items-center justify-center gap-2">
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${pkg.is_highlighted ? 'bg-white/20' : isDark ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
                                <svg className={`w-2.5 h-2.5 ${pkg.is_highlighted ? 'text-white' : isDark ? 'text-blue-400' : 'text-blue-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                              </div>
                              <span className={`text-xs font-semibold ${pkg.is_highlighted ? '' : isDark ? 'text-white/80' : 'text-gray-700'}`}>
                                {pkg.interactions.toLocaleString('pt-BR')} interações
                              </span>
                            </div>
                            {/* CORREÇÃO 5: Item 2 — ícone verde (igual ao código 2) */}
                            <div className="flex items-center justify-center gap-2">
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${pkg.is_highlighted ? 'bg-white/20' : isDark ? 'bg-green-500/10' : 'bg-green-50'}`}>
                                <svg className={`w-2.5 h-2.5 ${pkg.is_highlighted ? 'text-white' : isDark ? 'text-green-400' : 'text-green-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                              <span className={`text-xs ${pkg.is_highlighted ? 'opacity-90' : isDark ? 'text-white/55' : 'text-gray-500'}`}>
                                R$ {(pkg.price_per_interaction / 100).toFixed(2).replace('.', ',')} por interação
                              </span>
                            </div>
                            {/* Item 3: PIX */}
                            <div className="flex items-center justify-center gap-2">
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${pkg.is_highlighted ? 'bg-white/20' : isDark ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
                                <svg className={`w-2.5 h-2.5 ${pkg.is_highlighted ? 'text-white' : isDark ? 'text-blue-400' : 'text-blue-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                              <span className={`text-xs ${pkg.is_highlighted ? 'opacity-90' : isDark ? 'text-white/55' : 'text-gray-500'}`}>
                                Pagamento via PIX
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            ABA VENDAS
        ══════════════════════════════════════════════════════ */}
        {activeTab === 'vendas' && (
          <div className="w-full flex flex-col gap-2 sm:gap-3 animate-in fade-in duration-200">

            {/* Destaque principal: GRATUITO */}
            <div className={`rounded-2xl border p-4 sm:p-5 ${
              isDark ? 'bg-lime-500/5 border-lime-500/20' : 'bg-lime-50 border-lime-200'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-2xl sm:text-3xl font-black ${isDark ? 'text-lime-400' : 'text-lime-600'}`}>
                      Gratuito
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      isDark ? 'bg-lime-500/20 text-lime-400' : 'bg-lime-100 text-lime-700'
                    }`}>
                      para o lojista
                    </span>
                  </div>
                  <p className={`text-xs sm:text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                    Sem mensalidade, sem créditos, sem surpresa.
                    Você só paga quando vender.
                  </p>
                </div>
                <div className={`flex-shrink-0 text-center px-5 py-3 rounded-xl border ${
                  isDark ? 'bg-white/[0.03] border-lime-500/20' : 'bg-white border-lime-200'
                }`}>
                  <p className={`text-xl font-black ${isDark ? 'text-lime-400' : 'text-lime-600'}`}>10%</p>
                  <p className={`text-[10px] font-medium ${isDark ? 'text-white/40' : 'text-gray-400'}`}>por venda confirmada</p>
                  <p className={`text-[9px] mt-0.5 ${isDark ? 'text-white/25' : 'text-gray-300'}`}>descontado no saque</p>
                </div>
              </div>
            </div>

            {/* Integrações de pagamento */}
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 text-center ${
                isDark ? 'text-lime-400/60' : 'text-lime-600/60'
              }`}>
                Formas de recebimento
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { nome: 'PIX', sub: 'Banco Inter', detalhe: '10% no saque' },
                  { nome: 'NFC + Link', sub: 'InfinitePay', detalhe: 'Taxa da operadora' },
                  { nome: 'TEF', sub: 'Mercado Pago', detalhe: 'Taxa da operadora' },
                ].map(({ nome, sub, detalhe }) => (
                  <div key={nome} className={`flex flex-col items-center text-center p-2.5 sm:p-3 rounded-xl border ${
                    isDark ? 'bg-white/[0.02] border-white/6' : 'bg-white/80 border-gray-100 shadow-sm'
                  }`}>
                    <span className={`text-xs sm:text-sm font-bold mb-0.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>{nome}</span>
                    <span className={`text-[10px] font-medium ${isDark ? 'text-lime-400/80' : 'text-lime-600'}`}>{sub}</span>
                    <span className={`text-[9px] mt-0.5 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>{detalhe}</span>
                  </div>
                ))}
              </div>
              <p className={`text-[9px] text-center mt-1.5 ${isDark ? 'text-white/20' : 'text-gray-300'}`}>
                * Taxas de InfinitePay e Mercado Pago são cobradas diretamente por cada operadora, separadas da comissão da minhAi.
              </p>
            </div>

            {/* Funções disponíveis */}
            <div className={`[@media(max-height:650px)_and_(max-width:767px)]:hidden`}>
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 text-center ${
                isDark ? 'text-lime-400/60' : 'text-lime-600/60'
              }`}>
                18 funções incluídas — ative ou desative no painel
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5">
                {FUNCOES_VENDAS.map(({ label, desc }) => (
                  <div
                    key={label}
                    title={desc}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[10px] font-medium ${
                      isDark ? 'bg-white/[0.03] border-white/6 text-white/60' : 'bg-white/80 border-gray-100 text-gray-600'
                    }`}
                  >
                    <svg className={`w-2.5 h-2.5 flex-shrink-0 ${
                      ${isDark ? 'text-lime-400/60' : 'text-lime-600/60'
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="truncate">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
              <a
                href="/login"
                className="w-full sm:w-auto px-6 py-2.5 bg-lime-500 text-white rounded-full font-bold text-xs sm:text-sm text-center shadow-lg hover:brightness-110 hover:scale-105 transition-all duration-300"
              >
                Criar meu assistente Vendas grátis
              </a>
              <button
                onClick={() => window.open('https://wa.me/5511926828418?text=Quero%20saber%20mais%20sobre%20o%20minhAi%20Vendas', '_blank')}
                className={`w-full sm:w-auto px-6 py-2.5 border-2 rounded-full font-bold text-xs sm:text-sm text-center hover:scale-105 transition-all duration-300 ${
                  isDark ? 'border-lime-500/50 text-lime-400 hover:bg-lime-500/10' : 'border-lime-500/50 text-lime-600 hover:bg-lime-50'
                }`}
              >
                Falar com consultor
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
