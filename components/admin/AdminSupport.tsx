'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, MessagesSquare, RefreshCw, Send, UserRound } from 'lucide-react';
import type { AdminIdentity } from '@/types/platform-admin-business';
import AdminHeader from './AdminHeader';

type Thread = {
  id: string;
  product: string;
  host: string;
  path: string | null;
  user_id: string | null;
  company_id: string | null;
  status: string;
  human_requested: boolean;
  last_message_at: string;
  created_at: string;
};

type Message = {
  id: string;
  role: 'user'|'assistant'|'human'|'system';
  source: string;
  content: string;
  created_at: string;
};

export default function AdminSupport({ admin, basePath }: { admin: AdminIdentity; basePath: ''|'/admin' }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [summary, setSummary] = useState({ total: 0, waiting: 0, open: 0 });
  const [selected, setSelected] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch('/api/admin/suporte', { cache: 'no-store' });
    if (r.status === 401 || r.status === 403) {
      window.location.assign(`${basePath}/login`);
      return;
    }
    const j = await r.json();
    if (!j?.ok) return;
    setThreads(j.data.threads || []);
    setSummary(j.data.summary || { total: 0, waiting: 0, open: 0 });
    setSelected((current) => current ? (j.data.threads || []).find((x: Thread) => x.id === current.id) || current : null);
  }, [basePath]);

  const loadThread = useCallback(async (id: string) => {
    const r = await fetch(`/api/admin/suporte?thread=${encodeURIComponent(id)}`, { cache: 'no-store' });
    const j = await r.json();
    if (j?.ok) {
      setSelected(j.data.thread || null);
      setMessages(j.data.messages || []);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      void load();
      if (selected?.id) void loadThread(selected.id);
    }, 10000);
    return () => window.clearInterval(timer);
  }, [load, loadThread, selected?.id]);

  const waiting = useMemo(() => threads.filter((t) => t.status === 'waiting_human'), [threads]);
  const others = useMemo(() => threads.filter((t) => t.status !== 'waiting_human'), [threads]);

  async function act(payload: Record<string, unknown>) {
    setBusy(true);
    try {
      const r = await fetch('/api/admin/suporte', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || 'Falha');
      await load();
      if (selected?.id) await loadThread(selected.id);
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!selected || !reply.trim()) return;
    const message = reply.trim();
    setReply('');
    await act({ action: 'reply', threadId: selected.id, message });
  }

  const ThreadButton = ({ thread }: { thread: Thread }) => (
    <button
      onClick={() => void loadThread(thread.id)}
      className={`w-full rounded-2xl border p-3 text-left transition ${selected?.id === thread.id ? 'border-lime-300/30 bg-lime-300/[.06]' : 'border-white/10 bg-white/[.025] hover:bg-white/[.05]'}`}
    >
      <div className="flex items-center justify-between gap-2">
        <strong className="truncate text-sm">{thread.product}</strong>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${thread.status === 'waiting_human' ? 'bg-amber-300/10 text-amber-200' : thread.status === 'resolved' ? 'bg-emerald-300/10 text-emerald-200' : 'bg-sky-300/10 text-sky-200'}`}>{thread.status}</span>
      </div>
      <p className="mt-1 truncate text-xs text-slate-500">{thread.host}{thread.path || ''}</p>
      <p className="mt-1 text-[11px] text-slate-700">{new Date(thread.last_message_at).toLocaleString('pt-BR')}</p>
    </button>
  );

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <AdminHeader admin={admin} basePath={basePath} active="support" />
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-lime-300">Atendimento compartilhado</p>
            <h1 className="mt-2 text-3xl font-black">Suporte BigCorps</h1>
            <p className="mt-2 text-sm text-slate-400">Threads abertas pelo widget dos produtos. Respostas humanas aparecem no mesmo widget.</p>
          </div>
          <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-bold"><RefreshCw className="h-4 w-4" />Atualizar</button>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><p className="text-xs text-slate-500">Total recente</p><strong className="mt-1 block text-2xl">{summary.total}</strong></div>
          <div className="rounded-2xl border border-amber-300/15 bg-amber-300/[.04] p-4"><p className="text-xs text-amber-200/70">Aguardando humano</p><strong className="mt-1 block text-2xl text-amber-100">{summary.waiting}</strong></div>
          <div className="rounded-2xl border border-sky-300/15 bg-sky-300/[.04] p-4"><p className="text-xs text-sky-200/70">Abertas</p><strong className="mt-1 block text-2xl text-sky-100">{summary.open}</strong></div>
        </div>

        <div className="grid min-h-[620px] gap-4 lg:grid-cols-[360px_1fr]">
          <aside className="space-y-4 overflow-y-auto rounded-3xl border border-white/10 bg-white/[.02] p-3">
            {waiting.length ? <div><p className="mb-2 px-1 text-[11px] font-black uppercase tracking-wider text-amber-200">Aguardando equipe</p><div className="space-y-2">{waiting.map((t) => <ThreadButton key={t.id} thread={t} />)}</div></div> : null}
            <div><p className="mb-2 px-1 text-[11px] font-black uppercase tracking-wider text-slate-600">Demais conversas</p><div className="space-y-2">{others.map((t) => <ThreadButton key={t.id} thread={t} />)}</div></div>
          </aside>

          <section className="flex min-h-0 flex-col rounded-3xl border border-white/10 bg-white/[.02]">
            {!selected ? (
              <div className="grid flex-1 place-items-center p-10 text-center text-slate-600"><div><MessagesSquare className="mx-auto h-10 w-10" /><p className="mt-3 font-bold">Selecione uma conversa</p></div></div>
            ) : (
              <>
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4">
                  <div>
                    <p className="font-black">{selected.product} · {selected.host}</p>
                    <p className="mt-1 text-xs text-slate-600">{selected.path || '/'}{selected.user_id ? ' · usuário identificado' : ' · visitante'}</p>
                  </div>
                  <button disabled={busy} onClick={() => void act({ action: selected.status === 'resolved' ? 'reopen' : 'resolve', threadId: selected.id })} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold">
                    <CheckCircle2 className="h-4 w-4" />{selected.status === 'resolved' ? 'Reabrir' : 'Resolver'}
                  </button>
                </header>

                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  {messages.map((m) => (
                    <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6 ${m.role === 'user' ? 'bg-slate-800' : m.role === 'human' ? 'border border-emerald-300/15 bg-emerald-300/[.05]' : 'border border-white/10 bg-white/[.035]'}`}>
                        {m.role === 'human' ? <div className="mb-1 flex items-center gap-1 text-[10px] font-black uppercase text-emerald-300"><UserRound className="h-3 w-3" />Equipe</div> : null}
                        {m.content}
                      </div>
                    </div>
                  ))}
                </div>

                <form onSubmit={submit} className="flex gap-2 border-t border-white/10 p-4">
                  <input value={reply} onChange={(e) => setReply(e.target.value)} maxLength={4000} placeholder="Responder como equipe BigCorps..." className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm outline-none focus:border-lime-300/30" />
                  <button disabled={busy || !reply.trim()} className="grid h-10 w-10 place-items-center rounded-xl bg-lime-300 text-slate-950 disabled:opacity-40"><Send className="h-4 w-4" /></button>
                </form>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
