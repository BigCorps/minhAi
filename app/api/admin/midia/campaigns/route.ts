import { getPlatformAdminAccess } from '@/lib/platform-admin';
import { platformAdminAccessError, platformAdminJson } from '@/lib/platform-admin-http';
import { auditMidiaAdmin } from '@/lib/midia/admin';
import { adminMidia } from '@/lib/midia/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const access = await getPlatformAdminAccess();
  if (!access.ok) return platformAdminAccessError(access.reason);

  const body = await request.json().catch(() => null) as {
    campaignId?: string;
    action?: 'approve' | 'reject';
    reason?: string;
  } | null;
  const campaignId = String(body?.campaignId || '').trim();
  const action = body?.action;
  const reason = String(body?.reason || '').trim().slice(0, 500);
  if (!campaignId || !['approve','reject'].includes(String(action))) {
    return platformAdminJson({ ok: false, error: 'Dados inválidos.' }, 400);
  }
  if (action === 'reject' && reason.length < 5) {
    return platformAdminJson({ ok: false, error: 'Informe o que precisa ser ajustado.' }, 400);
  }

  const admin = adminMidia();
  const { data: campaign } = await admin
    .from('campaigns')
    .select('id,publisher_id,status,buyer_name,total_price_cents')
    .eq('id', campaignId)
    .maybeSingle();
  if (!campaign) return platformAdminJson({ ok: false, error: 'Campanha não encontrada.' }, 404);
  if (campaign.status !== 'under_review') return platformAdminJson({ ok: false, error: 'A campanha não está aguardando revisão.' }, 409);

  const { data, error } = await admin.rpc('review_campaign', {
    p_campaign_id: campaignId,
    p_publisher_id: campaign.publisher_id,
    p_reviewer_user_id: access.user.id,
    p_action: action,
    p_reason: action === 'reject' ? reason : null,
  });
  if (error) {
    const message = String(error.message || '');
    console.error('[admin/midia/campaigns]', error);
    if (message.includes('campaign_window_elapsed')) return platformAdminJson({ ok: false, error: 'A janela desta campanha já terminou.' }, 409);
    return platformAdminJson({ ok: false, error: 'Não foi possível revisar a campanha.' }, 500);
  }

  const row = Array.isArray(data) ? data[0] : data;
  await auditMidiaAdmin({
    adminUserId: access.user.id,
    action: `campaign_${action}`,
    entityType: 'campaign',
    entityId: campaignId,
    before: campaign,
    after: row ?? { status: action === 'approve' ? 'scheduled' : 'rejected' },
    metadata: action === 'reject' ? { reason } : {},
  });

  return platformAdminJson({ ok: true, data: row });
}
