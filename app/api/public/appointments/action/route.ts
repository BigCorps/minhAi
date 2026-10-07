import 'server-only';
import { uuid, actionTimes } from '@/supabase/functions/_shared/calendar-security';
import { calendarInput, caught, fail, calendarJson, calendarEdge, publicCompany, unsupported } from '@/lib/calendar-server';
import { verifyAppointmentCapability } from '@/lib/appointment-capability';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(req: Request) {
  try {
    const input = await calendarInput(req, ['company_id', 'appointment_id', 'action', 'capability', 'new_start', 'new_end', 'reason', 'profile_tokens']);
    const id = uuid(input.company_id), appointmentId = uuid(input.appointment_id);
    if (!id || !appointmentId) return fail('invalid_identifier');
    if (!['confirm', 'cancel', 'reschedule'].includes(input.action)) return fail('invalid_action');
    if (!verifyAppointmentCapability(input.capability, id, appointmentId, input.action)) return fail('invalid_capability', 403);
    const reason = input.reason;
    if (reason !== undefined && (typeof reason !== 'string' || reason.length > 500 || /[\u0000-\u001f\u007f-\u009f]/.test(reason))) return fail('invalid_reason');
    const times = input.action === 'reschedule' ? actionTimes(input) : null;
    if (input.action === 'reschedule' && !times) return fail('invalid_dates');
    if (input.action !== 'reschedule' && (input.new_start !== undefined || input.new_end !== undefined)) return fail('invalid_request');
    await publicCompany(req, input, id);
    await calendarEdge('appointment-actions-v2', { company_id: id, appointment_id: appointmentId, action: input.action,
      ...(input.action === 'cancel' ? { cancel_reason: reason } : {}), ...(times ? { new_start: times.start, new_end: times.end, reschedule_reason: reason } : {}) });
    return calendarJson({ ok: true });
  } catch (error) { return caught(error); }
}
export { unsupported as GET, unsupported as HEAD, unsupported as OPTIONS, unsupported as PUT, unsupported as PATCH, unsupported as DELETE };
