'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { User } from '@supabase/supabase-js';
import { Check, Zap, Star, TrendingUp, Shield, Clock, Globe, Users, Printer, Sparkles, QrCode } from 'lucide-react';
import PaymentModal from '@/components/PaymentModal';
import { useTheme } from 'next-themes';
import { useSearchParams } from 'next/navigation';

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

interface UserCredits {
  available_credits: number;
  total_purchased: number;
  total_used: number;
  has_active_plan: boolean;
  plan_expires_at: string | null;
  active_plan_name: string | null;
}

interface PaymentData {
  payment_id: string;
  pix_code: string;
  pix_qrcode?: string;
  amount: number;
  packageName: string;
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

export default function CreditsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'smart' | 'vendas'>('smart');

  const { resolvedTheme } = useTheme();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const requiresPlan = searchParams.get('requires_plan') === '1';
  const successParam = searchParams.get('success');

  useEffect(() => {
    if (successParam === 'true' && user) {
      const reload = async () => {
        const { data } = await supabase
          .from('user_credits')
          .select('*')
          .eq('user_id', user.id)
          .single();
        if (data) setCredits(data);
      };
      reload();
    }
  }, [successParam, user]);

  useEffect(() => {
    setMounted(true);
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, [supabase]);

  useEffect(() => {
    const loadPackages = async () => {
      const { data } = await supabase
        .from('credits_packages')
        .select('*')
        .eq('is_active', true)
        .gt('price_cents', 0)
        .order('display_order');
      setPackages(data || []);
    };
    loadPackages();
  }, [supabase]);

  useEffect(() => {
    const loadCredits = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', user.id)
        .single();
      setCredits(data || {
        available_credits: 20,
        total_purchased: 0,
        total_used: 0,
        has_active_plan: false,
        plan_expires_at: null,
        active_plan_name: null,
      });
      setLoading(false);
    };
    if (user) loadCredits();
  }, [user, supabase]);

  const handlePurchase = async (packageId: string) => {
    if (!user) {
      alert('Você precisa estar logado');
      return;
    }
    try {
      setPurchasing(packageId);
      const response = await fetch('/api/credits/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package_id: packageId }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erro ao processar compra');
      }
      const selectedPackage = packages.find(p => p.id === packageId);
      setPaymentData({
        payment_id: data.payment_id,
        pix_code: data.pix_code,
        pix_qrcode: data.pix_qrcode,
        amount: data.amount,
        packageName: selectedPackage?.name || 'Pacote',
      });
      setIsModalOpen(true);
    } catch (error) {
      console.error('Erro ao comprar:', error);
      alert(error instanceof Error ? error.message : 'Erro ao processar compra');
    } finally {
      setPurchasing(null);
    }
  };

  if (!mounted || loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-32 rounded-2xl bg-gray-200 dark:bg-slate-800/50" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map(i => <div key={i} className="h-48 rounded-2xl bg-gray-200 dark:bg-slate-800/50" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-96 rounded-2xl bg-gray-200 dark:bg-slate-800/50" />)}
        </div>
      </div>
    );
  }

  const isDark = resolvedTheme === 'dark';
  const monthlyPlans = packages.filter(p => p.package_type === 'monthly');
  const creditPlans = packages.filter(p => p.package_type === 'credits');

  const hasActivePlan =
    credits?.has_active_plan === true &&
    credits?.plan_expires_at != null &&
    new Date(credits.plan_expires_at) > new Date();

  const isTrial = hasActivePlan && credits?.active_plan_name === 'Trial';

  const trialDaysLeft = isTrial && credits?.plan_expires_at
    ? Math.ceil((new Date(credits.plan_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const planExpiresFormatted = credits?.plan_expires_at
    ? new Date(credits.plan_expires_at).toLocaleDateString('pt-BR')
    : null;

  return (
    <div className="space-y-8">

      {/* Aviso de plano necessário */}
      {requiresPlan && (
        <div className={`rounded-2xl p-4 border flex items-center gap-3 ${
          isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          <Sparkles className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">
            Essa seção requer um <strong>Plano Mensal</strong> ativo. Escolha um plano abaixo para liberar o acesso.
          </p>
        </div>
      )}

      {/* Banner de trial ativo */}
      {isTrial && (
        <div className={`rounded-2xl p-4 border flex items-center gap-3 ${
          isDark
            ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
            : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          <Star className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">
            Você está no <strong>período de teste gratuito</strong> — {trialDaysLeft} {trialDaysLeft === 1 ? 'dia restante' : 'dias restantes'} (até {planExpiresFormatted}). Assine um plano mensal para continuar com acesso total aos Serviços Google, Serviços Meta e Assistente de Produção.
          </p>
        </div>
      )}

      {/* Header com Stats */}
      <div className={`rounded-3xl shadow-lg p-8 border transition-all ${
        isDark ? 'bg-slate-900/40 border-white/10 backdrop-blur-xl' : 'bg-white border-gray-200'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <div className="flex-1">
            <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Gerenciamento de Créditos
            </h1>
            <p className={`text-lg ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
              Escolha o pacote ideal para suas necessidades
            </p>

            {hasActivePlan && (
              <div className={`mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
                isTrial
                  ? isDark
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                  : isDark
                    ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                    : 'bg-green-50 text-green-700 border border-green-200'
              }`}>
                <div className={`w-2 h-2 rounded-full animate-pulse ${isTrial ? 'bg-amber-500' : 'bg-green-500'}`} />
                {isTrial
                  ? `Período de teste — expira em ${planExpiresFormatted}`
                  : `Plano ${credits?.active_plan_name} ativo — expira em ${planExpiresFormatted}`
                }
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
            <div className={`rounded-2xl p-4 border transition-colors ${isDark ? 'bg-green-500/10 border-green-500/20' : 'bg-green-50 border-green-200'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Zap className={`w-4 h-4 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                <p className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-green-300' : 'text-green-900'}`}>Disponíveis</p>
              </div>
              <p className={`text-3xl font-bold ${isDark ? 'text-green-400' : 'text-green-700'}`}>{credits?.available_credits || 0}</p>
            </div>

            <div className={`rounded-2xl p-4 border transition-colors ${isDark ? 'bg-slate-800/50 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className={`w-4 h-4 ${isDark ? 'text-white/60' : 'text-gray-600'}`} />
                <p className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-white/70' : 'text-gray-900'}`}>Utilizados</p>
              </div>
              <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-700'}`}>{credits?.total_used || 0}</p>
            </div>

            <div className={`rounded-2xl p-4 border transition-colors ${isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Shield className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                <p className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-blue-300' : 'text-blue-900'}`}>Comprados</p>
              </div>
              <p className={`text-3xl font-bold ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>{credits?.total_purchased || 0}</p>
            </div>
          </div>
        </div>

        <div className={`mt-8 rounded-xl p-4 border transition-colors ${isDark ? 'bg-blue-500/5 border-blue-500/20' : 'bg-blue-50 border-blue-100'}`}>
          <p className={`text-sm text-center ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>
            <Star className="w-4 h-4 inline-block mr-2 mb-1" />
            <strong>Compartilhamento Inteligente:</strong> Seus créditos são automaticamente compartilhados entre todas as suas empresas.
          </p>
        </div>
      </div>

      {/* ── Seletor de abas Smart / Vendas ─────────────────────── */}
      <div className="flex justify-center">
        <div className={`flex items-center gap-1 p-1 rounded-2xl ${
          isDark ? 'bg-white/5' : 'bg-gray-100'
        }`}>
          {/* Smart */}
          <button
            onClick={() => setActiveTab('smart')}
            className={`
              relative flex items-center gap-2 px-5 py-2.5 rounded-xl
              text-sm font-bold transition-all duration-300
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
            <span className={`text-xs font-normal ${activeTab === 'smart' ? 'opacity-70' : 'opacity-50'}`}>
              créditos por uso
            </span>
          </button>

          {/* Vendas */}
          <button
            onClick={() => setActiveTab('vendas')}
            className={`
              relative flex items-center gap-2 px-5 py-2.5 rounded-xl
              text-sm font-bold transition-all duration-300
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
              text-xs font-bold px-2 py-0.5 rounded-full
              ${activeTab === 'vendas'
                ? 'bg-white/20 text-white'
                : isDark ? 'bg-lime-500/20 text-lime-400' : 'bg-lime-100 text-lime-700'
              }
            `}>
              GRÁTIS
            </span>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          ABA SMART
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'smart' && (
        <div className="space-y-8 animate-in fade-in duration-200">

          {/* PLANOS MENSAIS */}
          {monthlyPlans.length > 0 && (
            <>
              <div className="text-center">
                <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Planos com Acesso às Integrações
                </h2>
                <p className={`text-sm mt-1 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                  Libera Serviços Google, Meta e Linha de Produção e QR Codes com seu logo. Inclui créditos mensais.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {monthlyPlans.map((pkg) => (
                  <div
                    key={pkg.id}
                    className={`relative rounded-2xl transition-all duration-300 ${
                      pkg.is_highlighted
                        ? isDark ? 'bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-xl' : 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-xl'
                        : isDark ? 'bg-slate-900/40 border border-white/10 hover:border-blue-500/50' : 'bg-white border border-gray-200 hover:border-blue-300 shadow-sm'
                    }`}
                  >
                    {pkg.is_highlighted && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-950 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-lg whitespace-nowrap">
                        Recomendado
                      </div>
                    )}

                    {hasActivePlan && !isTrial && credits?.active_plan_name === pkg.name && (
                      <div className="absolute -top-4 right-6 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg whitespace-nowrap">
                        ✓ Ativo
                      </div>
                    )}

                    <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6">
                      <div className="flex-1">
                        <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${pkg.is_highlighted ? 'text-blue-200' : isDark ? 'text-white/40' : 'text-gray-400'}`}>Plano</p>
                        <h3 className={`text-2xl font-bold mb-1 ${!pkg.is_highlighted && (isDark ? 'text-white' : 'text-gray-900')}`}>{pkg.name}</h3>
                        <div className="flex items-baseline gap-1 mb-4">
                          <span className="text-3xl font-bold">R$ {(pkg.price_cents / 100).toFixed(2).replace('.', ',')}</span>
                          <span className={`text-sm ${pkg.is_highlighted ? 'text-white/70' : isDark ? 'text-white/40' : 'text-gray-400'}`}>/mês</span>
                        </div>

                        <button
                          onClick={() => handlePurchase(pkg.id)}
                          disabled={purchasing !== null}
                          className={`w-full py-3 px-6 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 ${
                            pkg.is_highlighted ? 'bg-white text-blue-700 hover:bg-blue-50 shadow-lg' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {purchasing === pkg.id ? (
                            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : hasActivePlan && !isTrial && credits?.active_plan_name === pkg.name
                            ? 'Renovar Plano'
                            : isTrial
                              ? 'Assinar e Continuar'
                              : 'Assinar Agora'
                          }
                        </button>
                      </div>

                      <div className={`hidden md:block w-px self-stretch ${pkg.is_highlighted ? 'bg-white/20' : isDark ? 'bg-white/10' : 'bg-gray-100'}`} />

                      <div className="flex-1 grid grid-cols-1 gap-3">
                        {[
                          { icon: Zap, label: `${pkg.interactions} créditos por mês` },
                          { icon: Globe, label: 'Serviços Google' },
                          { icon: Users, label: 'Serviços Meta' },
                          { icon: TrendingUp, label: 'Linha de Produção' },
                          { icon: QrCode, label: 'QR Codes com o seu logo' },
                          { icon: Printer, label: 'Impressão Remota, Bluetooth ou Local' },
                          ...(pkg.has_consultoria ? [
                            { icon: Star, label: 'Subdomínio Próprio' },
                            { icon: Shield, label: 'Consultoria' }
                          ] : [])
                        ].map((feature, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <feature.icon className={`w-4 h-4 ${pkg.is_highlighted ? 'text-white' : 'text-blue-500'}`} />
                            <span className={`text-sm ${pkg.is_highlighted ? 'text-white/90' : isDark ? 'text-white/70' : 'text-gray-600'}`}>{feature.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* CARD PLANO FULL */}
          <div className={`rounded-2xl border px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4 transition-colors ${
            isDark
              ? 'bg-gradient-to-r from-lime-900/30 to-purple-900/20 border-lime-500/20'
              : 'bg-gradient-to-r from-lime-50 to-purple-50 border-lime-200'
          }`}>
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isDark ? 'bg-lime-500/20' : 'bg-lime-100'
              }`}>
                <Sparkles className={`w-5 h-5 ${isDark ? 'text-lime-400' : 'text-lime-600'}`} />
              </div>
              <div>
                <p className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-lime-400' : 'text-lime-700'}`}>
                  Plano Full
                </p>
                <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Solução completa personalizada
                </p>
              </div>
            </div>
            <div className={`hidden sm:block w-px self-stretch ${isDark ? 'bg-lime-500/20' : 'bg-lime-200'}`} />
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 flex-1">
              {[
                'Créditos Ilimitados',
                'Landing Page Personalizada',
                'Implementação incluída',
                'White Label',
                'Domínio e Subdomínios próprios',
                'Configuração completa',
                'Suporte 24 horas',
              ].map((item) => (
                <div key={item} className="flex items-center gap-1.5">
                  <Check className={`w-3.5 h-3.5 flex-shrink-0 ${isDark ? 'text-lime-400' : 'text-lime-600'}`} />
                  <span className={`text-xs ${isDark ? 'text-white/70' : 'text-gray-600'}`}>{item}</span>
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

          {/* PACOTES DE CRÉDITOS */}
          <div className="text-center">
            <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Pacotes de Créditos
            </h2>
            <p className={`text-sm mt-1 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
              Créditos avulsos, sem mensalidade. Não expiram.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {creditPlans.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative rounded-2xl transition-all duration-300 flex flex-col ${
                  pkg.is_highlighted
                    ? isDark ? 'bg-gradient-to-b from-blue-600 to-blue-800 text-white shadow-xl scale-105 z-10' : 'bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-xl scale-105 z-10'
                    : isDark ? 'bg-slate-900/40 border border-white/10 hover:border-blue-500/50' : 'bg-white border border-gray-200 hover:border-blue-300 shadow-sm'
                }`}
              >
                {pkg.is_highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-950 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
                    Mais Popular
                  </div>
                )}

                <div className="p-8 flex-1 flex flex-col items-center text-center">
                  <h3 className={`text-xl font-bold mb-2 ${!pkg.is_highlighted && (isDark ? 'text-white' : 'text-gray-900')}`}>{pkg.name}</h3>
                  <p className="text-3xl font-bold mb-6">R$ {(pkg.price_cents / 100).toFixed(2).replace('.', ',')}</p>

                  <div className="space-y-4 mb-8 flex-1">
                    <div className="flex items-center gap-3">
                      <Zap className={`w-4 h-4 ${pkg.is_highlighted ? 'text-white' : 'text-blue-500'}`} />
                      <span className="font-bold">{pkg.interactions.toLocaleString('pt-BR')} Créditos</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm opacity-90">
                      <Clock className={`w-4 h-4 ${pkg.is_highlighted ? 'text-white' : 'text-blue-500'}`} />
                      <span>Não expiram</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handlePurchase(pkg.id)}
                    disabled={purchasing !== null}
                    className={`w-full py-4 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 ${
                      pkg.is_highlighted ? 'bg-white text-blue-700 hover:bg-blue-50 shadow-lg' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {purchasing === pkg.id ? (
                      <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : 'Selecionar'}
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          ABA VENDAS
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'vendas' && (
        <div className="space-y-8 animate-in fade-in duration-200">

          {/* Destaque principal: GRATUITO */}
          <div className={`rounded-2xl border p-6 md:p-8 ${
            isDark ? 'bg-lime-500/5 border-lime-500/20' : 'bg-lime-50 border-lime-200'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`text-4xl font-black ${isDark ? 'text-lime-400' : 'text-lime-600'}`}>
                    Gratuito
                  </span>
                  <span className={`text-sm px-3 py-1 rounded-full font-bold ${
                    isDark ? 'bg-lime-500/20 text-lime-400' : 'bg-lime-100 text-lime-700'
                  }`}>
                    para o lojista
                  </span>
                </div>
                <p className={`text-base ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                  Sem mensalidade, sem créditos, sem surpresa.
                  Você só paga quando vender.
                  Tenha uma IA focada em atender, vender e cobrar 24 horas!
                </p>
              </div>
              <div className={`flex-shrink-0 text-center px-8 py-5 rounded-2xl border ${
                isDark ? 'bg-white/[0.03] border-lime-500/20' : 'bg-white border-lime-200'
              }`}>
                <p className={`text-4xl font-black ${isDark ? 'text-lime-400' : 'text-lime-600'}`}>10%</p>
                <p className={`text-sm font-medium mt-1 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>por venda confirmada</p>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-white/25' : 'text-gray-300'}`}>descontado no saque</p>
              </div>
            </div>
          </div>

          {/* Integrações de pagamento */}
          <div>
            <div className="text-center mb-4">
              <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Formas de recebimento
              </h2>
              <p className={`text-sm mt-1 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                Receba pelo método que preferir, direto no seu celular.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { nome: 'PIX', sub: 'Banco Inter', detalhe: '10% descontado no saque', icon: '⚡' },
                { nome: 'NFC + Link de Pagamento', sub: 'InfinitePay', detalhe: 'Taxa da operadora', icon: '📲' },
                { nome: 'TEF (Maquininha)', sub: 'Mercado Pago', detalhe: 'Taxa da operadora', icon: '💳' },
              ].map(({ nome, sub, detalhe, icon }) => (
                <div key={nome} className={`flex flex-col items-center text-center p-5 rounded-2xl border ${
                  isDark ? 'bg-white/[0.02] border-white/8' : 'bg-white border-gray-100 shadow-sm'
                }`}>
                  <span className="text-3xl mb-2">{icon}</span>
                  <span className={`text-base font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{nome}</span>
                  <span className={`text-sm font-medium ${isDark ? 'text-lime-400/80' : 'text-lime-600'}`}>{sub}</span>
                  <span className={`text-xs mt-1 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>{detalhe}</span>
                </div>
              ))}
            </div>
            <p className={`text-xs text-center mt-3 ${isDark ? 'text-white/20' : 'text-gray-300'}`}>
              * Taxas de InfinitePay e Mercado Pago são cobradas diretamente por cada operadora, separadas da comissão da minhAi.
            </p>
          </div>

          {/* Funções disponíveis */}
          <div>
            <div className="text-center mb-4">
              <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                18 funções incluídas
              </h2>
              <p className={`text-sm mt-1 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                Ative ou desative cada função no painel quando quiser.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {FUNCOES_VENDAS.map(({ label, desc }) => (
                <div
                  key={label}
                  title={desc}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium ${
                    isDark ? 'bg-white/[0.03] border-white/8 text-white/60' : 'bg-white border-gray-100 text-gray-600 shadow-sm'
                  }`}
                >
                  <Check className={`w-3.5 h-3.5 flex-shrink-0 ${isDark ? 'text-lime-400/60' : 'text-lime-600/60'}`} />
                  <span className="truncate text-xs">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className={`rounded-2xl border p-6 flex flex-col sm:flex-row items-center justify-between gap-4 ${
            isDark ? 'bg-lime-500/5 border-lime-500/20' : 'bg-lime-50 border-lime-200'
          }`}>
            <div>
              <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Pronto para começar a vender?
              </p>
              <p className={`text-sm mt-0.5 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                Crie seu assistente de vendas agora — é totalmente gratuito.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
              <a
                href="/login"
                className="px-6 py-3 bg-lime-500 text-white rounded-xl font-bold text-sm text-center shadow-lg hover:brightness-110 hover:scale-105 transition-all duration-300 whitespace-nowrap"
              >
                Criar assistente Vendas grátis
              </a>
              <button
                onClick={() => window.open('https://wa.me/5511926828418?text=Quero%20saber%20mais%20sobre%20o%20minhAi%20Vendas', '_blank')}
                className={`px-6 py-3 border-2 rounded-xl font-bold text-sm text-center hover:scale-105 transition-all duration-300 whitespace-nowrap ${
                  isDark ? 'border-lime-500/50 text-lime-400 hover:bg-lime-500/10' : 'border-lime-500/50 text-lime-600 hover:bg-lime-50'
                }`}
              >
                Falar com consultor
              </button>
            </div>
          </div>

        </div>
      )}

      {/* Payment Modal */}
      {paymentData && (
        <PaymentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          paymentId={paymentData.payment_id}
          pixCode={paymentData.pix_code}
          qrCodeUrl={paymentData.pix_qrcode}
          amount={paymentData.amount}
          packageName={paymentData.packageName}
          theme={isDark ? 'dark' : 'light'}
        />
      )}
    </div>
  );
}
