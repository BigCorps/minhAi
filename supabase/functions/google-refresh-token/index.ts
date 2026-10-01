/** Secure Google OAuth refresh.
 *
 * - chamadas internas com service_role continuam permitidas;
 * - chamadas de usuário exigem JWT válido + ownership/admin da empresa;
 * - is_system é exclusivamente interno.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function bearer(req: Request): string {
  const raw = req.headers.get('authorization') || '';
  return raw.toLowerCase().startsWith('bearer ') ? raw.slice(7).trim() : '';
}

async function resolveActor(req: Request, admin: any) {
  const token = bearer(req);
  if (!token) return { ok: false, status: 401, error: 'unauthorized', internal: false, user: null };

  if (SERVICE_ROLE && token === SERVICE_ROLE) {
    return { ok: true, status: 200, error: null, internal: true, user: null };
  }

  const { data, error } = await admin.auth.getUser(token);
  const user = data?.user || null;
  if (error || !user) {
    return { ok: false, status: 401, error: 'unauthorized', internal: false, user: null };
  }

  return { ok: true, status: 200, error: null, internal: false, user };
}

async function canManageCompany(admin: any, companyId: string, userId: string) {
  const { data: company, error } = await admin
    .from('companies')
    .select('id,user_id,is_active')
    .eq('id', companyId)
    .maybeSingle();

  if (error || !company || company.is_active === false) return false;
  if (company.user_id === userId) return true;

  const { data: member } = await admin
    .from('company_admins')
    .select('role')
    .eq('company_id', companyId)
    .eq('user_id', userId)
    .maybeSingle();

  return !!member;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ success: false, error: 'method_not_allowed' }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const companyId = String(body?.company_id || '').trim();
    const isSystem = body?.is_system === true;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const actor = await resolveActor(req, admin);
    if (!actor.ok) return json({ success: false, error: actor.error }, actor.status);

    if (isSystem && !actor.internal) {
      return json({ success: false, error: 'system_refresh_internal_only' }, 403);
    }

    if (!isSystem) {
      if (!companyId) return json({ success: false, error: 'company_id_required' }, 400);
      if (!actor.internal) {
        const allowed = await canManageCompany(admin, companyId, actor.user.id);
        if (!allowed) return json({ success: false, error: 'forbidden' }, 403);
      }
    }

    let account: any;

    if (isSystem) {
      const { data, error } = await admin
        .from('system_email_account')
        .select('*')
        .eq('is_active', true)
        .single();
      if (error || !data) throw new Error('Conta sistema não encontrada');
      account = data;
    } else {
      const { data, error } = await admin
        .from('google_accounts')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .single();
      if (error || !data) throw new Error('Conta Google não encontrada ou inativa');
      account = data;
    }

    const clientId =
      Deno.env.get('GOOGLE_CLIENT_ID') ||
      Deno.env.get('GOOGLE_OAUTH_CLIENT_ID') ||
      '';
    const clientSecret =
      Deno.env.get('GOOGLE_CLIENT_SECRET') ||
      Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET') ||
      '';

    if (!clientId || !clientSecret) throw new Error('Credenciais OAuth Google não configuradas');

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: account.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    const tokens = await response.json();
    if (!response.ok) {
      console.error('google-refresh-token: Google API rejeitou o refresh');
      throw new Error('Falha ao renovar token com o Google');
    }

    const expiresAt = new Date(Date.now() + Number(tokens.expires_in || 3600) * 1000);
    const updatePayload = {
      access_token: tokens.access_token,
      expires_at: expiresAt.toISOString(),
      last_token_refresh: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSystem) {
      const { error } = await admin
        .from('system_email_account')
        .update(updatePayload)
        .eq('is_active', true);
      if (error) throw error;
    } else {
      const { error } = await admin
        .from('google_accounts')
        .update(updatePayload)
        .eq('company_id', companyId);
      if (error) throw error;
    }

    return json({ success: true, expires_at: expiresAt.toISOString() });
  } catch (error: any) {
    console.error('google-refresh-token:', error?.message || error);
    return json({ success: false, error: error?.message || 'internal_error' }, 400);
  }
});
