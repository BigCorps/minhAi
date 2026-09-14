import { createHmac } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  Pragma: 'no-cache',
  Vary: 'Cookie, Authorization',
};

const LOCAL_RATE_LIMIT = 20;
const LOCAL_RATE_WINDOW_MS = 60_000;
const DB_VISITOR_RATE_LIMIT = 12;
const DB_COMPANY_RATE_LIMIT = 180;

const localRateMap = new Map<string, { count: number; resetAt: number }>();

function json(body: unknown, status = 200, extraHeaders?: Record<string, string>) {
  return NextResponse.json(body, {
    status,
    headers: { ...NO_STORE_HEADERS, ...(extraHeaders || {}) },
  });
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

function cleanSource(value: unknown) {
  const source = String(value ?? '').trim();
  if (!source) return 'public_assistant';
  return /^[a-z0-9][a-z0-9_.:-]{0,63}$/i.test(source)
    ? source
    : 'public_assistant';
}

function requestIp(request: NextRequest) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    'unknown'
  );
}

function rateFingerprint(request: NextRequest) {
  const ip = requestIp(request);
  const userAgent = String(request.headers.get('user-agent') || 'unknown').slice(0, 300);
  const secret =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'minhai-public-usage';

  return createHmac('sha256', secret)
    .update(`${ip}|${userAgent}`)
    .digest('hex')
    .slice(0, 40);
}

function passLocalRateLimit(key: string) {
  const now = Date.now();
  const current = localRateMap.get(key);

  if (!current || now >= current.resetAt) {
    localRateMap.set(key, { count: 1, resetAt: now + LOCAL_RATE_WINDOW_MS });
    return true;
  }

  if (current.count >= LOCAL_RATE_LIMIT) return false;
  current.count += 1;
  return true;
}

async function isOwnerOrManager(
  admin: ReturnType<typeof createAdminClient>,
  company: { user_id: string | null },
  userId: string,
) {
  if (company.user_id === userId) return true;

  const { data: membership } = await admin
    .from('company_admins')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  return Boolean(
    membership &&
    ['owner', 'manager'].includes(String(membership.role)),
  );
}

export async function POST(request: NextRequest) {
  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    return json({ error: 'cross_site_request_blocked' }, 403);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  // O endpoint público nunca aceita custo informado pelo navegador.
  for (const forbidden of [
    'credits',
    'credits_consumed',
    'p_credits_consumed',
    'fallback_credits',
    'units',
    'amount',
  ]) {
    if (Object.prototype.hasOwnProperty.call(body || {}, forbidden)) {
      return json({ error: 'client_cost_not_allowed' }, 400);
    }
  }

  const companyId = cleanUuid(body?.company_id);
  const functionKey = cleanFunctionKey(body?.function_key);
  const source = cleanSource(body?.source);

  if (!companyId) return json({ error: 'company_id_required' }, 400);
  if (!functionKey) return json({ error: 'function_key_required' }, 400);

  const fingerprint = rateFingerprint(request);
  const localKey = `${companyId}:${fingerprint}`;

  if (!passLocalRateLimit(localKey)) {
    return json(
      { error: 'rate_limited' },
      429,
      { 'Retry-After': '60' },
    );
  }

  const admin = createAdminClient();

  const { data: company, error: companyError } = await admin
    .from('companies')
    .select('id,user_id,is_active,is_public')
    .eq('id', companyId)
    .maybeSingle();

  if (companyError || !company || company.is_active !== true) {
    return json({ error: 'company_not_found' }, 404);
  }

  if (!company.user_id) {
    return json({ error: 'company_without_owner' }, 409);
  }

  // Se houver sessão, dono/manager pode usar o mesmo helper em componentes
  // compartilhados mesmo quando a empresa não estiver pública.
  let authorizedManagement = false;
  try {
    const auth = createClient();
    const {
      data: { user },
    } = await auth.auth.getUser();

    if (user) {
      if (company.user_id === user.id) {
        authorizedManagement = true;
      } else {
        const { data: membership } = await admin
          .from('company_admins')
          .select('role')
          .eq('company_id', companyId)
          .eq('user_id', user.id)
          .maybeSingle();

        authorizedManagement = Boolean(
          membership &&
          ['owner', 'manager'].includes(String(membership.role)),
        );
      }
    }
  } catch {
    // Ausência de sessão é esperada no assistente público.
  }

  if (!authorizedManagement && company.is_public !== true) {
    return json({ error: 'company_not_found' }, 404);
  }

  const { data: fn, error: fnError } = await admin
    .from('assistant_functions')
    .select('function_key,is_active,default_enabled,credits_per_use')
    .eq('function_key', functionKey)
    .maybeSingle();

  if (fnError || !fn || fn.is_active !== true) {
    // Não existe fallback público para chaves fora do catálogo.
    return json({ error: 'function_not_available' }, 404);
  }

  const { data: setting, error: settingError } = await admin
    .from('company_function_settings')
    .select('is_enabled,custom_credits_per_use')
    .eq('company_id', companyId)
    .eq('function_key', functionKey)
    .maybeSingle();

  if (settingError) {
    console.error('[register-public-function-usage] settings lookup:', settingError);
    return json({ error: 'function_settings_lookup_failed' }, 500);
  }

  const enabled =
    setting?.is_enabled == null
      ? fn.default_enabled === true
      : setting.is_enabled === true;

  if (!enabled) {
    return json({ error: 'function_disabled' }, 403);
  }

  const officialCost = Math.max(
    0,
    Number(setting?.custom_credits_per_use ?? fn.credits_per_use ?? 0),
  );

  const isPublicUsage = !authorizedManagement;
  const metadata: Record<string, unknown> = {
    source,
    public_usage: isPublicUsage,
  };

  if (isPublicUsage) {
    metadata.public_rate_key = fingerprint;

    // Camada persistente de rate limit. A trava local acima reduz rajadas no
    // mesmo worker; estas consultas cobrem múltiplas instâncias.
    const since = new Date(Date.now() - 60_000).toISOString();

    const [
      { count: visitorCount, error: visitorRateError },
      { count: companyCount, error: companyRateError },
    ] = await Promise.all([
      admin
        .from('assistant_function_logs')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .gte('executed_at', since)
        .contains('metadata', {
          public_usage: true,
          public_rate_key: fingerprint,
        }),
      admin
        .from('assistant_function_logs')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .gte('executed_at', since)
        .contains('metadata', { public_usage: true }),
    ]);

    if (visitorRateError || companyRateError) {
      console.error(
        '[register-public-function-usage] rate lookup:',
        visitorRateError || companyRateError,
      );
      return json({ error: 'rate_check_failed' }, 503);
    }

    if ((visitorCount || 0) >= DB_VISITOR_RATE_LIMIT) {
      return json(
        { error: 'rate_limited' },
        429,
        { 'Retry-After': '60' },
      );
    }

    if ((companyCount || 0) >= DB_COMPANY_RATE_LIMIT) {
      return json(
        { error: 'company_rate_limited' },
        429,
        { 'Retry-After': '60' },
      );
    }
  }

  // Funções oficialmente gratuitas são registradas sem passar fallback=1
  // pelo núcleo de débito. Assim nunca há risco de cobrar uma função zero-cost
  // caso o catálogo mude entre a leitura e a chamada seguinte.
  if (officialCost === 0) {
    const { error: logError } = await admin
      .from('assistant_function_logs')
      .insert({
        company_id: companyId,
        user_id: company.user_id,
        function_key: functionKey,
        credits_consumed: 0,
        executed_at: new Date().toISOString(),
        metadata,
      });

    if (logError) {
      console.error('[register-public-function-usage] zero-cost log:', logError);
      return json({ error: 'usage_registration_failed' }, 500);
    }

    return json({ ok: true });
  }

  // O fallback abaixo é calculado no servidor. O navegador nunca consegue
  // escolher o valor debitado. O núcleo seguro revalida o custo do catálogo.
  const { error: usageError } = await admin.rpc(
    'app_register_function_usage_secure',
    {
      p_company_id: companyId,
      p_function_key: functionKey,
      p_fallback_credits: Math.max(1, Math.floor(officialCost)),
      p_metadata: metadata,
    },
  );

  if (usageError) {
    const message = String(usageError.message || '');

    if (message.includes('insufficient_credits')) {
      return json({ error: 'insufficient_credits' }, 402);
    }
    if (message.includes('company_without_owner')) {
      return json({ error: 'company_without_owner' }, 409);
    }

    console.error('[register-public-function-usage]', usageError);
    return json({ error: 'usage_registration_failed' }, 500);
  }

  return json({ ok: true });
}
