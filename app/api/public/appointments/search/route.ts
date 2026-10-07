import 'server-only';
import { uuid, findAppointment } from '@/supabase/functions/_shared/calendar-security';
import { calendarInput, caught, fail, calendarJson, publicCompany, searchRate, unsupported } from '@/lib/calendar-server';
import { signAppointmentCapability } from '@/lib/appointment-capability';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(req: Request) {
  const limited = searchRate(req); if (limited) return limited;
  try {
    const input = await calendarInput(req, ['company_id', 'action', 'date', 'time', 'name', 'profile_tokens']);
    const id = uuid(input.company_id); if (!id) return fail('invalid_company_id');
    if (!['confirm', 'cancel', 'reschedule'].includes(input.action)) return fail('invalid_action');
    const admin = await publicCompany(req, input, id);
    const { appointment, error } = await findAppointment(admin, id, input);
    if (error) return fail(error, error === 'appointment_unavailable' ? 503 : error === 'appointment_not_found' ? 404 : error === 'appointment_ambiguous' ? 409 : 400);
    const start = new Date(appointment.appointment_date);
    return calendarJson({ appointment_id: appointment.id, date: start.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }),
      time: start.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }), service_type: appointment.service_type || 'Agendamento',
      capability: signAppointmentCapability(id, appointment.id, input.action) });
  } catch (error) { return caught(error); }
}
export { unsupported as GET, unsupported as HEAD, unsupported as OPTIONS, unsupported as PUT, unsupported as PATCH, unsupported as DELETE };
