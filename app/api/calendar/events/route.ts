import 'server-only';
import { resolveCompanyActor } from '@/lib/orders-server';
import { uuid, calendarWindow, OPERATIONAL_PROFILES } from '@/supabase/functions/_shared/calendar-security';
import { calendarInput, caught, fail, calendarJson, calendarEdge, unsupported } from '@/lib/calendar-server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(req: Request) {
  try {
    const input = await calendarInput(req, ['company_id', 'time_min', 'time_max', 'max_results', 'profile_tokens']);
    const id = uuid(input.company_id); if (!id) return fail('invalid_company_id');
    const range = calendarWindow(input); if (!range) return fail('invalid_window');
    const resolved = await resolveCompanyActor(req, input, id, OPERATIONAL_PROFILES);
    if (!resolved.actor) return fail(resolved.error === 'company_not_found' ? 'company_not_found' : 'forbidden', resolved.error === 'company_not_found' ? 404 : resolved.error?.endsWith('_failed') ? 503 : req.headers.get('authorization') || input.profile_tokens?.length ? 403 : 401);
    const result = await calendarEdge('listar-eventos-google-v2', { company_id: id, ...range });
    return calendarJson({ ok: true, events: result.events || [] });
  } catch (error) { return caught(error); }
}
export { unsupported as GET, unsupported as HEAD, unsupported as OPTIONS, unsupported as PUT, unsupported as PATCH, unsupported as DELETE };
