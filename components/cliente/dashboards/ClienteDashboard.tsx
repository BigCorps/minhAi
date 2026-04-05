'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';

interface ClienteDashboardProps {
  profile: any;
  company: any;
  theme: 'dark' | 'light';
}

export default function ClienteDashboard({ profile, company, theme }: ClienteDashboardProps) {
  const [compras, setCompras] = useState<any[]>([]);
  const [cupons, setCupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isDark = theme === 'dark';

  useEffect(() => {
    loadClienteData();
  }, [profile.id]);

  async function loadClienteData() {
    const supabase = createClient();

    // Buscar compras do cliente
    const { data: comprasData } = await supabase
      .from('vendas')
      .select('*')
      .eq('client_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Buscar cupons disponíveis
    const { data: cuponsData } = await supabase
      .from('coupon_redemptions')
      .select('*, cupons(*)')
      .eq('user_id', profile.user_id)
      .eq('usado', false);

    setCompras(comprasData || []);
    setCupons(cuponsData || []);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header do Dashboard */}
      <div className="mb-8">
        <h1
          className="text-3xl font-bold mb-2"
          style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(15, 23, 42)' }}
        >
          Bem-vindo, {profile.nome}!
        </h1>
        <p
          className="text-lg"
          style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
        >
          Área do Cliente
        </p>
      </div>

      {/* Grid de Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Card: Minhas Compras */}
        <div
          className="rounded-2xl p-6 shadow-lg border"
          style={{
            background: isDark
              ? 'rgba(30, 41, 59, 0.8)'
              : 'rgba(255, 255, 255, 0.9)',
            borderColor: isDark
              ? 'rgba(148, 163, 184, 0.1)'
              : 'rgba(203, 213, 225, 0.3)',
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
              style={{
                background: 'rgba(59, 130, 246, 0.1)',
                color: isDark ? 'rgb(147, 197, 253)' : 'rgb(29, 78, 216)',
              }}
            >
              🛍️
            </div>
            <h2
              className="text-xl font-bold"
              style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(15, 23, 42)' }}
            >
              Minhas Compras
            </h2>
          </div>
          
          {compras.length > 0 ? (
            <div className="space-y-3">
              {compras.slice(0, 3).map((compra) => (
                <div
                  key={compra.id}
                  className="p-3 rounded-lg"
                  style={{
                    background: isDark
                      ? 'rgba(51, 65, 85, 0.5)'
                      : 'rgba(241, 245, 249, 0.8)',
                  }}
                >
                  <p
                    className="font-medium text-sm"
                    style={{ color: isDark ? 'rgb(226, 232, 240)' : 'rgb(30, 41, 59)' }}
                  >
                    Pedido #{compra.id.slice(0, 8)}
                  </p>
                  <p
                    className="text-xs mt-1"
                    style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
                  >
                    {new Date(compra.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              ))}
              <button
                className="w-full py-2 rounded-lg font-medium text-sm transition-colors"
                style={{
                  background: 'rgba(59, 130, 246, 0.1)',
                  color: isDark ? 'rgb(147, 197, 253)' : 'rgb(29, 78, 216)',
                }}
              >
                Ver Todas as Compras
              </button>
            </div>
          ) : (
            <p
              className="text-sm"
              style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
            >
              Você ainda não fez nenhuma compra.
            </p>
          )}
        </div>

        {/* Card: Meus Cupons */}
        <div
          className="rounded-2xl p-6 shadow-lg border"
          style={{
            background: isDark
              ? 'rgba(30, 41, 59, 0.8)'
              : 'rgba(255, 255, 255, 0.9)',
            borderColor: isDark
              ? 'rgba(148, 163, 184, 0.1)'
              : 'rgba(203, 213, 225, 0.3)',
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
              style={{
                background: 'rgba(16, 185, 129, 0.1)',
                color: isDark ? 'rgb(110, 231, 183)' : 'rgb(5, 150, 105)',
              }}
            >
              🎟️
            </div>
            <h2
              className="text-xl font-bold"
              style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(15, 23, 42)' }}
            >
              Meus Cupons
            </h2>
          </div>
          
          {cupons.length > 0 ? (
            <div className="space-y-3">
              {cupons.map((cupom) => (
                <div
                  key={cupom.id}
                  className="p-3 rounded-lg"
                  style={{
                    background: isDark
                      ? 'rgba(51, 65, 85, 0.5)'
                      : 'rgba(241, 245, 249, 0.8)',
                  }}
                >
                  <p
                    className="font-bold text-sm"
                    style={{ color: isDark ? 'rgb(110, 231, 183)' : 'rgb(5, 150, 105)' }}
                  >
                    {cupom.cupons?.codigo}
                  </p>
                  <p
                    className="text-xs mt-1"
                    style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
                  >
                    {cupom.cupons?.descricao}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p
              className="text-sm"
              style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
            >
              Você não tem cupons disponíveis no momento.
            </p>
          )}
        </div>

        {/* Card: Informações da Conta */}
        <div
          className="rounded-2xl p-6 shadow-lg border"
          style={{
            background: isDark
              ? 'rgba(30, 41, 59, 0.8)'
              : 'rgba(255, 255, 255, 0.9)',
            borderColor: isDark
              ? 'rgba(148, 163, 184, 0.1)'
              : 'rgba(203, 213, 225, 0.3)',
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
              style={{
                background: 'rgba(168, 85, 247, 0.1)',
                color: isDark ? 'rgb(216, 180, 254)' : 'rgb(107, 33, 168)',
              }}
            >
              👤
            </div>
            <h2
              className="text-xl font-bold"
              style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(15, 23, 42)' }}
            >
              Minha Conta
            </h2>
          </div>
          
          <div className="space-y-3">
            <div>
              <p
                className="text-xs mb-1"
                style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
              >
                Nome
              </p>
              <p
                className="font-medium"
                style={{ color: isDark ? 'rgb(226, 232, 240)' : 'rgb(30, 41, 59)' }}
              >
                {profile.nome}
              </p>
            </div>
            
            {profile.email && (
              <div>
                <p
                  className="text-xs mb-1"
                  style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
                >
                  Email
                </p>
                <p
                  className="font-medium text-sm"
                  style={{ color: isDark ? 'rgb(226, 232, 240)' : 'rgb(30, 41, 59)' }}
                >
                  {profile.email}
                </p>
              </div>
            )}
            
            {profile.telefone && (
              <div>
                <p
                  className="text-xs mb-1"
                  style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
                >
                  Telefone
                </p>
                <p
                  className="font-medium"
                  style={{ color: isDark ? 'rgb(226, 232, 240)' : 'rgb(30, 41, 59)' }}
                >
                  {profile.telefone}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
