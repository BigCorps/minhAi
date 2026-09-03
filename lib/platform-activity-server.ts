import type { User } from '@supabase/supabase-js';

import { createAdminClient } from '@/lib/supabase-admin';
import {
  normalizePlatformHostname,
  resolvePlatformApp,
  sanitizePlatformPath,
  type PlatformActivityKind,
  type PlatformAppKey,
} from '@/lib/platform-products';

type RecordPlatformActivityInput = {
  user: User;
  appKey: PlatformAppKey;
  kind: PlatformActivityKind;
  pathname: string;
  hostname: string;
  activeSecondsDelta?: number;
};

function clampActiveSeconds(value: number | undefined): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(90, Math.round(value ?? 0)));
}

export async function recordPlatformActivity({
  user,
  appKey,
  kind,
  pathname,
  hostname,
  activeSecondsDelta = 0,
}: RecordPlatformActivityInput): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin.rpc('record_platform_activity', {
    p_user_id: user.id,
    p_app_key: appKey,
    p_event_kind: kind,
    p_path: sanitizePlatformPath(pathname),
    p_host: normalizePlatformHostname(hostname).slice(0, 255),
    p_active_seconds_delta: clampActiveSeconds(activeSecondsDelta),
    p_auth_event_at: user.last_sign_in_at ?? null,
  });

  if (error) {
    throw error;
  }
}

export async function recordPlatformOAuthLogin({
  user,
  hostname,
  nextPath,
}: {
  user: User;
  hostname: string;
  nextPath: string;
}): Promise<void> {
  const appKey = resolvePlatformApp(hostname, nextPath);
  if (!appKey) return;

  await recordPlatformActivity({
    user,
    appKey,
    kind: 'login',
    pathname: nextPath,
    hostname,
    activeSecondsDelta: 0,
  });
}
