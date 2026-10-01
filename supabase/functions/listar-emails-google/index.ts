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

async function authorizeCompany(req: Request, admin: any, companyId: string) {
  const token = bearer(req);
  if (!token) return { ok: false, status: 401, error: 'unauthorized' };

  if (SERVICE_ROLE && token === SERVICE_ROLE) {
    return { ok: true, internal: true, userId: null };
  }

  const { data: authData, error: authError } = await admin.auth.getUser(token);
  const user = authData?.user;
  if (authError || !user) return { ok: false, status: 401, error: 'unauthorized' };

  const { data: company, error: companyError } = await admin
    .from('companies')
    .select('id,user_id,is_active')
    .eq('id', companyId)
    .maybeSingle();

  if (companyError || !company || company.is_active === false) {
    return { ok: false, status: 404, error: 'company_not_found' };
  }

  if (company.user_id === user.id) {
    return { ok: true, internal: false, userId: user.id };
  }

  const { data: member } = await admin
    .from('company_admins')
    .select('role')
    .eq('company_id', companyId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!member) return { ok: false, status: 403, error: 'forbidden' };
  return { ok: true, internal: false, userId: user.id };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ success: false, error: 'method_not_allowed', emails: [] }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const companyId = String(body?.company_id || '').trim();
    const maxResults = Math.max(1, Math.min(100, Number(body?.max_results || 20)));

    if (!companyId) return json({ success: false, error: 'company_id_required', emails: [] }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const auth = await authorizeCompany(req, admin, companyId);
    if (!auth.ok) return json({ success: false, error: auth.error, emails: [] }, auth.status);

    const { data: emails, error } = await admin
      .from('email_logs')
      .select('id, to_email, subject, body, sent_at, status')
      .eq('company_id', companyId)
      .order('sent_at', { ascending: false })
      .limit(maxResults);

    if (error) throw new Error(`Erro ao buscar emails: ${error.message}`);

    const formatted = (emails || []).map((e: any) => ({
      id: e.id,
      threadId: e.id,
      subject: e.subject || '(Sem assunto)',
      from: 'assistente@minhAi',
      to: [e.to_email],
      date: e.sent_at,
      snippet: e.body ? e.body.substring(0, 120) + (e.body.length > 120 ? '...' : '') : '',
      body: e.body || '',
      hasAttachments: false,
      isRead: true,
    }));

    return json({
      success: true,
      emails: formatted,
      count: formatted.length,
      type: 'sent',
    });
  } catch (error: any) {
    console.error('listar-emails-google:', error?.message || error);
    return json({ success: false, error: error?.message || 'internal_error', emails: [] }, 400);
  }
});
