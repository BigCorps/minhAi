'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Search, RefreshCw, Zap, Trash2, ChevronDown, ChevronLeft, ChevronRight, User, MessageSquare, Download } from 'lucide-react';

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface AssistantFunction {
  function_key: string;
  function_name: string;
  short_description: string | null;
  description: string;
}

interface LogEntry {
  id: string;
  company_id: string;
  function_key: string;
  credits_consumed: number;
  executed_at: string;
  metadata: any;
  companyName: string;
  realUserMessage?: string;
  realAssistantMessage?: string;
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 400;
const BRT = 'America/Sao_Paulo';

const DIALOGUE_FUNCTIONS = ['chatgpt', 'orcamento', 'faq'];
const META_FUNCTIONS = [
  'meta_reply', 'meta_comment',
  'pix_generate', 'pix_confirm', 'pix_check',
  'faq', 'contacts', 'nossa_marca', 'endereco', 'orcamento',
  'consultar_cep', 'consultar_cnpj', 'consultar_cambio', 'consultar_cpf',
  'consultar_placa', 'restricoes_cpf', 'restricoes_cnpj', 'consultar_leilao',
  'consultar_ddd', 'consultar_feriados',
  'clima_tempo', 'ver_noticias', 'rastreio_correios', 'traduzir_texto',
  'chamar_gerente', 'link_pagamento',
  'ver_agenda', 'horarios_disponiveis', 'agendar_compromisso',
  'cancelar_agendamento', 'confirmar_presenca', 'reagendar_compromisso',
  'enviar_email',
];
const RICH_FUNCTIONS = [...DIALOGUE_FUNCTIONS, ...META_FUNCTIONS];
const CONVERSATION_KEYS = RICH_FUNCTIONS;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBRT(dateStr: string): string {
  return new Date(dateStr).toLocaleString('pt-BR', {
    timeZone: BRT,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Componente ──────────────────────────────────────────────────────────────

export default function HistoricoPage() {

  // ── Data ──
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [functions, setFunctions] = useState<Record<string, AssistantFunction>>({});
  const [companies, setCompanies] = useState<any[]>([]);
  const [userCompanyIds, setUserCompanyIds] = useState<string[]>([]);

  // ── Filtros (server-side) ──
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [viewFilter, setViewFilter] = useState<'all' | 'conversations' | 'actions'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // ── Paginação ──
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // ── UI ──
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Dropdowns ──
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [typeDropdownPos, setTypeDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  // refs dos botões para calcular posição no clique — desktop e mobile separados
  const dropdownBtnDesktopRef = useRef<HTMLButtonElement>(null);
  const dropdownBtnMobileRef = useRef<HTMLButtonElement>(null);
  const typeDropdownBtnDesktopRef = useRef<HTMLButtonElement>(null);
  const typeDropdownBtnMobileRef = useRef<HTMLButtonElement>(null);
  const dropdownContainerRef = useRef<HTMLDivElement>(null);
  const typeDropdownContainerRef = useRef<HTMLDivElement>(null);

  function openDropdown(btnRef: React.RefObject<HTMLButtonElement | null>) {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setDropdownPos({ top: r.bottom + window.scrollY, left: r.right - Math.max(r.width, 180) + window.scrollX, width: Math.max(r.width, 180) });
    }
    setDropdownOpen(v => !v);
    setTypeDropdownOpen(false);
  }

  function openTypeDropdown(btnRef: React.RefObject<HTMLButtonElement | null>) {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setTypeDropdownPos({ top: r.bottom + window.scrollY, left: r.right - Math.max(r.width, 140) + window.scrollX, width: Math.max(r.width, 140) });
    }
    setTypeDropdownOpen(v => !v);
    setDropdownOpen(false);
  }

  const supabase = createClient();

  // ── Debounce busca ──
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // ── Fechar dropdowns ao clicar fora ──
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      const t = e.target as Node;
      const isInsideDropdownBtn =
        dropdownBtnDesktopRef.current?.contains(t) ||
        dropdownBtnMobileRef.current?.contains(t);
      const isInsideTypeBtn =
        typeDropdownBtnDesktopRef.current?.contains(t) ||
        typeDropdownBtnMobileRef.current?.contains(t);

      if (dropdownOpen && !dropdownContainerRef.current?.contains(t) && !isInsideDropdownBtn)
        setDropdownOpen(false);
      if (typeDropdownOpen && !typeDropdownContainerRef.current?.contains(t) && !isInsideTypeBtn)
        setTypeDropdownOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [dropdownOpen, typeDropdownOpen]);

  // ── Inicialização única: empresas + funções ──
  useEffect(() => { initStaticData(); }, []);

  // ── Recarregar quando filtros ou página mudam ──
  useEffect(() => {
    if (!initializing) loadLogs();
  }, [selectedCompany, viewFilter, debouncedSearch, page, initializing]);

  // ── Resetar para pág 0 ao mudar filtros ──
  useEffect(() => {
    if (!initializing) setPage(0);
  }, [selectedCompany, viewFilter, debouncedSearch]);

  // ─── Inicialização: dados estáticos (só 1x) ────────────────────────────────

  async function initStaticData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: adminData } = await supabase
        .from('company_admins').select('company_id').eq('user_id', user.id);

      let ids: string[] = [];
      if (adminData && adminData.length > 0) {
        ids = adminData.map((a: any) => a.company_id);
      } else {
        const { data: all } = await supabase.from('companies').select('id');
        if (all) ids = all.map((c: any) => c.id);
      }
      setUserCompanyIds(ids);

      if (ids.length > 0) {
        const [{ data: companiesData }, { data: functionsData }] = await Promise.all([
          supabase.from('companies').select('id, name, slug').in('id', ids).order('name'),
          supabase.from('assistant_functions').select('function_key, function_name, short_description, description'),
        ]);

        setCompanies(companiesData || []);

        const map: Record<string, AssistantFunction> = {};
        (functionsData || []).forEach((f: any) => { map[f.function_key] = f; });
        setFunctions(map);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao inicializar');
    } finally {
      setInitializing(false);
    }
  }

  // ─── Carregar logs paginados com filtros no banco ──────────────────────────

  const loadLogs = useCallback(async () => {
    if (userCompanyIds.length === 0) {
      setLogs([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('assistant_function_logs')
        .select('id, company_id, function_key, credits_consumed, executed_at, metadata', { count: 'exact' })
        .in('company_id', userCompanyIds)
        .order('executed_at', { ascending: false })
        .range(from, to);

      // Filtro: assistente
      if (selectedCompany !== 'all') {
        query = query.eq('company_id', selectedCompany);
      }

      // Filtro: tipo → traduzido em function_key no banco
      if (viewFilter === 'conversations') {
        query = query.in('function_key', CONVERSATION_KEYS);
      } else if (viewFilter === 'actions') {
        query = query.not('function_key', 'in', `(${CONVERSATION_KEYS.map(k => `"${k}"`).join(',')})`);
      }

      // Busca por texto → function_key, metadata.user_input, metadata.assistant_response
      if (debouncedSearch.trim()) {
        const s = debouncedSearch.trim();
        query = query.or(
          `function_key.ilike.%${s}%,metadata->>user_input.ilike.%${s}%,metadata->>assistant_response.ilike.%${s}%`
        );
      }

      const { data: logsData, error: logsError, count } = await query;
      if (logsError) throw new Error('Erro ao carregar histórico: ' + logsError.message);

      setTotalCount(count ?? 0);

      const batch: LogEntry[] = (logsData || []).map((log: any) => ({
        ...log,
        companyName: companies.find((c: any) => c.id === log.company_id)?.name ?? '—',
      }));

      const enriched = await enrichWithMessages(batch);
      setLogs(enriched);

    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [userCompanyIds, companies, selectedCompany, viewFilter, debouncedSearch, page]);

  // ─── Enriquecer lote com mensagens reais ───────────────────────────────────

  async function enrichWithMessages(batch: LogEntry[]): Promise<LogEntry[]> {
    const richLogs = batch.filter(l => RICH_FUNCTIONS.includes(l.function_key));
    if (richLogs.length === 0) return batch;

    // Passo 1: aplicar o que já existe no metadata (logs novos)
    let result = batch.map(log => {
      if (!RICH_FUNCTIONS.includes(log.function_key)) return log;

      if (log.metadata?.user_input || log.metadata?.assistant_response) {
        return { ...log, realUserMessage: log.metadata.user_input || '', realAssistantMessage: log.metadata.assistant_response || '' };
      }

      if (META_FUNCTIONS.includes(log.function_key) && log.metadata) {
        const u = log.metadata.user_input
          || log.metadata.from_message
          || log.metadata.comment_text
          || log.metadata.message
          || '';
        const a = log.metadata.assistant_response
          || log.metadata.reply_text
          || log.metadata.response
          || '';
        if (u || a) return { ...log, realUserMessage: u, realAssistantMessage: a };
      }

      return log;
    });

    // Passo 2: logs antigos sem metadata → cruzar por timestamp em messages
    const needsMessages = result.filter(l =>
      RICH_FUNCTIONS.includes(l.function_key) && !l.realUserMessage && !l.realAssistantMessage
    );

    if (needsMessages.length > 0) {
      const timestamps = needsMessages.map(l => new Date(l.executed_at).getTime());
      const minTs = new Date(Math.min(...timestamps) - 20000).toISOString();
      const maxTs = new Date(Math.max(...timestamps) + 20000).toISOString();

      const { data: allMessages } = await supabase
        .from('messages')
        .select('conversation_id, role, content, created_at')
        .gte('created_at', minTs)
        .lte('created_at', maxTs)
        .in('role', ['user', 'assistant'])
        .order('created_at', { ascending: true });

      if (allMessages && allMessages.length > 0) {
        const byConv: Record<string, any[]> = {};
        for (const m of allMessages) {
          if (!m.conversation_id) continue;
          if (!byConv[m.conversation_id]) byConv[m.conversation_id] = [];
          byConv[m.conversation_id].push(m);
        }

        const byTime = allMessages.map((m: any) => ({
          ts: new Date(m.created_at).getTime(),
          conversation_id: m.conversation_id,
        }));

        result = result.map(log => {
          if (log.realUserMessage || log.realAssistantMessage) return log;
          if (!RICH_FUNCTIONS.includes(log.function_key)) return log;

          const logTs = new Date(log.executed_at).getTime();
          const near = byTime.find(m => Math.abs(m.ts - logTs) <= 15000);
          if (!near?.conversation_id) return log;

          const msgs = byConv[near.conversation_id] || [];
          let userMsg = '';
          let assistantMsg = '';

          for (let i = msgs.length - 1; i > 0; i--) {
            if (msgs[i - 1].role === 'user' && msgs[i].role === 'assistant') {
              userMsg = msgs[i - 1].content;
              assistantMsg = msgs[i].content;
              break;
            }
          }

          if (!userMsg && msgs.length >= 2) {
            const last = msgs.slice(-2);
            if (last[0].role === 'user') userMsg = last[0].content;
            if (last[1].role === 'assistant') assistantMsg = last[1].content;
          }

          if (!userMsg && !assistantMsg) return log;
          return { ...log, realUserMessage: userMsg, realAssistantMessage: assistantMsg };
        });
      }
    }

    return result;
  }

  // ─── Ações ─────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;
    try {
      const { error } = await supabase.from('assistant_function_logs').delete().eq('id', id);
      if (error) throw error;
      setLogs(prev => prev.filter(l => l.id !== id));
      setTotalCount(prev => prev - 1);
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  }

  function goToPage(p: number) {
    setPage(Math.max(0, Math.min(p, totalPages - 1)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function exportarPDF() {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'landscape' });
  const LOGO_URL = 'https://minhai.app/icons/icon-192x192.png';
  const geradoEm = new Date().toLocaleString('pt-BR', { timeZone: BRT });
  const empresaLabel = selectedCompany === 'all'
    ? 'Todos os assistentes'
    : companies.find(c => c.id === selectedCompany)?.name ?? '—';

  // Cabeçalho
  try {
    const img = await fetch(LOGO_URL);
    const blob = await img.blob();
    const dataUrl = await new Promise<string>((res) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.readAsDataURL(blob);
    });
    doc.addImage(dataUrl, 'PNG', 10, 8, 12, 12);
  } catch { /* sem logo não quebra */ }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('minhAi — Histórico de Interações', 26, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Assistente: ${empresaLabel}`, 26, 20);
  doc.text(`Gerado em: ${geradoEm}`, 26, 25);
  doc.text(`Total de registros: ${totalCount}`, 26, 30);
  doc.setTextColor(0);

  // Tabela
  const rows = logs.map(log => {
    const func = functions[log.function_key];
    return [
      formatBRT(log.executed_at),
      log.companyName,
      func?.function_name ?? log.function_key,
      log.credits_consumed > 0 ? String(log.credits_consumed) : '—',
      (getUserMessage(log) ?? '').slice(0, 120),
      (getAssistantMessage(log) ?? '').slice(0, 120),
    ];
  });

  autoTable(doc, {
    startY: 36,
    head: [['Data/Hora', 'Assistente', 'Função', 'Créditos', 'Mensagem do Usuário', 'Resposta']],
    body: rows,
    styles: { fontSize: 7.5, cellPadding: 2.5, overflow: 'linebreak' },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 32 },
      2: { cellWidth: 32 },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 72 },
      5: { cellWidth: 72 },
    },
    alternateRowStyles: { fillColor: [245, 247, 255] },
    didDrawPage: (data) => {
      // Rodapé com número de página
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Página ${data.pageNumber} de ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'center' }
      );
    },
  });

  const nomeArquivo = `historico-minhai-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(nomeArquivo);
}

  // ─── Display helpers ───────────────────────────────────────────────────────

  function hasRealDialogue(log: LogEntry) {
    return !!(log.realUserMessage || log.realAssistantMessage);
  }

  function getUserMessage(log: LogEntry): string {
    if (log.realUserMessage) return log.realUserMessage;
    if (log.metadata?.transcript) return log.metadata.transcript;
    if (log.metadata?.user_input) return log.metadata.user_input;
    if (log.metadata?.from_message) return log.metadata.from_message;
    if (log.metadata?.comment_text) return log.metadata.comment_text;
    const func = functions[log.function_key];
    return `Função "${func?.function_name ?? log.function_key}" executada`;
  }

  function getAssistantMessage(log: LogEntry): string {
    if (log.realAssistantMessage) return log.realAssistantMessage;
    if (log.metadata?.assistant_response) return log.metadata.assistant_response;
    if (log.metadata?.response) return log.metadata.response;
    if (log.metadata?.reply_text) return log.metadata.reply_text;
    const func = functions[log.function_key];
    return func?.short_description ?? func?.description ?? 'Função executada com sucesso.';
  }

  // ─── Números de página com reticências ─────────────────────────────────────

  function getPaginationRange(): (number | '...')[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i);
    const r: (number | '...')[] = [];
    if (page <= 3) {
      r.push(0, 1, 2, 3, 4, '...', totalPages - 1);
    } else if (page >= totalPages - 4) {
      r.push(0, '...', totalPages - 5, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1);
    } else {
      r.push(0, '...', page - 1, page, page + 1, '...', totalPages - 1);
    }
    return r;
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const viewFilterLabel = viewFilter === 'all' ? 'Tudo' : viewFilter === 'conversations' ? 'Conversas' : 'Funções';
  const companyLabel = selectedCompany === 'all'
    ? 'Assistente'
    : companies.find(c => c.id === selectedCompany)?.name || 'Selecionar';
  const pageStart = totalCount === 0 ? 0 : page * PAGE_SIZE + 1;
  const pageEnd = Math.min((page + 1) * PAGE_SIZE, totalCount);

  return (
    <div className="min-h-screen transition-colors duration-500 bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* ── Cabeçalho ── */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold transition-colors text-gray-900 dark:text-white">
            Histórico de Conversas
          </h1>
          <p className="mt-2 transition-colors text-gray-600 dark:text-white/60">
            Visualize e gerencie as interações dos usuários com seus assistentes.
            {totalCount > 0 && (
              <span className="ml-2 text-sm font-medium text-blue-600 dark:text-blue-400">
                · {totalCount} registros
              </span>
            )}
          </p>
        </div>

        {/* ── Erro ── */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-lg p-5 mb-6 flex items-start gap-3">
            <div className="flex-1">
              <p className="text-red-900 dark:text-red-200 font-semibold text-sm">Erro ao carregar</p>
              <p className="text-red-700 dark:text-red-300 text-sm mt-0.5">{error}</p>
            </div>
            <button
              onClick={() => loadLogs()}
              className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm flex-shrink-0"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* ── Barra de filtros ── */}
        <div className="rounded-xl shadow-sm px-4 py-4 mb-6 transition-colors bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 backdrop-blur-sm overflow-visible">

          {/* Linha 1 — Desktop: tudo junto / Mobile: busca + refresh */}
          <div className="flex items-center gap-2">

            {/* Campo de busca */}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por função, pergunta ou resposta..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-sm border rounded-lg transition-colors
                focus:ring-2 focus:ring-blue-500 focus:border-transparent
                bg-white/50 border-gray-300 text-gray-900
                dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder-gray-500"
              />
              {/* Spinner de debounce */}
              {searchTerm !== debouncedSearch && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
              )}
            </div>

            {/* Tipo — desktop */}
            <div ref={typeDropdownContainerRef} className="hidden sm:block relative">
              <button
                ref={typeDropdownBtnDesktopRef}
                type="button"
                onClick={() => openTypeDropdown(typeDropdownBtnDesktopRef)}
                className="flex items-center gap-1 py-2 pl-3 pr-2 text-sm border rounded-lg transition-colors whitespace-nowrap
                bg-white/50 border-gray-300 text-gray-900
                dark:bg-white/5 dark:border-white/10 dark:text-white"
              >
                {viewFilterLabel}
                <ChevronDown className={`w-4 h-4 transition-transform ${typeDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Assistente — desktop */}
            <div ref={dropdownContainerRef} className="hidden sm:block relative">
              <button
                ref={dropdownBtnDesktopRef}
                type="button"
                onClick={() => openDropdown(dropdownBtnDesktopRef)}
                className="flex items-center gap-1 py-2 pl-3 pr-2 text-sm border rounded-lg transition-colors whitespace-nowrap
                bg-white/50 border-gray-300 text-gray-900
                dark:bg-white/5 dark:border-white/10 dark:text-white"
              >
                <span className="max-w-[120px] truncate">{companyLabel}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

{/* Exportar PDF */}
<button
  onClick={exportarPDF}
  disabled={loading || logs.length === 0}
  title="Exportar página atual como PDF"
  className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-transparent transition-colors disabled:opacity-50 flex-shrink-0
  bg-blue-50 text-blue-700 hover:bg-blue-100
  dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30"
>
  <Download className="w-4 h-4" />
  <span className="hidden md:inline">Exportar PDF</span>
</button>

            {/* Refresh */}
            <button
              onClick={() => { setPage(0); loadLogs(); }}
              disabled={loading}
              title="Atualizar"
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-transparent transition-colors disabled:opacity-50 flex-shrink-0
              bg-gray-100 text-gray-700 hover:bg-gray-200
              dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/20"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">Atualizar</span>
            </button>
          </div>

          {/* Linha 2 — Mobile: seletores lado a lado */}
          <div className="flex gap-2 mt-2 sm:hidden">
            {/* Tipo — mobile */}
            <button
              ref={typeDropdownBtnMobileRef}
              type="button"
              onClick={() => openTypeDropdown(typeDropdownBtnMobileRef)}
              className="flex-1 flex items-center justify-between gap-1 py-2 pl-3 pr-2 text-sm border rounded-lg transition-colors
              bg-white/50 border-gray-300 text-gray-900
              dark:bg-white/5 dark:border-white/10 dark:text-white"
            >
              {viewFilterLabel}
              <ChevronDown className={`w-4 h-4 transition-transform ${typeDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {/* Assistente — mobile */}
            <button
              ref={dropdownBtnMobileRef}
              type="button"
              onClick={() => openDropdown(dropdownBtnMobileRef)}
              className="flex-1 flex items-center justify-between gap-1 py-2 pl-3 pr-2 text-sm border rounded-lg transition-colors
              bg-white/50 border-gray-300 text-gray-900
              dark:bg-white/5 dark:border-white/10 dark:text-white"
            >
              <span className="truncate">{companyLabel}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* ── Lista ── */}
        {loading ? (
          <div className="rounded-xl p-12 text-center bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 backdrop-blur-sm">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">Carregando...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-xl p-12 text-center bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 backdrop-blur-sm">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-gray-100 dark:bg-white/10">
              <Zap className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Nenhuma interação encontrada</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {debouncedSearch
                ? `Nenhum resultado para "${debouncedSearch}"`
                : 'Ainda não há registros para os filtros selecionados.'}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {logs.map(log => {
                const func = functions[log.function_key];
                const userMsg = getUserMessage(log);
                const assistantMsg = getAssistantMessage(log);
                const isDialogue = hasRealDialogue(log);
                const isGeneric = !isDialogue && !RICH_FUNCTIONS.includes(log.function_key);

                return (
                  <div
                    key={log.id}
                    className="rounded-xl shadow-sm overflow-hidden border transition-all
                    bg-white/80 border-gray-200 hover:border-blue-300
                    dark:bg-white/5 dark:border-white/10 dark:hover:border-blue-500/30 backdrop-blur-sm"
                  >
                    <div className="p-4 sm:p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            {log.companyName}
                          </span>
                          <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300">
                            {func?.function_name ?? log.function_key}
                          </span>
                          {isDialogue && (
                            <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                              Conversa
                            </span>
                          )}
                          {isGeneric && (
                            <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400">
                              Função
                            </span>
                          )}
                          {log.credits_consumed > 0 && (
                            <span className="px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                              {log.credits_consumed} crédito{log.credits_consumed !== 1 ? 's' : ''}
                            </span>
                          )}
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatBRT(log.executed_at)}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDelete(log.id)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-start space-x-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          </div>
                          <div className="flex-1 bg-gray-50 dark:bg-white/5 rounded-lg p-3">
                            <p className={`text-sm whitespace-pre-wrap ${isGeneric ? 'text-gray-400 dark:text-gray-500 italic' : 'text-gray-900 dark:text-gray-200'}`}>
                              {userMsg}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start space-x-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                            <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex-1 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg p-3 border border-blue-100/50 dark:border-blue-500/10">
                            <p className={`text-sm whitespace-pre-wrap ${isGeneric ? 'text-gray-400 dark:text-gray-500 italic' : 'text-gray-900 dark:text-gray-200'}`}>
                              {assistantMsg}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Paginação ── */}
            {totalPages > 1 && (
              <div className="mt-8 flex flex-col items-center gap-3">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Mostrando {pageStart}–{pageEnd} de {totalCount} registros
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => goToPage(page - 1)}
                    disabled={page === 0}
                    className="p-2 rounded-lg transition-colors disabled:opacity-30
                    text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {getPaginationRange().map((p, i) =>
                    p === '...' ? (
                      <span key={`e${i}`} className="px-2 text-gray-400 text-sm select-none">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => goToPage(p as number)}
                        className={`min-w-[36px] h-9 px-2 rounded-lg text-sm font-medium transition-colors
                          ${page === p
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10'
                          }`}
                      >
                        {(p as number) + 1}
                      </button>
                    )
                  )}

                  <button
                    onClick={() => goToPage(page + 1)}
                    disabled={page >= totalPages - 1}
                    className="p-2 rounded-lg transition-colors disabled:opacity-30
                    text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Portais de dropdown — fixed para escapar de qualquer stacking context ── */}
      {typeDropdownOpen && (
        <div
          ref={typeDropdownContainerRef}
          style={{ position: 'fixed', top: typeDropdownPos.top, left: typeDropdownPos.left, width: typeDropdownPos.width, zIndex: 9999 }}
          className="rounded-lg border shadow-xl overflow-hidden bg-white border-gray-200 dark:bg-gray-800 dark:border-white/10"
        >
          {(['all', 'conversations', 'actions'] as const).map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => { setViewFilter(opt); setTypeDropdownOpen(false); }}
              className={`w-full px-4 py-2.5 text-left text-sm transition-colors
                ${viewFilter === opt
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'text-gray-900 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/10'}`}
            >
              {opt === 'all' ? 'Tudo' : opt === 'conversations' ? 'Conversas' : 'Funções'}
            </button>
          ))}
        </div>
      )}

      {dropdownOpen && (
        <div
          ref={dropdownContainerRef}
          style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 9999 }}
          className="rounded-lg border shadow-xl overflow-hidden bg-white border-gray-200 dark:bg-gray-800 dark:border-white/10"
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
