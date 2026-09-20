import { getPlatformAdminAccess } from '@/lib/platform-admin';
import {
  platformAdminAccessError,
  platformAdminJson,
  platformAdminUnavailable,
} from '@/lib/platform-admin-http';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEFAULT_MESSAGE = `Olá! 👋 Esta é uma mensagem automática da BigCorps.\n\nEste número é utilizado exclusivamente para o envio de notificações, confirmações e mensagens dos aplicativos BigCorps e minhAi.\n\nPara atendimento, dúvidas ou suporte, fale com nossa equipe pelo WhatsApp: (11) 92682-8418.\n\nObrigado!\nEquipe BigCorps / minhAi`;

export async function GET() {
  const access = await getPlatformAdminAccess();
  if (!access.ok) return platformAdminAccessError(access.reason);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('bigcorps_whatsapp_settings')
    .select('id,company_id,whatsapp_number_id,support_number,auto_reply_text,auto_reply_enabled,window_hours,updated_at')
    .eq('id', 'shared')
    .maybeSingle();

  if (error) {
    console.error('[admin-whatsapp] Falha ao carregar settings:', error);
    return platformAdminUnavailable('whatsapp_settings_unavailable');
  }

  if (!data) {
    return platformAdminJson({
      ok: false,
      error: 'whatsapp_settings_not_configured',
      defaults: { support_number: '(11) 92682-8418', auto_reply_text: DEFAULT_MESSAGE, window_hours: 24 },
    }, 503);
  }

  return platformAdminJson({ ok: true, data });
}

export async function PATCH(request: Request) {
  const access = await getPlatformAdminAccess();
  if (!access.ok) return platformAdminAccessError(access.reason);

  const body = await request.json().catch(() => null) as any;
  const supportNumber = String(body?.supportNumber ?? '').trim().slice(0, 40);
  const autoReplyText = String(body?.autoReplyText ?? '').trim().slice(0, 1200);
  const enabled = body?.enabled === true;
  const windowHoursRaw = Number(body?.windowHours ?? 24);
  const windowHours = Number.isFinite(windowHoursRaw)
    ? Math.max(1, Math.min(168, Math.round(windowHoursRaw)))
    : 24;

  if (supportNumber.length < 8 || autoReplyText.length < 20) {
    return platformAdminJson({ ok: false, error: 'configuracao_invalida' }, 400);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('bigcorps_whatsapp_settings')
    .update({
      support_number: supportNumber,
      auto_reply_text: autoReplyText,
      auto_reply_enabled: enabled,
      window_hours: windowHours,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 'shared')
    .select('id,company_id,whatsapp_number_id,support_number,auto_reply_text,auto_reply_enabled,window_hours,updated_at')
    .maybeSingle();

  if (error || !data) {
    console.error('[admin-whatsapp] Falha ao salvar settings:', error);
    return platformAdminUnavailable('whatsapp_settings_unavailable');
  }

  return platformAdminJson({ ok: true, data });
}
