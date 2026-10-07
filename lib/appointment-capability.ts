import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
const secret = () => process.env.APPOINTMENT_ACTION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
export function signAppointmentCapability(companyId: string, appointmentId: string, action: string) {
  const key = secret(); if (!key) throw Error('capability_unavailable');
  const value = Buffer.from(JSON.stringify({ company_id: companyId, appointment_id: appointmentId, action, exp: Math.floor(Date.now() / 1000) + 1800 })).toString('base64url');
  return `${value}.${createHmac('sha256', key).update(value).digest('base64url')}`;
}
export function verifyAppointmentCapability(token: unknown, companyId: string, appointmentId: string, action: string) {
  const key = secret(); if (!key || typeof token !== 'string' || token.length > 1024) return false;
  const parts = token.split('.'); if (parts.length !== 2 || !parts.every(part => /^[a-zA-Z0-9_-]+$/.test(part))) return false;
  const expected = createHmac('sha256', key).update(parts[0]).digest(); const actual = Buffer.from(parts[1], 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;
  try { const value = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')); const now = Math.floor(Date.now() / 1000);
    return value.company_id === companyId && value.appointment_id === appointmentId && value.action === action && Number.isInteger(value.exp) && value.exp > now && value.exp <= now + 1800;
  } catch { return false; }
}
