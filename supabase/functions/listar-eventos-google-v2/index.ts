// Deploy futuro: verify_jwt=false; auth service_role exata no helper.
import { uuid, calendarWindow } from '../_shared/calendar-security.ts';
import { authorize, readInput, json, adminClient, activeCompany, googleAccount, accountErrorStatus } from '../_shared/calendar-google.ts';
Deno.serve(async (req: Request) => {
  const denied = authorize(req); if (denied) return denied;
  let input;
  try { input = await readInput(req); } catch { return json('invalid_request', 400); }
  if (!input || Array.isArray(input) || typeof input !== 'object' || Object.keys(input).some(key => !['company_id', 'max_results', 'time_min', 'time_max'].includes(key))) return json('invalid_request', 400);
  const id = uuid(input.company_id); if (!id) return json('invalid_company_id', 400);
  const range = calendarWindow(input); if (!range) return json('invalid_window', 400);
  try {
    const admin = adminClient(); const companyError = await activeCompany(admin, id);
    if (companyError) return json(companyError, companyError === 'company_not_found' ? 404 : 503);
    const { account, error } = await googleAccount(admin, id); if (error) return json(error, accountErrorStatus(error));
    const events: any[] = []; let pageToken = '';
    do {
      const params = new URLSearchParams({ timeMin: range.time_min, timeMax: range.time_max, maxResults: String(Math.min(range.max_results - events.length, 250)), singleEvents: 'true', orderBy: 'startTime' });
      if (pageToken) params.set('pageToken', pageToken);
      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
        headers: { Authorization: `Bearer ${account.access_token}` }, signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) return json('calendar_read_failed', 502);
      const result = await response.json();
      if (!result || (result.items !== undefined && !Array.isArray(result.items))) return json('calendar_read_failed', 502);
      events.push(...(result.items || []));
      pageToken = typeof result.nextPageToken === 'string' ? result.nextPageToken : '';
      // Nunca retornar uma disponibilidade incompleta como se estivesse livre.
      if (pageToken && events.length >= range.max_results) break;
    } while (pageToken);
    return json(null, 200, { events: events.slice(0, range.max_results), truncated: Boolean(pageToken) });
  } catch { return json('calendar_read_failed', 502); }
});
