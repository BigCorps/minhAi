'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Headphones, Loader2, MessageCircle, Send, UserRound, X } from 'lucide-react';
import {
  resolveSupportProduct,
  SUPPORT_PRODUCTS,
  supportWidgetHidden,
  type SupportProduct,
} from '@/lib/support/product-context';

type Message = {
  id?: string;
  role: 'user' | 'assistant' | 'human' | 'system';
  content: string;
  created_at?: string;
};

export default function BigCorpsSupportWidget() {
  const [ready, setReady] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [open, setOpen] = useState(false);
  const [product, setProduct] = useState<SupportProduct>('other');
  const [token, setToken] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [humanRequested, setHumanRequested] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = window.location.hostname;
    const path = window.location.pathname;
    const p = resolveSupportProduct(host, path);
    setProduct(p);
    setHidden(supportWidgetHidden(host, path));
    const stored = window.localStorage.getItem(`bigcorps:support:${host}:${p}`) || '';
    setToken(stored);
    setReady(true);
  }, []);

  const info = SUPPORT_PRODUCTS[product];
  const storageKey = useMemo(
    () => (typeof window === 'undefined' ? '' : `bigcorps:support:${window.location.hostname}:${product}`),
    [product],
  );

  async function refresh(currentToken = token) {
    if (!currentToken) return;
    const r = await fetch(`/api/support?token=${encodeURIComponent(currentToken)}`, { cache: 'no-store' });
    if (!r.ok) return;
    const j = await r.json();
    if (!j?.ok) return;
    setMessages(j.data.messages || []);
    setHumanRequested(Boolean(j.data.thread?.humanRequested));
  }

  useEffect(() => {
    if (open && token) void refresh(token);
  }, [open, token]);

  useEffect(() => {
    if (!open || !token) return;
    const timer = window.setInterval(() => void refresh(token), 8000);
    return () => window.clearInterval(timer);
  }, [open, token]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [open, messages, busy]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const message = text.trim();
    if (!message || busy) return;
    setText('');
    setMessages((v) => [...v, { role: 'user', content: message }]);
    setBusy(true);
    try {
      const r = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token || undefined,
          message,
          path: window.location.pathname,
        }),
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || 'support_failed');
      if (j.data.token && j.data.token !== token) {
        setToken(j.data.token);
        window.localStorage.setItem(storageKey, j.data.token);
      }
      setMessages((v) => [...v, { role: 'assistant', content: j.data.reply }]);
      setHumanRequested(Boolean(j.data.humanRequested));
    } catch (err) {
      setMessages((v) => [
        ...v,
        { role: 'system', content: err instanceof Error && err.message === 'support_rate_limit'
          ? 'Muitas mensagens em pouco tempo. Tente novamente mais tarde.'
          : 'Não consegui enviar agora. Tente novamente em alguns instantes.' },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function human() {
    if (!token) {
      setText('Quero falar com uma pessoa da equipe.');
      return;
    }
    setBusy(true);
    try {
      const r = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'human', token }),
      });
      if (r.ok) setHumanRequested(true);
    } finally {
      setBusy(false);
    }
  }

  if (!ready || hidden) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[70] font-sans sm:bottom-6 sm:right-6">
      {open ? (
        <section className="mb-3 flex h-[min(70vh,560px)] w-[min(calc(100vw-2rem),380px)] flex-col overflow-hidden rounded-3xl border border-black/10 bg-white shadow-2xl">
          <header className="flex items-center justify-between px-4 py-3 text-slate-950" style={{ backgroundColor: info.accent }}>
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/70"><Headphones className="h-4 w-4" /></div>
              <div>
                <p className="text-sm font-black">Suporte {info.label}</p>
                <p className="text-[11px] font-semibold opacity-70">BigCorps</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-xl p-2 hover:bg-black/10" aria-label="Fechar suporte"><X className="h-4 w-4" /></button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
            {messages.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600">
                Olá! Como podemos ajudar com <strong>{info.label}</strong>? Não envie senhas, tokens ou dados completos de cartão.
              </div>
            ) : null}
            {messages.map((m, i) => (
              <div key={m.id || i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-5 ${
                  m.role === 'user'
                    ? 'bg-slate-900 text-white'
                    : m.role === 'human'
                      ? 'border border-emerald-200 bg-emerald-50 text-slate-700'
                      : m.role === 'system'
                        ? 'border border-amber-200 bg-amber-50 text-amber-900'
                        : 'border border-slate-200 bg-white text-slate-700'
                }`}>
                  {m.role === 'human' ? <div className="mb-1 flex items-center gap-1 text-[10px] font-black uppercase text-emerald-700"><UserRound className="h-3 w-3" />Equipe BigCorps</div> : null}
                  {m.content}
                </div>
              </div>
            ))}
            {busy ? <div className="flex items-center gap-2 text-xs text-slate-400"><Loader2 className="h-3.5 w-3.5 animate-spin" />Enviando...</div> : null}
            <div ref={endRef} />
          </div>

          <div className="border-t border-slate-200 bg-white p-3">
            {humanRequested ? (
              <p className="mb-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                Atendimento humano solicitado. A equipe pode continuar por esta conversa.
              </p>
            ) : (
              <button type="button" onClick={() => void human()} className="mb-2 text-xs font-bold text-slate-500 hover:text-slate-900">
                Falar com uma pessoa
              </button>
            )}
            <form onSubmit={send} className="flex gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={4000}
                placeholder="Digite sua mensagem..."
                className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400"
              />
              <button disabled={busy || !text.trim()} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-white disabled:opacity-40" aria-label="Enviar">
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </section>
      ) : null}

      <button
        onClick={() => setOpen((v) => !v)}
        className="grid h-14 w-14 place-items-center rounded-full text-slate-950 shadow-2xl transition hover:scale-105"
        style={{ backgroundColor: info.accent }}
        aria-label={open ? 'Fechar suporte' : `Abrir suporte ${info.label}`}
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}
