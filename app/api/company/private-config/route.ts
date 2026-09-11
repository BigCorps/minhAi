// app/api/company/private-config/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase-server';
import { stripCompanySecrets } from '@/lib/company-security';

const RESPONSE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  Pragma: 'no-cache',
  Vary: 'Cookie, Authorization',
};

type Scope =
  | 'safe'
  | 'payments'
  | 'wifi'
  | 'payment-status'
  | 'fiscal'
  | 'printnode';

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: RESPONSE_HEADERS });
}

function cleanCompanyId(value: string | null) {
  const id = String(value || '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    ? id
    : '';
}

async function loadAuthorizedCompany(companyId: string) {
  const auth = createClient();
  const {
    data: { user },
    error: authError,
  } = await auth.auth.getUser();

  if (authError || !user) return { error: 'unauthenticated' as const, status: 401 };

  const admin = createAdminClient();
  const { data: company, error } = await admin
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .maybeSingle();

  if (error || !company) return { error: 'company_not_found' as const, status: 404 };

  if (company.user_id !== user.id) {
    const { data: membership } = await admin
      .from('company_admins')
      .select('role')
      .eq('company_id', companyId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership || !['owner', 'manager'].includes(String(membership.role))) {
      return { error: 'forbidden' as const, status: 403 };
    }
  }

  return { admin, company, user };
}

export async function GET(request: NextRequest) {
  const companyId = cleanCompanyId(request.nextUrl.searchParams.get('company_id'));
  const scope = String(request.nextUrl.searchParams.get('scope') || 'safe') as Scope;

  if (!companyId) return json({ error: 'company_id_required' }, 400);
  if (!['safe', 'payments', 'wifi', 'payment-status', 'fiscal', 'printnode'].includes(scope)) {
    return json({ error: 'invalid_scope' }, 400);
  }

  const access = await loadAuthorizedCompany(companyId);
  if ('error' in access) return json({ error: access.error }, access.status);

  const { company } = access;

  if (scope === 'payments') {
    return json({
      config: {
        mp_access_token: company.mp_access_token ?? null,
        mp_terminal_id: company.mp_terminal_id ?? null,
        receiving_pix_key: company.receiving_pix_key ?? null,
        receiving_pix_key_type: company.receiving_pix_key_type ?? null,
        infinitepay_handle: company.infinitepay_handle ?? null,
      },
    });
  }

  if (scope === 'wifi') {
    return json({
      config: {
        wifi_network_name: company.wifi_network_name ?? '',
        wifi_network_password: company.wifi_network_password ?? '',
        name: company.name ?? '',
      },
    });
  }

  if (scope === 'payment-status') {
    return json({
      config: {
        mp_point_configured: Boolean(company.mp_access_token && company.mp_terminal_id),
        pix_configured: Boolean(company.receiving_pix_key),
        infinitepay_configured: Boolean(company.infinitepay_handle),
      },
    });
  }

  if (scope === 'fiscal') {
    return json({
      config: {
        // O token do provedor nunca precisa ser exibido no navegador.
        brasilnfe_token: company.brasilnfe_token ? '__configured__' : null,
        nfe_csc_identificador: company.nfe_csc_identificador ?? '',
        nfe_csc_codigo: company.nfe_csc_codigo ?? '',
      },
    });
  }

  if (scope === 'printnode') {
    return json({
      config: {
        printnode_api_key: company.printnode_api_key ?? '',
      },
    });
  }

  return json({ config: stripCompanySecrets(company) });
}
