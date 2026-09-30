'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import type { DatesSetArg, EventClickArg } from '@fullcalendar/core';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { CalendarDays, CheckCircle2, CircleDollarSign, Clock3, Filter, Loader2, MonitorSmartphone, RefreshCw, WifiOff } from 'lucide-react';
import { formatBrlCents, MIDIA_BRAND } from '@/lib/midia/constants';
import MidiaOfflineExportCard from '@/components/midia/MidiaOfflineExportCard';

export type MidiaScheduleScreen = {
  id: string;
  name: string;
  screenType: string;
  commercialMode: string;
  networkInventoryPercent: number;
  inventoryClass: string;
  status: string;
  locationName: string | null;
  city: string | null;
  state: string | null;
  timezone: string;
  ownPlaylistItems: number;
  activeMinutesPerDay: number;
  activeStartTime: string | null;
  activeEndTime: string | null;
  acceptingAds: boolean;
};

type ScheduleEvent = {
  id: string;
  campaignId: string;
  screenId: string;
  screenName: string;
  title: string;
  subtitle: string;
  plannedAt: string;
  windowEndAt: string;
  displaySeconds: number;
  status: string;
  playedAt: string | null;
  proofValidatedAt: string | null;
  publisherEarnedCents: number;
  campaignStatus: string | null;
  totalPriceCents: number;
};

type ScheduleResponse = {
  screens: MidiaScheduleScreen[];
  events: ScheduleEvent[];
  dailyStats: Record<string, { reservedSeconds: number; capacitySeconds: number; occupancyPercent: number; occurrences: number }>;
};

function localIso(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function statusMeta(status: string) {
  const key = String(status || '').toLowerCase();
  if (['played', 'delivered', 'completed'].includes(key)) return { label: 'Exibido', color: '#16a34a' };
  if (['missed', 'failed', 'expired'].includes(key)) return { label: 'Não exibido', color: '#64748b' };
  return { label: 'Programado', color: MIDIA_BRAND.red };
}

function occupancyLabel(value: number) {
  if (value >= 85) return 'Quase cheio';
  if (value >= 60) return 'Muito concorrido';
  if (value >= 35) return 'Concorrido';
  if (value >= 15) return 'Boa procura';
  return 'Livre';
}

export default function MidiaSchedulePanel() {
  const calendarRef = useRef<FullCalendar | null>(null);
  const [screenId, setScreenId] = useState('');
  const [data, setData] = useState<ScheduleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ScheduleEvent | null>(null);
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);

  const load = useCallback(async (from: string, to: string, nextScreenId = screenId) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ from, to });
      if (nextScreenId) qs.set('screenId', nextScreenId);
      const response = await fetch(`/api/midia/schedule?${qs.toString()}`, { cache: 'no-store' });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error || 'Não foi possível carregar a programação.');
      setData(json as ScheduleResponse);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível carregar a programação.');
    } finally {
      setLoading(false);
    }
  }, [screenId]);

  const onDatesSet = useCallback((arg: DatesSetArg) => {
    const from = localIso(arg.start);
    const end = new Date(arg.end.getTime() - 24 * 60 * 60 * 1000);
    const to = localIso(end);
    setRange({ from, to });
    void load(from, to);
  }, [load]);

  const changeScreen = (value: string) => {
    setScreenId(value);
    setSelected(null);
    if (range) void load(range.from, range.to, value);
  };

  const calendarEvents = useMemo(() => (data?.events ?? []).map((event) => {
    const meta = statusMeta(event.status);
    const start = new Date(event.plannedAt);
    const end = new Date(start.getTime() + Math.max(30, event.displaySeconds) * 1000);
    return {
      id: event.id,
      title: `${event.screenName} · ${event.title}`,
      start: event.plannedAt,
      end: end.toISOString(),
      backgroundColor: meta.color,
      borderColor: meta.color,
      extendedProps: { event },
    };
  }), [data?.events]);

  const selectedScreen = useMemo(() => {
    if (!data?.screens.length) return null;
    if (!screenId) return null;
    return data.screens.find((screen) => screen.id === screenId) ?? null;
  }, [data?.screens, screenId]);

  const today = localIso(new Date());
  const todayStats = data?.dailyStats?.[today];
  const totalOccurrences = data?.events.length ?? 0;
  const delivered = (data?.events ?? []).filter((item) => ['played', 'delivered', 'completed'].includes(String(item.status).toLowerCase())).length;

  const eventClick = (arg: EventClickArg) => {
    const item = arg.event.extendedProps.event as ScheduleEvent | undefined;
    if (item) setSelected(item);
  };

  return (
    <div className="mt-8 space-y-5">
      <section className="rounded-[28px] border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em]" style={{ color: MIDIA_BRAND.red }}>
              <CalendarDays className="h-4 w-4" /> Programação visual
            </div>
            <h2 className="mt-2 text-2xl font-black">Veja o que está programado em cada tela.</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Mês, semana e dia em uma única agenda. Os anúncios pagos aparecem no horário programado; suas mídias próprias continuam em rotação entre as campanhas.</p>
          </div>
          <label className="min-w-[250px] text-xs font-black uppercase tracking-wider text-slate-500">
            <span className="mb-2 flex items-center gap-2"><Filter className="h-4 w-4" /> Filtrar tela</span>
            <select value={screenId} onChange={(event) => changeScreen(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold normal-case tracking-normal text-slate-900">
              <option value="">Todas as telas</option>
              {(data?.screens ?? []).map((screen) => <option key={screen.id} value={screen.id}>{screen.name}{screen.locationName ? ` · ${screen.locationName}` : ''}</option>)}
            </select>
          </label>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MiniStat icon={<MonitorSmartphone className="h-5 w-5" />} label="Telas" value={String(screenId ? 1 : data?.screens.length ?? 0)} />
          <MiniStat icon={<CalendarDays className="h-5 w-5" />} label="Exibições no período" value={String(totalOccurrences)} />
          <MiniStat icon={<CheckCircle2 className="h-5 w-5" />} label="Já exibidas" value={String(delivered)} />
          <MiniStat icon={<Clock3 className="h-5 w-5" />} label="Hoje" value={todayStats ? `${todayStats.occupancyPercent}% ocupado` : 'Sem reservas'} />
        </div>

        {selectedScreen && (
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-slate-600">
            <span className="rounded-full bg-blue-50 px-3 py-2">{selectedScreen.ownPlaylistItems} mídia(s) própria(s) em rotação</span>
            <span className="rounded-full bg-slate-100 px-3 py-2">{selectedScreen.networkInventoryPercent}% reservado à rede</span>
            <span className="rounded-full bg-slate-100 px-3 py-2">Fuso: {selectedScreen.timezone}</span>
          </div>
        )}
      </section>

      <section className="relative overflow-hidden rounded-[28px] border border-blue-100 bg-white p-3 shadow-sm sm:p-5">
        {loading && <div className="pointer-events-none absolute right-5 top-5 z-10 inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-xs font-black text-slate-500 shadow"><Loader2 className="h-4 w-4 animate-spin" /> Atualizando</div>}
        {error && <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700"><span>{error}</span><button onClick={() => range && void load(range.from, range.to)} className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-2"><RefreshCw className="h-4 w-4" /> Tentar</button></div>}

        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale={ptBrLocale}
          firstDay={0}
          height="auto"
          events={calendarEvents}
          datesSet={onDatesSet}
          eventClick={eventClick}
          nowIndicator
          allDaySlot={false}
          slotMinTime="06:00:00"
          slotMaxTime="24:00:00"
          slotDuration="00:30:00"
          eventMinHeight={22}
          dayMaxEvents={4}
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek' }}
          buttonText={{ today: 'Hoje', month: 'Mês', week: 'Semana', day: 'Dia', list: 'Lista' }}
          dayCellDidMount={(arg) => {
            const key = localIso(arg.date);
            const stat = data?.dailyStats?.[key];
            if (!stat) return;
            const pct = stat.occupancyPercent;
            const tint = pct >= 85 ? 'rgba(234,13,22,.09)' : pct >= 60 ? 'rgba(249,115,22,.08)' : pct >= 35 ? 'rgba(234,179,8,.08)' : pct >= 15 ? 'rgba(59,130,246,.06)' : 'transparent';
            arg.el.style.background = tint;
            arg.el.title = `${occupancyLabel(pct)} · ${pct}% do inventário reservado`;
          }}
        />

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-4 text-[11px] font-bold text-slate-500">
          <Legend color="#16a34a" label="Exibido" />
          <Legend color={MIDIA_BRAND.red} label="Programado" />
          <Legend color="#64748b" label="Não exibido" />
          <span className="ml-auto">O fundo dos dias fica mais forte conforme a ocupação aumenta.</span>
        </div>
      </section>

      <MidiaOfflineExportCard screens={data?.screens ?? []} initialScreenId={screenId} />

      {selected && (
        <section className="rounded-[24px] border border-blue-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-wider" style={{ color: statusMeta(selected.status).color }}>{statusMeta(selected.status).label}</div>
              <h3 className="mt-1 text-xl font-black">{selected.title}</h3>
              <p className="mt-1 text-sm font-bold text-slate-400">{selected.screenName} · {selected.subtitle}</p>
            </div>
            <button onClick={() => setSelected(null)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-500">Fechar</button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Detail label="Horário" value={new Date(selected.plannedAt).toLocaleString('pt-BR')} />
            <Detail label="Duração" value={`${selected.displaySeconds}s`} />
            <Detail label="Valor da campanha" value={formatBrlCents(selected.totalPriceCents)} />
            <Detail label="Sua participação liberada" value={formatBrlCents(selected.publisherEarnedCents)} />
          </div>
          {!selected.proofValidatedAt && ['played', 'delivered'].includes(String(selected.status).toLowerCase()) === false && (
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-800"><WifiOff className="mt-0.5 h-4 w-4 shrink-0" /> Em player offline, a confirmação da exibição só chega ao painel depois que o dispositivo reconectar.</div>
          )}
        </section>
      )}

      <style jsx global>{`
        .fc { --fc-border-color: #e6ecf6; --fc-button-bg-color: #003295; --fc-button-border-color: #003295; --fc-button-hover-bg-color: #002979; --fc-button-active-bg-color: #001f5f; font-family: inherit; }
        .fc .fc-toolbar { gap: 10px; flex-wrap: wrap; }
        .fc .fc-toolbar-title { font-size: 1.15rem; font-weight: 900; color: #0f172a; }
        .fc .fc-button { border-radius: 10px; font-weight: 800; box-shadow: none !important; text-transform: none; }
        .fc .fc-col-header-cell-cushion, .fc .fc-daygrid-day-number { color: #475569; font-weight: 800; }
        .fc .fc-daygrid-event { border-radius: 7px; padding: 2px 4px; font-weight: 800; }
        .fc .fc-timegrid-event { border-radius: 7px; font-weight: 800; }
        @media (max-width: 720px) {
          .fc .fc-toolbar { align-items: stretch; }
          .fc .fc-toolbar-chunk { display: flex; justify-content: center; flex-wrap: wrap; }
          .fc .fc-toolbar-title { font-size: 1rem; }
          .fc .fc-button { font-size: .72rem; padding: .45rem .6rem; }
        }
      `}</style>
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><div className="flex items-center gap-2 text-slate-400">{icon}<span className="text-[10px] font-black uppercase tracking-wider">{label}</span></div><div className="mt-2 text-xl font-black text-slate-950">{value}</div></div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-slate-50 p-4"><div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</div><div className="mt-1 text-sm font-black text-slate-900">{value}</div></div>;
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />{label}</span>;
}
