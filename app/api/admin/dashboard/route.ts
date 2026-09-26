import {
  getPlatformAdminAccess,
} from '@/lib/platform-admin';
import {
  platformAdminAccessError,
  platformAdminJson,
  platformAdminUnavailable,
} from '@/lib/platform-admin-http';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const access = await getPlatformAdminAccess();

  if (!access.ok) {
    return platformAdminAccessError(access.reason);
  }

  const admin = createAdminClient();

  const { data, error } = await admin.rpc(
    'admin_platform_dashboard_snapshot',
    {
      p_days: 30,
    },
  );

  if (error || !data) {
    console.error('[platform-admin] Falha no snapshot do dashboard:', error);
    return platformAdminUnavailable('admin_data_unavailable');
  }

  // O snapshot histórico nasceu antes do Midia.Pro e mantém uma lista fixa
  // de oito produtos. Acrescentamos o nono produto aqui sem reescrever a RPC
  // inteira: o tracker continua sendo a fonte de verdade e os totais/daily da
  // RPC já consideram qualquer app presente nas tabelas de atividade.
  const today = new Date();
  const date30d = new Date(Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate() - 29,
  )).toISOString().slice(0, 10);

  const [{ data: midiaStats, error: midiaStatsError }, { data: midiaDaily, error: midiaDailyError }] = await Promise.all([
    admin
      .from('platform_user_app_stats')
      .select('user_id,last_seen_at')
      .eq('app_key', 'midia'),
    admin
      .from('platform_user_app_daily')
      .select('user_id,activity_date,page_views,active_seconds')
      .eq('app_key', 'midia')
      .gte('activity_date', date30d),
  ]);

  if (midiaStatsError || midiaDailyError) {
    console.error('[platform-admin] Falha ao complementar Midia.Pro:', midiaStatsError || midiaDailyError);
  }

  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
  const stats = midiaStats ?? [];
  const daily = midiaDaily ?? [];
  const uniqueUsers = new Set(stats.map((row) => row.user_id));
  const active7d = new Set(
    stats
      .filter((row) => row.last_seen_at && new Date(row.last_seen_at).getTime() >= weekAgo)
      .map((row) => row.user_id),
  );
  const active30d = new Set(
    stats
      .filter((row) => row.last_seen_at && new Date(row.last_seen_at).getTime() >= monthAgo)
      .map((row) => row.user_id),
  );
  const pageViews30d = daily.reduce((sum, row) => sum + Number(row.page_views ?? 0), 0);
  const activeSeconds30d = daily.reduce((sum, row) => sum + Number(row.active_seconds ?? 0), 0);
  const lastSeenAt = stats.reduce<string | null>((latest, row) => {
    if (!row.last_seen_at) return latest;
    if (!latest || row.last_seen_at > latest) return row.last_seen_at;
    return latest;
  }, null);

  const snapshot = data as any;
  const apps = Array.isArray(snapshot.apps)
    ? snapshot.apps.filter((app: any) => app?.appKey !== 'midia')
    : [];

  apps.push({
    appKey: 'midia',
    users: uniqueUsers.size,
    active7d: active7d.size,
    active30d: active30d.size,
    pageViews30d,
    activeMinutes30d: Math.round(activeSeconds30d / 60),
    lastSeenAt,
  });

  return platformAdminJson({
    ok: true,
    data: {
      ...snapshot,
      apps,
    },
  });
}
