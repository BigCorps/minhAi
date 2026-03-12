'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { User } from '@supabase/supabase-js';
import { Check, Zap, Star, TrendingUp, Shield, Clock, Globe, Users, Sparkles } from 'lucide-react';
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

export default function CreditsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { resolvedTheme } = useTheme();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const requiresPlan = searchParams.get('requires_plan') === '1';

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

  // Verificar se plano ativo ainda é válido
  const hasActivePlan =
    credits?.has_active_plan === true &&
    credits?.plan_expires_at != null &&
    new Date(credits.plan_expires_at) > new Date();

  const planExpiresFormatted = credits?.plan_expires_at
    ? new Date(credits.plan_expires_at).toLocaleDateString('pt-BR')
    : null;

  return (
    <div className="space-y-8">

      {/* Aviso de plano necessário (vindo do redirect do middleware) */}
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

      {/* Header com Stats */}
      <div className={`rounded-3xl shadow-lg p-8 border transition-all ${
        isDark
          ? 'bg-slate-900/40 border-white/10 backdrop-blur-xl'
          : 'bg-white border-gray-200'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <div className="flex-1">
            <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Gerenciamento de Créditos
            </h1>
            <p className={`text-lg ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
              Escolha o pacote ideal para suas necessidades
            </p>

            {/* Status do plano ativo */}
            {hasActivePlan && (
              <div className={`mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
                isDark ? 'bg-green-500/15 text-green-400 border border-green-500/20' : 'bg-green-50 text-green-700 border border-green-200'
              }`}>
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Plano {credits?.active_plan_name} ativo — expira em {planExpiresFormatted}
              </div>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
            <div className={`rounded-2xl p-4 border transition-colors ${
              isDark ? 'bg-green-500/10 border-green-500/20' : 'bg-green-50 border-green-200'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <Zap className={`w-4 h-4 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                <p className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-green-300' : 'text-green-900'}`}>
                  Disponíveis
                </p>
              </div>
              <p className={`text-3xl font-bold ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                {credits?.available_credits || 0}
              </p>
            </div>

            <div className={`rounded-2xl p-4 border transition-colors ${
              isDark ? 'bg-slate-800/50 border-white/10' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className={`w-4 h-4 ${isDark ? 'text-white/60' : 'text-gray-600'}`} />
                <p className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-white/70' : 'text-gray-900'}`}>
                  Utilizados
                </p>
              </div>
              <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-700'}`}>
                {credits?.total_used || 0}
              </p>
            </div>

            <div className={`rounded-2xl p-4 border transition-colors ${
              isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <Shield className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                <p className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-blue-300' : 'text-blue-900'}`}>
                  Comprados
                </p>
              </div>
              <p className={`text-3xl font-bold ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                {credits?.total_purchased || 0}
              </p>
            </div>
          </div>
        </div>

        <div className={`mt-8 rounded-xl p-4 border transition-colors ${
          isDark ? 'bg-blue-500/5 border-blue-500/20' : 'bg-blue-50 border-blue-100'
        }`}>
          <p className={`text-sm text-center ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>
            <Star className="w-4 h-4 inline-block mr-2 mb-1" />
            <strong>Compartilhamento Inteligente:</strong> Seus créditos são automaticamente compartilhados entre todas as suas empresas.
          </p>
        </div>
      </div>

      {/* ====================================================
          PLANOS MENSAIS — 2 cards deitados
      ==================================================== */}
      {monthlyPlans.length > 0 && (
        <div>
          <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Planos com Acesso às Integrações
          </h2>
          <p className={`text-sm mb-6 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
            Libera Serviços Google, Serviços Meta e Linha de Produção. Renova mensalmente e inclui créditos todo mês.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {monthlyPlans.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative rounded-2xl transition-all duration-300 ${
                  pkg.is_highlighted
                    ? isDark
                      ? 'bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-xl'
                      : 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-xl'
                    : isDark
                      ? 'bg-slate-900/40 border border-white/10 hover:border-blue-500/50'
                      : 'bg-white border border-gray-200 hover:border-blue-300 shadow-sm'
                }`}
              >
                {pkg.is_highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-950 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-lg whitespace-nowrap">
                    Recomendado
                  </div>
                )}

                {/* Badge de plano ativo */}
                {hasActivePlan && credits?.active_plan_name === pkg.name && (
                  <div className="absolute -top-4 right-6 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg whitespace-nowrap">
                    ✓ Ativo
                  </div>
                )}

                <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6">
                  {/* Coluna esquerda: nome + preço + botão */}
                  <div className="flex flex-col justify-between gap-4 md:min-w-[200px]">
                    <div>
                      <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${
                        pkg.is_highlighted ? 'text-blue-200' : isDark ? 'text-white/40' : 'text-gray-400'
                      }`}>
                        Plano
                      </p>
                      <h3 className={`text-2xl font-bold mb-1 ${
                        !pkg.is_highlighted && (isDark ? 'text-white' : 'text-gray-900')
                      }`}>
                        {pkg.name}
                      </h3>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold">
                          R$ {(pkg.price_cents / 100).toFixed(2).replace('.', ',')}
                        </span>
                        <span className={`text-sm ${pkg.is_highlighted ? 'text-white/70' : isDark ? 'text-white/40' : 'text-gray-400'}`}>
                          /mês
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handlePurchase(pkg.id)}
                      disabled={purchasing !== null}
                      className={`py-3 px-6 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 ${
                        pkg.is_highlighted
                          ? 'bg-white text-blue-700 hover:bg-blue-50 shadow-lg'
                          : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {purchasing === pkg.id ? (
                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : hasActivePlan && credits?.active_plan_name === pkg.name ? (
                        'Renovar Plano'
                      ) : (
                        'Assinar Agora'
                      )}
                    </button>
                  </div>

                  {/* Divisor */}
                  <div className={`hidden md:block w-px self-stretch ${
                    pkg.is_highlighted ? 'bg-white/20' : isDark ? 'bg-white/10' : 'bg-gray-100'
                  }`} />

                  {/* Coluna direita: features */}
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { icon: Zap, label: `${pkg.interactions} créditos por mês` },
                      { icon: Globe, label: 'Serviços Google liberado' },
                      { icon: Users, label: 'Serviços Meta liberado' },
                      { icon: TrendingUp, label: 'Linha de Produção liberada' },
                      ...(pkg.has_consultoria ? [
                        { icon: Star, label: 'Webapp com subdomínio próprio' },
                        { icon: Shield, label: 'Consultoria de implementação' },
                      ] : []),
                    ].map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                          pkg.is_highlighted ? 'bg-white/20' : isDark ? 'bg-blue-500/10' : 'bg-blue-50'
                        }`}>
                          <feature.icon className={`w-3 h-3 ${
                            pkg.is_highlighted ? 'text-white' : isDark ? 'text-blue-400' : 'text-blue-500'
                          }`} />
                        </div>
                        <span className={`text-sm ${
                          pkg.is_highlighted ? 'text-white/90' : isDark ? 'text-white/70' : 'text-gray-600'
                        }`}>
                          {feature.label}
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

      {/* ====================================================
          PACOTES DE CRÉDITOS — 4 cards verticais
      ==================================================== */}
      <div>
        <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Pacotes de Créditos
        </h2>
        <p className={`text-sm mb-6 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
          Créditos avulsos, sem mensalidade. Não expiram.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {creditPlans.map((pkg) => (
            <div
              key={pkg.id}
              className={`relative rounded-2xl transition-all duration-300 flex flex-col ${
                pkg.is_highlighted
                  ? isDark
                    ? 'bg-gradient-to-b from-blue-600 to-blue-800 text-white shadow-xl scale-105 z-10'
                    : 'bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-xl scale-105 z-10'
                  : isDark
                    ? 'bg-slate-900/40 border border-white/10 hover:border-blue-500/50'
                    : 'bg-white border border-gray-200 hover:border-blue-300 shadow-sm'
              }`}
            >
              {pkg.is_highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-950 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
                  Mais Popular
                </div>
              )}

              <div className="p-8 flex-1 flex flex-col items-center text-center">
                <div className="mb-6">
                  <h3 className={`text-xl font-bold mb-2 ${!pkg.is_highlighted && (isDark ? 'text-white' : 'text-gray-900')}`}>
                    {pkg.name}
                  </h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-bold">
                      R$ {(pkg.price_cents / 100).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>

                <div className="space-y-4 mb-8 flex-1">
                  <div className="flex items-center justify-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${pkg.is_highlighted ? 'bg-white/20' : 'bg-blue-500/10'}`}>
                      <Zap className={`w-3 h-3 ${pkg.is_highlighted ? 'text-white' : 'text-blue-500'}`} />
                    </div>
                    <span className="font-bold">{pkg.interactions.toLocaleString('pt-BR')} Interações</span>
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${pkg.is_highlighted ? 'bg-white/20' : 'bg-blue-500/10'}`}>
                      <Check className={`w-3 h-3 ${pkg.is_highlighted ? 'text-white' : 'text-blue-500'}`} />
                    </div>
                    <span className="text-sm opacity-90">
                      R$ {(pkg.price_per_interaction / 100).toFixed(2).replace('.', ',')} / interação
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${pkg.is_highlighted ? 'bg-white/20' : 'bg-blue-500/10'}`}>
                      <Clock className={`w-3 h-3 ${pkg.is_highlighted ? 'text-white' : 'text-blue-500'}`} />
                    </div>
                    <span className="text-sm opacity-90">Créditos não expiram</span>
                  </div>
                </div>

                <button
                  onClick={() => handlePurchase(pkg.id)}
                  disabled={purchasing !== null}
                  className={`w-full py-4 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 ${
                    pkg.is_highlighted
                      ? 'bg-white text-blue-700 hover:bg-blue-50 shadow-lg'
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {purchasing === pkg.id ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Selecionar Plano'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

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
