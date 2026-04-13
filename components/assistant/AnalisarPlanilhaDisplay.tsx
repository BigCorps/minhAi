'use client';

// ============================================================
// AnalisarPlanilhaDisplay.tsx
// Arquivo: components/assistant/AnalisarPlanilhaDisplay.tsx
// ============================================================
// Analisador universal de arquivos:
// - Planilhas: XLSX, XLS, CSV, TSV → JSON (SheetJS)
// - Documentos: DOCX, DOC → texto (mammoth)
// - PDFs → texto por página (pdfjs)
// - Imagens: JPG, PNG, WEBP → GPT-4o Vision (base64)
// Padrão: createPortal + fixed inset-0 + inline styles DARK/LIGHT
// ============================================================

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { useIsMobile } from '@/hooks/useIsMobile';
import { anonimizarPII, construirSchema } from '@/lib/utils/anonimizarPII';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

declare global {
  interface Window {
    XLSX?: any;
    pdfjsLib?: any;
    mammoth?: any;
  }
}

// ── Tipos ────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface KPI {
  label: string;
  valor: string;
  variacao?: string;
  cor: string;
  icone: 'trending_up' | 'trending_down' | 'neutral' | 'warning' | 'info';
}

interface GraficoDado {
  label: string;
  valor: number;
  [key: string]: string | number;
}

interface Grafico {
  id: string;
  tipo: 'bar' | 'line' | 'pie' | 'area' | 'scatter';
  titulo: string;
  descricao: string;
  dados: GraficoDado[];
  config: {
    xKey: string;
    yKey: string;
    cor: string;
    multiSeries?: { key: string; cor: string; label: string }[];
  };
}

interface Insight {
  titulo: string;
  descricao: string;
  prioridade: 'high' | 'medium' | 'low';
  tipo: 'tendencia' | 'anomalia' | 'oportunidade' | 'risco';
}

interface DashboardFicha {
  dominio: string;
  kpis: KPI[];
  graficos: Grafico[];
  insights: Insight[];
  resumo_executivo: string;
  completo: boolean;
}

interface Props {
  data: { companyId: string };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText: (text: string) => Promise<void>;
}

// ── Paletas inline ────────────────────────────────────────────
const DARK = {
  bg: '#1e293b',
  bgSecondary: '#334155',
  bgChat: '#0f172a',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  border: '#475569',
  accent: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  userBubble: '#3b82f6',
  assistantBubble: '#334155',
  kpiBg: '#1e3a5f',
  uploadBg: '#0f172a',
};

const LIGHT = {
  bg: '#ffffff',
  bgSecondary: '#f8fafc',
  bgChat: '#f1f5f9',
  text: '#0f172a',
  textMuted: '#64748b',
  border: '#e2e8f0',
  accent: '#2563eb',
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
  userBubble: '#2563eb',
  assistantBubble: '#e2e8f0',
  kpiBg: '#dbeafe',
  uploadBg: '#f8fafc',
};

const PIE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

// ── Tipo de arquivo ───────────────────────────────────────────
type TipoArquivo = 'planilha' | 'pdf' | 'docx' | 'imagem' | null;

const TIPOS_ACEITOS = '.csv,.xlsx,.xls,.tsv,.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp';

const EXTENSOES_POR_TIPO: Record<string, TipoArquivo> = {
  csv: 'planilha', xlsx: 'planilha', xls: 'planilha', tsv: 'planilha',
  pdf: 'pdf',
  doc: 'docx', docx: 'docx',
  jpg: 'imagem', jpeg: 'imagem', png: 'imagem', webp: 'imagem',
};

const ICONE_POR_TIPO: Record<NonNullable<TipoArquivo>, string> = {
  planilha: '📊', pdf: '📄', docx: '📝', imagem: '🖼️',
};

const MENSAGEM_INICIAL = 'Olá! Posso analisar planilhas, documentos, PDFs e imagens. Envie qualquer arquivo para começar, ou me descreva o que você quer analisar.';

// ── Ícones SVG inline (sem lucide-react) ──────────────────────
const IconX = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconSend = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);
const IconMic = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);
const IconUpload = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
  </svg>
);
const IconPDF = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
  </svg>
);
const IconShare = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);
const IconVolume = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  </svg>
);
const IconVolumeMute = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
  </svg>
);
const IconLoader = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);
const IconChart = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
  </svg>
);

// ── Ícone de KPI ──────────────────────────────────────────────
function KPIIcon({ icone, cor }: { icone: KPI['icone']; cor: string }) {
  if (icone === 'trending_up') return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth="2">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
    </svg>
  );
  if (icone === 'trending_down') return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth="2">
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 18 23 18 23 12" />
    </svg>
  );
  if (icone === 'warning') return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth="2">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

// ── Gráfico dinâmico ──────────────────────────────────────────
function GraficoRecharts({ grafico, C }: { grafico: Grafico; C: typeof DARK }) {
  const { tipo, dados, config } = grafico;
  if (!dados?.length) return (
    <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textMuted, fontSize: 12 }}>
      Sem dados suficientes
    </div>
  );

  const chartProps = { data: dados, margin: { top: 5, right: 10, left: -10, bottom: 5 } };
  const axisFill = '#6b7280';
  const gridColor = '#d1d5db';
  const axisStyle = { fontSize: 10, fill: axisFill };
  const tooltipStyle = { backgroundColor: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 11 };

  if (tipo === 'pie') {
    // Pie usa altura maior e label DENTRO da fatia (cx/cy com margem)
    // para evitar que o html2canvas corte as labels externas.
    // Também adiciona Legend abaixo para garantir legibilidade no PDF.
    const RADIAN = Math.PI / 180;
    const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
      // Só mostra label se fatia >= 5% para não sobrepor
      if (percent < 0.05) return null;
      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
      const x = cx + radius * Math.cos(-midAngle * RADIAN);
      const y = cy + radius * Math.sin(-midAngle * RADIAN);
      return (
        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
          {`${(percent * 100).toFixed(0)}%`}
        </text>
      );
    };

    return (
      <div style={{ width: '100%' }}>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
            <Pie
              data={dados}
              dataKey={config.yKey}
              nameKey={config.xKey}
              cx="50%"
              cy="50%"
              outerRadius={80}
              labelLine={false}
              label={renderCustomLabel}
            >
              {dados.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(value: any, name: any) => [value, name]} />
            <Legend
              formatter={(value) => <span style={{ fontSize: 11, color: axisFill }}>{value}</span>}
              wrapperStyle={{ paddingTop: 8 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }
  if (tipo === 'line') return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart {...chartProps}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis dataKey={config.xKey} tick={axisStyle} />
        <YAxis tick={axisStyle} />
        <Tooltip contentStyle={tooltipStyle} />
        {config.multiSeries ? config.multiSeries.map(s => <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.cor} strokeWidth={2} dot={false} name={s.label} />) : <Line type="monotone" dataKey={config.yKey} stroke={config.cor} strokeWidth={2} dot={false} />}
      </LineChart>
    </ResponsiveContainer>
  );
  if (tipo === 'area') return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart {...chartProps}>
        <defs><linearGradient id={`g${grafico.id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={config.cor} stopOpacity={0.3} /><stop offset="95%" stopColor={config.cor} stopOpacity={0} /></linearGradient></defs>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis dataKey={config.xKey} tick={axisStyle} /><YAxis tick={axisStyle} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area type="monotone" dataKey={config.yKey} stroke={config.cor} fill={`url(#g${grafico.id})`} strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
  // default: bar
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart {...chartProps}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis dataKey={config.xKey} tick={axisStyle} /><YAxis tick={axisStyle} />
        <Tooltip contentStyle={tooltipStyle} />
        {config.multiSeries ? config.multiSeries.map(s => <Bar key={s.key} dataKey={s.key} fill={s.cor} radius={[3,3,0,0]} name={s.label} />) : <Bar dataKey={config.yKey} fill={config.cor} radius={[3,3,0,0]} />}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Prioridade badge ──────────────────────────────────────────
function PrioridadeBadge({ p, C }: { p: Insight['prioridade']; C: typeof DARK }) {
  const map = { high: { label: 'Alta', cor: C.danger }, medium: { label: 'Média', cor: C.warning }, low: { label: 'Baixa', cor: C.textMuted } };
  const { label, cor } = map[p];
  return <span style={{ padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, color: cor, border: `1px solid ${cor}40`, background: `${cor}15` }}>{label}</span>;
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function AnalisarPlanilhaDisplay({ data, onClose, theme = 'dark', playText }: Props) {
  const { companyId } = data;
  const isDark = theme === 'dark';
  const C = isDark ? DARK : LIGHT;
  const isMobile = useIsMobile();
  const supabase = createClient();
  const voiceRecorder = useVoiceRecorder();

  // ── States ────────────────────────────────────────────────
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioMutado, setAudioMutado] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [slugCopiado, setSlugCopiado] = useState(false);
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [tipoArquivo, setTipoArquivo] = useState<TipoArquivo>(null);
  const [dadosBrutos, setDadosBrutos] = useState<Record<string, unknown>[]>([]);
  const [schema, setSchema] = useState<ReturnType<typeof construirSchema>>([]);
  const [conteudoTexto, setConteudoTexto] = useState(''); // para PDF/DOCX
  const [imagemBase64, setImagemBase64] = useState('');   // para imagens
  const [alertaPII, setAlertaPII] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dashboardSalvoId, setDashboardSalvoId] = useState<string | null>(null);
  const [slugCompartilhamento, setSlugCompartilhamento] = useState<string | null>(null);

  const [ficha, setFicha] = useState<DashboardFicha>({
    dominio: '', kpis: [], graficos: [], insights: [], resumo_executivo: '', completo: false,
  });

  // ── Refs ──────────────────────────────────────────────────
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputHeaderRef = useRef<HTMLInputElement>(null);
  const audioMutadoRef = useRef(false);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);
  const isActiveRef = useRef(true);
  const hasSpokenInitialRef = useRef(false);

  // ── Audio mute ────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    setAudioMutado(prev => { audioMutadoRef.current = !prev; return !prev; });
  }, []);

  const playTextComMute = useCallback(async (text: string) => {
    if (audioMutadoRef.current) return;
    return playText(text);
  }, [playText]);

  const playTextSafe = useCallback(async (text: string) => {
    if (audioMutadoRef.current) return;
    audioQueueRef.current.push(text);
    if (isPlayingRef.current) return;
    while (audioQueueRef.current.length > 0) {
      isPlayingRef.current = true;
      const next = audioQueueRef.current.shift();
      if (next) {
        try { await playTextComMute(next); await new Promise(r => setTimeout(r, 300)); }
        catch {}
      }
    }
    isPlayingRef.current = false;
  }, [playTextComMute]);

  // ── Mensagem inicial + preload de libs ───────────────────
  useEffect(() => {
    if (hasSpokenInitialRef.current) return;
    hasSpokenInitialRef.current = true;
    setMessages([{ id: Date.now().toString(), role: 'assistant', content: MENSAGEM_INICIAL, timestamp: new Date() }]);
    playTextSafe(MENSAGEM_INICIAL);

    // Preload das libs em background para evitar delay no primeiro upload
    // Não bloqueia — fire-and-forget
    const preload = async () => {
      try {
        // SheetJS
        if (!window.XLSX) {
          const s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
          document.head.appendChild(s);
        }
        // pdfjs
        if (!window.pdfjsLib) {
          await new Promise<void>((resolve) => {
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            s.onload = () => {
              if (window.pdfjsLib) {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
              }
              resolve();
            };
            s.onerror = () => resolve(); // falha silenciosa no preload
            document.head.appendChild(s);
          });
        }
        // mammoth
        if (!window.mammoth) {
          const s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
          document.head.appendChild(s);
        }
      } catch { /* preload silencioso */ }
    };
    preload();

    return () => { isActiveRef.current = false; };
  }, []);

  // Auto-scroll
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ── Processador universal de arquivos ────────────────────
  const processarArquivo = async (file: File) => {
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const tipo = EXTENSOES_POR_TIPO[ext] ?? null;

    if (!tipo) {
      addMessage('assistant', `Formato .${ext} não suportado. Envie: planilhas (XLSX, CSV), documentos (DOCX, PDF) ou imagens (JPG, PNG, WEBP).`);
      return;
    }

    setNomeArquivo(file.name);
    setTipoArquivo(tipo);
    addMessage('user', `${ICONE_POR_TIPO[tipo]} ${file.name}`);

    if (tipo === 'planilha') {
      addMessage('assistant', 'Lendo a planilha e anonimizando dados sensíveis...');
      try {
        if (!window.XLSX) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
            s.onload = () => resolve(); s.onerror = reject;
            document.head.appendChild(s);
          });
        }
        const buffer = await file.arrayBuffer();
        const workbook = window.XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const jsonData = window.XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' }) as Record<string, unknown>[];
        if (!jsonData.length) { addMessage('assistant', 'O arquivo está vazio ou não foi possível ler os dados.'); return; }

        const { dadosLimpos, camposAnonimizados, totalOcorrencias } = anonimizarPII(jsonData);
        const schemaDetectado = construirSchema(dadosLimpos);
        setDadosBrutos(dadosLimpos);
        setSchema(schemaDetectado);
        if (camposAnonimizados.length > 0) setAlertaPII(camposAnonimizados);

        const avisoAnon = camposAnonimizados.length > 0 ? ` (${totalOcorrencias} dado(s) sensível(is) anonimizados por LGPD)` : '';
        const msg = `Planilha lida: ${jsonData.length} linhas, ${schemaDetectado.length} colunas${avisoAnon}. Iniciando análise...`;
        addMessage('assistant', msg);
        await playTextSafe(msg);
        await processarMensagem('analisar planilha', dadosLimpos, schemaDetectado, undefined, undefined, file.name, 'planilha');
      } catch (err) {
        console.error(err);
        addMessage('assistant', 'Não consegui ler a planilha. Verifique se o arquivo está íntegro.');
      }

    } else if (tipo === 'pdf') {
      addMessage('assistant', 'Extraindo texto do PDF...');
      try {
        // Carrega pdfjs se necessário
        if (!window.pdfjsLib) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            s.onload = () => resolve();
            s.onerror = reject;
            document.head.appendChild(s);
          });
        }

        // Sempre configura workerSrc — independente de quando a lib carregou
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
        await new Promise(r => setTimeout(r, 150)); // dá tempo ao worker inicializar

        const buffer = await file.arrayBuffer();

        // disableWorker: true como fallback — roda no main thread se o worker falhar
        const loadingTask = window.pdfjsLib.getDocument({
          data: new Uint8Array(buffer),
          disableWorker: false,
          // Evita warning de password
          password: '',
        });

        const pdfDoc = await loadingTask.promise;
        const numPages = pdfDoc.numPages;
        let textoCompleto = '';

        for (let p = 1; p <= Math.min(numPages, 20); p++) {
          const page = await pdfDoc.getPage(p);
          const content = await page.getTextContent();
          // Junta itens preservando espaços entre palavras
          const pageText = content.items
            .map((item: any) => item.str)
            .filter((s: string) => s.trim())
            .join(' ');
          if (pageText.trim()) {
            textoCompleto += `\n--- Página ${p} ---\n${pageText}`;
          }
        }

        if (!textoCompleto.trim()) {
          addMessage('assistant', 'Este PDF não contém texto extraível (pode ser um PDF de imagens digitalizadas). Tente exportar como JPG/PNG e envie a imagem.');
          return;
        }

        setConteudoTexto(textoCompleto);
        const msg = `PDF lido: ${numPages} página(s), ${Math.round(textoCompleto.length / 1000)}k caracteres. Iniciando análise...`;
        addMessage('assistant', msg);
        await playTextSafe(msg);
        await processarMensagem('analisar documento', undefined, undefined, textoCompleto, undefined, file.name, 'pdf');
      } catch (err: any) {
        console.error('Erro PDF:', err);
        // Tenta fallback: envia como imagem se for PDF de 1 página
        addMessage('assistant', `Não consegui extrair o texto do PDF (${err?.message ?? 'erro desconhecido'}). Se for um PDF digitalizado, converta para imagem (JPG/PNG) e envie.`);
      }

    } else if (tipo === 'docx') {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'doc') {
        addMessage('assistant', 'Arquivos .DOC (formato antigo) não são suportados. Salve o documento como .DOCX no Word e envie novamente.');
        return;
      }
      addMessage('assistant', 'Extraindo texto do documento DOCX...');
      try {
        if (!window.mammoth) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement('script');
            // Usa versão mais recente e estável do mammoth no browser
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
            s.onload = () => resolve();
            s.onerror = () => {
              // Fallback para versão anterior
              const s2 = document.createElement('script');
              s2.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.4.2/mammoth.browser.min.js';
              s2.onload = () => resolve();
              s2.onerror = reject;
              document.head.appendChild(s2);
            };
            document.head.appendChild(s);
          });
        }

        const buffer = await file.arrayBuffer();

        // O mammoth browser pode expor a API de formas diferentes
        const mammothLib = window.mammoth?.default ?? window.mammoth;
        if (!mammothLib?.extractRawText) {
          throw new Error('mammoth não carregou corretamente');
        }

        const result = await mammothLib.extractRawText({ arrayBuffer: buffer });
        const texto = result?.value?.trim();

        if (!texto) {
          addMessage('assistant', 'O documento está vazio ou protegido por senha. Verifique o arquivo e tente novamente.');
          return;
        }

        setConteudoTexto(texto);
        const msg = `Documento lido: ${Math.round(texto.length / 1000)}k caracteres. Iniciando análise...`;
        addMessage('assistant', msg);
        await playTextSafe(msg);
        await processarMensagem('analisar documento', undefined, undefined, texto, undefined, file.name, 'docx');
      } catch (err: any) {
        console.error('Erro DOCX:', err);
        addMessage('assistant', `Erro ao ler o documento: ${err?.message ?? 'formato não reconhecido'}. Certifique-se de que é um .DOCX válido e tente novamente.`);
      }

    } else if (tipo === 'imagem') {
      addMessage('assistant', 'Processando imagem com visão computacional...');
      try {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        setImagemBase64(base64);
        const msg = 'Imagem carregada. Iniciando análise com IA visual...';
        addMessage('assistant', msg);
        await playTextSafe(msg);
        await processarMensagem('analisar imagem', undefined, undefined, undefined, base64, file.name, 'imagem');
      } catch (err) {
        console.error(err);
        addMessage('assistant', 'Erro ao carregar a imagem. Tente novamente.');
      }
    }
  };

  // ── Helpers de mensagem ───────────────────────────────────
  const addMessage = (role: 'user' | 'assistant', content: string) => {
    setMessages(prev => [...prev, { id: Date.now().toString() + Math.random(), role, content, timestamp: new Date() }]);
  };

  // ── Processar mensagem (conversa + análise universal) ─────
  const processarMensagem = async (
    textoUsuario: string,
    dadosOverride?: Record<string, unknown>[],
    schemaOverride?: ReturnType<typeof construirSchema>,
    conteudoOverride?: string,
    imagemOverride?: string,
    nomeOverride?: string,
    tipoOverride?: TipoArquivo,     // ← evita stale state logo após setTipoArquivo
  ) => {
    const dadosEnvio = dadosOverride ?? dadosBrutos;
    const schemaEnvio = schemaOverride ?? schema;
    const conteudoEnvio = conteudoOverride ?? conteudoTexto;
    const imagemEnvio = imagemOverride ?? imagemBase64;
    const nomeEnvio = nomeOverride ?? nomeArquivo;
    const tipoEnvio = tipoOverride ?? tipoArquivo; // usa override primeiro

    // Detectar intenção de salvar por voz
    const comandoSalvar = /\b(salvar|salva|salve|finalizar|pronto|concluir|confirmar)\b/i;
    if (comandoSalvar.test(textoUsuario) && ficha.completo) {
      addMessage('user', textoUsuario);
      await salvarDashboard();
      return;
    }

    const MSGS_INTERNAS = ['analisar planilha', 'analisar documento', 'analisar imagem'];
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: textoUsuario, timestamp: new Date() };
    if (!MSGS_INTERNAS.includes(textoUsuario)) {
      setMessages(prev => [...prev, userMsg]);
    }

    // Guard: sem arquivo carregado
    const temArquivo = dadosEnvio.length > 0 || conteudoEnvio.length > 0 || imagemEnvio.length > 0;
    if (!temArquivo) {
      addMessage('assistant', 'Primeiro envie um arquivo para analisar. Aceito planilhas (XLSX, CSV), documentos (DOCX, PDF) e imagens (JPG, PNG).');
      return;
    }

    setIsProcessing(true);

    try {
      const body: Record<string, unknown> = {
        messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
        fichaAtual: ficha,
        nomeArquivo: nomeEnvio,
        tipoArquivo: tipoEnvio,
        companyId,
      };

      // Monta payload específico por tipo
      if (tipoEnvio === 'planilha') {
        body.dados = dadosEnvio.slice(0, 500);
        body.schema = schemaEnvio;
      } else if (tipoEnvio === 'pdf' || tipoEnvio === 'docx') {
        // Limita texto a ~8k chars para não estourar tokens
        body.conteudo = conteudoEnvio.slice(0, 8000);
      } else if (tipoEnvio === 'imagem') {
        body.imagem = imagemEnvio;
        // Para imagem, dados vazios são aceitos pela edge
        body.dados = [];
        body.schema = [];
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/analisar-planilha`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) throw new Error('Erro na edge function');
      const resultado = await response.json();

      if (resultado.ficha) setFicha(resultado.ficha);

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: resultado.resposta,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
      playTextSafe(resultado.resposta);

      if (resultado.ficha?.completo && !dashboardSalvoId) {
        setTimeout(() => {
          const msg: Message = {
            id: (Date.now() + 2).toString(),
            role: 'assistant',
            content: 'A análise está pronta! Clique em "Exportar PDF" para baixar o relatório.',
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, msg]);
          playTextSafe('A análise está pronta! Clique em Exportar PDF para baixar o relatório.');
        }, 800);
      }

    } catch (err) {
      console.error('Erro ao processar:', err);
      addMessage('assistant', 'Desculpe, tive um problema ao analisar. Pode tentar novamente?');
    } finally {
      setIsProcessing(false);
    }
  };

  const enviarMensagem = () => {
    if (!inputText.trim() || isProcessing) return;
    processarMensagem(inputText.trim());
    setInputText('');
  };

  // ── Voz ───────────────────────────────────────────────────
  const handleMicPress = async () => {
    if (voiceRecorder.isRecording) {
      setIsTranscribing(true);
      try {
        const audioBlob = await voiceRecorder.stopRecording();
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        const base64Audio = await new Promise<string>(resolve => {
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        });
        const response = await fetch('/api/voice/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audio: base64Audio }),
        });
        if (!response.ok) throw new Error();
        const { text } = await response.json();
        if (text?.trim()) processarMensagem(text.trim());
      } catch {
        alert('Erro ao transcrever. Digite sua mensagem.');
      } finally {
        setIsTranscribing(false);
      }
    } else {
      await voiceRecorder.startRecording();
    }
  };

  // ── Salvar dashboard no banco ─────────────────────────────
  const salvarDashboard = async () => {
    if (!ficha.completo || isSaving) return;
    setIsSaving(true);
    try {
      const { data: slugData } = await supabase.rpc('gerar_slug_dashboard', { p_nome: nomeArquivo || 'dashboard' });

      const { data: saved, error } = await supabase
        .from('planilha_dashboards')
        .insert({
          company_id: companyId,
          nome: nomeArquivo || 'Dashboard',
          dominio: ficha.dominio,
          total_linhas: dadosBrutos.length,
          total_colunas: schema.length,
          schema_detectado: schema,
          dados_anonimizados: dadosBrutos.slice(0, 500),
          insights: ficha.insights,
          kpis: ficha.kpis,
          graficos: ficha.graficos,
          resumo_executivo: ficha.resumo_executivo,
          slug_compartilhamento: slugData,
          compartilhamento_ativo: true,
          status: 'completo',
          creditos_usados: 3,
        })
        .select('id, slug_compartilhamento')
        .single();

      if (error) throw error;
      setDashboardSalvoId(saved.id);
      setSlugCompartilhamento(saved.slug_compartilhamento);
      addMessage('assistant', `Dashboard salvo! Link de compartilhamento gerado.`);
      playTextSafe('Dashboard salvo com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar:', err);
      alert('Erro ao salvar dashboard. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Copiar link ───────────────────────────────────────────
  const copiarLink = () => {
    if (!slugCompartilhamento) return;
    const link = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/${slugCompartilhamento}`;
    navigator.clipboard.writeText(link);
    setSlugCopiado(true);
    setTimeout(() => setSlugCopiado(false), 2000);
  };

  // ── Export PDF com gráficos via html2canvas ───────────────
  const exportarPDF = async () => {
    if (!ficha.completo || isExportingPDF) return;
    // Garante que os dados ainda estão em memória antes de gerar
    if (!dadosBrutos.length && !conteudoTexto && !imagemBase64) {
      alert('Os dados do arquivo não estão mais em memória. Feche o modal e abra novamente enviando o arquivo.');
      return;
    }
    setIsExportingPDF(true);
    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;

      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      const W = 210;
      let y = 20;
      const margin = 15;
      const contentW = W - margin * 2;

      // ── Header ───────────────────────────────────────────
      doc.setFillColor(30, 64, 175);
      doc.rect(0, 0, W, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Dashboard Analítico', margin, 18);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(nomeArquivo || 'Análise de Dados', margin, 27);
      doc.text(new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }), margin, 34);
      doc.setTextColor(0, 0, 0);
      y = 50;

      // ── Domínio ──────────────────────────────────────────
      if (ficha.dominio) {
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Domínio: ${ficha.dominio.charAt(0).toUpperCase() + ficha.dominio.slice(1)}`, margin, y);
        y += 8;
      }

      // ── Resumo executivo ──────────────────────────────────
      if (ficha.resumo_executivo) {
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Resumo Executivo', margin, y);
        y += 6;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(50, 50, 50);
        const resumoLines = doc.splitTextToSize(ficha.resumo_executivo, contentW);
        doc.text(resumoLines, margin, y);
        y += resumoLines.length * 5 + 8;
      }

      // ── KPIs ─────────────────────────────────────────────
      if (ficha.kpis.length) {
        if (y > 240) { doc.addPage(); y = 20; }
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Indicadores Chave (KPIs)', margin, y);
        y += 6;

        const kpiCols = 3;
        const kpiW = contentW / kpiCols;
        ficha.kpis.forEach((kpi, i) => {
          const col = i % kpiCols;
          const row = Math.floor(i / kpiCols);
          const x = margin + col * kpiW;
          const yKpi = y + row * 22;
          doc.setFillColor(241, 245, 249);
          doc.roundedRect(x, yKpi, kpiW - 2, 19, 2, 2, 'F');
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.setFont('helvetica', 'normal');
          doc.text(kpi.label, x + 3, yKpi + 6);
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 0, 0);
          doc.text(kpi.valor, x + 3, yKpi + 14);
          if (kpi.variacao) {
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            const isPos = kpi.variacao.startsWith('+');
            doc.setTextColor(isPos ? 22 : 220, isPos ? 163 : 38, isPos ? 74 : 38);
            doc.text(kpi.variacao, x + kpiW - 20, yKpi + 14);
          }
        });
        const kpiRows = Math.ceil(ficha.kpis.length / kpiCols);
        y += kpiRows * 22 + 6;
        doc.setTextColor(0, 0, 0);
      }

      // ── Gráficos via html2canvas + container off-screen ──────
      // O ResponsiveContainer do Recharts precisa de dimensões reais no DOM
      // para renderizar os SVGs. Solução: criar um div fixo fora da viewport,
      // renderizar cada gráfico lá com ReactDOM, aguardar o layout, capturar.
      if (ficha.graficos.length) {
        if (y > 200) { doc.addPage(); y = 20; }
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Gráficos', margin, y);
        y += 6;

        const ReactDOM = await import('react-dom/client');
        const React = await import('react');

        // Container off-screen com largura fixa para o Recharts medir
        const offscreen = document.createElement('div');
        offscreen.style.cssText = 'position:fixed;top:-9999px;left:0;width:800px;background:#ffffff;z-index:-1;pointer-events:none;';
        document.body.appendChild(offscreen);

        for (const g of ficha.graficos) {
          if (y > 220) { doc.addPage(); y = 20; }

          if (g.titulo) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text(g.titulo, margin, y);
            y += 5;
          }

          try {
            const chartDiv = document.createElement('div');
            chartDiv.style.cssText = 'width:800px;height:340px;background:#ffffff;padding:12px;box-sizing:border-box;border-radius:8px;border:1px solid #e2e8f0;';
            offscreen.appendChild(chartDiv);

            // Renderiza GraficoRecharts com paleta LIGHT (sempre branco no PDF)
            const root = ReactDOM.createRoot(chartDiv);
            root.render(React.createElement(GraficoRecharts, { grafico: g, C: LIGHT }));

            // Aguarda Recharts medir o container e renderizar o SVG completo
            await new Promise(r => setTimeout(r, 700));

            const canvas = await html2canvas(chartDiv, {
              scale: 2,
              backgroundColor: '#ffffff',
              logging: false,
              useCORS: true,
              ignoreElements: (el) => el.tagName === 'IFRAME',
            });

            root.unmount();
            offscreen.removeChild(chartDiv);

            const imgData = canvas.toDataURL('image/png');
            const imgH = (canvas.height / canvas.width) * contentW;

            if (y + imgH > 275) { doc.addPage(); y = 20; }
            doc.addImage(imgData, 'PNG', margin, y, contentW, imgH);
            y += imgH + 8;
          } catch (err) {
            console.warn('Erro ao capturar gráfico:', g.titulo, err);
          }
        }

        document.body.removeChild(offscreen);
      }

      // ── Insights ──────────────────────────────────────────
      if (ficha.insights.length) {
        if (y > 230) { doc.addPage(); y = 20; }
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Insights e Recomendações', margin, y);
        y += 6;

        ficha.insights.forEach(ins => {
          if (y > 268) { doc.addPage(); y = 20; }
          const prioridadeCor: Record<string, [number, number, number]> = {
            high: [220, 38, 38], medium: [217, 119, 6], low: [100, 116, 139],
          };
          const [r, g, b] = prioridadeCor[ins.prioridade] ?? [100, 116, 139];
          doc.setFillColor(r, g, b);
          doc.circle(margin + 2, y + 2, 1.5, 'F');
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 0, 0);
          doc.text(ins.titulo, margin + 6, y + 4);
          y += 7;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(60, 60, 60);
          const descLines = doc.splitTextToSize(ins.descricao, contentW - 6);
          doc.text(descLines, margin + 6, y);
          y += descLines.length * 4 + 6;
        });
      }

      // ── Footer em todas as páginas ────────────────────────
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('Gerado por minhAi · minhai.app', margin, 291);
        doc.text(`Pág. ${i}/${totalPages}`, W - margin - 15, 291);
      }

      doc.save(`dashboard-${(nomeArquivo || 'analise').replace(/\.[^/.]+$/, '')}.pdf`);
    } catch (err) {
      console.error('Erro ao exportar PDF:', err);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  // ── Drag & Drop ───────────────────────────────────────────
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processarArquivo(file);
  };

  // ── Preview content (coluna direita) ──────────────────────
  const PreviewContent = () => (
    <>
      {/* Upload zone — aparece quando sem dados */}
      {!dadosBrutos.length && !conteudoTexto && !imagemBase64 && (
        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? C.accent : C.border}`,
            borderRadius: 12,
            padding: '32px 16px',
            textAlign: 'center',
            cursor: 'pointer',
            background: isDragging ? `${C.accent}10` : C.uploadBg,
            transition: 'all 0.2s',
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', color: isDragging ? C.accent : C.textMuted, marginBottom: 8 }}><IconUpload /></div>
          <p style={{ fontSize: 13, fontWeight: 600, color: isDragging ? C.accent : C.text, marginBottom: 4 }}>
            {isDragging ? 'Solte aqui!' : 'Enviar arquivo'}
          </p>
          <p style={{ fontSize: 11, color: C.textMuted }}>📊 XLSX, CSV · 📄 PDF · 📝 DOCX · 🖼️ JPG, PNG</p>
          <p style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>Arraste ou clique para selecionar</p>
          <input ref={fileInputRef} type="file" accept={TIPOS_ACEITOS} style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) processarArquivo(e.target.files[0]); }} />
        </div>
      )}

      {/* Alerta PII */}
      {alertaPII.length > 0 && (
        <div style={{ padding: '8px 12px', borderRadius: 8, background: `${C.warning}15`, border: `1px solid ${C.warning}40`, marginBottom: 12 }}>
          <p style={{ fontSize: 11, color: C.warning, fontWeight: 600, marginBottom: 2 }}>🔒 LGPD — Dados anonimizados</p>
          <p style={{ fontSize: 10, color: C.textMuted }}>{alertaPII.join(', ')}</p>
        </div>
      )}

      {/* KPIs */}
      {ficha.kpis.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, color: C.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>KPIs</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {ficha.kpis.map((kpi, i) => (
              <div key={i} style={{ padding: '10px 12px', borderRadius: 10, background: C.kpiBg, border: `1px solid ${C.accent}30` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <span style={{ fontSize: 10, color: C.textMuted }}>{kpi.label}</span>
                  <KPIIcon icone={kpi.icone} cor={kpi.cor} />
                </div>
                <p style={{ fontSize: 15, fontWeight: 700, color: kpi.cor, lineHeight: 1.2 }}>{kpi.valor}</p>
                {kpi.variacao && <p style={{ fontSize: 10, color: kpi.variacao.startsWith('+') ? C.success : C.danger }}>{kpi.variacao}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gráficos — container com ref para html2canvas */}
      {ficha.graficos.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, color: C.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gráficos</p>
          <div>
            {ficha.graficos.map(g => (
              <div
                key={g.id}
                style={{ marginBottom: 16, background: C.bgSecondary, borderRadius: 10, padding: '12px', border: `1px solid ${C.border}` }}
              >
                <p style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 2 }}>{g.titulo}</p>
                {g.descricao && <p style={{ fontSize: 10, color: C.textMuted, marginBottom: 8 }}>{g.descricao}</p>}
                <GraficoRecharts grafico={g} C={C} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      {ficha.insights.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, color: C.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Insights</p>
          {ficha.insights.map((ins, i) => (
            <div key={i} style={{ padding: '10px 12px', borderRadius: 8, background: C.bgSecondary, border: `1px solid ${C.border}`, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: C.text, flex: 1, marginRight: 8 }}>{ins.titulo}</p>
                <PrioridadeBadge p={ins.prioridade} C={C} />
              </div>
              <p style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.4 }}>{ins.descricao}</p>
            </div>
          ))}
        </div>
      )}

      {/* Placeholder vazio */}
      {!ficha.kpis.length && !ficha.graficos.length && (dadosBrutos.length > 0 || conteudoTexto || imagemBase64) && (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: C.textMuted, fontSize: 13 }}>
          <div style={{ marginBottom: 12, opacity: 0.3 }}><IconChart /></div>
          <p>O dashboard aparece aqui conforme a análise progride</p>
        </div>
      )}

      {/* Botão PDF — aparece assim que completo, sem precisar digitar nada */}
      {ficha.completo && (
        <div style={{ marginTop: 12 }}>
          <button
            onClick={exportarPDF}
            disabled={isExportingPDF}
            style={{
              width: '100%', padding: '12px', borderRadius: 8, border: 'none',
              cursor: isExportingPDF ? 'not-allowed' : 'pointer',
              background: C.accent, color: 'white', fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: isExportingPDF ? 0.6 : 1,
            }}
          >
            {isExportingPDF ? <><IconLoader /> Gerando PDF...</> : <><IconPDF /> Exportar PDF</>}
          </button>
        </div>
      )}
    </>
  );

  // ── Shared inline JSX blocks ─────────────────────────────
  // IMPORTANTE: estes blocos são JSX inline, não componentes,
  // para evitar remount a cada keystroke (bug de perda de foco).
  const headerButtonsJSX = (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      <button
        onClick={() => fileInputHeaderRef.current?.click()}
        title="Enviar arquivo"
        style={{ padding: '6px 10px', borderRadius: 6, background: `${C.accent}20`, border: `1px solid ${C.accent}40`, cursor: 'pointer', color: C.accent, fontSize: 11, fontWeight: 600 }}
      >
        + Arquivo
      </button>
      <input ref={fileInputHeaderRef} type="file" accept={TIPOS_ACEITOS} style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) processarArquivo(e.target.files[0]); }} />
      <button onClick={toggleMute} title={audioMutado ? 'Ativar áudio' : 'Desativar áudio'} style={{ padding: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: audioMutado ? C.textMuted : C.accent, opacity: audioMutado ? 0.5 : 1 }}>
        {audioMutado ? <IconVolumeMute /> : <IconVolume />}
      </button>
      <button onClick={onClose} style={{ padding: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: C.textMuted }}>
        <IconX />
      </button>
    </div>
  );

  const chatMessagesJSX = (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
      {messages.map(msg => (
        <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
          <div style={{ maxWidth: '80%', padding: '10px 14px', borderRadius: 12, background: msg.role === 'user' ? C.userBubble : C.assistantBubble, color: msg.role === 'user' ? 'white' : C.text, fontSize: 13, lineHeight: 1.5 }}>
            {msg.content}
          </div>
        </div>
      ))}
      {isProcessing && (
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <div style={{ padding: '10px 14px', borderRadius: 12, background: C.assistantBubble, color: C.text, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <IconLoader /> Analisando...
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );

  const inputAreaJSX = (
    <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, background: C.bg, flexShrink: 0 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {!inputText.trim() && (
          <button
            onClick={handleMicPress}
            disabled={isProcessing || isTranscribing}
            style={{
              width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
              background: voiceRecorder.isRecording ? '#ef4444' : C.accent,
              border: 'none', cursor: (isProcessing || isTranscribing) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
              transform: voiceRecorder.isRecording ? 'scale(1.1)' : 'scale(1)', transition: 'all 0.1s',
            }}
          >
            <IconMic />
          </button>
        )}
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensagem(); } }}
          placeholder={dadosBrutos.length || conteudoTexto || imagemBase64 ? 'Peça para refinar a análise...' : 'Envie um arquivo ou descreva o que quer analisar...'}
          disabled={isProcessing || voiceRecorder.isRecording || isTranscribing}
          style={{ flex: 1, padding: '10px 14px', background: C.bgSecondary, border: `1px solid ${C.border}`, borderRadius: 20, color: C.text, fontSize: 13, outline: 'none' }}
        />
        {inputText.trim() && (
          <button onClick={enviarMensagem} disabled={isProcessing} style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: C.accent, border: 'none', cursor: isProcessing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', opacity: isProcessing ? 0.5 : 1 }}>
            <IconSend />
          </button>
        )}
      </div>
      {voiceRecorder.isRecording && <p style={{ marginTop: 6, fontSize: 11, color: '#ef4444', textAlign: 'center' }}>Gravando... clique para enviar ({voiceRecorder.duration}s)</p>}
      {isTranscribing && <p style={{ marginTop: 6, fontSize: 11, color: C.accent, textAlign: 'center' }}>Transcrevendo...</p>}
    </div>
  );

  // ── RENDER MOBILE ─────────────────────────────────────────
  if (isMobile) {
    return createPortal(
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: C.bg, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconChart />
            <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Analisar Planilha</h2>
            {ficha.dominio && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: `${C.accent}20`, color: C.accent, fontWeight: 600 }}>{ficha.dominio}</span>}
          </div>
          {headerButtonsJSX}
        </div>

        {/* Chat */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {chatMessagesJSX}
        </div>

        {/* Preview colapsável */}
        {(ficha.kpis.length > 0 || ficha.graficos.length > 0 || !dadosBrutos.length) && (
          <div style={{ maxHeight: '40vh', overflowY: 'auto', padding: '12px 16px', background: C.bgSecondary, borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 10, textTransform: 'uppercase' }}>Dashboard</p>
            <PreviewContent />
          </div>
        )}

        {inputAreaJSX}
      </div>,
      document.body
    );
  }

  // ── RENDER DESKTOP ────────────────────────────────────────
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 1280, height: '92vh', background: C.bg, borderRadius: 16, border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <IconChart />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text }}>Analisar Planilha</h2>
                {ficha.dominio && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: `${C.accent}20`, color: C.accent, fontWeight: 600 }}>{ficha.dominio.charAt(0).toUpperCase() + ficha.dominio.slice(1)}</span>}
                {nomeArquivo && <span style={{ fontSize: 11, color: C.textMuted }}>· {nomeArquivo}</span>}
              </div>
              <p style={{ fontSize: 12, color: C.textMuted }}>Converse para refinar a análise e exportar o relatório</p>
            </div>
          </div>
          {headerButtonsJSX}
        </div>

        {/* Conteúdo 2 colunas */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 420px', gap: 1, background: C.border, overflow: 'hidden' }}>

          {/* COLUNA ESQUERDA — CHAT */}
          <div style={{ background: C.bgChat, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {chatMessagesJSX}
            {inputAreaJSX}
          </div>

          {/* COLUNA DIREITA — DASHBOARD PREVIEW */}
          <div style={{ background: C.bg, overflowY: 'auto', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <IconChart />
              <h3 style={{ fontSize: 15, fontWeight: 600, color: C.text }}>Dashboard Preview</h3>
              {ficha.completo && (
                <span style={{ marginLeft: 'auto', fontSize: 10, padding: '2px 8px', borderRadius: 4, background: `${C.success}20`, color: C.success, fontWeight: 600 }}>✓ Pronto</span>
              )}
            </div>
            <PreviewContent />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
