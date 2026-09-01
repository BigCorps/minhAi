'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { createClient } from '@/lib/supabase-browser';
import PixWikiHeader from '@/components/pix/PixWikiHeader';
import PixWikiDashboardNav from '@/components/pix/PixWikiDashboardNav';

type PeriodKey = 'today' | 'week' | 'month' | 'custom';
type SourceKey = 'all' | 'pix_key' | 'pixwiki_link';

interface CompanyOption {
  id: string;
  name: string;
  slug: string;
  is_primary: boolean;
}

interface ReportRow {
  id: string;
  company_id: string;
  company_name: string;
  mp_payment_id: string | null;
  amount_cents: number;
  fee_amount_cents: number;
  net_amount_cents: number;
  status: string;
  source: 'pix_key' | 'pixwiki_link' | string;
  provider: string;
  received_at: string;
}

interface PlanStatus {
  effective_plan: 'free' | 'link' | 'pro';
  features?: {
    reports?: boolean;
  };
}

const FUNCTIONS_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const TZ = 'America/Sao_Paulo';

function money(cents: number | null | undefined) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(cents || 0) / 100);
}

function decimalBR(cents: number | null | undefined) {
  return (Number(cents || 0) / 100).toFixed(2).replace('.', ',');
}

function isoDateInSaoPaulo(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function shiftDate(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T12:00:00-03:00`);
  date.setUTCDate(date.getUTCDate() + days);
  return isoDateInSaoPaulo(date);
}

function startOfWeek(today: string) {
  const date = new Date(`${today}T12:00:00-03:00`);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return shiftDate(today, diff);
}

function formatDate(isoDate: string) {
  if (!isoDate) return '—';
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDay(value: string) {
  return new Date(value).toLocaleDateString('pt-BR', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function sourceLabel(source: string) {
  return source === 'pixwiki_link' ? 'Pix Link' : 'Chave Pix';
}

function providerLabel(provider: string) {
  return provider === 'mercadopago' ? 'Mercado Pago' : provider || '—';
}

function csvEscape(value: unknown) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function Spinner() {
  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-emerald-400" />
    </div>
  );
}

export default function PixWikiReportsPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const today = useMemo(() => isoDateInSaoPaulo(), []);

  const [dark, setDark] = useState(true);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [exporting, setExporting] = useState<'csv' | 'pdf' | ''>('');
  const [error, setError] = useState('');
  const [plan, setPlan] = useState<PlanStatus | null>(null);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [rows, setRows] = useState<ReportRow[]>([]);

  const [period, setPeriod] = useState<PeriodKey>('today');
  const [companyId, setCompanyId] = useState('all');
  const [source, setSource] = useState<SourceKey>('all');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const isDark = dark;
  const page = isDark ? 'bg-[#020617] text-white' : 'bg-[#f7f8fa] text-slate-900';
  const card = isDark ? 'border-white/10 bg-white/[0.035]' : 'border-black/10 bg-white shadow-sm';
  const muted = isDark ? 'text-white/55' : 'text-slate-500';
  const faint = isDark ? 'text-white/35' : 'text-slate-400';
  const input = isDark
    ? 'border-white/10 bg-white/[0.055] text-white'
    : 'border-black/10 bg-white text-slate-900';

  const reportsEnabled = plan?.effective_plan === 'pro' && plan?.features?.reports === true;

  const applyPeriod = useCallback((next: PeriodKey) => {
    setPeriod(next);
    if (next === 'today') {
      setStartDate(today);
      setEndDate(today);
      return;
    }
    if (next === 'week') {
      setStartDate(startOfWeek(today));
      setEndDate(today);
      return;
    }
    if (next === 'month') {
      setStartDate(`${today.slice(0, 7)}-01`);
      setEndDate(today);
      return;
    }
    if (next === 'custom' && startDate === endDate) {
      setStartDate(shiftDate(today, -29));
      setEndDate(today);
    }
  }, [endDate, startDate, today]);

  const loadReport = useCallback(async () => {
    if (!reportsEnabled) return;
    if (!startDate || !endDate || endDate < startDate) {
      setError('Escolha um período válido.');
      return;
    }

    const diffDays = Math.round((new Date(`${endDate}T12:00:00-03:00`).getTime() - new Date(`${startDate}T12:00:00-03:00`).getTime()) / 86400000);
    if (diffDays > 366) {
      setError('O período máximo por relatório é de 367 dias.');
      return;
    }

    setReportLoading(true);
    setError('');
    try {
      const params = {
        p_company_id: companyId === 'all' ? null : companyId,
        p_source: source,
        p_start_date: startDate,
        p_end_date: endDate,
      };
      const pageSize = 1000;
      const maxPages = 20;
      const collected: ReportRow[] = [];

      for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
        const from = pageIndex * pageSize;
        const to = from + pageSize - 1;
        const { data, error: rpcError } = await supabase
          .rpc('pixwiki_report_receipts', params)
          .range(from, to);
        if (rpcError) throw rpcError;

        const batch = (data || []) as ReportRow[];
        collected.push(...batch);
        if (batch.length < pageSize) break;

        if (pageIndex === maxPages - 1) {
          throw new Error('report_too_large');
        }
      }

      setRows(collected);
    } catch (e: any) {
      const message = String(e?.message || '');
      if (message.includes('plan_required')) setError('Relatórios estão disponíveis no Pix Pro.');
      else if (message.includes('period_too_large')) setError('O período máximo por relatório é de 367 dias.');
      else if (message.includes('report_too_large')) setError('Este relatório ultrapassou 20 mil recebimentos. Reduza o período ou filtre por empresa.');
      else setError('Não foi possível carregar o relatório agora.');
    } finally {
      setReportLoading(false);
    }
  }, [companyId, endDate, reportsEnabled, source, startDate, supabase]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('publicTheme');
    if (savedTheme === 'light' || savedTheme === 'dark') setDark(savedTheme === 'dark');
    else setDark(window.matchMedia('(prefers-color-scheme: dark)').matches);

    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        router.replace('/login');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        router.replace('/login');
        return;
      }

      try {
        const planResponse = await fetch(`${FUNCTIONS_URL}/pixwiki-plan`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            apikey: ANON_KEY,
          },
          body: JSON.stringify({ action: 'status' }),
        });
        const planData = await planResponse.json().catch(() => ({}));
        if (!planResponse.ok) throw new Error(planData?.error || 'plan_status_error');

        const nextPlan: PlanStatus = {
          effective_plan: planData.effective_plan,
          features: planData.features || {},
        };
        setPlan(nextPlan);

        if (nextPlan.effective_plan === 'pro' && nextPlan.features?.reports === true) {
          const { data: companyData, error: companyError } = await supabase.rpc('pixwiki_list_my_companies');
          if (companyError) throw companyError;
          setCompanies(((companyData || []) as CompanyOption[]).map(item => ({
            id: item.id,
            name: item.name,
            slug: item.slug,
            is_primary: item.is_primary,
          })));
        }
      } catch {
        setError('Não foi possível carregar os dados de relatórios.');
      } finally {
        setLoading(false);
      }
    })();
  }, [router, supabase]);

  useEffect(() => {
    if (!loading && reportsEnabled) loadReport();
  }, [loading, reportsEnabled, period, companyId, source, startDate, endDate, loadReport]);

  const totals = useMemo(() => rows.reduce((acc, row) => {
    acc.count += 1;
    acc.gross += Number(row.amount_cents || 0);
    acc.fees += Number(row.fee_amount_cents || 0);
    acc.net += Number(row.net_amount_cents || 0);
    return acc;
  }, { count: 0, gross: 0, fees: 0, net: 0 }), [rows]);

  const daily = useMemo(() => {
    const map = new Map<string, { date: string; count: number; gross: number; fees: number; net: number }>();
    for (const row of rows) {
      const date = formatDay(row.received_at);
      const current = map.get(date) || { date, count: 0, gross: 0, fees: 0, net: 0 };
      current.count += 1;
      current.gross += Number(row.amount_cents || 0);
      current.fees += Number(row.fee_amount_cents || 0);
      current.net += Number(row.net_amount_cents || 0);
      map.set(date, current);
    }
    return Array.from(map.values());
  }, [rows]);

  const maxDailyGross = useMemo(() => Math.max(1, ...daily.map(item => item.gross)), [daily]);
  const companyName = companyId === 'all'
    ? 'Todas as empresas'
    : companies.find(item => item.id === companyId)?.name || 'Empresa selecionada';
  const sourceName = source === 'all' ? 'Chave Pix + Pix Link' : sourceLabel(source);
  const fileBase = `pixwiki-relatorio-${startDate}-a-${endDate}`;

  function exportCsv() {
    setExporting('csv');
    try {
      const header = [
        'Data', 'Hora', 'Empresa', 'Origem', 'Bruto (R$)', 'Tarifa (R$)', 'Líquido (R$)', 'Provedor', 'ID Mercado Pago',
      ];
      const lines = [header.map(csvEscape).join(';')];

      for (const row of rows) {
        const date = new Date(row.received_at);
        const dateText = date.toLocaleDateString('pt-BR', { timeZone: TZ });
        const timeText = date.toLocaleTimeString('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        lines.push([
          dateText,
          timeText,
          row.company_name,
          sourceLabel(row.source),
          decimalBR(row.amount_cents),
          decimalBR(row.fee_amount_cents),
          decimalBR(row.net_amount_cents),
          providerLabel(row.provider),
          row.mp_payment_id || '',
        ].map(csvEscape).join(';'));
      }

      const csv = `\uFEFF${lines.join('\r\n')}`;
      downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${fileBase}.csv`);
    } finally {
      setExporting('');
    }
  }

  function exportPdf() {
    setExporting('pdf');
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('PixWiki', 14, 16);
      doc.setFontSize(13);
      doc.text('Relatório de recebimentos', 14, 24);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Período: ${formatDate(startDate)} a ${formatDate(endDate)}`, 14, 31);
      doc.text(`Empresa: ${companyName}`, 14, 36);
      doc.text(`Origem: ${sourceName}`, 14, 41);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`Pix: ${totals.count}`, 145, 31);
      doc.text(`Bruto: ${money(totals.gross)}`, 145, 36);
      doc.text(`Tarifas: ${money(totals.fees)}`, 210, 31);
      doc.text(`Líquido: ${money(totals.net)}`, 210, 36);

      autoTable(doc, {
        startY: 48,
        head: [['Data/Hora', 'Empresa', 'Origem', 'Bruto', 'Tarifa', 'Líquido', 'Provedor', 'ID MP']],
        body: rows.map(row => [
          formatDateTime(row.received_at),
          row.company_name,
          sourceLabel(row.source),
          money(row.amount_cents),
          money(row.fee_amount_cents),
          money(row.net_amount_cents),
          providerLabel(row.provider),
          row.mp_payment_id || '—',
        ]),
        styles: { fontSize: 7.5, cellPadding: 2 },
        headStyles: { fillColor: [16, 185, 129], textColor: [2, 6, 23] },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { left: 14, right: 14 },
      });

      const pages = doc.getNumberOfPages();
      for (let pageNumber = 1; pageNumber <= pages; pageNumber += 1) {
        doc.setPage(pageNumber);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text(
          `PixWiki · Gerado em ${new Date().toLocaleString('pt-BR', { timeZone: TZ })} · Página ${pageNumber}/${pages}`,
          14,
          203,
        );
      }

      doc.save(`${fileBase}.pdf`);
    } finally {
      setExporting('');
    }
  }

  if (loading) return <Spinner />;

  if (!reportsEnabled) {
    return (
      <main className={`min-h-screen ${page}`}>
        <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-5 py-20">
          <div className={`w-full rounded-3xl border p-7 sm:p-10 ${card}`}>
            <div className="inline-flex rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-400">PIX PRO</div>
            <h1 className="mt-4 text-3xl font-black tracking-tight">Relatórios profissionais</h1>
            <p className={`mt-3 max-w-xl text-sm leading-6 ${muted}`}>
              Relatórios diário, semanal, mensal e por período, com filtro por empresa e por Chave Pix ou Pix Link. Exporte em CSV ou PDF.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {['Bruto, tarifas e líquido', 'Multiempresa', 'CSV para Excel', 'PDF pronto para enviar'].map(item => (
                <div key={item} className={`rounded-2xl border p-4 text-sm font-bold ${card}`}>✓ {item}</div>
              ))}
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/dashboard" className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black text-slate-950">Ver Pix Pro no painel</Link>
              <Link href="/dashboard" className={`rounded-xl border px-5 py-3 text-sm font-bold ${card}`}>Voltar</Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={`min-h-screen pb-24 ${page}`}>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <PixWikiHeader
          plan={plan?.effective_plan || 'pro'}
          dark={dark}
          onThemeChange={setDark}
        />

        <div className="mt-6">
          <h1 className="text-3xl font-black tracking-tight">Relatórios</h1>
          <p className={`mt-2 text-sm ${muted}`}>
            Acompanhe seus recebimentos, filtre por recebedor e período e exporte seus dados.
          </p>
        </div>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
        )}

        <section className={`mt-6 rounded-3xl border p-4 sm:p-5 ${card}`}>
          <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr_1fr]">
            <div>
              <p className={`mb-2 text-[11px] font-black uppercase tracking-wide ${faint}`}>Período</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                {([
                  ['today', 'Hoje'],
                  ['week', 'Semana'],
                  ['month', 'Mês'],
                  ['custom', 'Período'],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => applyPeriod(key)}
                    className={`rounded-xl border px-3 py-2.5 text-xs font-black transition ${
                      period === key ? 'border-emerald-500 bg-emerald-500 text-slate-950' : card
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className={`text-[11px] font-black uppercase tracking-wide ${faint}`}>Empresa</span>
              <select value={companyId} onChange={event => setCompanyId(event.target.value)} className={`mt-2 w-full appearance-none rounded-xl border px-3 py-3 text-sm outline-none ${input}`} style={{ colorScheme: isDark ? "dark" : "light" }}>
                <option value="all">Todas as empresas</option>
                {companies.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>

            <label className="block">
              <span className={`text-[11px] font-black uppercase tracking-wide ${faint}`}>Origem</span>
              <select value={source} onChange={event => setSource(event.target.value as SourceKey)} className={`mt-2 w-full appearance-none rounded-xl border px-3 py-3 text-sm outline-none ${input}`} style={{ colorScheme: isDark ? "dark" : "light" }}>
                <option value="all">Chave Pix + Pix Link</option>
                <option value="pix_key">Chave Pix</option>
                <option value="pixwiki_link">Pix Link</option>
              </select>
            </label>
          </div>

          {period === 'custom' && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className={`text-[11px] font-black uppercase tracking-wide ${faint}`}>De</span>
                <input type="date" value={startDate} max={endDate} onChange={event => setStartDate(event.target.value)} className={`mt-2 w-full rounded-xl border px-3 py-3 text-sm outline-none ${input}`} />
              </label>
              <label className="block">
                <span className={`text-[11px] font-black uppercase tracking-wide ${faint}`}>Até</span>
                <input type="date" value={endDate} min={startDate} max={today} onChange={event => setEndDate(event.target.value)} className={`mt-2 w-full rounded-xl border px-3 py-3 text-sm outline-none ${input}`} />
              </label>
            </div>
          )}
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Pix recebidos', String(totals.count)],
            ['Bruto', money(totals.gross)],
            ['Tarifas', money(totals.fees)],
            ['Líquido', money(totals.net)],
          ].map(([label, value]) => (
            <div key={label} className={`rounded-2xl border p-5 ${card}`}>
              <p className={`text-xs font-semibold ${muted}`}>{label}</p>
              <p className="mt-2 text-2xl font-black tracking-tight">{reportLoading ? '…' : value}</p>
            </div>
          ))}
        </section>

        <section className={`mt-4 rounded-3xl border p-5 ${card}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black">Resumo por dia</h2>
              <p className={`mt-1 text-xs ${muted}`}>{formatDate(startDate)} a {formatDate(endDate)} · {companyName} · {sourceName}</p>
            </div>
            <div className="flex gap-2">
              <button disabled={rows.length === 0 || !!exporting} onClick={exportCsv} className={`rounded-xl border px-4 py-2.5 text-xs font-black disabled:opacity-40 ${card}`}>
                {exporting === 'csv' ? 'Gerando…' : 'Exportar CSV'}
              </button>
              <button disabled={rows.length === 0 || !!exporting} onClick={exportPdf} className="rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-black text-slate-950 disabled:opacity-40">
                {exporting === 'pdf' ? 'Gerando…' : 'Exportar PDF'}
              </button>
            </div>
          </div>

          {daily.length === 0 ? (
            <div className={`mt-5 rounded-2xl border p-8 text-center text-sm ${card} ${muted}`}>
              Nenhum Pix encontrado neste período.
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {daily.map(item => (
                <div key={item.date} className={`rounded-2xl border p-4 ${isDark ? 'border-white/10 bg-black/10' : 'border-black/10 bg-slate-50'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black">{item.date}</p>
                      <p className={`mt-0.5 text-xs ${muted}`}>{item.count} Pix</p>
                    </div>
                    <div className="flex gap-5 text-right text-xs">
                      <div><p className={faint}>Bruto</p><p className="mt-0.5 font-black">{money(item.gross)}</p></div>
                      <div><p className={faint}>Tarifas</p><p className="mt-0.5 font-black text-amber-400">{money(item.fees)}</p></div>
                      <div><p className={faint}>Líquido</p><p className="mt-0.5 font-black text-emerald-400">{money(item.net)}</p></div>
                    </div>
                  </div>
                  <div className={`mt-3 h-1.5 overflow-hidden rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(3, (item.gross / maxDailyGross) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={`mt-4 overflow-hidden rounded-3xl border ${card}`}>
          <div className="flex flex-col gap-1 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black">Detalhamento</h2>
              <p className={`text-xs ${muted}`}>{rows.length} recebimento(s)</p>
            </div>
            {rows.length > 300 && <p className={`text-[11px] ${faint}`}>Mostrando 300 na tela; CSV/PDF exportam todos.</p>}
          </div>

          {reportLoading ? (
            <div className="flex items-center justify-center p-12"><div className="h-7 w-7 animate-spin rounded-full border-2 border-white/15 border-t-emerald-400" /></div>
          ) : rows.length === 0 ? (
            <div className={`p-10 text-center text-sm ${muted}`}>Nenhum recebimento para exibir.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className={isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}>
                  <tr className={`text-[10px] font-black uppercase tracking-wide ${faint}`}>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Empresa</th>
                    <th className="px-4 py-3">Origem</th>
                    <th className="px-4 py-3 text-right">Bruto</th>
                    <th className="px-4 py-3 text-right">Tarifa</th>
                    <th className="px-4 py-3 text-right">Líquido</th>
                    <th className="px-4 py-3">ID MP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {rows.slice(0, 300).map(row => (
                    <tr key={row.id}>
                      <td className="whitespace-nowrap px-4 py-3 text-xs">{formatDateTime(row.received_at)}</td>
                      <td className="px-4 py-3 font-semibold">{row.company_name}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-[10px] font-black ${row.source === 'pixwiki_link' ? 'bg-sky-500/10 text-sky-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                          {sourceLabel(row.source)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold">{money(row.amount_cents)}</td>
                      <td className="px-4 py-3 text-right font-bold text-amber-400">{money(row.fee_amount_cents)}</td>
                      <td className="px-4 py-3 text-right font-black text-emerald-400">{money(row.net_amount_cents)}</td>
                      <td className={`px-4 py-3 font-mono text-[11px] ${muted}`}>{row.mp_payment_id || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className={`py-8 text-center text-xs ${faint}`}>PixWiki | Tecnologia minhAi | Desenvolvido por BigCorps</footer>
        <PixWikiDashboardNav dark={dark} />
      </div>
    </main>
  );
}
