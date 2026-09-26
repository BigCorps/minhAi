import { NextResponse } from 'next/server';
import { adminMidia, getPublicMidiaScreen } from '@/lib/midia/server';

export const dynamic = 'force-dynamic';

function isoDateInTimezone(timeZone: string, date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function addDays(iso: string, days: number) {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function eachDay(from: string, until: string) {
  const result: string[] = [];
  for (let cursor = from; cursor <= until; cursor = addDays(cursor, 1)) result.push(cursor);
  return result;
}

function demandLabel(percent: number) {
  if (percent >= 85) return { level: 'very_high', label: 'Quase cheio' };
  if (percent >= 60) return { level: 'high', label: 'Muito concorrido' };
  if (percent >= 35) return { level: 'medium', label: 'Concorrido' };
  if (percent >= 15) return { level: 'light', label: 'Boa procura' };
  return { level: 'free', label: 'Livre' };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = (url.searchParams.get('slug') || '').trim().toLowerCase();
  const code = (url.searchParams.get('code') || '').trim().toUpperCase();

  const context = await getPublicMidiaScreen(slug, code);
  if (!context) {
    return NextResponse.json({ error: 'Tela indisponível.' }, { status: 404 });
  }

  const timezone = context.location.timezone || 'America/Sao_Paulo';
  const today = isoDateInTimezone(timezone);
  const horizon = Math.max(1, Math.min(180, Number(context.settings.booking_horizon_days || 90)));
  const maxDate = addDays(today, horizon);

  const activeMinutes = Number(context.settings.active_minutes_per_day || 0);
  const networkPercent = Number(context.screen.network_inventory_percent || 0);
  const capacitySeconds = Math.max(1, Math.round(activeMinutes * 60 * (networkPercent / 100)));

  const admin = adminMidia();
  const { data: holds, error } = await admin
    .from('campaign_inventory_holds')
    .select('reserved_from,reserved_until,requested_seconds_per_day,status,expires_at')
    .eq('screen_id', context.screen.id)
    .in('status', ['pending', 'converted'])
    .gte('reserved_until', today)
    .lte('reserved_from', maxDate);

  if (error) {
    console.error('[midia/public/calendar]', error);
    return NextResponse.json({ error: 'Não foi possível carregar a agenda.' }, { status: 500 });
  }

  const reserved = new Map<string, number>();
  const now = Date.now();

  for (const hold of holds ?? []) {
    if (
      hold.status === 'pending'
      && hold.expires_at
      && new Date(hold.expires_at).getTime() <= now
    ) continue;

    const from = String(hold.reserved_from) < today ? today : String(hold.reserved_from);
    const until = String(hold.reserved_until) > maxDate ? maxDate : String(hold.reserved_until);
    const seconds = Math.max(0, Number(hold.requested_seconds_per_day || 0));

    for (const day of eachDay(from, until)) {
      reserved.set(day, (reserved.get(day) || 0) + seconds);
    }
  }

  const days = eachDay(today, maxDate).map((date) => {
    const reservedSeconds = reserved.get(date) || 0;
    const occupancyPercent = Math.min(100, Math.round((reservedSeconds / capacitySeconds) * 100));
    const demand = demandLabel(occupancyPercent);

    return {
      date,
      occupancyPercent,
      level: demand.level,
      label: demand.label,
      available: occupancyPercent < 100,
    };
  });

  return NextResponse.json({
    ok: true,
    timezone,
    minDate: today,
    maxDate,
    capacitySecondsPerDay: capacitySeconds,
    days,
  }, {
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
    },
  });
}
