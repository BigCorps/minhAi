'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Loader2,
  MessageCircle,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings2,
  ShieldCheck,
} from 'lucide-react';

import AdminHeader from './AdminHeader';
import type { AdminIdentity } from '@/types/platform-admin-business';

type Source = 'conviteia' | 'pixwiki' | 'minhai' | 'outros';

type Thread = {
  page_id: string;
  from_id: string;
  sender_name: string | null;
  source: Source;
  source_context: Record<string, any>;
  unread_count: number;
  last_message_text: string | null;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  last_auto_reply_at: string | null;
  last_read_at: string | null;
  created_at: string;
  updated_at: string;
};

type Msg = {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
};

type Settings = {
  id: string;
  company_id: string;
  whatsapp_number_id: string;
  support_number: string;
  auto_reply_text: string;
  auto_reply_enabled: boolean;
  window_hours: number;
  updated_at: string;
};

type Props = {
  admin: AdminIdentity;
  basePath: '' | '/admin';
};

const SOURCE_META: Record<Source, { label: string; className: string }> = {
  conviteia: { label: 'ConviteIA', className: 'border-pink-300/20 bg-pink-300/10 text-pink-200' },
  pixwiki: { label: 'PixWiki', className: 'border-emerald-300/20 bg-emerald-300/10 text-emerald-200' },
  minhai: { label: 'minhAi', className: 'border-lime-300/20 bg-lime-300/10 text-lime-200' },
  outros: { label: 'Outros', className: 'border-slate-300/20 bg-white/5 text-slate-300' },
};

function apiError(status: number, payload: any, fallback: string) {
  if (status === 401 || status === 403) return 'unauthorized';
  if (payload?.message) return String(payload.message);
  if (payload?.error === 'whatsapp_settings_not_configured') return 'A migration da caixa de WhatsApp ainda não foi aplicada.';
  if (payload?.error === 'whatsapp_inbox_unavailable' || payload?.error === 'whatsapp_settings_unavailable') {
    return 'A estrutura da caixa de WhatsApp ainda não está disponível no banco.';
  }
  return fallback;
}

function formatDate(value: string | null, withDate = false) {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  const sameDay = new Date().toDateString() === date.toDateString();
  return new Intl.DateTimeFormat('pt-BR', withDate || !sameDay
    ? { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }
    : { hour: '2-digit', minute: '2-digit' }
  ).format(date);
}

function displayPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  const br = digits.startsWith('55') ? digits.slice(2) : digits;
  if (br.length === 11) return `(${br.slice(0,2)}) ${br.slice(2,7)}-${br.slice(7)}`;
  if (br.length === 10) return `(${br.slice(0,2)}) ${br.slice(2,6)}-${br.slice(6)}`;
  return `+${digits}`;
}

function threadName(thread: Thread) {
  return thread.sender_name
    || thread.source_context?.contatoNome
    || thread.source_context?.companyName
    || displayPhone(thread.from_id);
}

function contextText(thread: Thread) {
  if (thread.source === 'conviteia') {
    const event = thread.source_context?.eventoLabel || thread.source_context?.eventoSlug;
    return event ? `Evento: ${event}` : 'ConviteIA';
  }
  if (thread.source === 'pixwiki') {
    const company = thread.source_context?.companyName || thread.source_context?.companySlug;
    return company ? `Conta: ${company}` : 'PixWiki';
  }
  return displayPhone(thread.from_id);
}

function cleanMessage(content: string) {
  if (content.startsWith('[Automática] ')) return { text: content.slice(13), tag: 'Automática' };
  if (content.startsWith('[Admin] ')) return { text: content.slice(8), tag: 'Admin' };
  return { text: content, tag: null };
}

export default function AdminWhatsAppInbox({ admin, basePath }: Props) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [summary, setSummary] = useState({ total: 0, unread: 0, conviteia: 0, pixwiki: 0, minhai: 0 });
  const [selected, setSelected] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [search, setSearch] = useState('');
  const [source, setSource] = useState<'all' | Source>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState({ enabled: true, windowHours: 24, supportNumber: '', autoReplyText: '' });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loginPath = `${basePath}/login`;
  const unauthorized = useCallback(() => window.location.assign(loginPath), [loginPath]);

  const loadSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/whatsapp/settings', { cache: 'no-store', credentials: 'same-origin' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const message = apiError(response.status, payload, 'Não foi possível carregar a configuração do WhatsApp.');
        if (message === 'unauthorized') return unauthorized();
        throw new Error(message);
      }
      setSettings(payload.data);
      setSettingsDraft({
        enabled: payload.data.auto_reply_enabled === true,
        windowHours: Number(payload.data.window_hours || 24),
        supportNumber: payload.data.support_number || '',
        autoReplyText: payload.data.auto_reply_text || '',
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar a configuração do WhatsApp.');
    }
  }, [unauthorized]);

  const loadThreads = useCallback(async (silent = false) => {
    if (!silent) setLoadingThreads(true);
    try {
      const params = new URLSearchParams();
      if (source !== 'all') params.set('source', source);
      if (unreadOnly) params.set('unread', '1');
      if (search.trim()) params.set('search', search.trim());
      const response = await fetch(`/api/admin/whatsapp/threads?${params.toString()}`, { cache: 'no-store', credentials: 'same-origin' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const message = apiError(response.status, payload, 'Não foi possível carregar as conversas.');
        if (message === 'unauthorized') return unauthorized();
        throw new Error(message);
      }
      setThreads(payload.data || []);
      setSummary(payload.summary || { total: 0, unread: 0, conviteia: 0, pixwiki: 0, minhai: 0 });
      if (selected) {
        const updated = (payload.data || []).find((t: Thread) => t.page_id === selected.page_id && t.from_id === selected.from_id);
        if (updated) setSelected(updated);
      }
      setError(null);
    } catch (e) {
      if (!silent) setError(e instanceof Error ? e.message : 'Não foi possível carregar as conversas.');
    } finally {
      if (!silent) setLoadingThreads(false);
    }
  }, [source, unreadOnly, search, selected?.page_id, selected?.from_id, unauthorized]);

  const loadMessages = useCallback(async (thread: Thread, silent = false) => {
    if (!silent) setLoadingMessages(true);
    try {
      const params = new URLSearchParams({ pageId: thread.page_id, fromId: thread.from_id });
      const response = await fetch(`/api/admin/whatsapp/messages?${params.toString()}`, { cache: 'no-store', credentials: 'same-origin' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const message = apiError(response.status, payload, 'Não foi possível carregar o histórico.');
        if (message === 'unauthorized') return unauthorized();
        throw new Error(message);
      }
      setMessages(payload.messages || []);
      setSelected(payload.thread || thread);
      setThreads((prev) => prev.map((t) => t.page_id === thread.page_id && t.from_id === thread.from_id ? { ...t, unread_count: 0 } : t));
      setSummary((prev) => ({ ...prev, unread: Math.max(0, prev.unread - (thread.unread_count > 0 ? 1 : 0)) }));
      requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: silent ? 'auto' : 'smooth' }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar o histórico.');
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  }, [unauthorized]);

  useEffect(() => { void loadSettings(); }, [loadSettings]);
  useEffect(() => {
    const timer = window.setTimeout(() => void loadThreads(), search ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [source, unreadOnly, search]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadThreads(true);
      if (selected) void loadMessages(selected, true);
    }, 8_000);
    return () => window.clearInterval(timer);
  }, [loadThreads, loadMessages, selected]);

  const filters = useMemo(() => [
    { key: 'all' as const, label: 'Todas' },
    { key: 'conviteia' as const, label: 'ConviteIA' },
    { key: 'pixwiki' as const, label: 'PixWiki' },
    { key: 'minhai' as const, label: 'minhAi' },
    { key: 'outros' as const, label: 'Outros' },
  ], []);

  async function sendMessage() {
    if (!selected || !text.trim() || sending) return;
    const message = text.trim();
    setSending(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/whatsapp/send', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId: selected.page_id, fromId: selected.from_id, message }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const msg = apiError(response.status, payload, 'Não foi possível enviar a mensagem.');
        if (msg === 'unauthorized') return unauthorized();
        throw new Error(msg);
      }
      setText('');
      await loadMessages(selected);
      void loadThreads(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível enviar a mensagem.');
    } finally {
      setSending(false);
    }
  }

  async function saveSettings() {
    setSavingSettings(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/whatsapp/settings', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsDraft),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const msg = apiError(response.status, payload, 'Não foi possível salvar as configurações.');
        if (msg === 'unauthorized') return unauthorized();
        throw new Error(msg);
      }
      setSettings(payload.data);
      setSettingsDraft({
        enabled: payload.data.auto_reply_enabled === true,
        windowHours: Number(payload.data.window_hours || 24),
        supportNumber: payload.data.support_number || '',
        autoReplyText: payload.data.auto_reply_text || '',
      });
      setSettingsOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar as configurações.');
    } finally {
      setSavingSettings(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <AdminHeader admin={admin} basePath={basePath} active="whatsapp" />

      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-lime-300">
              <MessageCircle className="h-4 w-4" />
              Caixa de entrada BigCorps
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">WhatsApp</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Veja e responda as mensagens recebidas pelo número compartilhado dos aplicativos BigCorps / minhAi. A IA fica pausada nestas conversas e somente a resposta automática configurada abaixo é enviada.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setSettingsOpen((v) => !v)} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-white/5">
              <Settings2 className="h-4 w-4" /> Configurações {settingsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            <button onClick={() => void loadThreads()} disabled={loadingThreads} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-white/5 disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${loadingThreads ? 'animate-spin' : ''}`} /> Atualizar
            </button>
          </div>
        </div>

        {error && <div className="mb-5 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">{error}</div>}

        <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="Conversas" value={summary.total} />
          <Metric label="Não lidas" value={summary.unread} accent />
          <Metric label="ConviteIA" value={summary.conviteia} />
          <Metric label="PixWiki" value={summary.pixwiki} />
          <Metric label="minhAi" value={summary.minhai} />
        </section>

        {settingsOpen && (
          <section className="mb-5 rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-bold">Resposta automática</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Enviada somente na primeira mensagem recebida dentro da janela configurada. As mensagens seguintes não repetem o aviso.
                </p>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-300">
                <input type="checkbox" checked={settingsDraft.enabled} onChange={(e) => setSettingsDraft((v) => ({ ...v, enabled: e.target.checked }))} className="h-4 w-4 accent-lime-300" />
                Ativa
              </label>
            </div>
            <div className="grid gap-4 lg:grid-cols-[220px_180px_minmax(0,1fr)]">
              <label className="text-xs font-bold text-slate-400">
                WhatsApp de suporte
                <input value={settingsDraft.supportNumber} onChange={(e) => setSettingsDraft((v) => ({ ...v, supportNumber: e.target.value }))} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-lime-300/40" />
              </label>
              <label className="text-xs font-bold text-slate-400">
                Repetir após
                <div className="mt-2 flex items-center gap-2">
                  <input type="number" min={1} max={168} value={settingsDraft.windowHours} onChange={(e) => setSettingsDraft((v) => ({ ...v, windowHours: Number(e.target.value) }))} className="w-24 rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-lime-300/40" />
                  <span className="text-sm text-slate-500">horas</span>
                </div>
              </label>
              <label className="text-xs font-bold text-slate-400">
                Mensagem
                <textarea rows={6} value={settingsDraft.autoReplyText} onChange={(e) => setSettingsDraft((v) => ({ ...v, autoReplyText: e.target.value }))} className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm leading-6 text-white outline-none focus:border-lime-300/40" />
              </label>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-[11px] text-slate-600">Número Meta: {settings?.whatsapp_number_id || '—'}</p>
              <button onClick={saveSettings} disabled={savingSettings} className="inline-flex items-center gap-2 rounded-xl bg-lime-300 px-4 py-2.5 text-sm font-black text-slate-950 transition hover:bg-lime-200 disabled:opacity-50">
                {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
              </button>
            </div>
          </section>
        )}

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025] lg:grid lg:h-[690px] lg:grid-cols-[390px_minmax(0,1fr)]">
          <aside className="border-b border-white/10 lg:border-b-0 lg:border-r">
            <div className="border-b border-white/10 p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nome, telefone ou mensagem" className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-700 focus:border-lime-300/30" />
              </div>
              <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {filters.map((item) => (
                  <button key={item.key} onClick={() => setSource(item.key)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition ${source === item.key ? 'bg-lime-300 text-slate-950' : 'bg-white/5 text-slate-500 hover:bg-white/10 hover:text-slate-300'}`}>{item.label}</button>
                ))}
                <button onClick={() => setUnreadOnly((v) => !v)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition ${unreadOnly ? 'bg-amber-300 text-slate-950' : 'bg-white/5 text-slate-500 hover:bg-white/10 hover:text-slate-300'}`}>Não lidas</button>
              </div>
            </div>

            <div className="max-h-[520px] overflow-y-auto lg:max-h-none lg:h-[605px]">
              {loadingThreads ? (
                <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-600" /></div>
              ) : threads.length === 0 ? (
                <div className="px-8 py-16 text-center text-sm leading-6 text-slate-600">Nenhuma conversa encontrada com estes filtros.</div>
              ) : threads.map((thread) => {
                const selectedNow = selected?.page_id === thread.page_id && selected?.from_id === thread.from_id;
                const meta = SOURCE_META[thread.source] || SOURCE_META.outros;
                return (
                  <button key={`${thread.page_id}:${thread.from_id}`} onClick={() => { setSelected(thread); void loadMessages(thread); }} className={`block w-full border-b border-white/[0.05] px-4 py-4 text-left transition ${selectedNow ? 'bg-white/[0.07]' : 'hover:bg-white/[0.035]'}`}>
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5 text-sm font-black text-slate-300">{threadName(thread).charAt(0).toUpperCase()}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-bold text-slate-200">{threadName(thread)}</p>
                          <span className="shrink-0 text-[10px] text-slate-700">{formatDate(thread.last_inbound_at || thread.updated_at)}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${meta.className}`}>{meta.label}</span>
                          <span className="truncate text-[10px] text-slate-600">{contextText(thread)}</span>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <p className="min-w-0 flex-1 truncate text-xs text-slate-500">{thread.last_message_text || 'Sem prévia'}</p>
                          {thread.unread_count > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-lime-300 px-1.5 text-[10px] font-black text-slate-950">{thread.unread_count}</span>}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="flex min-h-[540px] flex-col lg:min-h-0">
            {!selected ? (
              <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-lime-300/10 text-lime-300"><MessageCircle className="h-7 w-7" /></div>
                <h2 className="mt-4 text-lg font-black">Selecione uma conversa</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">As respostas recebidas pelo número dos aplicativos BigCorps aparecem aqui. Você pode acompanhar o histórico e responder manualmente quando necessário.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-sm font-black text-slate-100">{threadName(selected)}</h2>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${SOURCE_META[selected.source]?.className || SOURCE_META.outros.className}`}>{SOURCE_META[selected.source]?.label || 'Outros'}</span>
                    </div>
                    <p className="mt-1 truncate text-[11px] text-slate-600">{displayPhone(selected.from_id)} · {contextText(selected)}</p>
                  </div>
                  <div className="hidden items-center gap-2 text-[10px] text-slate-600 sm:flex"><ShieldCheck className="h-3.5 w-3.5 text-lime-300" /> IA pausada</div>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto bg-slate-950/40 p-4 sm:p-5">
                  {loadingMessages ? (
                    <div className="flex h-full items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-600" /></div>
                  ) : messages.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-slate-600">Nenhuma mensagem registrada.</div>
                  ) : messages.map((msg) => {
                    const cleaned = cleanMessage(msg.content);
                    const mine = msg.role !== 'user';
                    return (
                      <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[84%] rounded-2xl px-3.5 py-2.5 shadow-sm ${mine ? 'rounded-br-md bg-lime-300 text-slate-950' : 'rounded-bl-md border border-white/10 bg-white/[0.06] text-slate-200'}`}>
                          {cleaned.tag && <p className={`mb-1 text-[9px] font-black uppercase tracking-wider ${mine ? 'text-slate-700' : 'text-slate-500'}`}>{cleaned.tag}</p>}
                          <p className="whitespace-pre-wrap break-words text-sm leading-5">{cleaned.text}</p>
                          <div className={`mt-1 flex items-center justify-end gap-1 text-[9px] ${mine ? 'text-slate-700' : 'text-slate-600'}`}>
                            {formatDate(msg.created_at)} {mine && <CheckCheck className="h-3 w-3" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                <div className="border-t border-white/10 bg-slate-950/70 p-3 sm:p-4">
                  <div className="mb-2 flex items-center gap-2 text-[10px] text-slate-600"><Bell className="h-3.5 w-3.5" /> Respostas manuais livres dependem da janela de 24h aberta pelo contato.</div>
                  <div className="flex items-end gap-2">
                    <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }} rows={2} placeholder="Digite sua resposta..." className="min-h-[48px] flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-700 focus:border-lime-300/30" />
                    <button onClick={sendMessage} disabled={!text.trim() || sending} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-lime-300 text-slate-950 transition hover:bg-lime-200 disabled:opacity-40" title="Enviar">
                      {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <article className={`rounded-2xl border p-4 ${accent ? 'border-lime-300/20 bg-lime-300/[0.06]' : 'border-white/10 bg-white/[0.03]'}`}>
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-black ${accent ? 'text-lime-300' : 'text-white'}`}>{new Intl.NumberFormat('pt-BR').format(value || 0)}</p>
    </article>
  );
}
