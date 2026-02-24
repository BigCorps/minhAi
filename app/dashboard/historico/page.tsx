'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Search, RefreshCw, Zap, Trash2, ChevronDown } from 'lucide-react';

// Mapa de ícones e labels por function_key
const FUNCTION_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  // QR Codes
  qrcode_whatsapp:  { label: 'WhatsApp',        icon: '📱', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  qrcode_instagram: { label: 'Instagram',        icon: '📸', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' },
  qrcode_website:   { label: 'Site',             icon: '🌐', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  qrcode_facebook:  { label: 'Facebook',         icon: '👍', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  qrcode_email:     { label: 'Email',            icon: '📧', color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
  qrcode_linkedin:  { label: 'LinkedIn',         icon: '💼', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  qrcode_tiktok:    { label: 'TikTok',           icon: '🎵', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  qrcode_twitter:   { label: 'Twitter/X',        icon: '🐦', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300' },
  qrcode_telefone:  { label: 'Telefone',         icon: '📞', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  // PIX
  pix_generate:     { label: 'PIX Gerado',       icon: '💳', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
  pix_confirm:      { label: 'PIX Confirmado',   icon: '✅', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  // Informações
  nossa_marca:      { label: 'Nossa Marca',      icon: '🏢', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  endereco:         { label: 'Endereço',         icon: '📍', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  meu_sistema:      { label: 'Meu Sistema',      icon: '🤖', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
  // Produtividade
  ver_agenda:           { label: 'Ver Agenda',       icon: '📆', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  agendar_compromisso:  { label: 'Marcar Evento',    icon: '📅', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' },
  enviar_email:         { label: 'Enviar Email',     icon: '📤', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  // Vídeo
  video_instrucoes:  { label: 'Vídeo Instruções',  icon: '🎓', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  sequencia_videos:  { label: 'Sequência Vídeos',  icon: '🎬', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' },
  // IA
  orcamento:         { label: 'Orçamento IA',      icon: '💰', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  chatgpt:           { label: 'ChatGPT',           icon: '🧠', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  faq:               { label: 'FAQ',               icon: '❓', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
};

function getFunctionInfo(functionKey: string) {
  return FUNCTION_LABELS[functionKey] ?? {
    label: functionKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    icon: '⚡',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  };
}

interface LogEntry {
  id: string;
  company_id: string;
  function_key: string;
  credits_consumed: number;
  executed_at: string;
  metadata: any;
  companyName: string;
}

export default function HistoricoPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const supabase = createClient();

  useEffect(() => {
    if (dropdownOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [dropdownOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    loadData();
  }, [selectedCompany]);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // 1. Buscar empresas do usuário
      const { data: adminData } = await supabase
        .from('company_admins')
        .select('company_id')
        .eq('user_id', user.id);

      let userCompanyIds: string[] = [];

      if (adminData && adminData.length > 0) {
        userCompanyIds = adminData.map(a => a.company_id);
      } else {
        const { data: allCompanies } = await supabase.from('companies').select('id');
        if (allCompanies) userCompanyIds = allCompanies.map(c => c.id);
      }

      if (userCompanyIds.length === 0) {
        setCompanies([]);
        setLogs([]);
        setLoading(false);
        return;
      }

      // 2. Carregar empresas para o filtro
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, name, slug')
        .in('id', userCompanyIds)
        .order('name');

      if (companiesError) throw new Error('Não foi possível carregar as empresas');
      setCompanies(companiesData || []);

      // 3. Buscar logs de assistant_function_logs
      let query = supabase
        .from('assistant_function_logs')
        .select('id, company_id, function_key, credits_consumed, executed_at, metadata')
        .in('company_id', userCompanyIds)
        .order('executed_at', { ascending: false })
        .limit(200);

      if (selectedCompany !== 'all') {
        query = query.eq('company_id', selectedCompany);
      }

      const { data: logsData, error: logsError } = await query;
      if (logsError) throw new Error('Erro ao carregar histórico: ' + logsError.message);

      // 4. Enriquecer com nome da empresa
      const enriched: LogEntry[] = (logsData || []).map(log => ({
        ...log,
        companyName: companiesData?.find(c => c.id === log.company_id)?.name ?? '—',
      }));

      setLogs(enriched);
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;
    try {
      const { error } = await supabase.from('assistant_function_logs').delete().eq('id', id);
      if (error) throw error;
      setLogs(prev => prev.filter(l => l.id !== id));
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  }

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const info = getFunctionInfo(log.function_key);
    return (
      log.function_key.toLowerCase().includes(search) ||
      info.label.toLowerCase().includes(search) ||
      log.companyName.toLowerCase().includes(search) ||
      JSON.stringify(log.metadata || {}).toLowerCase().includes(search)
    );
  });

  return (
    <div className="min-h-screen transition-colors duration-500 bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold transition-colors text-gray-900 dark:text-white">
            Histórico de Interações
          </h1>
          <p className="mt-2 transition-colors text-gray-600 dark:text-white/60">
            Todas as funções executadas pelos assistentes.
          </p>
        </div>

        {/* Erro */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-lg p-6 mb-6">
            <div className="flex items-start space-x-3">
              <div className="text-red-600 dark:text-red-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-red-900 dark:text-red-200 font-semibold mb-1">Erro ao carregar histórico</h3>
                <p className="text-red-800 dark:text-red-300 text-sm mb-3">{error}</p>
                <button onClick={loadData} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm">
                  Tentar Novamente
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="rounded-xl shadow-sm p-6 mb-6 transition-colors bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

            <div className="flex-1 relative">
              <label className="block text-sm font-medium mb-2 transition-colors text-gray-700 dark:text-gray-300">
                Buscar
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por função, assistente..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors
                  bg-white/50 border-gray-300 text-gray-900
                  dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder-gray-500"
                />
              </div>
            </div>

            <div className="w-full md:w-64">
              <label className="block text-sm font-medium mb-2 transition-colors text-gray-700 dark:text-gray-300">
                Filtrar por Assistente
              </label>
              <button
                ref={buttonRef}
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors
                bg-white/50 border-gray-300 text-gray-900
                dark:bg-white/5 dark:border-white/10 dark:text-white
                flex items-center justify-between text-left"
              >
                <span className="truncate">
                  {selectedCompany === 'all'
                    ? 'Todos os assistentes'
                    : companies.find(c => c.id === selectedCompany)?.name || 'Selecionar'}
                </span>
                <ChevronDown className={`w-4 h-4 ml-2 flex-shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm transition-colors text-gray-600 dark:text-gray-400">
            <span>{filteredLogs.length} {filteredLogs.length === 1 ? 'interação' : 'interações'}</span>
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center space-x-2 px-3 py-1 rounded transition disabled:opacity-50
              bg-gray-100 text-gray-700 hover:bg-gray-200
              dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/20"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </button>
          </div>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="rounded-xl shadow-sm p-12 text-center transition-colors bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 backdrop-blur-sm">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="transition-colors text-gray-600 dark:text-gray-400">Carregando histórico...</p>
          </div>
        ) : filteredLogs.length === 0 && !error ? (
          <div className="rounded-xl shadow-sm p-12 text-center transition-colors bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 backdrop-blur-sm">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-gray-100 dark:bg-white/10">
              <Zap className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h2 className="text-xl font-bold mb-2 transition-colors text-gray-900 dark:text-white">
              Nenhuma interação encontrada
            </h2>
            <p className="transition-colors text-gray-600 dark:text-gray-400">
              Ainda não há funções executadas para os critérios selecionados.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map(log => {
              const info = getFunctionInfo(log.function_key);
              return (
                <div
                  key={log.id}
                  className="rounded-xl shadow-sm border transition-all
                  bg-white/80 border-gray-200 hover:border-blue-300
                  dark:bg-white/5 dark:border-white/10 dark:hover:border-blue-500/30 backdrop-blur-sm"
                >
                  <div className="p-4 flex items-center gap-4">

                    {/* Ícone */}
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center flex-shrink-0 text-xl">
                      {info.icon}
                    </div>

                    {/* Info principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${info.color}`}>
                          {info.label}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          {log.companyName}
                        </span>
                        {log.credits_consumed > 0 && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                            {log.credits_consumed} crédito{log.credits_consumed !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      {/* Metadata relevante */}
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                          {Object.entries(log.metadata)
                            .filter(([k]) => !['function_used', 'interaction_type'].includes(k))
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(' · ')}
                        </p>
                      )}
                    </div>

                    {/* Data/hora */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {new Date(log.executed_at).toLocaleString('pt-BR')}
                      </span>
                      <button
                        onClick={() => handleDelete(log.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                        title="Excluir registro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dropdown */}
      {dropdownOpen && (
        <div
          ref={dropdownRef}
          className="fixed z-[99999] rounded-lg border shadow-lg overflow-hidden bg-white border-gray-200 dark:bg-gray-800 dark:border-white/10"
          style={{ top: `${dropdownPosition.top}px`, left: `${dropdownPosition.left}px`, width: `${dropdownPosition.width}px` }}
        >
          <div className="max-h-60 overflow-y-auto">
            <button
              type="button"
              onClick={() => { setSelectedCompany('all'); setDropdownOpen(false); }}
              className={`w-full px-4 py-2.5 text-left text-sm transition-colors
                ${selectedCompany === 'all'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'text-gray-900 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/10'}`}
            >
              Todos os assistentes
            </button>
            {companies.map(company => (
              <button
                key={company.id}
                type="button"
                onClick={() => { setSelectedCompany(company.id); setDropdownOpen(false); }}
                className={`w-full px-4 py-2.5 text-left text-sm transition-colors
                  ${selectedCompany === company.id
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'text-gray-900 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/10'}`}
              >
                {company.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
