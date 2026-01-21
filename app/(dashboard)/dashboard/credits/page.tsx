'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser'; // ← USANDO O ARQUIVO QUE JÁ EXISTE!
import { User } from '@supabase/supabase-js';

interface Package {
  id: string;
  name: string;
  description: string | null;
  interactions: number;
  price_cents: number;
  price_per_interaction: number;
  is_highlighted: boolean;
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

  // Carregar usuário
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  // Carregar pacotes
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

  // Carregar créditos do usuário
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

  // Comprar pacote
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
    return <div className="p-8">Carregando...</div>;
  }

  return (
    <div className="container mx-auto p-8">
      {/* Header com Saldo */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h1 className="text-3xl font-bold mb-2">Meus Créditos</h1>
        <div className="flex gap-8">
          <div>
            <p className="text-gray-600">Disponíveis</p>
            <p className="text-4xl font-bold text-green-600">
              {credits?.available_credits || 0}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Utilizados</p>
            <p className="text-2xl font-semibold text-gray-700">
              {credits?.total_used || 0}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Total Comprado</p>
            <p className="text-2xl font-semibold text-blue-600">
              {credits?.total_purchased || 0}
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-4">
          💡 Seus créditos são compartilhados entre todas as suas empresas
        </p>
      </div>

      {/* Pacotes */}
      <h2 className="text-2xl font-bold mb-6">Pacotes Disponíveis</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className={`
              bg-white rounded-lg shadow-lg p-6 
              ${pkg.is_highlighted ? 'ring-2 ring-blue-500' : ''}
            `}
          >
            {pkg.is_highlighted && (
              <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm mb-4 inline-block">
                Mais Popular
              </span>
            )}
            
            <h3 className="text-2xl font-bold mb-2">{pkg.name}</h3>
            <p className="text-gray-600 mb-4">{pkg.description}</p>
            
            <div className="mb-4">
              <p className="text-4xl font-bold text-green-600">
                R$ {(pkg.price_cents / 100).toFixed(2)}
              </p>
              <p className="text-sm text-gray-500">
                {pkg.interactions} interações
              </p>
              <p className="text-xs text-gray-400">
                R$ {pkg.price_per_interaction.toFixed(4)} por interação
              </p>
            </div>

            <button
              onClick={() => handlePurchase(pkg.id)}
              disabled={purchasing === pkg.id}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
            >
              {purchasing === pkg.id ? 'Processando...' : 'Comprar Agora'}
            </button>
          </div>
        ))}
      </div>

      {/* Histórico */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6">Histórico de Transações</h2>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <p className="text-gray-500">Em breve...</p>
        </div>
      </div>
    </div>
  );
}
