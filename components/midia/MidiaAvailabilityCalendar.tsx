'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Flame,
  Loader2,
} from 'lucide-react';
import { MIDIA_BRAND } from '@/lib/midia/constants';

type DayInfo = {
  date: string;
  occupancyPercent: number;
  level: 'free' | 'light' | 'medium' | 'high' | 'very_high';
  label: string;
  available: boolean;
};

type CalendarData = {
  minDate: string;
  maxDate: string;
  timezone: string;
  days: DayInfo[];
};

type Props = {
  slug: string;
  code: string;
  value: string;
  minDate: string;
  maxDate: string;
  campaignDays?: number;
  onChange: (date: string) => void;
};

const week = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];

function parseIso(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toIso(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(value: string, amount: number) {
  const date = parseIso(value);
  date.setDate(date.getDate() + amount);
  return toIso(date);
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
    .format(date)
    .replace(/^./, (char) => char.toUpperCase());
}

function demandClass(level?: DayInfo['level']) {
  if (level === 'very_high') return 'border-red-300 bg-red-50 text-red-800';
  if (level === 'high') return 'border-orange-300 bg-orange-50 text-orange-800';
  if (level === 'medium') return 'border-amber-200 bg-amber-50 text-amber-800';
  if (level === 'light') return 'border-blue-200 bg-blue-50 text-blue-800';
  return 'border-slate-200 bg-white text-slate-700';
}

function dotClass(level?: DayInfo['level']) {
  if (level === 'very_high') return 'bg-red-600';
  if (level === 'high') return 'bg-orange-500';
  if (level === 'medium') return 'bg-amber-400';
  if (level === 'light') return 'bg-blue-400';
  return 'bg-emerald-400';
}

export default function MidiaAvailabilityCalendar({
  slug,
  code,
  value,
  minDate,
  maxDate,
  campaignDays = 1,
  onChange,
}: Props) {
  const initial = value ? parseIso(value) : parseIso(minDate);
  const [cursor, setCursor] = useState(() => new Date(initial.getFullYear(), initial.getMonth(), 1));
  const [data, setData] = useState<CalendarData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/midia/public/calendar?slug=${encodeURIComponent(slug)}&code=${encodeURIComponent(code)}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        const json = await response.json().catch(() => null);
        if (!response.ok) throw new Error(json?.error || 'Não foi possível carregar a agenda.');
        setData(json as CalendarData);
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') setError(err?.message || 'Não foi possível carregar a agenda.');
      });

    return () => controller.abort();
  }, [slug, code]);

  useEffect(() => {
    if (!value) return;
    const selected = parseIso(value);
    setCursor(new Date(selected.getFullYear(), selected.getMonth(), 1));
  }, [value]);

  const dayMap = useMemo(
    () => new Map((data?.days ?? []).map((day) => [day.date, day])),
    [data?.days],
  );

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const mondayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
  const cells: Array<number | null> = [
    ...Array.from({ length: mondayIndex }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  while (cells.length % 7) cells.push(null);

  const selectedUntil = value && campaignDays > 1 ? addDays(value, campaignDays - 1) : value;
  const selectedInfo = value ? dayMap.get(value) : null;

  const previousMonth = new Date(year, month - 1, 1);
  const nextMonth = new Date(year, month + 1, 1);
  const previousMonthLast = toIso(new Date(year, month, 0));
  const nextMonthFirst = toIso(nextMonth);
  const canPrevious = previousMonthLast >= minDate;
  const canNext = nextMonthFirst <= maxDate;

  return (
    <div className="rounded-3xl border border-blue-100 bg-[#FBFCFF] p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-black text-slate-800">
            <CalendarDays className="h-5 w-5" style={{ color: MIDIA_BRAND.blue }} />
            Escolha a data no calendário
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            As cores mostram quanto do espaço publicitário daquele dia já está reservado.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
          <button
            type="button"
            disabled={!canPrevious}
            onClick={() => setCursor(previousMonth)}
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-50 disabled:opacity-25"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-[142px] px-2 text-center text-xs font-black text-slate-700">
            {monthLabel(cursor)}
          </div>
          <button
            type="button"
            disabled={!canNext}
            onClick={() => setCursor(nextMonth)}
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-50 disabled:opacity-25"
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1">
        {week.map((label) => (
          <div key={label} className="py-1 text-center text-[9px] font-black tracking-wider text-slate-400">
            {label}
          </div>
        ))}

        {cells.map((day, index) => {
          if (!day) return <div key={`blank-${index}`} className="aspect-square" />;

          const iso = toIso(new Date(year, month, day));
          const info = dayMap.get(iso);
          const disabled = iso < minDate || iso > maxDate || info?.available === false;
          const selected = value === iso;
          const inRange = Boolean(value && selectedUntil && iso >= value && iso <= selectedUntil);

          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => onChange(iso)}
              title={info ? `${info.label} · ${info.occupancyPercent}% reservado` : 'Disponibilidade sendo carregada'}
              className={[
                'relative aspect-square min-h-10 rounded-xl border text-center transition',
                'focus:outline-none focus:ring-2 focus:ring-blue-200',
                demandClass(info?.level),
                selected ? 'ring-2 ring-blue-500 ring-offset-1' : '',
                inRange && !selected ? 'ring-1 ring-blue-200' : '',
                disabled ? 'cursor-not-allowed opacity-30' : 'hover:-translate-y-0.5 hover:shadow-sm',
              ].join(' ')}
            >
              <span className="text-xs font-black">{day}</span>
              <i className={`absolute bottom-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${dotClass(info?.level)}`} />
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-3 gap-y-2 text-[10px] font-bold text-slate-500">
        <Legend color="bg-emerald-400" label="Livre" />
        <Legend color="bg-blue-400" label="Boa procura" />
        <Legend color="bg-amber-400" label="Concorrido" />
        <Legend color="bg-orange-500" label="Muito concorrido" />
        <Legend color="bg-red-600" label="Quase cheio" />
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800">
          {error} Você ainda pode escolher a data normalmente.
        </div>
      ) : !data ? (
        <div className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando procura das datas…
        </div>
      ) : value ? (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-blue-100 bg-white p-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50" style={{ color: MIDIA_BRAND.blue }}>
            {selectedInfo?.level === 'high' || selectedInfo?.level === 'very_high'
              ? <Flame className="h-5 w-5" />
              : <CalendarDays className="h-5 w-5" />}
          </div>
          <div>
            <div className="text-xs font-black text-slate-800">
              {campaignDays > 1
                ? `Campanha começa em ${parseIso(value).toLocaleDateString('pt-BR')} e ocupa ${campaignDays} dias`
                : `Data escolhida: ${parseIso(value).toLocaleDateString('pt-BR')}`}
            </div>
            <div className="mt-1 text-[11px] font-semibold text-slate-500">
              {selectedInfo
                ? `${selectedInfo.label} · ${selectedInfo.occupancyPercent}% do espaço publicitário já reservado neste dia.`
                : 'A disponibilidade final será confirmada antes do pagamento.'}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <i className={`h-2 w-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}
