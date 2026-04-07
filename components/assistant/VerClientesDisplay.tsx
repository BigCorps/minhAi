'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Users, Search, Mail, Phone, Loader2, User } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

interface VerClientesDisplayProps {
  data: {
    companyId: string;
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText?: (text: string) => Promise<void>;
}

interface Cliente {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  identificador: string | null;
  created_at: string;
  total_pedidos?: number;
  ultimo_pedido?: string;
}

export default function VerClientesDisplay({
  data,
  onClose,
  theme = 'dark',
  playText,
}: VerClientesDisplayProps) {
  const { companyId } = data;
  
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
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
    inputBg: 'bg-slate-700',
  };

  const LIGHT = {
    bg: 'bg-white',
    cardBg: 'bg-gray-50',
    border: 'border-gray-200',
    textPrimary: 'text-gray-900',
    textMuted: 'text-gray-600',
    inputBg: 'bg-white',
  };

  const colors = isDark ? DARK : LIGHT;

  useEffect(() => {
    setMounted(true);
    window.dispatchEvent(new CustomEvent('eai:modalOpen'));
    return () => {
      window.dispatchEvent(new CustomEvent('eai:modalClose'));
    };
  }, []);

  // Buscar clientes da empresa
  useEffect(() => {
    async function fetchClientes() {
      setLoading(true);
      try {
        // Busca perfis do tipo 'cliente' na empresa
        const { data: clientesData, error } = await supabase
          .from('company_profiles')
          .select(`
            id,
            nome,
            email,
            telefone,
            identificador,
            created_at
          `)
          .eq('company_id', companyId)
          .eq('tipo', 'cliente')
          .eq('is_active', true)
          .order('nome', { ascending: true });

        if (error) throw error;

        // Para cada cliente, busca total de pedidos e último pedido
        const clientesComStats = await Promise.all(
          (clientesData || []).map(async (cliente) => {
            const { count } = await supabase
              .from('pedidos')
              .select('*', { count: 'exact', head: true })
              .eq('company_id', companyId)
              .eq('profile_id', cliente.id);

            const { data: ultimoPedido } = await supabase
              .from('pedidos')
              .select('created_at')
              .eq('company_id', companyId)
              .eq('profile_id', cliente.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            return {
              ...cliente,
              total_pedidos: count || 0,
              ultimo_pedido: ultimoPedido?.created_at || null,
            };
          })
        );

        setClientes(clientesComStats);
        setFilteredClientes(clientesComStats);

        // Fala quantidade de clientes
        if (playText && clientesComStats.length > 0) {
          await playText(`${clientesComStats.length} ${clientesComStats.length === 1 ? 'cliente cadastrado' : 'clientes cadastrados'}.`);
        }

      } catch (error) {
        console.error('Erro ao buscar clientes:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchClientes();
  }, [companyId]);

  // Filtrar clientes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredClientes(clientes);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = clientes.filter(
      (cliente) =>
        cliente.nome.toLowerCase().includes(term) ||
        cliente.email?.toLowerCase().includes(term) ||
        cliente.telefone?.includes(term) ||
        cliente.identificador?.toLowerCase().includes(term)
    );

    setFilteredClientes(filtered);
  }, [searchTerm, clientes]);

  function formatDate(dateString: string | null): string {
    if (!dateString) return 'Nunca';
    
    const date = new Date(dateString);
    const hoje = new Date();
    const diffDays = Math.floor((hoje.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Hoje';
    } else if (diffDays === 1) {
      return 'Ontem';
    } else if (diffDays < 7) {
      return `${diffDays} dias atrás`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} ${weeks === 1 ? 'semana' : 'semanas'} atrás`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} ${months === 1 ? 'mês' : 'meses'} atrás`;
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  }

  if (!mounted) return null;

  const content = (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      {/* Modal */}
      <div className={`w-full max-w-4xl rounded-2xl shadow-2xl ${colors.bg} ${colors.border} border overflow-hidden max-h-[90vh] flex flex-col`}>
        
        {/* Header */}
        <div className={`px-6 py-4 border-b ${colors.border} flex-shrink-0`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
                <Users className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
              </div>
              <div>
                <h2 className={`text-lg font-semibold ${colors.textPrimary}`}>Clientes Cadastrados</h2>
                <p className={`text-xs ${colors.textMuted}`}>
                  {loading ? 'Carregando...' : `${clientes.length} ${clientes.length === 1 ? 'cliente' : 'clientes'}`}
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

          {/* Search Bar */}
          {!loading && clientes.length > 0 && (
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${colors.textMuted}`} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, email, telefone ou CPF..."
                className={`w-full pl-10 pr-4 py-2 rounded-lg border ${colors.border} ${colors.inputBg} ${colors.textPrimary} focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm`}
              />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className={`w-12 h-12 animate-spin ${colors.textMuted}`} />
              <p className={`text-sm ${colors.textMuted} mt-4`}>Carregando clientes...</p>
            </div>
          ) : clientes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className={`p-4 rounded-full ${colors.cardBg} mb-4`}>
                <Users className={`w-12 h-12 ${colors.textMuted}`} />
              </div>
              <p className={`text-lg font-medium ${colors.textPrimary}`}>Nenhum cliente cadastrado</p>
              <p className={`text-sm ${colors.textMuted} mt-2 text-center max-w-sm`}>
                Os clientes aparecerão aqui quando se cadastrarem ou fizerem pedidos.
              </p>
            </div>
          ) : filteredClientes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className={`p-4 rounded-full ${colors.cardBg} mb-4`}>
                <Search className={`w-12 h-12 ${colors.textMuted}`} />
              </div>
              <p className={`text-lg font-medium ${colors.textPrimary}`}>Nenhum cliente encontrado</p>
              <p className={`text-sm ${colors.textMuted} mt-2 text-center max-w-sm`}>
                Tente buscar por outro nome, email ou telefone.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredClientes.map((cliente) => (
                <div
                  key={cliente.id}
                  className={`rounded-xl border ${colors.border} ${colors.cardBg} p-4 hover:shadow-lg transition-shadow`}
                >
                  {/* Header do Cliente */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`p-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                      <User className={`w-5 h-5 ${colors.textMuted}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-base font-semibold ${colors.textPrimary} truncate`}>
                        {cliente.nome}
                      </h3>
                      {cliente.identificador && (
                        <p className={`text-xs ${colors.textMuted}`}>
                          {cliente.identificador}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Contatos */}
                  <div className="space-y-2 mb-3">
                    {cliente.email && (
                      <div className="flex items-center gap-2">
                        <Mail className={`w-4 h-4 ${colors.textMuted} flex-shrink-0`} />
                        <span className={`text-xs ${colors.textPrimary} truncate`}>
                          {cliente.email}
                        </span>
                      </div>
                    )}
                    {cliente.telefone && (
                      <div className="flex items-center gap-2">
                        <Phone className={`w-4 h-4 ${colors.textMuted} flex-shrink-0`} />
                        <span className={`text-xs ${colors.textPrimary}`}>
                          {cliente.telefone}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className={`border-t ${colors.border} pt-3 grid grid-cols-2 gap-3`}>
                    <div>
                      <p className={`text-xs ${colors.textMuted}`}>Total de pedidos</p>
                      <p className={`text-lg font-bold ${colors.textPrimary}`}>
                        {cliente.total_pedidos || 0}
                      </p>
                    </div>
                    <div>
                      <p className={`text-xs ${colors.textMuted}`}>Último pedido</p>
                      <p className={`text-sm font-medium ${colors.textPrimary}`}>
                        {formatDate(cliente.ultimo_pedido || null)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {clientes.length > 0 && (
          <div className={`px-6 py-4 border-t ${colors.border} flex-shrink-0`}>
            <div className="flex items-center justify-between">
              <p className={`text-sm ${colors.textMuted}`}>
                {filteredClientes.length === clientes.length 
                  ? `Total: ${clientes.length} ${clientes.length === 1 ? 'cliente' : 'clientes'}`
                  : `Mostrando ${filteredClientes.length} de ${clientes.length}`
                }
              </p>
              <button
                onClick={onClose}
                className={`px-6 py-2 rounded-lg font-medium transition ${
                  isDark 
                    ? 'bg-slate-700 hover:bg-slate-600 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }`}
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
