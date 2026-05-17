'use client';

// ============================================================
// AnalisarPlanilhaDisplay.tsx — Fase 1 + 2 + 3 (COMPLETO)
// components/assistant/AnalisarPlanilhaDisplay.tsx
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
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

declare global {
  interface Window {
    XLSX?: any;
    pdfjsLib?: any;
    mammoth?: any;
  }
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

type Acao =
  | 'analisar'
  | 'editar_grafico'
  | 'adicionar_kpi'
  | 'adicionar_grafico'
  | 'mais_insights'
  | 'aprofundar'
  | 'refinar'
  | 'resumo';

type TipoGrafico = 'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'radar' | 'composed';

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
  tipo: TipoGrafico;
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

interface Chip {
  label: string;
  texto: string;
  acao: Acao;
}

interface Props {
  data: { companyId: string };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText: (text: string) => Promise<void>;
}

// ── Paletas ───────────────────────────────────────────────────────────────────

const DARK = {
  bg: '#1e293b', bgSecondary: '#334155', bgChat: '#0f172a',
  text: '#f1f5f9', textMuted: '#94a3b8', border: '#475569',
  accent: '#3b82f6', success: '#22c55e', warning: '#f59e0b', danger: '#ef4444',
  userBubble: '#3b82f6', assistantBubble: '#334155',
  kpiBg: '#1e3a5f', uploadBg: '#0f172a', chipBg: '#273549',
};

const LIGHT = {
  bg: '#ffffff', bgSecondary: '#f8fafc', bgChat: '#f1f5f9',
  text: '#0f172a', textMuted: '#64748b', border: '#e2e8f0',
  accent: '#2563eb', success: '#16a34a', warning: '#d97706', danger: '#dc2626',
  userBubble: '#2563eb', assistantBubble: '#e2e8f0',
  kpiBg: '#dbeafe', uploadBg: '#f8fafc', chipBg: '#f1f5f9',
};

const PIE_COLORS = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f43f5e','#84cc16'];

const TIPOS_GRAFICO: { tipo: TipoGrafico; label: string; emoji: string }[] = [
  { tipo: 'bar',      label: 'Barras',     emoji: '📊' },
  { tipo: 'line',     label: 'Linha',      emoji: '📈' },
  { tipo: 'area',     label: 'Área',       emoji: '🏔️' },
  { tipo: 'pie',      label: 'Pizza',      emoji: '🥧' },
  { tipo: 'scatter',  label: 'Dispersão',  emoji: '✦' },
  { tipo: 'radar',    label: 'Radar',      emoji: '🕸️' },
  { tipo: 'composed', label: 'Misto',      emoji: '🔀' },
];

// ── Chips de sugestão rápida ──────────────────────────────────────────────────

const CHIPS_PADRAO: Chip[] = [
  { label: '🔍 Análise profunda',  texto: 'Faça uma análise mais profunda e detalhada dos dados', acao: 'aprofundar' },
  { label: '📊 Novo gráfico',      texto: 'Adicione um novo gráfico que explore outro ângulo dos dados', acao: 'adicionar_grafico' },
  { label: '💡 Mais insights',     texto: 'Gere mais insights e recomendações acionáveis', acao: 'mais_insights' },
  { label: '🎯 Novo KPI',          texto: 'Sugira e adicione novos KPIs relevantes para o negócio', acao: 'adicionar_kpi' },
  { label: '📝 Melhorar resumo',   texto: 'Reescreva o resumo executivo de forma mais impactante', acao: 'resumo' },
];

type TipoArquivo = 'planilha' | 'pdf' | 'docx' | 'imagem' | null;

const TIPOS_ACEITOS = '.csv,.xlsx,.xls,.tsv,.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp';
const EXTENSOES_POR_TIPO: Record<string, TipoArquivo> = {
  csv: 'planilha', xlsx: 'planilha', xls: 'planilha', tsv: 'planilha',
  pdf: 'pdf', doc: 'docx', docx: 'docx',
  jpg: 'imagem', jpeg: 'imagem', png: 'imagem', webp: 'imagem',
};
const ICONE_POR_TIPO: Record<NonNullable<TipoArquivo>, string> = {
  planilha: '📊', pdf: '📄', docx: '📝', imagem: '🖼️',
};
const MENSAGEM_INICIAL = 'Olá! Posso analisar planilhas, documentos, PDFs e imagens. Envie um arquivo para começar — depois você pode editar KPIs, gráficos e insights diretamente no painel.';

// ── Ícones SVG inline ─────────────────────────────────────────────────────────

const IconX        = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconSend     = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
const IconMic      = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>;
const IconUpload   = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>;
const IconPDF      = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
const IconVolume   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>;
const IconVolumeMute = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>;
const IconLoader   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{animation:'spin 1s linear infinite'}}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>;
const IconChart    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>;
const IconEdit     = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IconTrash    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>;
const IconCheck    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>;
const IconPlus     = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconClose    = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconRefresh  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>;

function KPIIcon({ icone, cor }: { icone: KPI['icone']; cor: string }) {
  if (icone === 'trending_up') return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
  if (icone === 'trending_down') return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>;
  if (icone === 'warning') return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
}

function PrioridadeBadge({ p, C }: { p: Insight['prioridade']; C: typeof DARK }) {
  const map = { high: { label: 'Alta', cor: C.danger }, medium: { label: 'Média', cor: C.warning }, low: { label: 'Baixa', cor: C.textMuted } };
  const { label, cor } = map[p];
  return <span style={{ padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, color: cor, border: `1px solid ${cor}40`, background: `${cor}15` }}>{label}</span>;
}

// ── GraficoRecharts ───────────────────────────────────────────────────────────

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
    const RADIAN = Math.PI / 180;
    const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
      if (percent < 0.05) return null;
      const r = innerRadius + (outerRadius - innerRadius) * 0.5;
      const x = cx + r * Math.cos(-midAngle * RADIAN);
      const y = cy + r * Math.sin(-midAngle * RADIAN);
      return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>{`${(percent*100).toFixed(0)}%`}</text>;
    };
    return (
      <ResponsiveContainer width="100%" height={200}>
        <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
          <Pie data={dados} dataKey={config.yKey} nameKey={config.xKey} cx="50%" cy="50%" outerRadius={80} labelLine={false} label={renderLabel}>
            {dados.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend formatter={v => <span style={{ fontSize: 11, color: axisFill }}>{v}</span>} wrapperStyle={{ paddingTop: 8 }} />
        </PieChart>
      </ResponsiveContainer>
    );
  }
  if (tipo === 'radar') return (
    <ResponsiveContainer width="100%" height={200}>
      <RadarChart data={dados}>
        <PolarGrid stroke={gridColor} />
        <PolarAngleAxis dataKey={config.xKey} tick={axisStyle} />
        <PolarRadiusAxis tick={axisStyle} />
        <Tooltip contentStyle={tooltipStyle} />
        {config.multiSeries
          ? config.multiSeries.map(s => <Radar key={s.key} name={s.label} dataKey={s.key} stroke={s.cor} fill={s.cor} fillOpacity={0.25} />)
          : <Radar name={config.yKey} dataKey={config.yKey} stroke={config.cor} fill={config.cor} fillOpacity={0.25} />
        }
        {config.multiSeries && <Legend formatter={v => <span style={{ fontSize: 11, color: axisFill }}>{v}</span>} />}
      </RadarChart>
    </ResponsiveContainer>
  );
  if (tipo === 'composed') return (
    <ResponsiveContainer width="100%" height={160}>
      <ComposedChart {...chartProps}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis dataKey={config.xKey} tick={axisStyle} />
        <YAxis tick={axisStyle} />
        <Tooltip contentStyle={tooltipStyle} />
        {config.multiSeries
          ? config.multiSeries.map((s, i) =>
              i === 0
                ? <Bar key={s.key} dataKey={s.key} fill={s.cor} radius={[3,3,0,0]} name={s.label} />
                : <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.cor} strokeWidth={2} dot={false} name={s.label} />
            )
          : <Bar dataKey={config.yKey} fill={config.cor} radius={[3,3,0,0]} />
        }
        {config.multiSeries && <Legend formatter={v => <span style={{ fontSize: 11, color: axisFill }}>{v}</span>} />}
      </ComposedChart>
    </ResponsiveContainer>
  );
  if (tipo === 'line') return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart {...chartProps}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis dataKey={config.xKey} tick={axisStyle} />
        <YAxis tick={axisStyle} />
        <Tooltip contentStyle={tooltipStyle} />
        {config.multiSeries
          ? config.multiSeries.map(s => <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.cor} strokeWidth={2} dot={false} name={s.label} />)
          : <Line type="monotone" dataKey={config.yKey} stroke={config.cor} strokeWidth={2} dot={false} />
        }
        {config.multiSeries && <Legend formatter={v => <span style={{ fontSize: 11, color: axisFill }}>{v}</span>} />}
      </LineChart>
    </ResponsiveContainer>
  );
  if (tipo === 'area') return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart {...chartProps}>
        <defs><linearGradient id={`g${grafico.id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={config.cor} stopOpacity={0.3}/><stop offset="95%" stopColor={config.cor} stopOpacity={0}/></linearGradient></defs>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis dataKey={config.xKey} tick={axisStyle} /><YAxis tick={axisStyle} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area type="monotone" dataKey={config.yKey} stroke={config.cor} fill={`url(#g${grafico.id})`} strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
  if (tipo === 'scatter') return (
    <ResponsiveContainer width="100%" height={160}>
      <ScatterChart {...chartProps}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis dataKey={config.xKey} tick={axisStyle} /><YAxis dataKey={config.yKey} tick={axisStyle} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: '3 3' }} />
        <Scatter data={dados} fill={config.cor} />
      </ScatterChart>
    </ResponsiveContainer>
  );
  // default: bar
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart {...chartProps}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis dataKey={config.xKey} tick={axisStyle} /><YAxis tick={axisStyle} />
        <Tooltip contentStyle={tooltipStyle} />
        {config.multiSeries
          ? config.multiSeries.map(s => <Bar key={s.key} dataKey={s.key} fill={s.cor} radius={[3,3,0,0]} name={s.label} />)
          : <Bar dataKey={config.yKey} fill={config.cor} radius={[3,3,0,0]} />
        }
        {config.multiSeries && <Legend formatter={v => <span style={{ fontSize: 11, color: axisFill }}>{v}</span>} />}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Editor de KPI inline ──────────────────────────────────────────────────────

function KPICard({
  kpi, index, C, onUpdate, onDelete,
}: {
  kpi: KPI; index: number; C: typeof DARK;
  onUpdate: (index: number, kpi: KPI) => void;
  onDelete: (index: number) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [draft, setDraft] = useState<KPI>(kpi);

  const salvar = () => { onUpdate(index, draft); setEditando(false); };
  const cancelar = () => { setDraft(kpi); setEditando(false); };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '4px 8px', borderRadius: 6, border: `1px solid ${C.border}`,
    background: C.bg, color: C.text, fontSize: 12, outline: 'none',
  };

  if (editando) return (
    <div style={{ padding: '10px 12px', borderRadius: 10, background: C.kpiBg, border: `2px solid ${C.accent}`, gridColumn: 'span 2' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
        <div>
          <p style={{ fontSize: 9, color: C.textMuted, marginBottom: 2 }}>RÓTULO</p>
          <input style={inputStyle} value={draft.label} onChange={e => setDraft(d => ({ ...d, label: e.target.value }))} />
        </div>
        <div>
          <p style={{ fontSize: 9, color: C.textMuted, marginBottom: 2 }}>VALOR</p>
          <input style={inputStyle} value={draft.valor} onChange={e => setDraft(d => ({ ...d, valor: e.target.value }))} />
        </div>
        <div>
          <p style={{ fontSize: 9, color: C.textMuted, marginBottom: 2 }}>VARIAÇÃO (opcional)</p>
          <input style={inputStyle} placeholder="+18%" value={draft.variacao ?? ''} onChange={e => setDraft(d => ({ ...d, variacao: e.target.value }))} />
        </div>
        <div>
          <p style={{ fontSize: 9, color: C.textMuted, marginBottom: 2 }}>COR</p>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {['#22c55e','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#06b6d4'].map(cor => (
              <button key={cor} onClick={() => setDraft(d => ({ ...d, cor }))}
                style={{ width: 20, height: 20, borderRadius: '50%', background: cor, border: draft.cor === cor ? `2px solid ${C.text}` : '2px solid transparent', cursor: 'pointer' }} />
            ))}
          </div>
        </div>
        <div>
          <p style={{ fontSize: 9, color: C.textMuted, marginBottom: 2 }}>ÍCONE</p>
          <select style={{ ...inputStyle, cursor: 'pointer' }} value={draft.icone} onChange={e => setDraft(d => ({ ...d, icone: e.target.value as KPI['icone'] }))}>
            <option value="trending_up">↑ Alta</option>
            <option value="trending_down">↓ Baixa</option>
            <option value="neutral">→ Neutro</option>
            <option value="warning">⚠ Alerta</option>
            <option value="info">ℹ Info</option>
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button onClick={cancelar} style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.textMuted, fontSize: 11, cursor: 'pointer' }}>Cancelar</button>
        <button onClick={salvar} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: C.accent, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <IconCheck /> Salvar
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ padding: '10px 12px', borderRadius: 10, background: C.kpiBg, border: `1px solid ${C.accent}30`, position: 'relative' }}
      onMouseEnter={e => (e.currentTarget.querySelector('.kpi-actions') as HTMLElement | null)!.style.opacity = '1'}
      onMouseLeave={e => (e.currentTarget.querySelector('.kpi-actions') as HTMLElement | null)!.style.opacity = '0'}>
      <div className="kpi-actions" style={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 3, opacity: 0, transition: 'opacity 0.15s' }}>
        <button onClick={() => setEditando(true)} style={{ padding: 3, borderRadius: 4, border: 'none', background: `${C.accent}20`, color: C.accent, cursor: 'pointer', display: 'flex' }}><IconEdit /></button>
        <button onClick={() => onDelete(index)} style={{ padding: 3, borderRadius: 4, border: 'none', background: `${C.danger}20`, color: C.danger, cursor: 'pointer', display: 'flex' }}><IconTrash /></button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
        <span style={{ fontSize: 10, color: C.textMuted }}>{kpi.label}</span>
        <KPIIcon icone={kpi.icone} cor={kpi.cor} />
      </div>
      <p style={{ fontSize: 15, fontWeight: 700, color: kpi.cor, lineHeight: 1.2 }}>{kpi.valor}</p>
      {kpi.variacao && <p style={{ fontSize: 10, color: kpi.variacao.startsWith('+') ? C.success : C.danger }}>{kpi.variacao}</p>}
    </div>
  );
}

// ── Editor de KPI — formulário de adição ──────────────────────────────────────

function KPIAddForm({ C, onAdd, onCancel }: { C: typeof DARK; onAdd: (kpi: KPI) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<KPI>({ label: '', valor: '', cor: '#3b82f6', icone: 'neutral' });
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '6px 8px', borderRadius: 6, border: `1px solid ${C.border}`,
    background: C.bgSecondary, color: C.text, fontSize: 12, outline: 'none',
  };
  const canSave = draft.label.trim() && draft.valor.trim();
  return (
    <div style={{ padding: '12px', borderRadius: 10, border: `2px dashed ${C.accent}`, background: `${C.accent}08`, marginBottom: 8 }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: C.accent, marginBottom: 8 }}>Novo KPI</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
        <div>
          <p style={{ fontSize: 9, color: C.textMuted, marginBottom: 2 }}>RÓTULO *</p>
          <input style={inputStyle} placeholder="Ex: Receita Total" value={draft.label} onChange={e => setDraft(d => ({ ...d, label: e.target.value }))} />
        </div>
        <div>
          <p style={{ fontSize: 9, color: C.textMuted, marginBottom: 2 }}>VALOR *</p>
          <input style={inputStyle} placeholder="Ex: R$ 48.900" value={draft.valor} onChange={e => setDraft(d => ({ ...d, valor: e.target.value }))} />
        </div>
        <div>
          <p style={{ fontSize: 9, color: C.textMuted, marginBottom: 2 }}>VARIAÇÃO</p>
          <input style={inputStyle} placeholder="+12% vs mês ant." value={draft.variacao ?? ''} onChange={e => setDraft(d => ({ ...d, variacao: e.target.value }))} />
        </div>
        <div>
          <p style={{ fontSize: 9, color: C.textMuted, marginBottom: 2 }}>COR</p>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', paddingTop: 4 }}>
            {['#22c55e','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#06b6d4'].map(cor => (
              <button key={cor} onClick={() => setDraft(d => ({ ...d, cor }))}
                style={{ width: 20, height: 20, borderRadius: '50%', background: cor, border: draft.cor === cor ? `2px solid ${C.text}` : '2px solid transparent', cursor: 'pointer' }} />
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{ padding: '5px 12px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.textMuted, fontSize: 11, cursor: 'pointer' }}>Cancelar</button>
        <button onClick={() => canSave && onAdd(draft)} disabled={!canSave} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: canSave ? C.accent : C.border, color: '#fff', fontSize: 11, fontWeight: 600, cursor: canSave ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 4 }}>
          <IconCheck /> Adicionar
        </button>
      </div>
    </div>
  );
}

// ── Editor de Gráfico ─────────────────────────────────────────────────────────

function GraficoCard({
  grafico, index, C, onUpdate, onDelete,
}: {
  grafico: Grafico; index: number; C: typeof DARK;
  onUpdate: (index: number, g: Grafico) => void;
  onDelete: (index: number) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [draft, setDraft] = useState<Grafico>(grafico);
  // Preview em tempo real — atualiza enquanto o usuário muda o tipo
  const [previewTipo, setPreviewTipo] = useState<TipoGrafico>(grafico.tipo);

  const graficoPreview: Grafico = { ...grafico, tipo: previewTipo };

  const salvar = () => { onUpdate(index, { ...draft, tipo: previewTipo }); setEditando(false); };
  const cancelar = () => { setDraft(grafico); setPreviewTipo(grafico.tipo); setEditando(false); };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '5px 8px', borderRadius: 6, border: `1px solid ${C.border}`,
    background: C.bg, color: C.text, fontSize: 12, outline: 'none',
  };

  return (
    <div style={{ marginBottom: 16, background: C.bgSecondary, borderRadius: 12, border: `1px solid ${editando ? C.accent : C.border}`, overflow: 'hidden', transition: 'border-color 0.15s' }}>
      {/* Header do card */}
      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{grafico.titulo}</p>
          {grafico.descricao && <p style={{ fontSize: 10, color: C.textMuted }}>{grafico.descricao}</p>}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => setEditando(e => !e)}
            style={{ padding: '4px 8px', borderRadius: 6, border: `1px solid ${editando ? C.accent : C.border}`, background: editando ? `${C.accent}15` : 'transparent', color: editando ? C.accent : C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
            <IconEdit /> {editando ? 'Fechar' : 'Editar'}
          </button>
          <button onClick={() => onDelete(index)}
            style={{ padding: '4px 6px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <IconTrash />
          </button>
        </div>
      </div>

      {/* Editor expansível */}
      {editando && (
        <div style={{ padding: '0 14px 14px', borderTop: `1px solid ${C.border}` }}>
          {/* Seletor de tipo — PREVIEW EM TEMPO REAL */}
          <p style={{ fontSize: 10, color: C.textMuted, marginTop: 12, marginBottom: 6 }}>TIPO DE GRÁFICO</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {TIPOS_GRAFICO.map(t => (
              <button key={t.tipo} onClick={() => setPreviewTipo(t.tipo)}
                style={{
                  padding: '5px 10px', borderRadius: 20, border: `1px solid ${previewTipo === t.tipo ? C.accent : C.border}`,
                  background: previewTipo === t.tipo ? `${C.accent}15` : 'transparent',
                  color: previewTipo === t.tipo ? C.accent : C.textMuted,
                  fontSize: 11, cursor: 'pointer', transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                {t.emoji} {t.label}
              </button>
            ))}
          </div>

          {/* Preview em tempo real com novo tipo */}
          <div style={{ background: C.bg, borderRadius: 8, padding: 10, marginBottom: 12, border: `1px solid ${C.border}` }}>
            <p style={{ fontSize: 10, color: C.textMuted, marginBottom: 6 }}>Preview:</p>
            <GraficoRecharts grafico={graficoPreview} C={C} />
          </div>

          {/* Campos de texto */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <div>
              <p style={{ fontSize: 9, color: C.textMuted, marginBottom: 2 }}>TÍTULO</p>
              <input style={inputStyle} value={draft.titulo} onChange={e => setDraft(d => ({ ...d, titulo: e.target.value }))} />
            </div>
            <div>
              <p style={{ fontSize: 9, color: C.textMuted, marginBottom: 2 }}>COR PRINCIPAL</p>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', paddingTop: 4 }}>
                {['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f43f5e','#84cc16'].map(cor => (
                  <button key={cor} onClick={() => setDraft(d => ({ ...d, config: { ...d.config, cor } }))}
                    style={{ width: 18, height: 18, borderRadius: '50%', background: cor, border: draft.config.cor === cor ? `2px solid ${C.text}` : '2px solid transparent', cursor: 'pointer' }} />
                ))}
              </div>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <p style={{ fontSize: 9, color: C.textMuted, marginBottom: 2 }}>DESCRIÇÃO</p>
              <input style={inputStyle} value={draft.descricao} onChange={e => setDraft(d => ({ ...d, descricao: e.target.value }))} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button onClick={cancelar} style={{ padding: '5px 12px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.textMuted, fontSize: 11, cursor: 'pointer' }}>Cancelar</button>
            <button onClick={salvar} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: C.accent, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <IconCheck /> Aplicar
            </button>
          </div>
        </div>
      )}

      {/* Gráfico renderizado (tipo salvo, não preview) */}
      {!editando && (
        <div style={{ padding: '0 12px 12px' }}>
          <GraficoRecharts grafico={grafico} C={C} />
        </div>
      )}
    </div>
  );
}

// ── Editor de Insight inline ──────────────────────────────────────────────────

function InsightCard({
  insight, index, C, onUpdate, onDelete,
}: {
  insight: Insight; index: number; C: typeof DARK;
  onUpdate: (index: number, ins: Insight) => void;
  onDelete: (index: number) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [draft, setDraft] = useState<Insight>(insight);

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '5px 8px', borderRadius: 6, border: `1px solid ${C.border}`,
    background: C.bg, color: C.text, fontSize: 12, outline: 'none',
  };

  if (editando) return (
    <div style={{ padding: '12px', borderRadius: 8, background: C.bgSecondary, border: `2px solid ${C.accent}`, marginBottom: 8 }}>
      <div style={{ display: 'grid', gap: 6, marginBottom: 8 }}>
        <div>
          <p style={{ fontSize: 9, color: C.textMuted, marginBottom: 2 }}>TÍTULO</p>
          <input style={inputStyle} value={draft.titulo} onChange={e => setDraft(d => ({ ...d, titulo: e.target.value }))} />
        </div>
        <div>
          <p style={{ fontSize: 9, color: C.textMuted, marginBottom: 2 }}>DESCRIÇÃO</p>
          <textarea rows={3} style={{ ...inputStyle, resize: 'vertical' }} value={draft.descricao} onChange={e => setDraft(d => ({ ...d, descricao: e.target.value }))} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <div>
            <p style={{ fontSize: 9, color: C.textMuted, marginBottom: 2 }}>PRIORIDADE</p>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={draft.prioridade} onChange={e => setDraft(d => ({ ...d, prioridade: e.target.value as Insight['prioridade'] }))}>
              <option value="high">🔴 Alta</option>
              <option value="medium">🟡 Média</option>
              <option value="low">⚪ Baixa</option>
            </select>
          </div>
          <div>
            <p style={{ fontSize: 9, color: C.textMuted, marginBottom: 2 }}>TIPO</p>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={draft.tipo} onChange={e => setDraft(d => ({ ...d, tipo: e.target.value as Insight['tipo'] }))}>
              <option value="tendencia">📈 Tendência</option>
              <option value="anomalia">⚠️ Anomalia</option>
              <option value="oportunidade">💡 Oportunidade</option>
              <option value="risco">🚨 Risco</option>
            </select>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button onClick={() => { setDraft(insight); setEditando(false); }} style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.textMuted, fontSize: 11, cursor: 'pointer' }}>Cancelar</button>
        <button onClick={() => { onUpdate(index, draft); setEditando(false); }} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: C.accent, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <IconCheck /> Salvar
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ padding: '10px 12px', borderRadius: 8, background: C.bgSecondary, border: `1px solid ${C.border}`, marginBottom: 8, position: 'relative' }}
      onMouseEnter={e => (e.currentTarget.querySelector('.ins-actions') as HTMLElement | null)!.style.opacity = '1'}
      onMouseLeave={e => (e.currentTarget.querySelector('.ins-actions') as HTMLElement | null)!.style.opacity = '0'}>
      <div className="ins-actions" style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 3, opacity: 0, transition: 'opacity 0.15s' }}>
        <button onClick={() => setEditando(true)} style={{ padding: 3, borderRadius: 4, border: 'none', background: `${C.accent}20`, color: C.accent, cursor: 'pointer', display: 'flex' }}><IconEdit /></button>
        <button onClick={() => onDelete(index)} style={{ padding: 3, borderRadius: 4, border: 'none', background: `${C.danger}20`, color: C.danger, cursor: 'pointer', display: 'flex' }}><IconTrash /></button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4, paddingRight: 48 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{insight.titulo}</p>
        <PrioridadeBadge p={insight.prioridade} C={C} />
      </div>
      <p style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.4 }}>{insight.descricao}</p>
    </div>
  );
}

// ── Formulário de Insight novo ────────────────────────────────────────────────

function InsightAddForm({ C, onAdd, onCancel }: { C: typeof DARK; onAdd: (ins: Insight) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<Insight>({ titulo: '', descricao: '', prioridade: 'medium', tipo: 'oportunidade' });
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '6px 8px', borderRadius: 6, border: `1px solid ${C.border}`,
    background: C.bgSecondary, color: C.text, fontSize: 12, outline: 'none',
  };
  const canSave = draft.titulo.trim() && draft.descricao.trim();
  return (
    <div style={{ padding: '12px', borderRadius: 8, border: `2px dashed ${C.accent}`, background: `${C.accent}08`, marginBottom: 8 }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: C.accent, marginBottom: 8 }}>Novo Insight</p>
      <div style={{ display: 'grid', gap: 6, marginBottom: 8 }}>
        <div>
          <p style={{ fontSize: 9, color: C.textMuted, marginBottom: 2 }}>TÍTULO *</p>
          <input style={inputStyle} placeholder="Ex: Pico de vendas às sextas" value={draft.titulo} onChange={e => setDraft(d => ({ ...d, titulo: e.target.value }))} />
        </div>
        <div>
          <p style={{ fontSize: 9, color: C.textMuted, marginBottom: 2 }}>DESCRIÇÃO *</p>
          <textarea rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Descreva o insight e o que fazer..." value={draft.descricao} onChange={e => setDraft(d => ({ ...d, descricao: e.target.value }))} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <div>
            <p style={{ fontSize: 9, color: C.textMuted, marginBottom: 2 }}>PRIORIDADE</p>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={draft.prioridade} onChange={e => setDraft(d => ({ ...d, prioridade: e.target.value as Insight['prioridade'] }))}>
              <option value="high">🔴 Alta</option>
              <option value="medium">🟡 Média</option>
              <option value="low">⚪ Baixa</option>
            </select>
          </div>
          <div>
            <p style={{ fontSize: 9, color: C.textMuted, marginBottom: 2 }}>TIPO</p>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={draft.tipo} onChange={e => setDraft(d => ({ ...d, tipo: e.target.value as Insight['tipo'] }))}>
              <option value="tendencia">📈 Tendência</option>
              <option value="anomalia">⚠️ Anomalia</option>
              <option value="oportunidade">💡 Oportunidade</option>
              <option value="risco">🚨 Risco</option>
            </select>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{ padding: '5px 12px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.textMuted, fontSize: 11, cursor: 'pointer' }}>Cancelar</button>
        <button onClick={() => canSave && onAdd(draft)} disabled={!canSave} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: canSave ? C.accent : C.border, color: '#fff', fontSize: 11, fontWeight: 600, cursor: canSave ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 4 }}>
          <IconCheck /> Adicionar
        </button>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function AnalisarPlanilhaDisplay({ data, onClose, theme = 'dark', playText }: Props) {
  const { companyId } = data;
  const isDark = theme === 'dark';
  const C = isDark ? DARK : LIGHT;
  const isMobile = useIsMobile();
  const supabase = createClient();
  const voiceRecorder = useVoiceRecorder();

  // ── States ──────────────────────────────────────────────────────────────────
  const [messages, setMessages]           = useState<Message[]>([]);
  const [inputText, setInputText]         = useState('');
  const [isProcessing, setIsProcessing]   = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioMutado, setAudioMutado]     = useState(false);
  const [isSaving, setIsSaving]           = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [slugCopiado, setSlugCopiado]     = useState(false);
  const [nomeArquivo, setNomeArquivo]     = useState('');
  const [tipoArquivo, setTipoArquivo]     = useState<TipoArquivo>(null);
  const [dadosBrutos, setDadosBrutos]     = useState<Record<string, unknown>[]>([]);
  const [schema, setSchema]               = useState<ReturnType<typeof construirSchema>>([]);
  const [conteudoTexto, setConteudoTexto] = useState('');
  const [imagemBase64, setImagemBase64]   = useState('');
  const [alertaPII, setAlertaPII]         = useState<string[]>([]);
  const [isDragging, setIsDragging]       = useState(false);
  const [dashboardSalvoId, setDashboardSalvoId] = useState<string | null>(null);
  const [slugCompartilhamento, setSlugCompartilhamento] = useState<string | null>(null);
  const [acaoAtual, setAcaoAtual]         = useState<Acao>('analisar');
  const [graficoAlvoId, setGraficoAlvoId] = useState<string | null>(null);

  // Estados do painel direito — edição direta
  const [addingKPI, setAddingKPI]         = useState(false);
  const [addingInsight, setAddingInsight] = useState(false);
  const [resumoEditando, setResumoEditando] = useState(false);
  const [resumoDraft, setResumoDraft]     = useState('');
  const [abaAtiva, setAbaAtiva]           = useState<'kpi' | 'graficos' | 'insights' | 'resumo'>('kpi');

  const [ficha, setFicha] = useState<DashboardFicha>({
    dominio: '', kpis: [], graficos: [], insights: [], resumo_executivo: '', completo: false,
  });

  // ── Refs ────────────────────────────────────────────────────────────────────
  const messagesEndRef      = useRef<HTMLDivElement>(null);
  const inputRef            = useRef<HTMLInputElement>(null);
  const fileInputRef        = useRef<HTMLInputElement>(null);
  const fileInputHeaderRef  = useRef<HTMLInputElement>(null);
  const audioMutadoRef      = useRef(false);
  const audioQueueRef       = useRef<string[]>([]);
  const isPlayingRef        = useRef(false);
  const isActiveRef         = useRef(true);
  const hasSpokenInitialRef = useRef(false);
  const sessaoRef           = useRef<{ messages: { role: string; content: string }[] }>({ messages: [] });
  // Refs espelhando state para evitar stale closure em callbacks assíncronos
  const dadosBrutosRef      = useRef<Record<string, unknown>[]>([]);
  const schemaRef           = useRef<ReturnType<typeof construirSchema>>([]);
  const conteudoTextoRef    = useRef('');
  const imagemBase64Ref     = useRef('');
  const tipoArquivoRef      = useRef<TipoArquivo>(null);
  const nomeArquivoRef      = useRef('');

  // ── Audio ───────────────────────────────────────────────────────────────────
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
      if (next) { try { await playTextComMute(next); await new Promise(r => setTimeout(r, 300)); } catch {} }
    }
    isPlayingRef.current = false;
  }, [playTextComMute]);

  // ── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (hasSpokenInitialRef.current) return;
    hasSpokenInitialRef.current = true;
    setMessages([{ id: Date.now().toString(), role: 'assistant', content: MENSAGEM_INICIAL, timestamp: new Date() }]);
    playTextSafe(MENSAGEM_INICIAL);

    // Preload libs
    const preload = async () => {
      try {
        if (!window.XLSX) { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; document.head.appendChild(s); }
        if (!window.pdfjsLib) {
          await new Promise<void>(r => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'; s.onload = () => { if (window.pdfjsLib) window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; r(); }; s.onerror = () => r(); document.head.appendChild(s); });
        }
        if (!window.mammoth) { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js'; document.head.appendChild(s); }
      } catch {}
    };
    preload();
    return () => { isActiveRef.current = false; };
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Mantém refs sincronizadas com os states para uso em callbacks assíncronos
  useEffect(() => { dadosBrutosRef.current = dadosBrutos; }, [dadosBrutos]);
  useEffect(() => { schemaRef.current = schema; }, [schema]);
  useEffect(() => { conteudoTextoRef.current = conteudoTexto; }, [conteudoTexto]);
  useEffect(() => { imagemBase64Ref.current = imagemBase64; }, [imagemBase64]);
  useEffect(() => { tipoArquivoRef.current = tipoArquivo; }, [tipoArquivo]);
  useEffect(() => { nomeArquivoRef.current = nomeArquivo; }, [nomeArquivo]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const addMessage = (role: 'user' | 'assistant', content: string) => {
    setMessages(prev => [...prev, { id: Date.now().toString() + Math.random(), role, content, timestamp: new Date() }]);
  };

  // ── Helper: recalcula completo após qualquer edição local ────────────────────
  const recalcularCompleto = (f: DashboardFicha): DashboardFicha => ({
    ...f,
    completo: f.kpis.length >= 3 && f.graficos.length >= 2 && f.insights.length >= 2 && !!f.resumo_executivo,
  });

  // ── Edição direta no painel ──────────────────────────────────────────────────
  const atualizarKPI = useCallback((index: number, kpi: KPI) => {
    setFicha(f => { const kpis = [...f.kpis]; kpis[index] = kpi; return recalcularCompleto({ ...f, kpis }); });
  }, []);
  const removerKPI = useCallback((index: number) => {
    setFicha(f => recalcularCompleto({ ...f, kpis: f.kpis.filter((_, i) => i !== index) }));
  }, []);
  const adicionarKPI = useCallback((kpi: KPI) => {
    setFicha(f => recalcularCompleto({ ...f, kpis: [...f.kpis, kpi] }));
    setAddingKPI(false);
  }, []);

  const atualizarGrafico = useCallback((index: number, g: Grafico) => {
    setFicha(f => { const graficos = [...f.graficos]; graficos[index] = g; return recalcularCompleto({ ...f, graficos }); });
  }, []);
  const removerGrafico = useCallback((index: number) => {
    setFicha(f => recalcularCompleto({ ...f, graficos: f.graficos.filter((_, i) => i !== index) }));
  }, []);

  const atualizarInsight = useCallback((index: number, ins: Insight) => {
    setFicha(f => { const insights = [...f.insights]; insights[index] = ins; return recalcularCompleto({ ...f, insights }); });
  }, []);
  const removerInsight = useCallback((index: number) => {
    setFicha(f => recalcularCompleto({ ...f, insights: f.insights.filter((_, i) => i !== index) }));
  }, []);
  const adicionarInsight = useCallback((ins: Insight) => {
    setFicha(f => recalcularCompleto({ ...f, insights: [...f.insights, ins] }));
    setAddingInsight(false);
  }, []);

  const salvarResumo = useCallback(() => {
    setFicha(f => recalcularCompleto({ ...f, resumo_executivo: resumoDraft }));
    setResumoEditando(false);
  }, [resumoDraft]);

  // ── Intent detection ────────────────────────────────────────────────────────
  const detectarAcao = useCallback((texto: string, fichaLocal: DashboardFicha): { acao: Acao; graficoAlvoId?: string } => {
    const t = texto.toLowerCase();
    if (/\b(mais (profund|detalhad|complet)|aprofund|expand|deep dive)\b/.test(t)) return { acao: 'aprofundar' };
    const temGrafico = /\b(gráfico|grafico|chart|gr[aá]fico)\b/.test(t);
    if (temGrafico && /\b(muda|troca|altera|converte|mude|trocar|transforma|muda para)\b/.test(t)) {
      const idxMatch = texto.match(/\d+/);
      const idx = idxMatch ? parseInt(idxMatch[0]) - 1 : 0;
      const g = fichaLocal.graficos[Math.max(0, Math.min(idx, fichaLocal.graficos.length - 1))];
      return { acao: 'editar_grafico', graficoAlvoId: g?.id };
    }
    if (/\b(add|adicion|cria|novo|inclui).*(gráfico|grafico|chart)\b/.test(t) || /\b(gráfico|grafico).*(novo|mais|outro)\b/.test(t)) return { acao: 'adicionar_grafico' };
    if (/\b(add|adicion|novo|mais).*(kpi|indicador|métrica)\b/.test(t) || /\b(kpi|indicador).*(novo|mais)\b/.test(t)) return { acao: 'adicionar_kpi' };
    if (/\b(mais insight|mais recomenda|mais sugest|gerar insight)\b/.test(t)) return { acao: 'mais_insights' };
    if (/\b(resumo|sumário|reescreve o resumo|melhora o resumo)\b/.test(t)) return { acao: 'resumo' };
    if (fichaLocal.completo) return { acao: 'refinar' };
    return { acao: 'analisar' };
  }, []);

  // ── processarMensagem ────────────────────────────────────────────────────────
  const processarMensagem = async (
    textoUsuario: string,
    dadosOverride?: Record<string, unknown>[],
    schemaOverride?: ReturnType<typeof construirSchema>,
    conteudoOverride?: string,
    imagemOverride?: string,
    nomeOverride?: string,
    tipoOverride?: TipoArquivo,
    acaoOverride?: Acao,
    graficoAlvoOverride?: string,
  ) => {
    // Usa refs para evitar stale closure — setState é assíncrono e processarArquivo
    // chama processarMensagem logo após setDadosBrutos, antes do re-render
    const dadosEnvio    = dadosOverride    ?? dadosBrutosRef.current;
    const schemaEnvio   = schemaOverride   ?? schemaRef.current;
    const conteudoEnvio = conteudoOverride ?? conteudoTextoRef.current;
    const imagemEnvio   = imagemOverride   ?? imagemBase64Ref.current;
    const nomeEnvio     = nomeOverride     ?? nomeArquivoRef.current;
    const tipoEnvio     = tipoOverride     ?? tipoArquivoRef.current;

    const { acao: acaoDetectada, graficoAlvoId: graficoDetectado } =
      acaoOverride
        ? { acao: acaoOverride, graficoAlvoId: graficoAlvoOverride }
        : detectarAcao(textoUsuario, ficha);

    setAcaoAtual(acaoDetectada);
    setGraficoAlvoId(graficoDetectado ?? null);

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
      sessaoRef.current.messages.push({ role: 'user', content: textoUsuario });
    }

    // Patches (resumo, mais_insights, refinar, adicionar_kpi) não precisam de arquivo em memória
    const isPatch = acaoDetectada !== 'analisar' && acaoDetectada !== 'aprofundar';
    const temArquivo = dadosEnvio.length > 0 || conteudoEnvio.length > 0 || imagemEnvio.length > 0;
    if (!temArquivo && !isPatch) {
      addMessage('assistant', 'Primeiro envie um arquivo para analisar. Aceito planilhas (XLSX, CSV), documentos (DOCX, PDF) e imagens (JPG, PNG).');
      return;
    }
    // Patches sem arquivo em memória também precisam de fichaAtual preenchida
    if (isPatch && !ficha.dominio) {
      addMessage('assistant', 'Ainda não há análise para refinar. Envie um arquivo primeiro.');
      return;
    }

    setIsProcessing(true);

    try {
      const body: Record<string, unknown> = {
        messages: sessaoRef.current.messages.map(m => ({ role: m.role, content: m.content })),
        fichaAtual: ficha,
        nomeArquivo: nomeEnvio,
        tipoArquivo: tipoEnvio,
        companyId,
        acao: acaoDetectada,
      };

      if (acaoDetectada === 'editar_grafico' && graficoDetectado) body.graficoAlvo = graficoDetectado;

      // Resumo e refinar de texto não precisam enviar dados brutos — só fichaAtual
      const acoesTextoOnly: Acao[] = ['resumo'];
      if (!acoesTextoOnly.includes(acaoDetectada)) {
        if (tipoEnvio === 'planilha') {
          body.dados  = isPatch ? dadosEnvio.slice(0, 80) : dadosEnvio.slice(0, 500);
          body.schema = schemaEnvio;
        } else if (tipoEnvio === 'pdf' || tipoEnvio === 'docx') {
          body.conteudo = isPatch ? conteudoEnvio.slice(0, 3000) : conteudoEnvio.slice(0, 8000);
        } else if (tipoEnvio === 'imagem') {
          body.imagem = imagemEnvio;
          body.dados  = [];
          body.schema = [];
        }
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/analisar-planilha`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) throw new Error('Erro na edge function');
      const resultado = await response.json();

      if (resultado.ficha) setFicha(resultado.ficha);

      sessaoRef.current.messages.push({ role: 'assistant', content: resultado.resposta });

      const assistantMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: resultado.resposta, timestamp: new Date() };
      setMessages(prev => [...prev, assistantMsg]);
      playTextSafe(resultado.resposta);

      if (resultado.ficha?.completo && !dashboardSalvoId) {
        setTimeout(() => {
          const msg: Message = { id: (Date.now() + 2).toString(), role: 'assistant', content: 'A análise está pronta! Use os chips abaixo para refinar, ou edite KPIs e gráficos diretamente no painel.', timestamp: new Date() };
          setMessages(prev => [...prev, msg]);
          sessaoRef.current.messages.push({ role: 'assistant', content: msg.content });
          playTextSafe('A análise está pronta! Edite o que quiser no painel ou peça uma análise mais profunda.');
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

  // ── Processador de arquivo ───────────────────────────────────────────────────
  const processarArquivo = async (file: File) => {
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const tipo = EXTENSOES_POR_TIPO[ext] ?? null;

    if (!tipo) { addMessage('assistant', `Formato .${ext} não suportado. Envie: planilhas (XLSX, CSV), documentos (DOCX, PDF) ou imagens (JPG, PNG, WEBP).`); return; }

    setNomeArquivo(file.name);
    setTipoArquivo(tipo);
    nomeArquivoRef.current = file.name;
    tipoArquivoRef.current = tipo;
    addMessage('user', `${ICONE_POR_TIPO[tipo]} ${file.name}`);
    sessaoRef.current.messages = []; // reseta sessão ao trocar arquivo

    if (tipo === 'planilha') {
      addMessage('assistant', 'Lendo a planilha e anonimizando dados sensíveis...');
      try {
        if (!window.XLSX) await new Promise<void>((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload = () => res(); s.onerror = rej; document.head.appendChild(s); });
        const buffer = await file.arrayBuffer();
        const wb = window.XLSX.read(buffer, { type: 'array' });
        const jsonData = window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' }) as Record<string, unknown>[];
        if (!jsonData.length) { addMessage('assistant', 'O arquivo está vazio ou não foi possível ler os dados.'); return; }
        const { dadosLimpos, camposAnonimizados, totalOcorrencias } = anonimizarPII(jsonData);
        const schemaDetectado = construirSchema(dadosLimpos);
        setDadosBrutos(dadosLimpos); setSchema(schemaDetectado);
        dadosBrutosRef.current = dadosLimpos;
        schemaRef.current = schemaDetectado;
        if (camposAnonimizados.length > 0) setAlertaPII(camposAnonimizados);
        const avisoAnon = camposAnonimizados.length > 0 ? ` (${totalOcorrencias} dado(s) sensível(is) anonimizados)` : '';
        const msg = `Planilha lida: ${jsonData.length} linhas, ${schemaDetectado.length} colunas${avisoAnon}. Iniciando análise...`;
        addMessage('assistant', msg);
        await playTextSafe(msg);
        await processarMensagem('analisar planilha', dadosLimpos, schemaDetectado, undefined, undefined, file.name, 'planilha');
      } catch { addMessage('assistant', 'Não consegui ler a planilha. Verifique se o arquivo está íntegro.'); }

    } else if (tipo === 'pdf') {
      addMessage('assistant', 'Extraindo texto do PDF...');
      try {
        if (!window.pdfjsLib) {
          await new Promise<void>((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'; s.onload = () => res(); s.onerror = rej; document.head.appendChild(s); });
        }
        if (window.pdfjsLib) window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        await new Promise(r => setTimeout(r, 150));
        const pdfDoc = await window.pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
        let textoCompleto = '';
        for (let p = 1; p <= Math.min(pdfDoc.numPages, 20); p++) {
          const page = await pdfDoc.getPage(p);
          const content = await page.getTextContent();
          const pageText = content.items.map((i: any) => i.str).filter((s: string) => s.trim()).join(' ');
          if (pageText.trim()) textoCompleto += `\n--- Página ${p} ---\n${pageText}`;
        }
        if (!textoCompleto.trim()) { addMessage('assistant', 'PDF sem texto extraível. Tente exportar como imagem (JPG/PNG).'); return; }
        setConteudoTexto(textoCompleto);
        conteudoTextoRef.current = textoCompleto;
        const msg = `PDF lido: ${pdfDoc.numPages} página(s). Iniciando análise...`;
        addMessage('assistant', msg);
        await playTextSafe(msg);
        await processarMensagem('analisar documento', undefined, undefined, textoCompleto, undefined, file.name, 'pdf');
      } catch (err: any) { addMessage('assistant', `Não consegui extrair o texto do PDF. Tente como imagem (JPG/PNG).`); }

    } else if (tipo === 'docx') {
      if (file.name.endsWith('.doc')) { addMessage('assistant', 'Arquivos .DOC antigos não são suportados. Salve como .DOCX e envie novamente.'); return; }
      addMessage('assistant', 'Extraindo texto do documento DOCX...');
      try {
        if (!window.mammoth) await new Promise<void>((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js'; s.onload = () => res(); s.onerror = rej; document.head.appendChild(s); });
        const mammothLib = window.mammoth?.default ?? window.mammoth;
        if (!mammothLib?.extractRawText) throw new Error('mammoth não carregou');
        const result = await mammothLib.extractRawText({ arrayBuffer: await file.arrayBuffer() });
        if (!result?.value?.trim()) { addMessage('assistant', 'Documento vazio ou protegido.'); return; }
        setConteudoTexto(result.value.trim());
        conteudoTextoRef.current = result.value.trim();
        const msg = `Documento lido: ${Math.round(result.value.length / 1000)}k caracteres. Iniciando análise...`;
        addMessage('assistant', msg);
        await playTextSafe(msg);
        await processarMensagem('analisar documento', undefined, undefined, result.value.trim(), undefined, file.name, 'docx');
      } catch (err: any) { addMessage('assistant', `Erro ao ler o documento: ${err?.message ?? 'formato não reconhecido'}.`); }

    } else if (tipo === 'imagem') {
      addMessage('assistant', 'Processando imagem com visão computacional...');
      try {
        const reader = new FileReader();
        const base64 = await new Promise<string>((res, rej) => { reader.onload = () => res((reader.result as string).split(',')[1]); reader.onerror = rej; reader.readAsDataURL(file); });
        setImagemBase64(base64);
        imagemBase64Ref.current = base64;
        const msg = 'Imagem carregada. Iniciando análise com IA visual...';
        addMessage('assistant', msg);
        await playTextSafe(msg);
        await processarMensagem('analisar imagem', undefined, undefined, undefined, base64, file.name, 'imagem');
      } catch { addMessage('assistant', 'Erro ao carregar a imagem. Tente novamente.'); }
    }
  };

  // ── Voz ──────────────────────────────────────────────────────────────────────
  const handleMicPress = async () => {
    if (voiceRecorder.isRecording) {
      setIsTranscribing(true);
      try {
        const audioBlob = await voiceRecorder.stopRecording();
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        const base64Audio = await new Promise<string>(resolve => { reader.onloadend = () => resolve((reader.result as string).split(',')[1]); });
        const response = await fetch('/api/voice/transcribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audio: base64Audio }) });
        if (!response.ok) throw new Error();
        const { text } = await response.json();
        if (text?.trim()) processarMensagem(text.trim());
      } catch { alert('Erro ao transcrever. Digite sua mensagem.'); }
      finally { setIsTranscribing(false); }
    } else { await voiceRecorder.startRecording(); }
  };

  // ── Salvar dashboard ─────────────────────────────────────────────────────────
  const salvarDashboard = async () => {
    if (!ficha.completo || isSaving) return;
    setIsSaving(true);
    try {
      const { data: slugData } = await supabase.rpc('gerar_slug_dashboard', { p_nome: nomeArquivo || 'dashboard' });
      const { data: saved, error } = await supabase.from('planilha_dashboards').insert({
        company_id: companyId, nome: nomeArquivo || 'Dashboard', dominio: ficha.dominio,
        total_linhas: dadosBrutos.length, total_colunas: schema.length,
        schema_detectado: schema, dados_anonimizados: dadosBrutos.slice(0, 500),
        insights: ficha.insights, kpis: ficha.kpis, graficos: ficha.graficos,
        resumo_executivo: ficha.resumo_executivo, slug_compartilhamento: slugData,
        compartilhamento_ativo: true, status: 'completo', creditos_usados: 3,
      }).select('id, slug_compartilhamento').single();
      if (error) throw error;
      setDashboardSalvoId(saved.id);
      setSlugCompartilhamento(saved.slug_compartilhamento);
      addMessage('assistant', 'Dashboard salvo com sucesso!');
      playTextSafe('Dashboard salvo com sucesso!');
    } catch { alert('Erro ao salvar. Tente novamente.'); }
    finally { setIsSaving(false); }
  };

  const copiarLink = () => {
    if (!slugCompartilhamento) return;
    navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/${slugCompartilhamento}`);
    setSlugCopiado(true);
    setTimeout(() => setSlugCopiado(false), 2000);
  };

  // ── Export PDF ───────────────────────────────────────────────────────────────
  const exportarPDF = async () => {
    if (!ficha.completo || isExportingPDF) return;
    setIsExportingPDF(true);
    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      const W = 210; let y = 20; const margin = 15; const contentW = W - margin * 2;

      doc.setFillColor(30, 64, 175);
      doc.rect(0, 0, W, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20); doc.setFont('helvetica', 'bold');
      doc.text('Dashboard Analítico', margin, 18);
      doc.setFontSize(11); doc.setFont('helvetica', 'normal');
      doc.text(nomeArquivo || 'Análise de Dados', margin, 27);
      doc.text(new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }), margin, 34);
      doc.setTextColor(0, 0, 0); y = 50;

      if (ficha.dominio) { doc.setFontSize(10); doc.setTextColor(100,100,100); doc.text(`Domínio: ${ficha.dominio.charAt(0).toUpperCase() + ficha.dominio.slice(1)}`, margin, y); y += 8; }

      if (ficha.resumo_executivo) {
        doc.setFontSize(13); doc.setFont('helvetica','bold'); doc.setTextColor(0,0,0); doc.text('Resumo Executivo', margin, y); y += 6;
        doc.setFontSize(10); doc.setFont('helvetica','normal'); doc.setTextColor(50,50,50);
        const lines = doc.splitTextToSize(ficha.resumo_executivo, contentW);
        doc.text(lines, margin, y); y += lines.length * 5 + 8;
      }

      if (ficha.kpis.length) {
        if (y > 240) { doc.addPage(); y = 20; }
        doc.setFontSize(13); doc.setFont('helvetica','bold'); doc.setTextColor(0,0,0); doc.text('Indicadores Chave (KPIs)', margin, y); y += 6;
        const kpiCols = 3; const kpiW = contentW / kpiCols;
        ficha.kpis.forEach((kpi, i) => {
          const col = i % kpiCols; const row = Math.floor(i / kpiCols);
          const x = margin + col * kpiW; const yKpi = y + row * 22;
          doc.setFillColor(241,245,249); doc.roundedRect(x, yKpi, kpiW - 2, 19, 2, 2, 'F');
          doc.setFontSize(8); doc.setTextColor(100,100,100); doc.setFont('helvetica','normal'); doc.text(kpi.label, x+3, yKpi+6);
          doc.setFontSize(12); doc.setFont('helvetica','bold'); doc.setTextColor(0,0,0); doc.text(kpi.valor, x+3, yKpi+14);
          if (kpi.variacao) { doc.setFontSize(8); doc.setFont('helvetica','normal'); const isPos = kpi.variacao.startsWith('+'); doc.setTextColor(isPos?22:220, isPos?163:38, isPos?74:38); doc.text(kpi.variacao, x+kpiW-20, yKpi+14); }
        });
        y += Math.ceil(ficha.kpis.length / kpiCols) * 22 + 6; doc.setTextColor(0,0,0);
      }

      if (ficha.graficos.length) {
        if (y > 200) { doc.addPage(); y = 20; }
        doc.setFontSize(13); doc.setFont('helvetica','bold'); doc.setTextColor(0,0,0); doc.text('Gráficos', margin, y); y += 6;
        const ReactDOM = await import('react-dom/client');
        const React = await import('react');
        const offscreen = document.createElement('div');
        offscreen.style.cssText = 'position:fixed;top:-9999px;left:0;width:800px;background:#ffffff;z-index:-1;pointer-events:none;';
        document.body.appendChild(offscreen);
        for (const g of ficha.graficos) {
          if (y > 220) { doc.addPage(); y = 20; }
          if (g.titulo) { doc.setFontSize(10); doc.setFont('helvetica','bold'); doc.setTextColor(0,0,0); doc.text(g.titulo, margin, y); y += 5; }
          try {
            const chartDiv = document.createElement('div');
            chartDiv.style.cssText = 'width:800px;height:340px;background:#ffffff;padding:12px;box-sizing:border-box;border-radius:8px;';
            offscreen.appendChild(chartDiv);
            const root = ReactDOM.createRoot(chartDiv);
            root.render(React.createElement(GraficoRecharts, { grafico: g, C: LIGHT }));
            await new Promise(r => setTimeout(r, 700));
            const canvas = await html2canvas(chartDiv, { scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: true });
            root.unmount(); offscreen.removeChild(chartDiv);
            const imgData = canvas.toDataURL('image/png');
            const imgH = (canvas.height / canvas.width) * contentW;
            if (y + imgH > 275) { doc.addPage(); y = 20; }
            doc.addImage(imgData, 'PNG', margin, y, contentW, imgH); y += imgH + 8;
          } catch (err) { console.warn('Erro gráfico PDF:', g.titulo, err); }
        }
        document.body.removeChild(offscreen);
      }

      if (ficha.insights.length) {
        if (y > 230) { doc.addPage(); y = 20; }
        doc.setFontSize(13); doc.setFont('helvetica','bold'); doc.setTextColor(0,0,0); doc.text('Insights e Recomendações', margin, y); y += 6;
        ficha.insights.forEach(ins => {
          if (y > 268) { doc.addPage(); y = 20; }
          const pCor: Record<string, [number,number,number]> = { high:[220,38,38], medium:[217,119,6], low:[100,116,139] };
          const [r,g,b] = pCor[ins.prioridade] ?? [100,116,139];
          doc.setFillColor(r,g,b); doc.circle(margin+2, y+2, 1.5, 'F');
          doc.setFontSize(10); doc.setFont('helvetica','bold'); doc.setTextColor(0,0,0); doc.text(ins.titulo, margin+6, y+4); y += 7;
          doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(60,60,60);
          const descLines = doc.splitTextToSize(ins.descricao, contentW-6);
          doc.text(descLines, margin+6, y); y += descLines.length * 4 + 6;
        });
      }

      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(150,150,150); doc.text('Gerado por minhAi · minhai.app', margin, 291); doc.text(`Pág. ${i}/${totalPages}`, W-margin-15, 291); }
      doc.save(`dashboard-${(nomeArquivo || 'analise').replace(/\.[^/.]+$/, '')}.pdf`);
    } catch (err) { console.error('Erro PDF:', err); alert('Erro ao gerar PDF. Tente novamente.'); }
    finally { setIsExportingPDF(false); }
  };

  // ── Drag & Drop ──────────────────────────────────────────────────────────────
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processarArquivo(file);
  };

  // ── Painel direito interativo ─────────────────────────────────────────────────
  const PainelDireito = () => {
    const temDados = dadosBrutos.length > 0 || conteudoTexto.length > 0 || imagemBase64.length > 0;

    // Upload zone
    if (!temDados) return (
      <div style={{ padding: 20 }}>
        <div onDragOver={e => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{ border: `2px dashed ${isDragging ? C.accent : C.border}`, borderRadius: 12, padding: '32px 16px', textAlign: 'center', cursor: 'pointer', background: isDragging ? `${C.accent}10` : C.uploadBg, transition: 'all 0.2s' }}>
          <div style={{ display: 'flex', justifyContent: 'center', color: isDragging ? C.accent : C.textMuted, marginBottom: 8 }}><IconUpload /></div>
          <p style={{ fontSize: 13, fontWeight: 600, color: isDragging ? C.accent : C.text, marginBottom: 4 }}>{isDragging ? 'Solte aqui!' : 'Enviar arquivo'}</p>
          <p style={{ fontSize: 11, color: C.textMuted }}>XLSX, CSV · PDF · DOCX · JPG, PNG</p>
          <p style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>Arraste ou clique para selecionar</p>
          <input ref={fileInputRef} type="file" accept={TIPOS_ACEITOS} style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) processarArquivo(e.target.files[0]); }} />
        </div>
      </div>
    );

    // Tabs do painel (KPIs, Gráficos, Insights, Resumo)
    const tabs: { key: typeof abaAtiva; label: string; count?: number }[] = [
      { key: 'kpi',      label: 'KPIs',     count: ficha.kpis.length },
      { key: 'graficos', label: 'Gráficos', count: ficha.graficos.length },
      { key: 'insights', label: 'Insights', count: ficha.insights.length },
      { key: 'resumo',   label: 'Resumo' },
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Status header */}
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconChart />
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Dashboard</span>
            {ficha.dominio && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: `${C.accent}20`, color: C.accent, fontWeight: 600 }}>{ficha.dominio.charAt(0).toUpperCase() + ficha.dominio.slice(1)}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {ficha.completo && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: `${C.success}20`, color: C.success, fontWeight: 600 }}>✓ Pronto</span>}
            {isProcessing && <span style={{ fontSize: 10, color: C.accent, display: 'flex', alignItems: 'center', gap: 4 }}><IconLoader /> Processando</span>}
          </div>
        </div>

        {/* Abas */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setAbaAtiva(tab.key)}
              style={{ flex: 1, padding: '8px 4px', fontSize: 11, fontWeight: abaAtiva === tab.key ? 600 : 400, color: abaAtiva === tab.key ? C.accent : C.textMuted, background: 'transparent', border: 'none', borderBottom: `2px solid ${abaAtiva === tab.key ? C.accent : 'transparent'}`, cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 10, background: abaAtiva === tab.key ? C.accent : C.border, color: abaAtiva === tab.key ? '#fff' : C.textMuted, fontWeight: 700 }}>{tab.count}</span>}
            </button>
          ))}
        </div>

        {/* Conteúdo da aba */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>

          {/* ── ABA KPIs ── */}
          {abaAtiva === 'kpi' && (
            <div>
              {ficha.kpis.length === 0 && !isProcessing && (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: C.textMuted, fontSize: 12 }}>Nenhum KPI ainda. A análise os gerará automaticamente.</div>
              )}
              {addingKPI && (
                <KPIAddForm C={C} onAdd={adicionarKPI} onCancel={() => setAddingKPI(false)} />
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {ficha.kpis.map((kpi, i) => (
                  <KPICard key={i} kpi={kpi} index={i} C={C} onUpdate={atualizarKPI} onDelete={removerKPI} />
                ))}
              </div>
              {!addingKPI && (
                <button onClick={() => setAddingKPI(true)}
                  style={{ marginTop: 12, width: '100%', padding: '8px', borderRadius: 8, border: `1px dashed ${C.border}`, background: 'transparent', color: C.textMuted, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted; }}>
                  <IconPlus /> Adicionar KPI manualmente
                </button>
              )}
              {ficha.kpis.length > 0 && (
                <button onClick={() => processarMensagem('Sugira e adicione novos KPIs relevantes', undefined, undefined, undefined, undefined, undefined, undefined, 'adicionar_kpi')}
                  disabled={isProcessing}
                  style={{ marginTop: 8, width: '100%', padding: '8px', borderRadius: 8, border: `1px solid ${C.accent}40`, background: `${C.accent}10`, color: C.accent, fontSize: 12, cursor: isProcessing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: isProcessing ? 0.5 : 1 }}>
                  <IconRefresh /> Gerar KPIs com IA
                </button>
              )}
            </div>
          )}

          {/* ── ABA GRÁFICOS ── */}
          {abaAtiva === 'graficos' && (
            <div>
              {ficha.graficos.length === 0 && !isProcessing && (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: C.textMuted, fontSize: 12 }}>Nenhum gráfico ainda. Faça a análise para gerá-los.</div>
              )}
              {ficha.graficos.map((g, i) => (
                <GraficoCard key={g.id} grafico={g} index={i} C={C} onUpdate={atualizarGrafico} onDelete={removerGrafico} />
              ))}
              <button onClick={() => processarMensagem('Adicione um novo gráfico explorando outro ângulo dos dados', undefined, undefined, undefined, undefined, undefined, undefined, 'adicionar_grafico')}
                disabled={isProcessing}
                style={{ width: '100%', padding: '8px', borderRadius: 8, border: `1px dashed ${C.border}`, background: 'transparent', color: C.textMuted, fontSize: 12, cursor: isProcessing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: isProcessing ? 0.5 : 1, transition: 'all 0.15s' }}
                onMouseEnter={e => { if (!isProcessing) { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; } }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted; }}>
                <IconPlus /> Gerar novo gráfico com IA
              </button>
            </div>
          )}

          {/* ── ABA INSIGHTS ── */}
          {abaAtiva === 'insights' && (
            <div>
              {ficha.insights.length === 0 && !isProcessing && (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: C.textMuted, fontSize: 12 }}>Nenhum insight ainda.</div>
              )}
              {addingInsight && (
                <InsightAddForm C={C} onAdd={adicionarInsight} onCancel={() => setAddingInsight(false)} />
              )}
              {ficha.insights.map((ins, i) => (
                <InsightCard key={i} insight={ins} index={i} C={C} onUpdate={atualizarInsight} onDelete={removerInsight} />
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                {!addingInsight && (
                  <button onClick={() => setAddingInsight(true)}
                    style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1px dashed ${C.border}`, background: 'transparent', color: C.textMuted, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted; }}>
                    <IconPlus /> Manual
                  </button>
                )}
                <button onClick={() => processarMensagem('Gere mais insights e recomendações acionáveis', undefined, undefined, undefined, undefined, undefined, undefined, 'mais_insights')}
                  disabled={isProcessing}
                  style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1px solid ${C.accent}40`, background: `${C.accent}10`, color: C.accent, fontSize: 12, cursor: isProcessing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: isProcessing ? 0.5 : 1 }}>
                  <IconRefresh /> Gerar com IA
                </button>
              </div>
            </div>
          )}

          {/* ── ABA RESUMO ── */}
          {abaAtiva === 'resumo' && (
            <div>
              {resumoEditando ? (
                <div>
                  <p style={{ fontSize: 11, color: C.textMuted, marginBottom: 6 }}>Edite o resumo executivo:</p>
                  <textarea rows={6} value={resumoDraft} onChange={e => setResumoDraft(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: 8, border: `1px solid ${C.accent}`, background: C.bgSecondary, color: C.text, fontSize: 13, outline: 'none', resize: 'vertical', lineHeight: 1.6 }} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button onClick={() => { setResumoDraft(ficha.resumo_executivo); setResumoEditando(false); }} style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.textMuted, fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
                    <button onClick={salvarResumo} style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: C.accent, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <IconCheck /> Salvar
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {ficha.resumo_executivo ? (
                    <div style={{ padding: '14px', borderRadius: 10, background: C.bgSecondary, border: `1px solid ${C.border}`, marginBottom: 12 }}>
                      <p style={{ fontSize: 13, color: C.text, lineHeight: 1.7 }}>{ficha.resumo_executivo}</p>
                    </div>
                  ) : (
                    <div style={{ padding: '32px 16px', textAlign: 'center', color: C.textMuted, fontSize: 12 }}>Resumo executivo será gerado pela análise.</div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    {ficha.resumo_executivo && (
                      <button onClick={() => { setResumoDraft(ficha.resumo_executivo); setResumoEditando(true); }}
                        style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.textMuted, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <IconEdit /> Editar
                      </button>
                    )}
                    <button onClick={() => processarMensagem('Reescreva o resumo executivo de forma mais impactante', undefined, undefined, undefined, undefined, undefined, undefined, 'resumo')}
                      disabled={isProcessing}
                      style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1px solid ${C.accent}40`, background: `${C.accent}10`, color: C.accent, fontSize: 12, cursor: isProcessing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, opacity: isProcessing ? 0.5 : 1 }}>
                      <IconRefresh /> Regerar com IA
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Botão exportar PDF */}
        {ficha.completo && (
          <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
            <button onClick={exportarPDF} disabled={isExportingPDF}
              style={{ width: '100%', padding: '11px', borderRadius: 8, border: 'none', cursor: isExportingPDF ? 'not-allowed' : 'pointer', background: C.accent, color: 'white', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: isExportingPDF ? 0.6 : 1 }}>
              {isExportingPDF ? <><IconLoader /> Gerando PDF...</> : <><IconPDF /> Exportar PDF</>}
            </button>
          </div>
        )}
      </div>
    );
  };

  // ── Blocos de chat compartilhados ────────────────────────────────────────────
  const headerButtonsJSX = (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      <button onClick={() => fileInputHeaderRef.current?.click()} title="Enviar arquivo"
        style={{ padding: '6px 10px', borderRadius: 6, background: `${C.accent}20`, border: `1px solid ${C.accent}40`, cursor: 'pointer', color: C.accent, fontSize: 11, fontWeight: 600 }}>
        + Arquivo
      </button>
      <input ref={fileInputHeaderRef} type="file" accept={TIPOS_ACEITOS} style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) processarArquivo(e.target.files[0]); }} />
      <button onClick={toggleMute} title={audioMutado ? 'Ativar áudio' : 'Desativar áudio'}
        style={{ padding: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: audioMutado ? C.textMuted : C.accent, opacity: audioMutado ? 0.5 : 1 }}>
        {audioMutado ? <IconVolumeMute /> : <IconVolume />}
      </button>
      <button onClick={onClose} style={{ padding: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: C.textMuted }}><IconX /></button>
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
            <IconLoader />
            {acaoAtual === 'aprofundar'          ? 'Aprofundando análise...'
             : acaoAtual === 'mais_insights'     ? 'Gerando insights...'
             : acaoAtual === 'adicionar_grafico' ? 'Criando gráfico...'
             : acaoAtual === 'adicionar_kpi'     ? 'Calculando KPI...'
             : acaoAtual === 'editar_grafico'    ? 'Editando gráfico...'
             : acaoAtual === 'refinar'           ? 'Refinando...'
             : acaoAtual === 'resumo'            ? 'Reescrevendo resumo...'
             : 'Analisando...'}
          </div>
        </div>
      )}
      {/* Chips de sugestão rápida */}
      {ficha.completo && !isProcessing && (
        <div style={{ paddingBottom: 4 }}>
          <p style={{ fontSize: 10, color: C.textMuted, marginBottom: 6 }}>Sugestões rápidas:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {CHIPS_PADRAO.map(chip => (
              <button key={chip.acao}
                onClick={() => processarMensagem(chip.texto, undefined, undefined, undefined, undefined, undefined, undefined, chip.acao)}
                style={{ padding: '5px 10px', borderRadius: 20, border: `1px solid ${C.border}`, background: C.chipBg, color: C.text, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text; }}>
                {chip.label}
              </button>
            ))}
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
          <button onClick={handleMicPress} disabled={isProcessing || isTranscribing}
            style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: voiceRecorder.isRecording ? '#ef4444' : C.accent, border: 'none', cursor: (isProcessing || isTranscribing) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', transform: voiceRecorder.isRecording ? 'scale(1.1)' : 'scale(1)', transition: 'all 0.1s' }}>
            <IconMic />
          </button>
        )}
        <input ref={inputRef} type="text" value={inputText} onChange={e => setInputText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensagem(); } }}
          placeholder={dadosBrutos.length || conteudoTexto || imagemBase64 ? 'Ex: "mude gráfico 1 para linha" ou "mais insights"...' : 'Envie um arquivo ou descreva o que quer analisar...'}
          disabled={isProcessing || voiceRecorder.isRecording || isTranscribing}
          style={{ flex: 1, padding: '10px 14px', background: C.bgSecondary, border: `1px solid ${C.border}`, borderRadius: 20, color: C.text, fontSize: 13, outline: 'none' }} />
        {inputText.trim() && (
          <button onClick={enviarMensagem} disabled={isProcessing}
            style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: C.accent, border: 'none', cursor: isProcessing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', opacity: isProcessing ? 0.5 : 1 }}>
            <IconSend />
          </button>
        )}
      </div>
      {voiceRecorder.isRecording && <p style={{ marginTop: 6, fontSize: 11, color: '#ef4444', textAlign: 'center' }}>Gravando... clique para enviar ({voiceRecorder.duration}s)</p>}
      {isTranscribing && <p style={{ marginTop: 6, fontSize: 11, color: C.accent, textAlign: 'center' }}>Transcrevendo...</p>}
    </div>
  );

  // ── CSS keyframe para o spinner (injetado uma vez) ────────────────────────────
  useEffect(() => {
    if (document.getElementById('planilha-spin')) return;
    const style = document.createElement('style');
    style.id = 'planilha-spin';
    style.textContent = '@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
    document.head.appendChild(style);
  }, []);

  // ── RENDER MOBILE ─────────────────────────────────────────────────────────────
  if (isMobile) return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: C.bg, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconChart />
          <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Relatório de Arquivos</h2>
          {ficha.dominio && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: `${C.accent}20`, color: C.accent, fontWeight: 600 }}>{ficha.dominio}</span>}
        </div>
        {headerButtonsJSX}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>{chatMessagesJSX}</div>
      {(ficha.kpis.length > 0 || ficha.graficos.length > 0 || !(dadosBrutos.length || conteudoTexto || imagemBase64)) && (
        <div style={{ maxHeight: '45vh', overflowY: 'auto', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
          <PainelDireito />
        </div>
      )}
      {inputAreaJSX}
    </div>,
    document.body
  );

  // ── RENDER DESKTOP ────────────────────────────────────────────────────────────
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 1340, height: '92vh', background: C.bg, borderRadius: 16, border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <IconChart />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text }}>Relatório de Arquivos</h2>
                {ficha.dominio && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: `${C.accent}20`, color: C.accent, fontWeight: 600 }}>{ficha.dominio.charAt(0).toUpperCase() + ficha.dominio.slice(1)}</span>}
                {nomeArquivo && <span style={{ fontSize: 11, color: C.textMuted }}>· {nomeArquivo}</span>}
              </div>
              <p style={{ fontSize: 12, color: C.textMuted }}>Converse, edite KPIs e gráficos diretamente no painel</p>
            </div>
          </div>
          {headerButtonsJSX}
        </div>

        {/* Layout 2 colunas */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 440px', gap: 1, background: C.border, overflow: 'hidden' }}>

          {/* COLUNA ESQUERDA — CHAT */}
          <div style={{ background: C.bgChat, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {chatMessagesJSX}
            {inputAreaJSX}
          </div>

          {/* COLUNA DIREITA — PAINEL INTERATIVO */}
          <div style={{ background: C.bg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <PainelDireito />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
