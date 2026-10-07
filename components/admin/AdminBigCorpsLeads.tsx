'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MessageCircle,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import type { AdminIdentity } from '@/types/platform-admin-business';
import type { LeadPriority, LeadStatus } from '@/lib/bigcorps-leads';
import AdminHeader from './AdminHeader';

type Lead = {
  id: string;
  created_at: string;
  nome: string;
  empresa: string;
  whatsapp: string;
  email: string | null;
  cidade: string | null;
  uf: string | null;
  melhor_horario: string | null;
  tipo_empresa: string;
  segmento: string;
  porte: string;
  tempo_empresa: string;
  faturamento_faixa: string;
  areas: string[];
  respostas: {
    sintomas?: Record<string, 'sim' | 'as_vezes' | 'nao'>;
    gestao?: string[];
    prioridade_score?: number;
    sintomas_sim?: number;
  } | null;
  areas_prioritarias: string[];
  prioridade: LeadPriority;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  fbclid: string | null;
  fbc: string | null;
  fbp: string | null;
  user_agent: string | null;
  consentimento_em: string;
  consentimento_texto: string;
  status: LeadStatus;
  notas: string | null;
};

type Props = { admin: AdminIdentity; basePath: '' | '/admin' };
type Payload = {
  items: Lead[];
  pagination: { page: number; perPage: number; total: number; totalPages: number };
};

const STATUS_LABEL: Record<LeadStatus, string> = {
  novo: 'Novo',
  contatado: 'Contatado',
  proposta: 'Proposta',
  cliente: 'Cliente',
  descartado: 'Descartado',
};

const PRIORITY_LABEL: Record<LeadPriority, string> = {
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
};

function fmtDate(value: string) {
  try {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return value;
  }
}

function waHref(phone: string) {
  const digits = phone.replace(/\D/g, '');
  const normalized = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${normalized}`;
}

function priorityClass(priority: LeadPriority) {
  if (priority === 'alta') return 'border-orange-400/30 bg-orange-400/10 text-orange-200';
  if (priority === 'media') return 'border-amber-300/25 bg-amber-300/10 text-amber-100';
  return 'border-slate-500/25 bg-slate-500/10 text-slate-300';
}

function answerLabel(value: string) {
  if (value === 'sim') return 'Sim';
  if (value === 'as_vezes') return 'Às vezes';
  if (value === 'nao') return 'Não';
  return value;
}

export default function AdminBigCorpsLeads({ admin, basePath }: Props) {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [notes, setNotes] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus>('novo');
  const [saving, setSaving] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), perPage: '25' });
    if (search.trim()) params.set('search', search.trim());
    if (status) params.set('status', status);
    if (priority) params.set('prioridade', priority);
    return params.toString();
  }, [page, priority, search, status]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/bigcorps-leads?${query}`, { cache: 'no-store', credentials: 'same-origin' });
      if (response.status === 401 || response.status === 403) {
        window.location.assign(`${basePath}/login`);
        return;
      }
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.ok) throw new Error('Não foi possível carregar os Leads BigCorps.');
      setData(json.data as Payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar leads.');
    } finally {
      setLoading(false);
    }
  }, [basePath, query]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, search]);

  useEffect(() => setPage(1), [status, priority]);

  const openLead = (lead: Lead) => {
    setSelected(lead);
    setNotes(lead.notas || '');
    setSelectedStatus(lead.status);
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/admin/bigcorps-leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ id: selected.id, status: selectedStatus, notas: notes }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.ok) throw new Error('Não foi possível salvar o lead.');
      setSelected(json.lead as Lead);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao salvar o lead.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <AdminHeader admin={admin} basePath={basePath} active="bigcorps-leads" />
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-[#FD9219]">BigCorps</p>
            <h1 className="mt-2 text-3xl font-black">Leads BigCorps</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Diagnósticos gratuitos de ajuda.bigcorps.com.br, com origem do anúncio, prioridade e respostas completas.
            </p>
          </div>
          <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-slate-300 hover:bg-white/5 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </button>
        </div>

        {error && <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100">{error}</div>}

        <section className="mt-6 grid gap-3 rounded-3xl border border-white/10 bg-white/[.035] p-4 md:grid-cols-[1.5fr_.7fr_.7fr]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Nome, empresa, WhatsApp, e-mail ou cidade" className="min-h-12 w-full rounded-xl border border-white/10 bg-slate-950/70 py-3 pl-9 pr-3 text-sm outline-none placeholder:text-slate-700 focus:border-orange-400/40" />
          </label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="min-h-12 rounded-xl border border-white/10 bg-slate-950/70 px-3 text-sm outline-none">
            <option value="">Todos os status</option>
            {Object.entries(STATUS_LABEL).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="min-h-12 rounded-xl border border-white/10 bg-slate-950/70 px-3 text-sm outline-none">
            <option value="">Todas as prioridades</option>
            {Object.entries(PRIORITY_LABEL).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </section>

        <section className="mt-5 overflow-hidden rounded-3xl border border-white/10 bg-white/[.035]">
          <div className="flex items-center justify-between border-b border-white/[.06] px-5 py-4">
            <div>
              <h2 className="font-black">Diagnósticos</h2>
              <p className="mt-1 text-xs text-slate-600">{data ? `${data.pagination.total} lead(s)` : 'Carregando…'}</p>
            </div>
          </div>

          {loading && !data ? (
            <div className="p-10 text-center text-sm text-slate-500">Carregando leads…</div>
          ) : !data?.items.length ? (
            <div className="p-10 text-center text-sm text-slate-500">Nenhum lead encontrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-left text-sm">
                <thead className="bg-white/[.025] text-[10px] font-black uppercase tracking-[.12em] text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Lead</th><th className="px-4 py-3">Prioridade</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Perfil</th><th className="px-4 py-3">Prioridades</th><th className="px-4 py-3">Origem</th><th className="px-4 py-3">Criado</th><th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[.06]">
                  {data.items.map((lead) => (
                    <tr key={lead.id} className="hover:bg-white/[.02]">
                      <td className="px-4 py-4"><p className="font-bold text-slate-100">{lead.nome}</p><p className="mt-1 text-xs text-slate-500">{lead.empresa}</p><p className="mt-1 text-[11px] text-slate-700">{lead.whatsapp}</p></td>
                      <td className="px-4 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${priorityClass(lead.prioridade)}`}>{PRIORITY_LABEL[lead.prioridade]}</span></td>
                      <td className="px-4 py-4"><span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold text-slate-300">{STATUS_LABEL[lead.status]}</span></td>
                      <td className="px-4 py-4"><p className="font-semibold text-slate-300">{lead.segmento}</p><p className="mt-1 text-xs text-slate-600">{lead.porte} · {lead.faturamento_faixa}</p></td>
                      <td className="px-4 py-4"><p className="max-w-[260px] text-xs leading-5 text-slate-400">{lead.areas_prioritarias.join(' · ')}</p></td>
                      <td className="px-4 py-4"><p className="text-xs font-semibold text-slate-300">{lead.utm_source || 'direto'}</p><p className="mt-1 text-[11px] text-slate-600">{lead.utm_campaign || 'sem campanha'}</p></td>
                      <td className="px-4 py-4 text-xs text-slate-500">{fmtDate(lead.created_at)}</td>
                      <td className="px-4 py-4 text-right"><button onClick={() => openLead(lead)} className="min-h-10 rounded-xl border border-white/10 px-3 text-xs font-bold hover:bg-white/5">Ver detalhes</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-white/[.06] px-5 py-4">
              <button disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-white/10 px-3 text-xs font-bold disabled:opacity-30"><ChevronLeft className="h-4 w-4" />Anterior</button>
              <p className="text-xs text-slate-600">Página {data.pagination.page} de {data.pagination.totalPages}</p>
              <button disabled={page >= data.pagination.totalPages || loading} onClick={() => setPage((p) => p + 1)} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-white/10 px-3 text-xs font-bold disabled:opacity-30">Próxima<ChevronRight className="h-4 w-4" /></button>
            </div>
          )}
        </section>
      </div>

      {selected && (
        <div className="fixed inset-0 z-[70] flex justify-end bg-black/65" onMouseDown={(e) => { if (e.currentTarget === e.target) setSelected(null); }}>
          <aside className="h-full w-full max-w-2xl overflow-y-auto border-l border-white/10 bg-slate-950 p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0"><p className="text-xs font-black uppercase tracking-[.16em] text-[#FD9219]">Lead BigCorps</p><h2 className="mt-2 truncate text-2xl font-black">{selected.nome}</h2><p className="mt-1 text-sm text-slate-400">{selected.empresa}</p></div>
              <button onClick={() => setSelected(null)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 text-slate-400 hover:bg-white/5"><X className="h-5 w-5" /></button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Info label="WhatsApp" value={selected.whatsapp} />
              <Info label="E-mail" value={selected.email || '—'} />
              <Info label="Cidade" value={[selected.cidade, selected.uf].filter(Boolean).join(' / ') || '—'} />
              <Info label="Melhor horário" value={selected.melhor_horario || '—'} />
            </div>

            <a href={waHref(selected.whatsapp)} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-black text-slate-950 hover:brightness-105"><MessageCircle className="h-4 w-4" />Abrir WhatsApp<ExternalLink className="h-3.5 w-3.5" /></a>

            <DetailSection title="Perfil da empresa">
              <div className="grid gap-3 sm:grid-cols-2"><Info label="Tipo" value={selected.tipo_empresa} /><Info label="Segmento" value={selected.segmento} /><Info label="Porte" value={selected.porte} /><Info label="Tempo de empresa" value={selected.tempo_empresa} /><Info label="Faturamento" value={selected.faturamento_faixa} /><Info label="Score comercial" value={String(selected.respostas?.prioridade_score ?? '—')} /></div>
            </DetailSection>

            <DetailSection title="Diagnóstico">
              <p className="text-xs font-bold uppercase tracking-[.12em] text-slate-600">Áreas marcadas</p><p className="mt-2 text-sm leading-6 text-slate-300">{selected.areas.join(' · ')}</p>
              <p className="mt-5 text-xs font-bold uppercase tracking-[.12em] text-slate-600">3 prioridades</p><p className="mt-2 text-sm leading-6 font-bold text-orange-200">{selected.areas_prioritarias.join(' · ')}</p>
              <div className="mt-5 space-y-2">{Object.entries(selected.respostas?.sintomas || {}).map(([area, answer]) => <div key={area} className="flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-white/[.025] px-3 py-2.5"><span className="text-sm text-slate-300">{area}</span><span className="shrink-0 text-xs font-black text-orange-200">{answerLabel(answer)}</span></div>)}</div>
              <p className="mt-5 text-xs font-bold uppercase tracking-[.12em] text-slate-600">Gestão atual</p><p className="mt-2 text-sm text-slate-300">{selected.respostas?.gestao?.join(' · ') || '—'}</p>
            </DetailSection>

            <DetailSection title="Aquisição e medição">
              <div className="grid gap-3 sm:grid-cols-2"><Info label="UTM source" value={selected.utm_source || '—'} /><Info label="UTM medium" value={selected.utm_medium || '—'} /><Info label="UTM campaign" value={selected.utm_campaign || '—'} /><Info label="UTM content" value={selected.utm_content || '—'} /><Info label="fbclid" value={selected.fbclid || '—'} /><Info label="fbc / fbp" value={[selected.fbc, selected.fbp].filter(Boolean).join(' / ') || '—'} /></div>
              <div className="mt-4"><Info label="User agent" value={selected.user_agent || '—'} /></div>
            </DetailSection>

            <DetailSection title="Consentimento">
              <p className="text-sm leading-6 text-slate-300">{selected.consentimento_texto}</p><p className="mt-2 text-xs text-slate-600">Registrado em {fmtDate(selected.consentimento_em)}</p>
            </DetailSection>

            <DetailSection title="Acompanhamento comercial">
              <label className="block text-xs font-bold uppercase tracking-[.12em] text-slate-500">Status</label>
              <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as LeadStatus)} className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm outline-none">
                {Object.entries(STATUS_LABEL).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
              <label className="mt-4 block text-xs font-bold uppercase tracking-[.12em] text-slate-500">Notas</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={6} maxLength={5000} placeholder="Registre contato, proposta, próximos passos…" className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-sm leading-6 outline-none placeholder:text-slate-700" />
              <button onClick={() => void save()} disabled={saving} className="mt-4 min-h-12 w-full rounded-xl bg-[#FD9219] px-4 text-sm font-black text-slate-950 hover:brightness-105 disabled:opacity-50">{saving ? 'Salvando…' : 'Salvar status e notas'}</button>
            </DetailSection>

            <p className="mt-6 break-all text-[10px] text-slate-800">ID: {selected.id}</p>
          </aside>
        </div>
      )}
    </main>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-6 rounded-2xl border border-white/10 bg-white/[.025] p-4"><h3 className="mb-4 flex items-center gap-2 font-black"><Building2 className="h-4 w-4 text-[#FD9219]" />{title}</h3>{children}</section>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[.12em] text-slate-600">{label}</p><p className="mt-1 break-words text-sm text-slate-300">{value}</p></div>;
}
