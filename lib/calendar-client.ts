'use client';
import { collectOrderClientAuth } from '@/lib/orders-client';
export type AppointmentSummary = { appointment_id: string; date: string; time: string; service_type: string; capability: string };
export type BusyBlock = { start: string; end: string; all_day: boolean };
async function request(path: string, input: Record<string, unknown>) {
  const auth = await collectOrderClientAuth();
  const response = await fetch(path, { method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json', ...(auth.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : {}) }, body: JSON.stringify({ ...input, profile_tokens: auth.profileTokens }) });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const messages: Record<string, string> = { forbidden: 'A agenda completa está disponível somente para usuários autorizados da equipe.', unauthorized: 'A agenda completa está disponível somente para usuários autorizados da equipe.',
      appointment_ambiguous: 'Há mais de um agendamento compatível. Informe o nome completo e o horário.', appointment_not_found: 'Nenhum agendamento encontrado com os critérios informados.', invalid_search: 'Informe a data e também o horário ou nome completo.',
      calendar_slot_unavailable: 'Este horário não está disponível.', slot_unavailable: 'Este horário não está disponível.', invalid_capability: 'A confirmação expirou. Busque o agendamento novamente.', rate_limited: 'Muitas consultas. Aguarde um minuto e tente novamente.' };
    throw Error(messages[result?.reason] || 'Não foi possível acessar a agenda. Tente novamente.');
  }
  return result;
}
export async function listCompanyCalendarEvents(input: { company_id: string; time_min?: string; time_max?: string; max_results?: number }): Promise<any[]> { const result = await request('/api/calendar/events', input); return result.events || []; }
export async function listPublicCalendarAvailability(input: { company_id: string; time_min: string; time_max: string }): Promise<BusyBlock[]> { return await request('/api/public/calendar/availability', input); }
export async function searchPublicAppointment(input: { company_id: string; action: string; date: string; time?: string; name?: string }): Promise<AppointmentSummary> { return await request('/api/public/appointments/search', input); }
export async function actOnPublicAppointment(input: { company_id: string; appointment_id: string; action: string; capability: string; new_start?: string; new_end?: string; reason?: string }) { return await request('/api/public/appointments/action', input); }

export async function createCompanyCalendarEvent(input: { company_id: string; summary: string; description?: string; start_time: string; end_time: string; location?: string; attendees?: (string | { email: string })[]; reminders?: { useDefault?: boolean; overrides?: { method: 'popup'; minutes: number }[] }; create_conference?: boolean }): Promise<{ event_id: string; event_link: string | null; meet_url: string | null }> {
  return await request('/api/calendar/events/create', input);
}
export async function createPublicAppointment(input: { company_id: string; start_time: string; end_time: string; customer_name?: string; service_type?: string; service_description?: string; notes?: string }): Promise<{ ok: true; appointment_id: string }> {
  return await request('/api/public/appointments/create', input);
}
export async function createMedicationReminder(input: { company_id: string; medicine_name: string; daily_times: string[]; total_days: number }) {
  return await request('/api/public/calendar/medication-reminder', input);
}
