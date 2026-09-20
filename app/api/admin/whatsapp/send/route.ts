import { getPlatformAdminAccess } from '@/lib/platform-admin';
import {
  platformAdminAccessError,
  platformAdminJson,
  platformAdminUnavailable,
} from '@/lib/platform-admin-http';
import { createAdminClient } from '@/lib/supabase-admin';
import {
  getBigCorpsWhatsappSettings,
  latestWhatsappConversation,
  sendBigCorpsWhatsappText,
} from '@/lib/bigcorps-whatsapp';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const access = await getPlatformAdminAccess();
  if (!access.ok) return platformAdminAccessError(access.reason);

  const body = await request.json().catch(() => null) as any;
  const pageId = String(body?.pageId ?? '').trim();
  const fromId = String(body?.fromId ?? '').trim();
  const message = String(body?.message ?? '').trim().slice(0, 2000);

  if (!pageId || !fromId || !message) {
    return platformAdminJson({ ok: false, error: 'mensagem_invalida' }, 400);
  }

  const admin = createAdminClient();
  const settings = await getBigCorpsWhatsappSettings(admin, pageId);
  if (!settings) {
    return platformAdminJson({ ok: false, error: 'numero_nao_configurado' }, 404);
  }

  const { data: thread } = await admin
    .from('bigcorps_whatsapp_threads')
    .select('page_id,from_id')
    .eq('page_id', pageId)
    .eq('from_id', fromId)
    .maybeSingle();

  if (!thread) {
    return platformAdminJson({ ok: false, error: 'thread_nao_encontrada' }, 404);
  }

  try {
    const provider = await sendBigCorpsWhatsappText({
      admin,
      pageId,
      to: fromId,
      message,
    });

    let conv = await latestWhatsappConversation(admin, pageId, fromId);
    if (!conv) {
      const { data, error } = await admin
        .from('conversations')
        .insert({
          company_id: settings.company_id,
          status: 'active',
          total_messages: 0,
          meta_from_id: fromId,
          meta_page_id: pageId,
          meta_platform: 'whatsapp',
        })
        .select('id,company_id,meta_from_id,meta_page_id,meta_platform,created_at,updated_at')
        .single();
      if (!error) conv = data;
    }

    if (conv?.id) {
      const { error: msgError } = await admin.from('messages').insert({
        conversation_id: conv.id,
        role: 'assistant',
        content: `[Admin] ${message}`,
        created_at: new Date().toISOString(),
      });
      if (msgError) {
        console.warn('[admin-whatsapp] Mensagem enviada, mas histórico falhou:', msgError);
      }
    }

    const now = new Date().toISOString();
    await Promise.all([
      admin
        .from('bigcorps_whatsapp_threads')
        .update({
          unread_count: 0,
          last_read_at: now,
          last_outbound_at: now,
          updated_at: now,
        })
        .eq('page_id', pageId)
        .eq('from_id', fromId),
      admin
        .from('conversation_ai_control')
        .upsert({
          conversation_id: fromId,
          page_id: pageId,
          company_id: settings.company_id,
          platform: 'whatsapp',
          ai_enabled: false,
          is_paused: true,
          paused_until: null,
          last_human_response_at: now,
          updated_at: now,
        }, { onConflict: 'conversation_id,page_id' }),
    ]);

    return platformAdminJson({ ok: true, wamid: provider.wamid });
  } catch (error) {
    const e = error as Error & { code?: number; meta?: unknown };
    console.error('[admin-whatsapp] Falha no envio manual:', e.meta ?? e);

    if (e.code === 131047) {
      return platformAdminJson({
        ok: false,
        error: 'janela_24h_encerrada',
        message: 'A janela de atendimento de 24 horas foi encerrada. Aguarde uma nova mensagem deste contato antes de responder livremente.',
      }, 409);
    }

    return platformAdminUnavailable('whatsapp_send_failed');
  }
}
