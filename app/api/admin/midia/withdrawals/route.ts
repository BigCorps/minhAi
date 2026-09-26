import { getPlatformAdminAccess } from '@/lib/platform-admin';
import { platformAdminAccessError, platformAdminJson } from '@/lib/platform-admin-http';
import { auditMidiaAdmin } from '@/lib/midia/admin';
import { adminMidia } from '@/lib/midia/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const access = await getPlatformAdminAccess();
  if (!access.ok) return platformAdminAccessError(access.reason);

  const body = await request.json().catch(() => null) as {
    withdrawalId?: string;
    status?: 'processing' | 'paid' | 'rejected' | 'cancelled';
    error?: string;
  } | null;
  const withdrawalId = String(body?.withdrawalId || '').trim();
  const status = String(body?.status || '');
  const reason = String(body?.error || '').trim().slice(0, 500);
  if (!withdrawalId || !['processing','paid','rejected','cancelled'].includes(status)) {
    return platformAdminJson({ ok: false, error: 'Dados inválidos.' }, 400);
  }
  if (status === 'rejected' && reason.length < 5) {
    return platformAdminJson({ ok: false, error: 'Informe o motivo da rejeição.' }, 400);
  }

  const admin = adminMidia();
  const { data: before } = await admin.from('withdrawals').select('*').eq('id', withdrawalId).maybeSingle();
  if (!before) return platformAdminJson({ ok: false, error: 'Saque não encontrado.' }, 404);

  const { data, error } = await admin.rpc('set_withdrawal_status', {
    p_withdrawal_id: withdrawalId,
    p_status: status,
    p_error: reason || null,
  });
  if (error) {
    console.error('[admin/midia/withdrawals]', error);
    return platformAdminJson({ ok: false, error: 'Não foi possível atualizar o saque.' }, 500);
  }

  const { data: after } = await admin.from('withdrawals').select('*').eq('id', withdrawalId).maybeSingle();
  await auditMidiaAdmin({
    adminUserId: access.user.id,
    action: `withdrawal_${status}`,
    entityType: 'withdrawal',
    entityId: withdrawalId,
    before,
    after,
  });

  return platformAdminJson({ ok: true, status: data ?? status });
}
