import { getPlatformAdminAccess } from '@/lib/platform-admin';
import {
  platformAdminAccessError,
  platformAdminJson,
  platformAdminUnavailable,
} from '@/lib/platform-admin-http';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STAGES = new Set(['account', 'connected', 'activated', 'pricing', 'purchase']);
const PLANS = new Set(['free', 'link', 'pro', 'vip']);
const SORTS = new Set(['score_desc', 'recent_desc', 'volume_desc', 'savings_desc']);

function intParam(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export async function GET(request: Request) {
  const access = await getPlatformAdminAccess();
  if (!access.ok) return platformAdminAccessError(access.reason);

  const url = new URL(request.url);
  const search = (url.searchParams.get('search') || '').trim().slice(0, 120);
  const rawStage = (url.searchParams.get('stage') || '').toLowerCase();
  const rawPlan = (url.searchParams.get('plan') || '').toLowerCase();
  const rawSort = (url.searchParams.get('sort') || 'score_desc').toLowerCase();
  const stage = STAGES.has(rawStage) ? rawStage : null;
  const plan = PLANS.has(rawPlan) ? rawPlan : null;
  const sort = SORTS.has(rawSort) ? rawSort : 'score_desc';
  const minScore = intParam(url.searchParams.get('minScore'), 0, 0, 300);
  const page = intParam(url.searchParams.get('page'), 1, 1, 100_000);
  const requestedPerPage = intParam(url.searchParams.get('perPage'), 25, 10, 100);
  const perPage = [10, 25, 50, 100].includes(requestedPerPage) ? requestedPerPage : 25;

  const admin = createAdminClient();
  const { data, error } = await admin.rpc('admin_pixwiki_v2_leads_page', {
    p_search: search || null,
    p_stage: stage,
    p_plan: plan,
    p_min_score: minScore,
    p_page: page,
    p_per_page: perPage,
    p_sort: sort,
  });

  if (error || !data) {
    console.error('[platform-admin] Falha ao listar Leads PixWiki:', error);
    return platformAdminUnavailable('pixwiki_leads_unavailable');
  }

  return platformAdminJson({ ok: true, data });
}
