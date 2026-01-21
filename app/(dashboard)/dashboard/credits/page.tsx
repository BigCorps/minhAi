'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { User } from '@supabase/supabase-js';
import { Check, Zap, Star, TrendingUp, Shield, Clock } from 'lucide-react';

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

export default function CreditsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const supabase = createClient();

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

      alert(`PIX gerado! Código: ${data.pix_code}`);

    } catch (error) {
      console.error('Erro ao comprar:', error);
      alert(error instanceof Error ? error.message : 'Erro ao processar compra');
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="h-32 bg-white rounded-2xl shadow-lg"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-96 bg-white rounded-2xl shadow-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const mainPlans = packages.filter(p => p.display_order < 10);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Header Premium com Stats */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 mb-12 border border-slate-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            
            {/* Title Section */}
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-slate-900 mb-2">
                Gerenciamento de Créditos
              </h1>
              <p className="text-slate-600 text-lg">
                Escolha o plano ideal para suas necessidades
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4 lg:gap-6">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-green-600" />
                  <p className="text-sm font-medium text-green-900">Disponíveis</p>
                </div>
                <p className="text-3xl font-bold text-green-700">
                  {credits?.available_credits || 0}
                </p>
              </div>

              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-4 border border-slate-200">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-slate-600" />
                  <p className="text-sm font-medium text-slate-900">Utilizados</p>
                </div>
                <p className="text-3xl font-bold text-slate-700">
                  {credits?.total_used || 0}
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <p className="text-sm font-medium text-blue-900">Comprados</p>
                </div>
                <p className="text-3xl font-bold text-blue-700">
                  {credits?.total_purchased || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Info Banner */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800 text-center">
              <strong>Compartilhamento Inteligente:</strong> Seus créditos são automaticamente compartilhados entre todas as suas empresas
            </p>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Planos Disponíveis</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {mainPlans.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative rounded-2xl transition-all duration-300 ${
                  pkg.is_highlighted
                    ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-2xl shadow-blue-500/50 scale-105 ring-4 ring-blue-300'
                    : 'bg-white text-slate-900 shadow-xl hover:shadow-2xl hover:-translate-y-1 border border-slate-200'
                }`}
              >
                {/* Popular Badge */}
                {pkg.is_highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-slate-900 px-4 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      MAIS POPULAR
                    </div>
                  </div>
                )}

                <div className="p-6">
                  {/* Plan Name */}
                  <div className="text-center mb-6 pt-2">
                    <h3 className={`text-2xl font-bold mb-2 ${
                      pkg.is_highlighted ? 'text-white' : 'text-slate-900'
                    }`}>
                      {pkg.name}
                    </h3>
                    <p className={`text-sm ${
                      pkg.is_highlighted ? 'text-blue-100' : 'text-slate-600'
                    }`}>
                      {pkg.description}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="text-center mb-6">
                    <div className="flex items-baseline justify-center gap-1 mb-1">
                      <span className="text-xl font-medium">R$</span>
                      <span className={`text-5xl font-bold ${
                        pkg.is_highlighted ? 'text-white' : 'text-slate-900'
                      }`}>
                        {(pkg.price_cents / 100).toFixed(2).split('.')[0]}
                      </span>
                      <span className="text-2xl font-medium">,{(pkg.price_cents / 100).toFixed(2).split('.')[1]}</span>
                    </div>
                    <p className={`text-xs ${
                      pkg.is_highlighted ? 'text-blue-200' : 'text-slate-500'
                    }`}>
                      R$ {pkg.price_per_interaction.toFixed(4)} por interação
                    </p>
                  </div>

                  {/* Interactions */}
                  <div className={`text-center py-4 rounded-xl mb-6 ${
                    pkg.is_highlighted 
                      ? 'bg-white/20 backdrop-blur-sm' 
                      : 'bg-slate-50 border border-slate-200'
                  }`}>
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Zap className={`w-5 h-5 ${
                        pkg.is_highlighted ? 'text-yellow-300' : 'text-blue-600'
                      }`} />
                      <span className={`text-4xl font-bold ${
                        pkg.is_highlighted ? 'text-white' : 'text-slate-900'
                      }`}>
                        {pkg.interactions.toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <p className={`text-sm font-medium ${
                      pkg.is_highlighted ? 'text-blue-100' : 'text-slate-600'
                    }`}>
                      interações incluídas
                    </p>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start gap-2">
                      <Check className={`w-5 h-5 flex-shrink-0 ${
                        pkg.is_highlighted ? 'text-green-300' : 'text-green-600'
                      }`} />
                      <span className={`text-sm ${
                        pkg.is_highlighted ? 'text-white' : 'text-slate-700'
                      }`}>
                        Créditos sem expiração
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className={`w-5 h-5 flex-shrink-0 ${
                        pkg.is_highlighted ? 'text-green-300' : 'text-green-600'
                      }`} />
                      <span className={`text-sm ${
                        pkg.is_highlighted ? 'text-white' : 'text-slate-700'
                      }`}>
                        Compartilhado entre empresas
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className={`w-5 h-5 flex-shrink-0 ${
                        pkg.is_highlighted ? 'text-green-300' : 'text-green-600'
                      }`} />
                      <span className={`text-sm ${
                        pkg.is_highlighted ? 'text-white' : 'text-slate-700'
                      }`}>
                        Suporte prioritário
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className={`w-5 h-5 flex-shrink-0 ${
                        pkg.is_highlighted ? 'text-green-300' : 'text-green-600'
                      }`} />
                      <span className={`text-sm ${
                        pkg.is_highlighted ? 'text-white' : 'text-slate-700'
                      }`}>
                        Pagamento via PIX instantâneo
                      </span>
                    </li>
                  </ul>

                  {/* CTA Button */}
                  <button
                    onClick={() => handlePurchase(pkg.id)}
                    disabled={purchasing === pkg.id}
                    className={`w-full py-3.5 rounded-xl font-semibold transition-all duration-200 ${
                      pkg.is_highlighted
                        ? 'bg-white text-blue-700 hover:bg-blue-50 shadow-lg'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
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
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mb-3">
                <Shield className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">Pagamento Seguro</h3>
              <p className="text-sm text-slate-600">Processamento via PIX com tecnologia bancária</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                <Clock className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">Ativação Instantânea</h3>
              <p className="text-sm text-slate-600">Créditos disponíveis imediatamente após pagamento</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mb-3">
                <Zap className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">Sem Expiração</h3>
              <p className="text-sm text-slate-600">Use seus créditos quando e onde quiser</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
