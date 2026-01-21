'use client';

import { useState, useEffect } from 'react';
import { Check, Zap, Star, Package, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CreditPackage {
  id: string;
  name: string;
  description: string;
  interactions: number;
  price_cents: number;
  price_per_interaction: number;
  is_highlighted: boolean;
  display_order: number;
}

interface CreditsPageProps {
  companyId: string;
  theme?: 'dark' | 'light';
}

export default function CreditsPage({ companyId, theme = 'light' }: CreditsPageProps) {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const router = useRouter();

  const isDark = theme === 'dark';

  useEffect(() => {
    fetchPackages();
  }, []);

  async function fetchPackages() {
    try {
      const response = await fetch('/api/credits/packages');
      if (!response.ok) throw new Error('Erro ao buscar pacotes');
      const data = await response.json();
      
      // Separar planos principais e avulsos
      const mainPlans = data.filter((p: CreditPackage) => p.display_order < 10 && p.price_cents > 0);
      const extraPackages = data.filter((p: CreditPackage) => p.display_order >= 10);
      
      setPackages([...mainPlans, ...extraPackages]);
    } catch (err) {
      console.error('Erro ao buscar pacotes:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handlePurchase(packageId: string) {
    setPurchasing(true);
    setSelectedPackage(packageId);
    
    try {
      const response = await fetch('/api/credits/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId, package_id: packageId })
      });

      if (!response.ok) throw new Error('Erro ao criar pagamento');
      
      const { payment } = await response.json();
      
      // Redirecionar para página de pagamento PIX
      router.push(`/dashboard/credits/payment/${payment.id}`);
    } catch (err) {
      console.error('Erro ao processar compra:', err);
      alert('Erro ao processar compra. Tente novamente.');
    } finally {
      setPurchasing(false);
      setSelectedPackage(null);
    }
  }

  function formatPrice(cents: number): string {
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  function formatPricePerInteraction(price: number): string {
    return price.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    });
  }

  if (loading) {
    return (
      <div className={`min-h-screen p-6 ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="h-12 bg-gray-300 dark:bg-gray-700 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-96 bg-gray-300 dark:bg-gray-700 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const mainPlans = packages.filter(p => p.display_order < 10);
  const extraPackages = packages.filter(p => p.display_order >= 10);

  return (
    <div className={`min-h-screen p-6 ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className={`flex items-center gap-2 mb-4 text-sm ${
              isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
            } transition`}
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          
          <h1 className={`text-4xl font-bold mb-2 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            💰 Escolha seu Plano
          </h1>
          <p className={`text-lg ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Selecione o pacote ideal para suas necessidades
          </p>
        </div>

        {/* Planos Principais */}
        <div className="mb-12">
          <h2 className={`text-2xl font-bold mb-6 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            📊 Planos Principais
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {mainPlans.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative rounded-2xl p-6 transition-all duration-300 ${
                  pkg.is_highlighted
                    ? `ring-2 ring-blue-500 scale-105 ${
                        isDark ? 'bg-slate-800' : 'bg-white'
                      } shadow-2xl shadow-blue-500/20`
                    : isDark
                    ? 'bg-slate-800 hover:bg-slate-750 border border-slate-700'
                    : 'bg-white hover:shadow-xl border border-gray-200'
                }`}
              >
                {/* Badge "Mais Vendido" */}
                {pkg.is_highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" />
                    MAIS VENDIDO
                  </div>
                )}

                {/* Nome do Plano */}
                <div className="text-center mb-4">
                  <h3 className={`text-xl font-bold mb-1 ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    {pkg.name}
                  </h3>
                  <p className={`text-sm ${
                    isDark ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {pkg.description}
                  </p>
                </div>

                {/* Preço */}
                <div className="text-center mb-6">
                  <div className="flex items-baseline justify-center gap-1 mb-1">
                    <span className={`text-4xl font-bold ${
                      pkg.is_highlighted ? 'text-blue-500' : 
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                      {formatPrice(pkg.price_cents)}
                    </span>
                  </div>
                  <p className={`text-xs ${
                    isDark ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {formatPricePerInteraction(pkg.price_per_interaction)} por interação
                  </p>
                </div>

                {/* Interações */}
                <div className={`text-center py-4 rounded-lg mb-6 ${
                  isDark ? 'bg-slate-700/50' : 'bg-gray-50'
                }`}>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Zap className={`w-5 h-5 ${
                      pkg.is_highlighted ? 'text-blue-500' : 
                      isDark ? 'text-blue-400' : 'text-blue-600'
                    }`} />
                    <span className={`text-3xl font-bold ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                      {pkg.interactions.toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <p className={`text-sm ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    interações
                  </p>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-2">
                    <Check className={`w-4 h-4 ${
                      pkg.is_highlighted ? 'text-blue-500' : 'text-green-500'
                    }`} />
                    <span className={`text-sm ${
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Créditos nunca expiram
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className={`w-4 h-4 ${
                      pkg.is_highlighted ? 'text-blue-500' : 'text-green-500'
                    }`} />
                    <span className={`text-sm ${
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Suporte prioritário
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className={`w-4 h-4 ${
                      pkg.is_highlighted ? 'text-blue-500' : 'text-green-500'
                    }`} />
                    <span className={`text-sm ${
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Pagamento via PIX
                    </span>
                  </li>
                </ul>

                {/* Botão Comprar */}
                <button
                  onClick={() => handlePurchase(pkg.id)}
                  disabled={purchasing && selectedPackage === pkg.id}
                  className={`w-full py-3 rounded-lg font-medium transition-all duration-200 ${
                    pkg.is_highlighted
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/30'
                      : isDark
                      ? 'bg-slate-700 hover:bg-slate-600 text-white'
                      : 'bg-gray-900 hover:bg-gray-800 text-white'
                  } ${
                    purchasing && selectedPackage === pkg.id ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {purchasing && selectedPackage === pkg.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processando...
                    </span>
                  ) : (
                    '💳 Comprar Agora'
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Pacotes Avulsos */}
        {extraPackages.length > 0 && (
          <div>
            <h2 className={`text-2xl font-bold mb-6 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              📦 Pacotes Avulsos
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {extraPackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`rounded-xl p-6 transition-all duration-300 ${
                    isDark
                      ? 'bg-slate-800 hover:bg-slate-750 border border-slate-700'
                      : 'bg-white hover:shadow-xl border border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Package className={`w-8 h-8 ${
                        isDark ? 'text-purple-400' : 'text-purple-600'
                      }`} />
                      <div>
                        <h3 className={`text-xl font-bold ${
                          isDark ? 'text-white' : 'text-gray-900'
                        }`}>
                          {pkg.name}
                        </h3>
                        <p className={`text-sm ${
                          isDark ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {pkg.description}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${
                        isDark ? 'text-white' : 'text-gray-900'
                      }`}>
                        {formatPrice(pkg.price_cents)}
                      </p>
                      <p className={`text-xs ${
                        isDark ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {pkg.interactions.toLocaleString('pt-BR')} int.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handlePurchase(pkg.id)}
                    disabled={purchasing && selectedPackage === pkg.id}
                    className={`w-full py-2.5 rounded-lg font-medium transition-all duration-200 ${
                      isDark
                        ? 'bg-purple-600 hover:bg-purple-700 text-white'
                        : 'bg-purple-500 hover:bg-purple-600 text-white'
                    } ${
                      purchasing && selectedPackage === pkg.id ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {purchasing && selectedPackage === pkg.id ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processando...
                      </span>
                    ) : (
                      '⚡ Comprar Recarga'
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Info */}
        <div className={`mt-12 p-6 rounded-xl ${
          isDark ? 'bg-slate-800/50' : 'bg-blue-50'
        }`}>
          <p className={`text-center text-sm ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
            💡 <strong>Importante:</strong> Seus créditos nunca expiram e podem ser usados a qualquer momento.
            Pagamento processado instantaneamente via PIX.
          </p>
        </div>
      </div>
    </div>
  );
}