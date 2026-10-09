import { NextResponse } from 'next/server';
import {
  findSupportThread,
  handleSupportMessage,
  requestHuman,
  supportMessages,
} from '@/lib/support/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = String(url.searchParams.get('token') || '');
  const thread = await findSupportThread(token);
  if (!thread) return json({ ok: false, error: 'thread_not_found' }, 404);
  try {
    const messages = await supportMessages(thread.id);
    return json({
      ok: true,
      data: {
        thread: {
          id: thread.id,
          product: thread.product,
          status: thread.status,
          humanRequested: thread.human_requested,
        },
        messages,
      },
    });
  } catch {
    return json({ ok: false, error: 'support_unavailable' }, 503);
  }
}

export async function POST(req: Request) {
  if (new URL(req.url).origin !== req.headers.get('origin')) {
    return json({ ok: false, error: 'origin_rejected' }, 403);
  }
  const input = await req.json().catch(() => ({}));
  try {
    if (input?.action === 'human') {
      const thread = await findSupportThread(String(input?.token || ''));
      if (!thread) return json({ ok: false, error: 'thread_not_found' }, 404);
      await requestHuman(thread.id);
      return json({ ok: true, data: { humanRequested: true } });
    }
    const data = await handleSupportMessage(req, input || {});
    return json({ ok: true, data });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'support_failed';
    const status = code === 'support_rate_limit' ? 429 : code === 'support_message_required' ? 400 : 503;
    return json({ ok: false, error: code }, status);
  }
}
