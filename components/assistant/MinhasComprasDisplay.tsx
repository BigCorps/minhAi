'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShoppingBag, Package, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

interface MinhasComprasDisplayProps {
  data: {
    companyId: string;
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText?: (text: string) => Promise<void>;
}

interface Pedido {
  id: string;
  numero_pedido: string;
  created_at: string;
  status: 'pendente' | 'preparando' | 'pronto' | 'entregue' | 'cancelado';
  total: number;
  tipo_pagamento: string;
  itens: Array<{
    produto_nome: string;
    quantidade: number;
    preco_unitario: number;
  }>;
}

export default function MinhasComprasDisplay({
  data,
  onClose,
  theme = 'dark',
  playText,
}: MinhasComprasDisplayProps) {
  const { companyId } = data;
  
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const supabase = createClient();
  const isDark = theme === 'dark';

  // Paletas de cores
  const DARK = {
    bg: 'bg-slate-900',
    cardBg: 'bg-slate-800',
    border: 'border-white/10',
    textPrimary: 'text-white',
    textMuted: 'text-white/60',
  };

  const LIGHT = {
    bg: 'bg-white',
    cardBg: 'bg-gray-50',
    border: 'border-gray-200',
    textPrimary: 'text-gray-900',
    textMuted: 'text-gray-600',
  };

  const colors = isDark ? DARK : LIGHT;

  useEffect(() => {
    setMounted(true);
    window.dispatchEvent(new CustomEvent('eai:modalOpen'));
    return () => {
      window.dispatchEvent(new CustomEvent('eai:modalClose'));
    };
  }, []);

  // Buscar pedidos do cliente logado
  useEffect(() => {
    async function fetchPedidos() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('Usuário não autenticado');
          setLoading(false);
          return;
        }

        // Busca perfil ativo do cliente
        const { data: session } = await supabase
          .from('profile_sessions')
          .select('profile_id, company_profiles(email, identificador)')
          .eq('user_id', user.id)
          .eq('company_id', companyId)
          .eq('is_active', true)
          .maybeSingle();

        if (!session?.profile_id) {
          console.log('Perfil não encontrado');
          setLoading(false);
          return;
        }

        // Busca pedidos do cliente (via email ou identificador)
        const { data: pedidosData, error } = await supabase
          .from('pedidos')
          .select(`
            id,
            numero_pedido,
            created_at,
            status,
            total,
            tipo_pagamento,
            pedido_itens (
              quantidade,
              preco_unitario,
              produtos_venda (
                nome
              )
            )
          `)
          .eq('company_id', companyId)
          .eq('profile_id', session.profile_id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;

        // Formata dados
        const formatted: Pedido[] = (pedidosData || []).map((p: any) => ({
          id: p.id,
          numero_pedido: p.numero_pedido,
          created_at: p.created_at,
          status: p.status,
          total: p.total,
          tipo_pagamento: p.tipo_pagamento,
          itens: (p.pedido_itens || []).map((item: any) => ({
            produto_nome: item.produtos_venda?.nome || 'Produto',
            quantidade: item.quantidade,
            preco_unitario: item.preco_unitario,
          })),
        }));

        setPedidos(formatted);

        // Fala quantidade de pedidos
        if (playText && formatted.length > 0) {
          await playText(`Você tem ${formatted.length} ${formatted.length === 1 ? 'pedido' : 'pedidos'}.`);
        }

      } catch (error) {
        console.error('Erro ao buscar pedidos:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchPedidos();
  }, [companyId]);

  function getStatusConfig(status: string) {
    const configs = {
      pendente: {
        icon: Clock,
        label: 'Pendente',
        color: isDark ? 'text-yellow-400 bg-yellow-900/30' : 'text-yellow-700 bg-yellow-100',
      },
      preparando: {
        icon: Package,
        label: 'Preparando',
        color: isDark ? 'text-blue-400 bg-blue-900/30' : 'text-blue-700 bg-blue-100',
      },
      pronto: {
        icon: CheckCircle,
        label: 'Pronto',
        color: isDark ? 'text-green-400 bg-green-900/30' : 'text-green-700 bg-green-100',
      },
      entregue: {
        icon: CheckCircle,
        label: 'Entregue',
        color: isDark ? 'text-green-400 bg-green-900/30' : 'text-green-700 bg-green-100',
      },
      cancelado: {
        icon: XCircle,
        label: 'Cancelado',
        color: isDark ? 'text-red-400 bg-red-900/30' : 'text-red-700 bg-red-100',
      },
    };
    return configs[status as keyof typeof configs] || configs.pendente;
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const hoje = new Date();
    const ontem = new Date(hoje);
    ontem.setDate(ontem.getDate() - 1);

    const sameDay = date.toDateString() === hoje.toDateString();
    const wasYesterday = date.toDateString() === ontem.toDateString();

    if (sameDay) {
      return `Hoje às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (wasYesterday) {
      return `Ontem às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + 
             ` às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    }
  }

  function formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  if (!mounted) return null;

  const content = (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      {/* Modal */}
      <div className={`w-full max-w-2xl rounded-2xl shadow-2xl ${colors.bg} ${colors.border} border overflow-hidden max-h-[90vh] flex flex-col`}>
        
        {/* Header */}
        <div className={`px-6 py-4 border-b ${colors.border} flex items-center justify-between flex-shrink-0`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-purple-900/30' : 'bg-purple-100'}`}>
              <ShoppingBag className={`w-6 h-6 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${colors.textPrimary}`}>Minhas Compras</h2>
              <p className={`text-xs ${colors.textMuted}`}>
                {loading ? 'Carregando...' : `${pedidos.length} ${pedidos.length === 1 ? 'pedido' : 'pedidos'}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDark 
                ? 'text-white/50 hover:text-white hover:bg-white/10' 
                : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className={`w-12 h-12 animate-spin ${colors.textMuted}`} />
              <p className={`text-sm ${colors.textMuted} mt-4`}>Carregando pedidos...</p>
            </div>
          ) : pedidos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className={`p-4 rounded-full ${colors.cardBg} mb-4`}>
                <ShoppingBag className={`w-12 h-12 ${colors.textMuted}`} />
              </div>
              <p className={`text-lg font-medium ${colors.textPrimary}`}>Nenhum pedido encontrado</p>
              <p className={`text-sm ${colors.textMuted} mt-2 text-center max-w-sm`}>
                Seus pedidos aparecerão aqui quando você realizar compras.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pedidos.map((pedido) => {
                const statusConfig = getStatusConfig(pedido.status);
                const StatusIcon = statusConfig.icon;

                return (
                  <div
                    key={pedido.id}
                    className={`rounded-xl border ${colors.border} ${colors.cardBg} p-4 hover:shadow-lg transition-shadow`}
                  >
                    {/* Header do Pedido */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm font-semibold ${colors.textPrimary}`}>
                            Pedido #{pedido.numero_pedido}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.color} flex items-center gap-1`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig.label}
                          </span>
                        </div>
                        <p className={`text-xs ${colors.textMuted}`}>
                          {formatDate(pedido.created_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${colors.textPrimary}`}>
                          {formatCurrency(pedido.total)}
                        </p>
                        <p className={`text-xs ${colors.textMuted} capitalize`}>
                          {pedido.tipo_pagamento}
                        </p>
                      </div>
                    </div>

                    {/* Itens do Pedido */}
                    <div className={`border-t ${colors.border} pt-3 space-y-2`}>
                      {pedido.itens.map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs ${colors.textMuted} font-medium w-6`}>
                              {item.quantidade}x
                            </span>
                            <span className={`text-sm ${colors.textPrimary}`}>
                              {item.produto_nome}
                            </span>
                          </div>
                          <span className={`text-sm font-medium ${colors.textPrimary}`}>
                            {formatCurrency(item.preco_unitario * item.quantidade)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {pedidos.length > 0 && (
          <div className={`px-6 py-4 border-t ${colors.border} flex-shrink-0`}>
            <button
              onClick={onClose}
              className={`w-full px-4 py-3 rounded-lg font-medium transition ${
                isDark 
                  ? 'bg-slate-700 hover:bg-slate-600 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
              }`}
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
