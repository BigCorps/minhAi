// Deploy futuro: verify_jwt=false; somente service_role. Sem lookup por contato/Google ID.
import { uuid, actionTimes, ACTIVE_APPOINTMENTS } from '../_shared/calendar-security.ts';
import { authorize, readInput, json, adminClient, activeCompany, googleAccount, accountErrorStatus, eventUrl } from '../_shared/calendar-google.ts';
Deno.serve(async (req: Request) => {
  const denied = authorize(req); if (denied) return denied;
  let input;
  try { input = await readInput(req); } catch { return json('invalid_request', 400); }
  if (!input || Array.isArray(input) || typeof input !== 'object') return json('invalid_request', 400);
  const action = input.action;
  if (!['confirm', 'cancel', 'reschedule'].includes(action)) return json('invalid_action', 400);
  const allowed = ['company_id', 'appointment_id', 'action', ...(action === 'cancel' ? ['cancel_reason'] : action === 'reschedule' ? ['new_start', 'new_end', 'reschedule_reason'] : [])];
  if (Object.keys(input).some(key => !allowed.includes(key))) return json('invalid_request', 400);
  const companyId = uuid(input.company_id), appointmentId = uuid(input.appointment_id);
  if (!companyId || !appointmentId) return json('invalid_identifier', 400);
  const reason = action === 'cancel' ? input.cancel_reason : input.reschedule_reason;
  if (reason !== undefined && (typeof reason !== 'string' || reason.length > 500 || /[\u0000-\u001f\u007f-\u009f]/.test(reason))) return json('invalid_reason', 400);
  const times = action === 'reschedule' ? actionTimes(input) : null;
  if (action === 'reschedule' && !times) return json('invalid_dates', 400);
  try {
    const admin = adminClient(); const companyError = await activeCompany(admin, companyId);
    if (companyError) return json(companyError, companyError === 'company_not_found' ? 404 : 503);
    const { data: appointment, error: lookupError } = await admin.from('customer_appointments').select('*')
      .eq('company_id', companyId).eq('id', appointmentId).maybeSingle();
    if (lookupError) return json('service_unavailable', 503);
    if (!appointment || appointment.company_id !== companyId) return json('appointment_not_found', 404);
    if ((action === 'confirm' && appointment.status === 'confirmed') || (action === 'cancel' && appointment.status === 'cancelled')) return json(null);
    if (!ACTIVE_APPOINTMENTS.includes(appointment.status)) return json('invalid_appointment_state', 409);
    if (times) {
      const { data: conflicts, error } = await admin.from('customer_appointments').select('id')
        .eq('company_id', companyId).in('status', ACTIVE_APPOINTMENTS).neq('id', appointmentId)
        .lt('appointment_date', times.end).gt('appointment_end', times.start).limit(1);
      if (error) return json('service_unavailable', 503);
      if (conflicts?.length) return json('slot_unavailable', 409);
    }
    let account: any = null;
    const eventId = typeof appointment.google_event_id === 'string' ? appointment.google_event_id : '';
    async function patch(start: string, end: string) {
      return await fetch(eventUrl(eventId), { method: 'PATCH', headers: { Authorization: `Bearer ${account.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ start: { dateTime: start }, end: { dateTime: end } }), signal: AbortSignal.timeout(30000) });
    }
    if (action !== 'confirm' && eventId) {
      const result = await googleAccount(admin, companyId, true); if (result.error) return json(result.error, accountErrorStatus(result.error)); account = result.account;
      try {
        const google = action === 'cancel'
          ? await fetch(eventUrl(eventId), { method: 'DELETE', headers: { Authorization: `Bearer ${account.access_token}` }, signal: AbortSignal.timeout(30000) })
          : await patch(times!.start, times!.end);
        if (!google.ok && !(action === 'cancel' && google.status === 404)) return json(action === 'cancel' ? 'calendar_delete_failed' : 'calendar_update_failed', 502);
      } catch { return json(action === 'cancel' ? 'calendar_delete_failed' : 'calendar_update_failed', 502); }
    }
    const now = new Date().toISOString();
    const update = action === 'confirm' ? { status: 'confirmed', confirmed_at: now, updated_at: now }
      : action === 'cancel' ? { status: 'cancelled', cancelled_at: now, updated_at: now }
      : { status: 'rescheduled', original_date: appointment.original_date || appointment.appointment_date, appointment_date: times!.start, appointment_end: times!.end,
        rescheduled_at: now, reschedule_reason: reason?.trim() || null, updated_at: now };
    let persisted = false;
    try {
      let mutation = admin.from('customer_appointments').update(update).eq('company_id', companyId).eq('id', appointmentId).eq('status', appointment.status);
      mutation = appointment.updated_at == null ? mutation.is('updated_at', null) : mutation.eq('updated_at', appointment.updated_at);
      const { data, error } = await mutation.select('id').maybeSingle();
      persisted = !error && !!data;
    } catch { /* rollback abaixo quando necessário */ }
    if (!persisted) {
      if (action === 'reschedule' && eventId && account) {
        try { const rollback = await patch(appointment.appointment_date, appointment.appointment_end); if (!rollback.ok) console.warn('[calendar-v2] rollback_failed'); }
        catch { console.warn('[calendar-v2] rollback_failed'); }
      }
      return json('appointment_update_failed', 503);
    }
    try {
      await admin.from('interaction_history').insert({ company_id: companyId, function_key: `appointment_${action}`, interaction_type: 'appointment_action',
        metadata: { appointment_id: appointmentId, action }, status: 'success' });
    } catch { /* best-effort, sem contatos/motivo nos logs */ }
    return json(null);
  } catch { return json('service_unavailable', 503); }
});
