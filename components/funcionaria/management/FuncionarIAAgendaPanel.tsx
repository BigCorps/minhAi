'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock, ExternalLink, Loader2, Plus, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import CreateEventModal from '@/components/assistant/CreateEventModal';

type Props = { companyId: string };

type GoogleAccount = {
  id: string;
  google_email: string;
  is_active: boolean;
};

type CalendarEvent = {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  location?: string;
};

function formatDate(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function FuncionarIAAgendaPanel({ companyId }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const popupRef = useRef<Window | null>(null);
  const [account, setAccount] = useState<GoogleAccount | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const { data: googleAccount, error: accountError } = await supabase
        .from('google_accounts')
        .select('id,google_email,is_active')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .maybeSingle();
      if (accountError && accountError.code !== 'PGRST116') throw accountError;
      setAccount(googleAccount || null);
      if (!googleAccount) {
        setEvents([]);
        return;
      }

      const now = new Date();
      const max = new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000);
      const { data, error: eventsError } = await supabase.functions.invoke('listar-eventos-google', {
        body: {
          company_id: companyId,
          max_results: 100,
          time_min: now.toISOString(),
          time_max: max.toISOString(),
        },
      });
      if (eventsError) throw eventsError;
      const incoming = Array.isArray(data?.events) ? data.events : [];
      incoming.sort((a: CalendarEvent, b: CalendarEvent) => {
        const aa = new Date(a.start?.dateTime || a.start?.date || 0).getTime();
        const bb = new Date(b.start?.dateTime || b.start?.date || 0).getTime();
        return aa - bb;
      });
      setEvents(incoming);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível carregar a agenda.');
    } finally {
      setLoading(false);
    }
  }, [companyId, supabase]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event?.data?.type === 'google-auth-success') {
        popupRef.current?.close();
        popupRef.current = null;
        setConnecting(false);
        window.setTimeout(() => void load(), 800);
      }
      if (event?.data?.type === 'google-auth-error' || event?.data?.type === 'google-auth-cancelled') {
        popupRef.current?.close();
        popupRef.current = null;
        setConnecting(false);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [load]);

  async function connectGoogle() {
    setConnecting(true);
    setError(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('google-auth-url', {
        body: { company_id: companyId },
      });
      if (invokeError || !data?.auth_url) throw invokeError || new Error('URL de conexão não retornada.');
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      popupRef.current = window.open(
        data.auth_url,
        'Google Authorization',
        `width=${width},height=${height},left=${left},top=${top}`,
      );
      if (!popupRef.current) throw new Error('Permita pop-ups para conectar a agenda Google.');

      const timer = window.setInterval(async () => {
        if (!popupRef.current || popupRef.current.closed) {
          window.clearInterval(timer);
          popupRef.current = null;
          setConnecting(false);
          await load();
        }
      }, 1500);
    } catch (err: any) {
      setConnecting(false);
      setError(err?.message || 'Não foi possível iniciar a conexão Google.');
    }
  }

  if (loading) {
    return <div className="flex min-h-52 items-center justify-center rounded-3xl border bg-white"><Loader2 className="h-6 w-6 animate-spin text-[#6D28D9]" /></div>;
  }

  if (!account) {
    return (
      <div className="rounded-3xl border border-violet-100 bg-white p-7 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-[#6D28D9]"><CalendarDays className="h-6 w-6" /></div>
        <h2 className="mt-4 text-xl font-black">Conecte sua Agenda Google</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">A habilidade Agenda & Reservas usa a mesma integração Google já existente na minhAi, mas sem exigir o plano Smart. Depois de conectar, a FuncionarIA pode consultar horários e criar compromissos conforme as permissões da habilidade.</p>
        {error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
        <button onClick={connectGoogle} disabled={connecting} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#6D28D9] px-5 py-3 text-sm font-black text-white disabled:opacity-60">
          {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
          {connecting ? 'Conectando…' : 'Conectar Agenda Google'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lime-50 text-lime-600"><CheckCircle2 className="h-5 w-5" /></div>
          <div><div className="font-black">Agenda conectada</div><div className="text-xs font-semibold text-slate-500">{account.google_email}</div></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-600 hover:bg-slate-50"><RefreshCw className="h-4 w-4" />Atualizar</button>
          <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#6D28D9] px-4 py-2.5 text-sm font-black text-white"><Plus className="h-4 w-4" />Novo agendamento</button>
        </div>
      </div>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div> : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-[#6D28D9]" /><h3 className="text-lg font-black">Próximos compromissos</h3></div>
        {events.length ? (
          <div className="mt-4 divide-y divide-slate-100">
            {events.slice(0, 30).map((event) => {
              const start = event.start?.dateTime || event.start?.date;
              return (
                <div key={event.id} className="flex items-start gap-3 py-3">
                  <div className="mt-0.5 rounded-xl bg-violet-50 p-2 text-[#6D28D9]"><Clock className="h-4 w-4" /></div>
                  <div className="min-w-0"><div className="truncate text-sm font-black text-slate-900">{event.summary || 'Compromisso'}</div><div className="mt-1 text-xs font-semibold text-slate-500">{formatDate(start)}</div>{event.location ? <div className="mt-1 truncate text-xs text-slate-400">{event.location}</div> : null}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl bg-slate-50 p-8 text-center text-sm font-semibold text-slate-400">Nenhum compromisso futuro encontrado.</div>
        )}
      </section>

      {showCreate ? (
        <CreateEventModal
          data={{ companyId, assistantType: 'smart' }}
          onClose={() => { setShowCreate(false); window.setTimeout(() => void load(), 500); }}
          theme="light"
        />
      ) : null}
    </div>
  );
}
