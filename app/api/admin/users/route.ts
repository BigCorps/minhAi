import {
  getPlatformAdminAccess,
} from '@/lib/platform-admin';
import {
  platformAdminAccessError,
  platformAdminJson,
  platformAdminUnavailable,
} from '@/lib/platform-admin-http';
import { createAdminClient } from '@/lib/supabase-admin';
import {
  PLATFORM_APP_KEYS,
  type PlatformAppKey,
} from '@/lib/platform-products';
import type {
  PlatformUserStatus,
  PlatformUsersSort,
} from '@/types/platform-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const USER_STATUSES: PlatformUserStatus[] = [
  'online',
  'today',
  'recent',
  'idle',
  'inactive',
  'never',
];

const SORTS: PlatformUsersSort[] = [
  'last_seen_desc',
  'created_desc',
  'created_asc',
  'name_asc',
];

function integerParam(
  value: string | null,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function appParam(value: string | null): PlatformAppKey | null {
  if (!value) return null;

  return PLATFORM_APP_KEYS.includes(value as PlatformAppKey)
    ? (value as PlatformAppKey)
    : null;
}

function statusParam(value: string | null): PlatformUserStatus | null {
  if (!value) return null;

  return USER_STATUSES.includes(value as PlatformUserStatus)
    ? (value as PlatformUserStatus)
    : null;
}

function sortParam(value: string | null): PlatformUsersSort {
  if (!value) return 'last_seen_desc';

  return SORTS.includes(value as PlatformUsersSort)
    ? (value as PlatformUsersSort)
    : 'last_seen_desc';
}

export async function GET(request: Request) {
  const access = await getPlatformAdminAccess();

  if (!access.ok) {
    return platformAdminAccessError(access.reason);
  }

  const url = new URL(request.url);
  const page = integerParam(url.searchParams.get('page'), 1, 1, 100_000);
  const requestedPerPage = integerParam(
    url.searchParams.get('perPage'),
    25,
    10,
    100,
  );

  const perPage = [10, 25, 50, 100].includes(requestedPerPage)
    ? requestedPerPage
    : 25;

  // A busca administrativa é curta por desenho; isso evita payloads grandes e
  // consultas acidentais com strings arbitrariamente longas.
  const search = (url.searchParams.get('search') ?? '')
    .trim()
    .slice(0, 120);

  const appKey = appParam(url.searchParams.get('app'));
  const status = statusParam(url.searchParams.get('status'));
  const sort = sortParam(url.searchParams.get('sort'));

  const admin = createAdminClient();

  const { data, error } = await admin.rpc(
    'admin_platform_users_page',
    {
      p_search: search || null,
      p_app_key: appKey,
      p_status: status,
      p_page: page,
      p_per_page: perPage,
      p_sort: sort,
    },
  );

  if (error || !data) {
    console.error('[platform-admin] Falha ao listar usuários:', error);
    return platformAdminUnavailable('admin_users_unavailable');
  }

  return platformAdminJson({
    ok: true,
    data,
  });
}
