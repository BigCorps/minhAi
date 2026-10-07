import 'server-only';
import { uuid, calendarWindow } from '@/supabase/functions/_shared/calendar-security';
import { calendarInput, caught, fail, calendarJson, calendarEdge, publicCompany, unsupported } from '@/lib/calendar-server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(req: Request) {
  try {
    const input = await calendarInput(req, ['company_id', 'time_min', 'time_max', 'profile_tokens']);
    const id = uuid(input.company_id); if (!id) return fail('invalid_company_id');
    if (!input.time_min || !input.time_max) return fail('invalid_window');
    const range = calendarWindow({ ...input, max_results: 500 }, 60); if (!range) return fail('invalid_window');
    await publicCompany(req, input, id);
    const result = await calendarEdge('listar-eventos-google-v2', { company_id: id, ...range });
    if (result.truncated) return fail('calendar_result_limit', 409);
    const busy = (result.events || []).filter((e: any) => e.status !== 'cancelled' && e.transparency !== 'transparent').map((e: any) => ({
      start: e.start?.dateTime || e.start?.date, end: e.end?.dateTime || e.end?.date, all_day: !e.start?.dateTime,
    })).filter((e: any) => e.start && e.end);
    return calendarJson(busy);
  } catch (error) { return caught(error); }
}
export { unsupported as GET, unsupported as HEAD, unsupported as OPTIONS, unsupported as PUT, unsupported as PATCH, unsupported as DELETE };
