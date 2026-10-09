import { NextRequest, NextResponse } from 'next/server';
import {
  findSupportThread,
  handleSupportMessage,
  requestHuman,
  supportMessages,
} from '@/lib/support/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPPORT_COOKIE = 'bc_support_v1';

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function tokenFrom(req: NextRequest) {
  return req.cookies.get(SUPPORT_COOKIE)?.value || '';
}

function withToken(response: NextResponse, token: string) {
  if (token) {
    response.cookies.set(SUPPORT_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });
  }
  return response;
}

export async function GET(req: NextRequest) {
  const token = tokenFrom(req);
  const thread = token ? await findSupportThread(token) : null;
  if (!thread) return json({ ok: true, data: { thread: null, messages: [] } });
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

export async function POST(req: NextRequest) {
  if (new URL(req.url).origin !== req.headers.get('origin')) {
    return json({ ok: false, error: 'origin_rejected' }, 403);
  }

  const input = await req.json().catch(() => ({}));
  const token = tokenFrom(req);

  try {
    if (input?.action === 'human') {
      const thread = token ? await findSupportThread(token) : null;
      if (!thread) return json({ ok: false, error: 'thread_not_found' }, 404);
      await requestHuman(thread.id);
      return json({ ok: true, data: { humanRequested: true } });
    }

    const data = await handleSupportMessage(req, {
      token: token || undefined,
      message: input?.message,
      path: input?.path,
    });
    return withToken(json({ ok: true, data: {
      threadId: data.threadId,
      reply: data.reply,
      humanRequested: data.humanRequested,
    } }), data.token);
  } catch (error) {
    const code = error instanceof Error ? error.message : 'support_failed';
    const status = code === 'support_rate_limit'
      ? 429
      : code === 'support_message_required'
        ? 400
        : code === 'support_secret_missing'
          ? 503
          : 503;
    return json({ ok: false, error: code }, status);
  }
}
