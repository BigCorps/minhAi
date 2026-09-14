import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase-server';

const NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  Pragma: 'no-cache',
  Vary: 'Cookie, Authorization',
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS });
}

function cleanUuid(value: unknown) {
  const id = String(value ?? '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    ? id
    : '';
}

function cleanFunctionKey(value: unknown) {
  const key = String(value ?? '').trim();
  return /^[a-z0-9][a-z0-9_:-]{0,127}$/i.test(key) ? key : '';
}

function cleanFallbackCredits(value: unknown) {
  const credits = Number(value);
  return Number.isInteger(credits) && credits > 0 && credits <= 1000
    ? credits
    : null;
}

function cleanMetadata(value: unknown) {
  if (value == null) return null;
  if (typeof value !== 'object' || Array.isArray(value)) return null;

  try {
    const serialized = JSON.stringify(value);
    if (serialized.length > 4096) return null;
    return JSON.parse(serialized) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const companyId = cleanUuid(body?.company_id);
  const functionKey = cleanFunctionKey(body?.function_key);
  const fallbackCredits = cleanFallbackCredits(body?.fallback_credits);
  const metadata = cleanMetadata(body?.metadata);

  if (!companyId) return json({ error: 'company_id_required' }, 400);
  if (!functionKey) return json({ error: 'function_key_required' }, 400);
  if (fallbackCredits == null) return json({ error: 'invalid_fallback_credits' }, 400);
  if (body?.metadata != null && metadata == null) {
    return json({ error: 'invalid_metadata' }, 400);
  }

  const auth = createClient();
  const {
    data: { user },
    error: authError,
  } = await auth.auth.getUser();

  if (authError || !user) {
    return json({ error: 'not_authenticated' }, 401);
  }

  const admin = createAdminClient();

  const { data: company, error: companyError } = await admin
    .from('companies')
    .select('id, user_id')
    .eq('id', companyId)
    .maybeSingle();

  if (companyError || !company) {
    return json({ error: 'company_not_found' }, 404);
  }

  if (company.user_id !== user.id) {
    const { data: membership } = await admin
      .from('company_admins')
      .select('role')
      .eq('company_id', companyId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership || !['owner', 'manager'].includes(String(membership.role))) {
      return json({ error: 'forbidden' }, 403);
    }
  }

  const { error: usageError } = await admin.rpc('app_register_function_usage_secure', {
    p_company_id: companyId,
    p_function_key: functionKey,
    p_fallback_credits: fallbackCredits,
    p_metadata: metadata,
  });

  if (usageError) {
    const message = String(usageError.message || '');

    if (message.includes('insufficient_credits')) {
      return json({ error: 'insufficient_credits' }, 402);
    }
    if (message.includes('invalid_credits_consumed')) {
      return json({ error: 'invalid_credits_consumed' }, 400);
    }
    if (message.includes('company_without_owner')) {
      return json({ error: 'company_without_owner' }, 409);
    }

    console.error('[register-authenticated-function-usage]', usageError);
    return json({ error: 'usage_registration_failed' }, 500);
  }

  return json({ ok: true });
}
