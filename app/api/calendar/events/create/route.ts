import 'server-only';
import { resolveCompanyActor } from '@/lib/orders-server';
import { uuid, OPERATIONAL_PROFILES } from '@/supabase/functions/_shared/calendar-security';
import { validateCalendarCreation, validGoogleEventId, safeGoogleLink } from '@/supabase/functions/_shared/calendar-security';
import { calendarInput, calendarJson, calendarEdge, caught, fail, unsupported } from '@/lib/calendar-server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(req: Request) {
  try {
    const input = await calendarInput(req, ['company_id','summary','description','start_time','end_time','location','attendees','reminders','create_conference','profile_tokens'], 64 * 1024);
    const id = uuid(input.company_id); if (!id) return fail('invalid_company_id');
    const resolved = await resolveCompanyActor(req, input, id, OPERATIONAL_PROFILES);
    if (!resolved.actor) return fail(resolved.error === 'company_not_found' ? 'company_not_found' : 'forbidden', resolved.error === 'company_not_found' ? 404 : resolved.error?.endsWith('_failed') ? 503 : req.headers.get('authorization') || input.profile_tokens?.length ? 403 : 401);
    const { profile_tokens: _auth, ...event } = input;
    const validated = validateCalendarCreation(event); if ('error' in validated) return fail(validated.error);
    const result = await calendarEdge('criar-evento-calendario-v2', validated.data);
    if (!validGoogleEventId(result.event_id)) return fail('calendar_unavailable', 502);
    return calendarJson({ ok: true, event_id: result.event_id, event_link: safeGoogleLink(result.event_link), meet_url: safeGoogleLink(result.meet_url, true) });
  } catch (error) { return caught(error); }
}
export { unsupported as GET, unsupported as HEAD, unsupported as OPTIONS, unsupported as PUT, unsupported as PATCH, unsupported as DELETE };
