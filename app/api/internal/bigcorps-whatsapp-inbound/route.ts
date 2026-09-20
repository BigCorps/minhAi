import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase-admin';
import {
  classifyBigCorpsWhatsappSource,
  getBigCorpsWhatsappSettings,
  sendBigCorpsWhatsappText,
} from '@/lib/bigcorps-whatsapp';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function safeSecretEqual(received: string, expected: string) {
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
    },
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as any;
  const pageId = String(body?.pageId ?? '').trim();
  const fromId = String(body?.fromId ?? '').trim();
  const conversationId = String(body?.conversationId ?? '').trim();
  const text = String(body?.text ?? '').trim().slice(0, 4000);
  const receivedSecret = request.headers.get('x-bigcorps-webhook-secret') ?? '';

  if (!pageId || !fromId || !conversationId || !text || !receivedSecret) {
    return json({ ok: false, error: 'invalid_request' }, 400);
  }

  const admin = createAdminClient();
  const settings = await getBigCorpsWhatsappSettings(admin, pageId);
  if (!settings || !safeSecretEqual(receivedSecret, settings.webhook_secret)) {
    return json({ ok: false, error: 'unauthorized' }, 401);
  }

  try {
    const source = await classifyBigCorpsWhatsappSource(admin, fromId);

    const { data: claim, error: claimError } = await admin.rpc(
      'bigcorps_whatsapp_record_inbound',
      {
        p_page_id: pageId,
        p_from_id: fromId,
        p_sender_name: source.senderName,
        p_message_text: text,
        p_source: source.source,
        p_source_context: source.context,
      },
    );

    if (claimError) {
      console.error('[bigcorps-whatsapp] Falha ao registrar inbound:', claimError);
      return json({ ok: false, error: 'record_failed' }, 500);
    }

    const shouldAutoReply = claim?.should_auto_reply === true;
    if (!shouldAutoReply) {
      return json({ ok: true, recorded: true, autoReply: false });
    }

    const replyText = String(claim?.auto_reply_text ?? settings.auto_reply_text ?? '').trim();
    if (!replyText) {
      await admin
        .from('bigcorps_whatsapp_threads')
        .update({ auto_reply_claimed_at: null, updated_at: new Date().toISOString() })
        .eq('page_id', pageId)
        .eq('from_id', fromId);
      return json({ ok: true, recorded: true, autoReply: false });
    }

    try {
      const provider = await sendBigCorpsWhatsappText({
        admin,
        pageId,
        to: fromId,
        message: replyText,
      });

      const now = new Date().toISOString();
      const [historyResult] = await Promise.all([
        admin.from('messages').insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: `[Automática] ${replyText}`,
          created_at: now,
        }),
        admin
          .from('bigcorps_whatsapp_threads')
          .update({
            auto_reply_claimed_at: null,
            last_auto_reply_at: now,
            last_outbound_at: now,
            updated_at: now,
          })
          .eq('page_id', pageId)
          .eq('from_id', fromId),
      ]);

      if (historyResult.error) {
        console.warn('[bigcorps-whatsapp] Auto resposta enviada, mas histórico falhou:', historyResult.error);
      }

      return json({ ok: true, recorded: true, autoReply: true, wamid: provider.wamid });
    } catch (sendError) {
      await admin
        .from('bigcorps_whatsapp_threads')
        .update({ auto_reply_claimed_at: null, updated_at: new Date().toISOString() })
        .eq('page_id', pageId)
        .eq('from_id', fromId);

      console.error('[bigcorps-whatsapp] Falha ao enviar auto resposta:', sendError);
      return json({ ok: false, error: 'auto_reply_failed' }, 502);
    }
  } catch (error) {
    console.error('[bigcorps-whatsapp] Erro no callback inbound:', error);
    return json({ ok: false, error: 'internal_error' }, 500);
  }
}
