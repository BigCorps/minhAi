import type { ReactNode } from 'react';

export function money(cents: number | null | undefined) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format((cents ?? 0) / 100);
}

export function usd(cents: number | null | undefined) {
  if (cents == null) return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

export function number(value: number | null | undefined) {
  return new Intl.NumberFormat('pt-BR').format(value ?? 0);
}

export function bytes(value: number | null | undefined) {
  const n = value ?? 0;
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let current = n / 1024;
  let unit = units[0];
  for (let i = 1; i < units.length && current >= 1024; i += 1) {
    current /= 1024;
    unit = units[i];
  }
  return `${current.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${unit}`;
}

export function pct(value: number | null | undefined) {
  if (value == null) return '—';
  return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

export function relative(value: string | null | undefined) {
  if (!value) return '—';
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return '—';
  const diff = time - Date.now();
  const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
  const abs = Math.abs(diff);
  if (abs < 60_000) return rtf.format(Math.round(diff / 1000), 'second');
  if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), 'minute');
  if (abs < 86_400_000) return rtf.format(Math.round(diff / 3_600_000), 'hour');
  return rtf.format(Math.round(diff / 86_400_000), 'day');
}

export function BusinessMetric({
  title,
  value,
  subtitle,
  icon,
  emphasized = false,
}: {
  title: string;
  value: ReactNode;
  subtitle?: string;
  icon?: ReactNode;
  emphasized?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${emphasized ? 'border-lime-300/20 bg-lime-300/[0.07]' : 'border-white/10 bg-white/[0.035]'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-slate-600">{title}</p>
          <div className="mt-2 text-2xl font-black tracking-tight text-white">{value}</div>
          {subtitle ? <p className="mt-1 text-xs text-slate-600">{subtitle}</p> : null}
        </div>
        {icon ? <div className={emphasized ? 'text-lime-300' : 'text-slate-600'}>{icon}</div> : null}
      </div>
    </div>
  );
}

export function BusinessError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-5 text-sm text-amber-100">
      <p>{message}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="mt-3 rounded-lg bg-white px-3 py-2 text-xs font-black text-slate-950">
          Tentar novamente
        </button>
      ) : null}
    </div>
  );
}

export function BusinessLoading({ text = 'Carregando...' }: { text?: string }) {
  return (
    <div className="flex min-h-[45vh] items-center justify-center text-sm text-slate-500">
      <span className="mr-3 h-4 w-4 animate-spin rounded-full border-2 border-slate-700 border-t-lime-300" />
      {text}
    </div>
  );
}
