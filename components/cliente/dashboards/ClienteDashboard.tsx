'use client';

// ============================================================
// components/cliente/dashboards/ClienteDashboard.tsx
//
// Dashboard para profile.tipo === 'cliente'
//
// 4 funções:
//   1. Minha Conta    — shared/CardMinhaConta
//   2. Minhas Compras — busca pedidos por cliente_nome/cliente_telefone
//   3. Fazer Pedido   — redireciona para /vendas/[slug] (mesmo fluxo do VoiceAssistant)
//   4. Logout         — shared/BotaoLogout
//
// Pedidos são vinculados ao cliente via cliente_nome e cliente_telefone
// conforme salvo pelo CheckoutFlow ao confirmar pagamento.
// ============================================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { SlugProfile } from '@/hooks/useProfile';
import CardMinhaConta from './shared/CardMinhaConta';
import BotaoLogout from './shared/BotaoLogout';

// ── Status dos pedidos ────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  aberto:               { label: 'Aberto',     color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
  aguardando_pagamento: { label: 'Aguardando', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  pago:                 { label: 'Pago',        color: '#22c55e', bg: 'rgba(34,197,94,0.12)'   },
  entregue:             { label: 'Entregue',    color: '#3b82f6', bg: 'rgba(59,130,246,0.12)'  },
  cancelado:            { label: 'Cancelado',   color: '#ef4444', bg: 'rgba(239,68,68,0.12)'   },
};

// ── Tipos ─────────────────────────────────────────────────────
interface ClienteDashboardProps {
  profile: SlugProfile;
  company: {
    id: string;
    slug: string;
    name: string;
    logo_url?: string | null;
  };
  theme: 'dark' | 'light';
}

// ── Helpers ───────────────────────────────────────────────────
function formatBRL(valor: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

function formatData(dateStr: string) {
  const date = new Date(dateStr);
  const now   = new Date();
  const diff  = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (diff === 0) return `Hoje, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  if (diff === 1) return 'Ontem';
  if (diff < 7)   return `${diff} dias atrás`;
  return date.toLocaleDateString('pt-BR');
}

// ── Componente principal ──────────────────────────────────────
export default function ClienteDashboard({ profile, company, theme }: ClienteDashboardProps) {
  const isDark = theme === 'dark';
  const router = useRouter();

  const [pedidos, setPedidos]       = useState<any[]>([]);
  const [loadingPedidos, setLoading] = useState(true);

  // ── Cores base ────────────────────────────────────────────
  const cardBg     = isDark ? 'rgba(30,41,59,0.8)'    : 'rgba(255,255,255,0.9)';
  const cardBorder = isDark ? 'rgba(148,163,184,0.1)' : 'rgba(203,213,225,0.3)';
  const titleColor = isDark ? 'rgb(241,245,249)'       : 'rgb(15,23,42)';
  const muteColor  = isDark ? 'rgb(100,116,139)'       : 'rgb(148,163,184)';
  const itemBg     = isDark ? 'rgba(51,65,85,0.5)'    : 'rgba(241,245,249,0.8)';
  const itemTitle  = isDark ? 'rgb(226,232,240)'       : 'rgb(15,23,42)';

  // ── Busca pedidos ─────────────────────────────────────────
  useEffect(() => {
    loadPedidos();
  }, [profile.id]);

  async function loadPedidos() {
    setLoading(true);

    try {
      const supabase = createClient();

      // CheckoutFlow salva cliente_nome (profile.nome) e
      // cliente_telefone (profile.identificador).
      // Buscamos pedidos da empresa que batem com pelo menos um dos dois.
      const nome        = profile.nome?.trim() ?? '';
      const identificador = (profile.identificador ?? profile.email ?? '').trim();

      if (!nome && !identificador) {
        setPedidos([]);
        setLoading(false);
        return;
      }

      // Monta filtro OR com os campos disponíveis
      const orFilters: string[] = [];
      if (nome)         orFilters.push(`cliente_nome.ilike.%${nome}%`);
      if (identificador) orFilters.push(`cliente_telefone.eq.${identificador}`);

      const { data, error } = await supabase
        .from('pedidos')
        .select('id, total, status, created_at, metodo_pagamento, cliente_nome')
        .eq('company_id', company.id)
        .or(orFilters.join(','))
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) console.error('[ClienteDashboard] erro ao buscar pedidos:', error);

      setPedidos(data ?? []);
    } catch (err) {
      console.error('[ClienteDashboard] loadPedidos:', err);
      setPedidos([]);
    } finally {
      setLoading(false);
    }
  }

  // ── Fazer Pedido: mesmo comportamento do VoiceAssistant ───
  // VoiceAssistantWithWakeWord case 'modo_venda':
  //   window.location.href = getContextualRoute('vendas', slug)
  // → resulta em /vendas/[slug]
  function handleFazerPedido() {
    router.push(`/vendas/${company.slug}`);
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Saudação */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1" style={{ color: titleColor }}>
          Olá, {profile.nome.split(' ')[0]}! 👋
        </h1>
        <p className="text-base" style={{ color: muteColor }}>
          Área do cliente · {company.name}
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* ── 1. Minha Conta ───────────────────────────────── */}
        <CardMinhaConta profile={profile} theme={theme} />

        {/* ── 2. Minhas Compras ────────────────────────────── */}
        <div
          className="rounded-2xl p-6 shadow-lg border"
          style={{ background: cardBg, borderColor: cardBorder }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
              style={{ background: 'rgba(59,130,246,0.1)' }}>
              🛍️
            </div>
            <h2 className="text-xl font-bold" style={{ color: titleColor }}>
              Minhas Compras
            </h2>
          </div>

          {/* Conteúdo */}
          {loadingPedidos ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>

          ) : pedidos.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-3xl mb-3">🛒</p>
              <p className="text-sm" style={{ color: muteColor }}>
                Você ainda não fez nenhum pedido.
              </p>
              <button
                onClick={handleFazerPedido}
                className="mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: 'rgba(59,130,246,0.1)',
                  color: isDark ? 'rgb(147,197,253)' : 'rgb(29,78,216)',
                }}
              >
                Fazer meu primeiro pedido →
              </button>
            </div>

          ) : (
            <div className="space-y-3">
              {pedidos.map((pedido) => {
                const st = STATUS_CONFIG[pedido.status] ?? STATUS_CONFIG.aberto;
                return (
                  <div
                    key={pedido.id}
                    className="p-3 rounded-xl flex items-center justify-between gap-2"
                    style={{ background: itemBg }}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-sm" style={{ color: itemTitle }}>
                        #{pedido.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: muteColor }}>
                        {formatData(pedido.created_at)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <p className="font-bold text-sm"
                        style={{ color: isDark ? 'rgb(147,197,253)' : 'rgb(29,78,216)' }}>
                        {formatBRL(pedido.total)}
                      </p>
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{ background: st.bg, color: st.color }}
                      >
                        {st.label}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Rodapé do card */}
              {pedidos.length === 10 && (
                <p className="text-xs text-center pt-1" style={{ color: muteColor }}>
                  Exibindo os 10 pedidos mais recentes
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── 3. Fazer Pedido ──────────────────────────────── */}
        <div
          className="rounded-2xl p-6 shadow-lg border flex flex-col"
          style={{ background: cardBg, borderColor: cardBorder }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
              style={{ background: 'rgba(16,185,129,0.1)' }}>
              💿
            </div>
            <h2 className="text-xl font-bold" style={{ color: titleColor }}>
              Fazer Pedido
            </h2>
          </div>

          <p className="text-sm mb-6 flex-1" style={{ color: muteColor }}>
            Acesse o catálogo completo da {company.name} e faça seu pedido com pagamento integrado.
          </p>

          <button
            onClick={handleFazerPedido}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              color: '#ffffff',
              boxShadow: '0 4px 14px rgba(59,130,246,0.35)',
            }}
          >
            🛒 Abrir Catálogo
          </button>
        </div>

      </div>

      {/* ── 4. Logout ────────────────────────────────────────── */}
      <div className="mt-8 max-w-sm">
        <BotaoLogout slug={company.slug} theme={theme} />
      </div>

    </div>
  );
}
