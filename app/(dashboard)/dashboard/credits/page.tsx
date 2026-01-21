'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { User } from '@supabase/supabase-js';
import { Check, Zap, Star, TrendingUp, Shield, Clock, ArrowLeft } from 'lucide-react';
import PaymentModal from '@/components/PaymentModal';

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

interface UserCredits {
  available_credits: number;
  total_purchased: number;
  total_used: number;
}

interface PaymentData {
  payment_id: string;
  pix_code: string;
  pix_qrcode?: string;
  amount: number;
  packageName: string;
}

export default function CreditsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // ✅ Tema Light/Dark
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const supabase = createClient();

  // Detectar tema do sistema
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    if (mediaQuery.matches) {
      setTheme('light');
    }
  }, []);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  useEffect(() => {
    const loadPackages = async () => {
      const { data } = await supabase
        .from('credits_packages')
        .select('*')
        .eq('is_active', true)
        .gt('price_cents', 0) // ✅ Excluir plano grátis (price > 0)
        .order('display_order');
      
      setPackages(data || []);
    };
    loadPackages();
  }, []);

  useEffect(() => {
    const loadCredits = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      setCredits(data || { available_credits: 20, total_purchased: 0, total_used: 0 });
      setLoading(false);
    };

    if (user) {
      loadCredits();
    }
  }, [user]);

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
        body: JSON.stringify({ package_id: packageId })
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
        packageName: selectedPackage?.name || 'Pacote'
      });
      setIsModalOpen(true);

    } catch (error) {
      console.error('Erro ao comprar:', error);
      alert(error instanceof Error ? error.message : 'Erro ao processar compra');
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen p-8 ${theme === 'dark' ? 'bg-slate-950' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className={`h-32 rounded-2xl ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1,2,3,4].map(i => (
                <div key={i} className={`h-96 rounded-2xl ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const mainPlans = packages.filter(p => p.display_order < 10);

  return (
    <>
      <div className={`min-h-screen transition-colors duration-500 ${
        theme === 'dark' ? 'bg-slate-950' : 'bg-gray-50'
      }`}>
        
        {/* Botão Toggle Tema */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className={`fixed top-6 right-6 z-40 p-3 rounded-full backdrop-blur-xl border transition-all hover:scale-110 ${
            theme === 'dark'
              ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
              : 'bg-black/5 border-black/10 text-black hover:bg-black/10'
          }`}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          
          {/* Botão Voltar */}
          <button
            onClick={() => router.push('/dashboard')}
            className={`flex items-center gap-2 mb-6 px-4 py-2 rounded-lg transition ${
              theme === 'dark'
                ? 'text-white/70 hover:text-white hover:bg-white/5'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar ao Dashboard
          </button>

          {/* Header com Stats */}
          <div className={`rounded-3xl shadow-2xl p-8 mb-12 border transition-colors ${
            theme === 'dark'
              ? 'bg-slate-900/50 border-white/10 backdrop-blur-xl'
              : 'bg-white border-gray-200'
          }`}>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
              
              <div className="flex-1">
                <h1 className={`text-4xl font-bold mb-2 transition-colors ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Gerenciamento de Créditos
                </h1>
                <p className={`text-lg transition-colors ${
                  theme === 'dark' ? 'text-white/60' : 'text-gray-600'
                }`}>
                  Escolha o plano ideal para suas necessidades
                </p>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-4 lg:gap-6">
                <div className={`rounded-2xl p-4 border transition-colors ${
                  theme === 'dark'
                    ? 'bg-green-500/10 border-green-500/20'
                    : 'bg-green-50 border-green-200'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className={`w-4 h-4 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-green-300' : 'text-green-900'}`}>
                      Disponíveis
                    </p>
                  </div>
                  <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-green-400' : 'text-green-700'}`}>
                    {credits?.available_credits || 0}
                  </p>
                </div>

                <div className={`rounded-2xl p-4 border transition-colors ${
                  theme === 'dark'
                    ? 'bg-slate-800/50 border-white/10'
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className={`w-4 h-4 ${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`} />
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white/70' : 'text-gray-900'}`}>
                      Utilizados
                    </p>
                  </div>
                  <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                    {credits?.total_used || 0}
                  </p>
                </div>

                <div className={`rounded-2xl p-4 border transition-colors ${
                  theme === 'dark'
                    ? 'bg-blue-500/10 border-blue-500/20'
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className={`w-4 h-4 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-300' : 'text-blue-900'}`}>
                      Comprados
                    </p>
                  </div>
                  <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-700'}`}>
                    {credits?.total_purchased || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Info Banner */}
            <div className={`mt-6 rounded-xl p-4 border transition-colors ${
              theme === 'dark'
                ? 'bg-blue-500/10 border-blue-500/20'
                : 'bg-blue-50 border-blue-200'
            }`}>
              <p className={`text-sm text-center ${theme === 'dark' ? 'text-blue-300' : 'text-blue-800'}`}>
                <strong>Compartilhamento Inteligente:</strong> Seus créditos são automaticamente compartilhados entre todas as suas empresas
              </p>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="mb-8">
            <h2 className={`text-2xl font-bold mb-6 transition-colors ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Planos Disponíveis
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {mainPlans.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`relative rounded-2xl transition-all duration-300 ${
                    pkg.is_highlighted
                      ? theme === 'dark'
                        ? 'bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-2xl shadow-blue-500/50 scale-105 ring-4 ring-blue-400/30'
                        : 'bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-2xl shadow-blue-500/50 scale-105 ring-4 ring-blue-300'
                      : theme === 'dark'
                      ? 'bg-slate-900/50 text-white shadow-xl hover:shadow-2xl hover:-translate-y-1 border border-white/10 backdrop-blur-xl'
                      : 'bg-white text-gray-900 shadow-xl hover:shadow-2xl hover:-translate-y-1 border border-gray-200'
                  }`}
                >
                  {/* Badge Popular */}
                  {pkg.is_highlighted && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <div className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5 ${
                        theme === 'dark'
                          ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-900'
                          : 'bg-gradient-to-r from-yellow-300 to-orange-300 text-gray-900'
                      }`}>
                        <Star className="w-3.5 h-3.5 fill-current" />
                        MAIS POPULAR
                      </div>
                    </div>
                  )}

                  <div className="p-6">
                    {/* Nome */}
                    <div className="text-center mb-6 pt-2">
                      <h3 className="text-2xl font-bold mb-2">{pkg.name}</h3>
                      <p className={`text-sm ${
                        pkg.is_highlighted 
                          ? 'text-blue-100' 
                          : theme === 'dark' ? 'text-white/60' : 'text-gray-600'
                      }`}>
                        {pkg.description}
                      </p>
                    </div>

                    {/* Preço */}
                    <div className="text-center mb-6">
                      <div className="flex items-baseline justify-center gap-1 mb-1">
                        <span className="text-xl font-medium">R$</span>
                        <span className="text-5xl font-bold">
                          {(pkg.price_cents / 100).toFixed(2).split('.')[0]}
                        </span>
                        <span className="text-2xl font-medium">,{(pkg.price_cents / 100).toFixed(2).split('.')[1]}</span>
                      </div>
                      <p className={`text-xs ${
                        pkg.is_highlighted 
                          ? 'text-blue-200' 
                          : theme === 'dark' ? 'text-white/40' : 'text-gray-500'
                      }`}>
                        R$ {pkg.price_per_interaction.toFixed(4)} por interação
                      </p>
                    </div>

                    {/* Interações */}
                    <div className={`text-center py-4 rounded-xl mb-6 ${
                      pkg.is_highlighted 
                        ? 'bg-white/20 backdrop-blur-sm' 
                        : theme === 'dark' ? 'bg-slate-800/50 border border-white/10' : 'bg-gray-50 border border-gray-200'
                    }`}>
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Zap className={`w-5 h-5 ${
                          pkg.is_highlighted 
                            ? 'text-yellow-300' 
                            : theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                        }`} />
                        <span className="text-4xl font-bold">
                          {pkg.interactions.toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className={`text-sm font-medium ${
                        pkg.is_highlighted 
                          ? 'text-blue-100' 
                          : theme === 'dark' ? 'text-white/60' : 'text-gray-600'
                      }`}>
                        interações incluídas
                      </p>
                    </div>

                    {/* Features */}
                    <ul className="space-y-3 mb-6">
                      {['Créditos sem expiração', 'Compartilhado entre empresas', 'Suporte prioritário', 'Pagamento via PIX'].map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <Check className={`w-5 h-5 flex-shrink-0 ${
                            pkg.is_highlighted 
                              ? 'text-green-300' 
                              : theme === 'dark' ? 'text-green-400' : 'text-green-600'
                          }`} />
                          <span className={`text-sm ${
                            pkg.is_highlighted 
                              ? 'text-white' 
                              : theme === 'dark' ? 'text-white/70' : 'text-gray-700'
                          }`}>
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* Botão */}
                    <button
                      onClick={() => handlePurchase(pkg.id)}
                      disabled={purchasing === pkg.id}
                      className={`w-full py-3.5 rounded-xl font-semibold transition-all duration-200 ${
                        pkg.is_highlighted
                          ? 'bg-white text-blue-700 hover:bg-blue-50 shadow-lg'
                          : theme === 'dark'
                          ? 'bg-blue-600 text-white hover:bg-blue-500'
                          : 'bg-gray-900 text-white hover:bg-gray-800'
                      } ${
                        purchasing === pkg.id ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {purchasing === pkg.id ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Processando...
                        </span>
                      ) : (
                        'Selecionar Plano'
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trust Badges */}
          <div className={`rounded-2xl shadow-lg p-8 border transition-colors ${
            theme === 'dark'
              ? 'bg-slate-900/50 border-white/10 backdrop-blur-xl'
              : 'bg-white border-gray-200'
          }`}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              {[
                { icon: Shield, title: 'Pagamento Seguro', desc: 'Processamento via PIX com tecnologia bancária', color: 'green' },
                { icon: Clock, title: 'Ativação Instantânea', desc: 'Créditos disponíveis imediatamente após pagamento', color: 'blue' },
                { icon: Zap, title: 'Sem Expiração', desc: 'Use seus créditos quando e onde quiser', color: 'purple' }
              ].map(({ icon: Icon, title, desc, color }) => (
                <div key={title} className="flex flex-col items-center">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 ${
                    theme === 'dark'
                      ? `bg-${color}-500/10`
                      : `bg-${color}-100`
                  }`}>
                    <Icon className={`w-7 h-7 ${theme === 'dark' ? `text-${color}-400` : `text-${color}-600`}`} />
                  </div>
                  <h3 className={`font-semibold mb-1 transition-colors ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {title}
                  </h3>
                  <p className={`text-sm transition-colors ${
                    theme === 'dark' ? 'text-white/60' : 'text-gray-600'
                  }`}>
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {paymentData && (
        <PaymentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          pixCode={paymentData.pix_code}
          qrCodeUrl={paymentData.pix_qrcode}
          amount={paymentData.amount}
          packageName={paymentData.packageName}
          paymentId={paymentData.payment_id}
        />
      )}
    </>
  );
}
