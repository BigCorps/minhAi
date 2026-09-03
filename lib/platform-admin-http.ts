import { NextResponse } from 'next/server';

import {
  platformAdminHttpStatus,
  type PlatformAdminAccessReason,
} from '@/lib/platform-admin';

const ADMIN_RESPONSE_HEADERS = {
  'Cache-Control': 'private, no-store, no-cache, max-age=0, must-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
  'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
  'X-Content-Type-Options': 'nosniff',
} as const;

export function platformAdminJson(
  payload: unknown,
  status = 200,
): NextResponse {
  return NextResponse.json(payload, {
    status,
    headers: ADMIN_RESPONSE_HEADERS,
  });
}

export function platformAdminAccessError(
  reason: PlatformAdminAccessReason,
): NextResponse {
  return platformAdminJson(
    {
      ok: false,
      error: reason,
    },
    platformAdminHttpStatus(reason),
  );
}

export function platformAdminUnavailable(
  code: string,
): NextResponse {
  return platformAdminJson(
    {
      ok: false,
      error: code,
    },
    503,
  );
}
