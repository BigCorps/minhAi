export const ACTIVE_APPOINTMENTS = ['scheduled', 'confirmed', 'rescheduled'];
export const OPERATIONAL_PROFILES = ['frentista', 'atendente', 'caixa', 'gerente', 'colaborador', 'administrador'];
export const PUBLIC_PROFILES = ['cliente', ...OPERATIONAL_PROFILES];
export function uuid(value: unknown): string { return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : ''; }
export function validDay(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value + 'T00:00:00Z')) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;
}
export function iso(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !validDay(value.slice(0, 10)) || Number(value.slice(11, 13)) > 23 || Number(value.slice(14, 16)) > 59 || Number(value.slice(17, 19)) > 59) return null;
  return Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
}
export function validTime(value: unknown): value is string { return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value); }
export function normalizedName(value: unknown): string { return typeof value === 'string' ? value.normalize('NFKC').replace(/[\u0000-\u001f\u007f-\u009f]/g, '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR') : ''; }
export function calendarWindow(input: any, days = 730) {
  const start = input.time_min === undefined ? new Date().toISOString() : iso(input.time_min);
  const end = input.time_max === undefined && start ? new Date(Date.parse(start) + 30 * 86400000).toISOString() : iso(input.time_max);
  if (!start || !end || Date.parse(end) <= Date.parse(start) || Date.parse(end) - Date.parse(start) > days * 86400000) return null;
  const count = input.max_results === undefined ? 100 : input.max_results;
  if (typeof count !== 'number' || !Number.isInteger(count) || count < 1) return null;
  return { time_min: start, time_max: end, max_results: Math.min(count, 500) };
}
export function actionTimes(input: any) {
  const start = iso(input.new_start), end = iso(input.new_end);
  if (!start || !end || Date.parse(start) < Date.now() - 86400000 || Date.parse(start) > Date.now() + 730 * 86400000 || Date.parse(end) <= Date.parse(start) || Date.parse(end) - Date.parse(start) > 86400000) return null;
  return { start, end };
}
// Busca exata por nome normalizado; horário comercial America/Sao_Paulo.
export async function findAppointment(admin: any, companyId: string, input: any) {
  const name = normalizedName(input.name);
  if (!validDay(input.date) || (!validTime(input.time) && name.length < 3) || (name && name.length < 3) || name.length > 120 || (input.time !== undefined && input.time !== '' && !validTime(input.time))) return { error: 'invalid_search', appointment: null };
  const dayStart = Date.parse(input.date + 'T00:00:00-03:00');
  const target = validTime(input.time) ? Date.parse(`${input.date}T${input.time}:00-03:00`) : null;
  const min = target === null ? dayStart : Math.max(dayStart, target - 10 * 60000);
  const max = target === null ? dayStart + 86400000 : Math.min(dayStart + 86400000, target + 10 * 60000 + 1);
  const { data, error } = await admin.from('customer_appointments').select('id,company_id,customer_name,appointment_date,appointment_end,service_type')
    .eq('company_id', companyId).in('status', ACTIVE_APPOINTMENTS).gte('appointment_date', new Date(min).toISOString()).lt('appointment_date', new Date(max).toISOString()).limit(201);
  if (error) return { error: 'appointment_unavailable', appointment: null };
  if ((data || []).length > 200) return { error: 'appointment_ambiguous', appointment: null };
  const matching = (data || []).filter((row: any) => row.company_id === companyId && (!name || normalizedName(row.customer_name) === name));
  return matching.length === 1 ? { error: null, appointment: matching[0] } : { error: matching.length ? 'appointment_ambiguous' : 'appointment_not_found', appointment: null };
}
