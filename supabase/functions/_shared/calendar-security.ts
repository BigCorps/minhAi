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

const CONTROLS = /[\u0000-\u001f\u007f-\u009f]/;
const encoder = new TextEncoder();
export function calendarEmail(value: unknown): string | null {
  if (typeof value !== 'string' || CONTROLS.test(value)) return null;
  const email = value.trim(), local = email.split('@')[0];
  return email.length <= 254 && local.length <= 64 && !local.startsWith('.') && !local.endsWith('.') && !local.includes('..')
    && /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(email) ? email : null;
}
export function creationTimes(input: any, days = 730, requireFuture = false) {
  const start = iso(input.start_time), end = iso(input.end_time), now = Date.now();
  if (!start || !end || Date.parse(start) > now + days * 86400000 || requireFuture && Date.parse(start) < now - 60000
    || Date.parse(end) <= Date.parse(start) || Date.parse(end) - Date.parse(start) > 86400000) return null;
  return { start, end };
}
export function creationText(value: unknown, maxBytes: number, singleLine = false): string | null {
  if (typeof value !== 'string' || encoder.encode(value).length > maxBytes || value.includes('\u0000') || singleLine && CONTROLS.test(value)) return null;
  return value.trim();
}
export function validateCalendarCreation(input: any): { error: string } | { data: any } {
  const allowed = ['company_id','summary','description','start_time','end_time','location','attendees','reminders','create_conference','recurrence','ensure_available','appointment'];
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !allowed.includes(key))) return { error: 'invalid_request' };
  const companyId = uuid(input.company_id); if (!companyId) return { error: 'invalid_company_id' };
  if (typeof input.summary !== 'string' || !input.summary.trim() || input.summary.trim().length > 200 || CONTROLS.test(input.summary)) return { error: 'invalid_summary' };
  const times = creationTimes(input); if (!times) return { error: 'invalid_dates' };
  const data: any = { company_id: companyId, summary: input.summary.trim(), start_time: times.start, end_time: times.end };
  for (const [field, max, line] of [['description', 10 * 1024, false], ['location', 500, true]] as const) {
    if (input[field] !== undefined) { const text = creationText(input[field], max, line); if (text === null) return { error: `invalid_${field}` }; data[field] = text; }
  }
  for (const field of ['create_conference', 'ensure_available']) {
    if (input[field] !== undefined && typeof input[field] !== 'boolean') return { error: 'invalid_request' };
    data[field] = input[field] === true;
  }
  if (input.attendees !== undefined) {
    if (!Array.isArray(input.attendees) || input.attendees.length > 20) return { error: 'invalid_attendees' };
    const addresses = new Set<string>();
    for (const attendee of input.attendees) {
      if (typeof attendee !== 'string' && (!attendee || typeof attendee !== 'object' || Array.isArray(attendee) || Object.keys(attendee).some(key => key !== 'email'))) return { error: 'invalid_attendees' };
      const address = calendarEmail(typeof attendee === 'string' ? attendee : attendee.email);
      if (!address) return { error: 'invalid_attendees' }; addresses.add(address.toLowerCase());
    }
    data.attendees = [...addresses].map(email => ({ email }));
  }
  if (input.reminders !== undefined) {
    const reminders = input.reminders;
    if (!reminders || typeof reminders !== 'object' || Array.isArray(reminders) || Object.keys(reminders).some(key => !['useDefault','overrides'].includes(key))
      || reminders.useDefault !== undefined && typeof reminders.useDefault !== 'boolean') return { error: 'invalid_reminders' };
    if (reminders.overrides !== undefined && (!Array.isArray(reminders.overrides) || reminders.overrides.length > 5 || reminders.useDefault === true)) return { error: 'invalid_reminders' };
    if (reminders.useDefault === undefined && reminders.overrides === undefined) return { error: 'invalid_reminders' };
    for (const override of reminders.overrides || []) {
      if (!override || typeof override !== 'object' || Array.isArray(override) || Object.keys(override).some(key => !['method','minutes'].includes(key))
        || override.method !== 'popup' || !Number.isInteger(override.minutes) || override.minutes < 0 || override.minutes > 40320) return { error: 'invalid_reminders' };
    }
    data.reminders = { useDefault: reminders.useDefault === true, ...(reminders.overrides !== undefined ? { overrides: reminders.overrides.map((item: any) => ({ method: 'popup', minutes: item.minutes })) } : {}) };
  }
  if (input.recurrence !== undefined) {
    if (!Array.isArray(input.recurrence) || input.recurrence.length < 1 || input.recurrence.length > 2 || input.recurrence.some((rule: unknown) => typeof rule !== 'string' || rule.length > 512
      || !/^RRULE:[A-Z0-9=;,+-]+$/.test(rule) || !/^RRULE:FREQ=(?:DAILY|WEEKLY|MONTHLY|YEARLY|HOURLY|MINUTELY|SECONDLY)(?:;|$)/.test(rule))) return { error: 'invalid_recurrence' };
    data.recurrence = input.recurrence;
  }
  if (input.appointment !== undefined) {
    const appointment = input.appointment;
    const limits: Record<string, number> = { customer_name: 200, customer_email: 254, customer_phone: 50, customer_id: 36, service_type: 200, service_description: 10 * 1024, notes: 5000 };
    if (!appointment || typeof appointment !== 'object' || Array.isArray(appointment) || Object.keys(appointment).some(key => !Object.prototype.hasOwnProperty.call(limits, key))) return { error: 'invalid_appointment' };
    data.appointment = {};
    for (const [field, value] of Object.entries(appointment)) {
      if (value == null) { data.appointment[field] = null; continue; }
      const text = creationText(value, limits[field], !['service_description','notes'].includes(field));
      if (text === null || field === 'customer_id' && !uuid(text) || field === 'customer_email' && text && !calendarEmail(text)) return { error: 'invalid_appointment' };
      data.appointment[field] = text || null;
    }
  }
  return { data };
}
export function validGoogleEventId(value: unknown): value is string { return typeof value === 'string' && /^[a-zA-Z0-9_-]{1,256}$/.test(value); }
export function safeGoogleLink(value: unknown, meet = false): string | null {
  try { const url = new URL(String(value || '')); return url.protocol === 'https:' && !url.username && !url.password && (meet ? url.hostname === 'meet.google.com' : ['calendar.google.com','www.google.com'].includes(url.hostname)) ? url.href : null; } catch { return null; }
}

export function truncateCalendarText(value: string, maxBytes = 10 * 1024): string {
  let text = '', bytes = 0;
  for (const char of value) { const length = encoder.encode(char).length; if (bytes + length > maxBytes) break; text += char; bytes += length; }
  return text;
}
