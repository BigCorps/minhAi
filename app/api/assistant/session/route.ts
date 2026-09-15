import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { cleanUuid } from '@/lib/orders-server';

const MAX_FUNCTIONS = 8;
const MAX_FUNCTION_KEY = 120;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const companyId = cleanUuid(body?.company_id);
  const sessionId = cleanUuid(body?.session_id);
  const action = String(body?.action || 'read');
  if (!companyId || !sessionId) return NextResponse.json({ error: 'invalid_session_scope' }, { status: 400 });

  const admin = createAdminClient();
  const { data: company } = await admin.from('companies').select('id,is_active').eq('id', companyId).maybeSingle();
  if (!company?.id || company.is_active === false) return NextResponse.json({ error: 'company_not_available' }, { status: 404 });

  const { data: session } = await admin
    .from('assistant_sessions')
    .select('id,company_id,expires_at,context_summary,last_function_keys,messages')
    .eq('id', sessionId)
    .eq('company_id', companyId)
    .maybeSingle();
  if (!session) return NextResponse.json({ error: 'session_not_found' }, { status: 404 });
  if (session.expires_at && new Date(session.expires_at).getTime() <= Date.now()) {
    return NextResponse.json({ error: 'session_expired' }, { status: 410 });
  }

  if (action === 'read') {
    return NextResponse.json({
      session: {
        context_summary: session.context_summary || '',
        last_function_keys: Array.isArray(session.last_function_keys) ? session.last_function_keys : [],
        messages: Array.isArray(session.messages) ? session.messages : [],
      },
    });
  }

  if (action === 'set_last_functions') {
    const values = Array.isArray(body?.last_function_keys)
      ? body.last_function_keys.map((v: unknown) => String(v || '').slice(0, MAX_FUNCTION_KEY)).filter(Boolean).slice(0, MAX_FUNCTIONS)
      : [];
    const { error } = await admin
      .from('assistant_sessions')
      .update({ last_function_keys: values, last_activity_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('company_id', companyId);
    if (error) return NextResponse.json({ error: 'session_update_failed' }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'unsupported_action' }, { status: 400 });
}
