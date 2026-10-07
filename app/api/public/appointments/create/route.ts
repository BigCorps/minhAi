import 'server-only';
import { uuid, ACTIVE_APPOINTMENTS } from '@/supabase/functions/_shared/calendar-security';
import { creationTimes, creationText, truncateCalendarText } from '@/supabase/functions/_shared/calendar-security';
import { calendarInput, calendarJson, calendarEdge, publicCompany, searchRate, caught, fail, unsupported } from '@/lib/calendar-server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(req: Request) {
  const limited = searchRate(req); if (limited) return limited;
  try {
    const input = await calendarInput(req, ['company_id','start_time','end_time','customer_name','service_type','service_description','notes','profile_tokens'], 64 * 1024);
    const id = uuid(input.company_id); if (!id) return fail('invalid_company_id');
    const times = creationTimes(input, 365, true); if (!times) return fail('invalid_dates');
    const appointment: Record<string, string | null> = {};
    for (const [field, max, line] of [['customer_name',200,true], ['service_type',200,true], ['service_description',10 * 1024,false], ['notes',5000,false]] as const) {
      if (input[field] !== undefined) { const text = creationText(input[field], max, line); if (text === null) return fail('invalid_appointment'); appointment[field] = text || null; }
    }
    const admin = await publicCompany(req, input, id);
    const { count, error: limitError } = await admin.from('customer_appointments').select('id', { count: 'exact', head: true })
      .eq('company_id', id).gte('created_at', new Date(Date.now() - 10 * 60000).toISOString());
    if (limitError || typeof count !== 'number') return fail('calendar_unavailable', 503);
    if (count >= 30) return calendarJson({ ok: false, reason: 'rate_limited' }, 429, { 'Retry-After': '600' });
    const { data: overlap, error } = await admin.from('customer_appointments').select('id').eq('company_id', id).in('status', ACTIVE_APPOINTMENTS)
      .lt('appointment_date', times.end).gt('appointment_end', times.start).limit(1);
    if (error) return fail('calendar_unavailable', 503); if (overlap?.length) return fail('slot_unavailable', 409);
    const description = truncateCalendarText([appointment.service_type ? `Serviço: ${appointment.service_type}` : '', appointment.service_description, appointment.notes].filter(Boolean).join('\n').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'));
    // Somente texto; o browser nunca controla opções genéricas do Google.
    const result = await calendarEdge('criar-evento-calendario-v2', { company_id: id, summary: appointment.customer_name || appointment.service_type || 'Agendamento',
      description, start_time: times.start, end_time: times.end, ensure_available: true, appointment });
    if (!uuid(result.appointment_id)) return fail('calendar_unavailable', 502);
    return calendarJson({ ok: true, appointment_id: result.appointment_id });
  } catch (error) { return caught(error); }
}
export { unsupported as GET, unsupported as HEAD, unsupported as OPTIONS, unsupported as PUT, unsupported as PATCH, unsupported as DELETE };
