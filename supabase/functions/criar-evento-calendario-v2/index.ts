// Deploy futuro: verify_jwt=false, autorização custom exata de service_role.
import { uuid } from '../_shared/calendar-security.ts';
import { validateCalendarCreation, validGoogleEventId, safeGoogleLink } from '../_shared/calendar-security.ts';
import { authorize, readInput, json, adminClient, activeCompany, googleAccount, accountErrorStatus, eventUrl } from '../_shared/calendar-google.ts';
Deno.serve(async (req: Request) => {
  const denied = authorize(req); if (denied) return denied;
  let input; try { input = await readInput(req, 64 * 1024); } catch { return json('invalid_request', 400); }
  const validated = validateCalendarCreation(input); if ('error' in validated) return json(validated.error, 400);
  const data = validated.data;
  try {
    const admin = adminClient();
    const companyError = await activeCompany(admin, data.company_id); if (companyError) return json(companyError, companyError === 'company_not_found' ? 404 : 503);
    const { account, error } = await googleAccount(admin, data.company_id, true); if (error) return json(error, accountErrorStatus(error));
    const headers = { Authorization: `Bearer ${account.access_token}`, 'Content-Type': 'application/json' };
    if (data.ensure_available) {
      let freeBusy;
      try {
        const response = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', { method: 'POST', headers, body: JSON.stringify({ timeMin: data.start_time, timeMax: data.end_time, items: [{ id: 'primary' }] }), signal: AbortSignal.timeout(30000) });
        if (!response.ok) return json('calendar_availability_failed', 502); freeBusy = await response.json();
      } catch { return json('calendar_availability_failed', 502); }
      const primary = freeBusy?.calendars?.primary;
      if (!primary || primary.errors?.length || !Array.isArray(primary.busy)) return json('calendar_availability_failed', 502);
      for (const busy of primary.busy) {
        const start = Date.parse(busy?.start), end = Date.parse(busy?.end);
        if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) return json('calendar_availability_failed', 502);
        if (start < Date.parse(data.end_time) && end > Date.parse(data.start_time)) return json('calendar_slot_unavailable', 409);
      }
    }
    const event: any = { summary: data.summary, start: { dateTime: data.start_time, ...(data.recurrence ? { timeZone: 'America/Sao_Paulo' } : {}) },
      end: { dateTime: data.end_time, ...(data.recurrence ? { timeZone: 'America/Sao_Paulo' } : {}) } };
    for (const field of ['description','location','attendees','reminders','recurrence']) if (data[field] !== undefined) event[field] = data[field];
    const params = new URLSearchParams();
    if (data.attendees?.length) params.set('sendUpdates', 'all');
    if (data.create_conference) { params.set('conferenceDataVersion', '1'); event.conferenceData = { createRequest: { requestId: crypto.randomUUID(), conferenceSolutionKey: { type: 'hangoutsMeet' } } }; }
    let result;
    try {
      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events${params.size ? '?' + params : ''}`, { method: 'POST', headers, body: JSON.stringify(event), signal: AbortSignal.timeout(30000) });
      if (!response.ok) return json('calendar_create_failed', 502); result = await response.json();
    } catch { return json('calendar_create_failed', 502); }
    if (!validGoogleEventId(result?.id)) return json('calendar_create_failed', 502);
    let appointmentId: string | null = null;
    if (data.appointment !== undefined) {
      try {
        const { data: saved, error } = await admin.from('customer_appointments').insert({ ...data.appointment,
          company_id: data.company_id, google_event_id: result.id, appointment_date: data.start_time, appointment_end: data.end_time, status: 'scheduled',
        }).select('id').single();
        if (!error && uuid(saved?.id)) appointmentId = saved.id;
      } catch { /* rollback abaixo, sem logar dados do agendamento */ }
      if (!appointmentId) {
        console.warn('[calendar-create-v2] appointment_record_failed');
        try { const rollback = await fetch(eventUrl(result.id), { method: 'DELETE', headers: { Authorization: `Bearer ${account.access_token}` }, signal: AbortSignal.timeout(30000) });
          if (!rollback.ok && rollback.status !== 404) console.warn('[calendar-create-v2] rollback_failed');
        } catch { console.warn('[calendar-create-v2] rollback_failed'); }
        return json('appointment_record_failed', 503);
      }
    }
    const meet = safeGoogleLink(result.hangoutLink, true) || safeGoogleLink(result.conferenceData?.entryPoints?.find((entry: any) => entry.entryPointType === 'video')?.uri, true);
    return json(null, 200, { event_id: result.id, event_link: safeGoogleLink(result.htmlLink), meet_url: meet, ...(appointmentId ? { appointment_id: appointmentId } : {}) });
  } catch { return json('calendar_unavailable', 503); }
});
