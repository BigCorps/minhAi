import 'server-only';
import { resolveCompanyActor } from '@/lib/orders-server';
import { uuid, validTime, OPERATIONAL_PROFILES } from '@/supabase/functions/_shared/calendar-security';
import { creationText, validGoogleEventId } from '@/supabase/functions/_shared/calendar-security';
import { calendarInput, calendarJson, calendarEdge, searchRate, caught, fail, unsupported } from '@/lib/calendar-server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(req: Request) {
  const limited = searchRate(req); if (limited) return limited;
  try {
    const input = await calendarInput(req, ['company_id','medicine_name','daily_times','total_days','profile_tokens']);
    const id = uuid(input.company_id); if (!id) return fail('invalid_company_id');
    const medicine = creationText(input.medicine_name, 480, true); if (!medicine || medicine.length > 120) return fail('invalid_medicine');
    if (!Array.isArray(input.daily_times) || !input.daily_times.length || input.daily_times.length > 24 || input.daily_times.some((time: unknown) => !validTime(time))
      || new Set(input.daily_times).size !== input.daily_times.length) return fail('invalid_times');
    if (!Number.isInteger(input.total_days) || input.total_days < 1 || input.total_days > 365) return fail('invalid_days');
    const times: string[] = [...input.daily_times].sort();
    if (new Set(times.map(time => time.slice(3))).size !== 1) return fail('invalid_times');
    const resolved = await resolveCompanyActor(req, input, id, OPERATIONAL_PROFILES);
    if (!resolved.actor) return fail(resolved.error === 'company_not_found' ? 'company_not_found' : 'forbidden', resolved.error === 'company_not_found' ? 404 : resolved.error?.endsWith('_failed') ? 503 : req.headers.get('authorization') || input.profile_tokens?.length ? 403 : 401);
    const now = new Date(), day = now.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
    let start = times.map(time => new Date(`${day}T${time}:00-03:00`)).find(date => date.getTime() > now.getTime());
    if (!start) start = new Date(Date.parse(`${day}T${times[0]}:00-03:00`) + 86400000);
    const hours = times.map(time => Number(time.slice(0, 2))).join(',');
    const recurrence = [`RRULE:FREQ=DAILY;BYHOUR=${hours};BYMINUTE=${Number(times[0].slice(3))};BYSECOND=0;COUNT=${input.total_days * times.length}`];
    const result = await calendarEdge('criar-evento-calendario-v2', { company_id: id, summary: `💊 ${medicine}`, description: 'Lembrete de medicamento configurado na minhAi.',
      start_time: start.toISOString(), end_time: new Date(start.getTime() + 15 * 60000).toISOString(), recurrence,
      ensure_available: false, reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 1 }] } });
    if (!validGoogleEventId(result.event_id)) return fail('calendar_unavailable', 502);
    return calendarJson({ ok: true });
  } catch (error) { return caught(error); }
}
export { unsupported as GET, unsupported as HEAD, unsupported as OPTIONS, unsupported as PUT, unsupported as PATCH, unsupported as DELETE };
