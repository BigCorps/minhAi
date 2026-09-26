import { adminMidia } from '@/lib/midia/server';

export async function auditMidiaAdmin(input: {
  adminUserId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
}) {
  try {
    const admin = adminMidia();
    const { error } = await admin.from('admin_audit_log').insert({
      admin_user_id: input.adminUserId,
      action: input.action.slice(0, 100),
      entity_type: input.entityType.slice(0, 80),
      entity_id: input.entityId ? String(input.entityId).slice(0, 180) : null,
      before_data: input.before ?? null,
      after_data: input.after ?? null,
      metadata: input.metadata ?? {},
    });
    if (error) console.error('[midia/admin-audit]', error);
  } catch (error) {
    // Auditoria nunca deve desfazer a operação administrativa já concluída.
    console.error('[midia/admin-audit] unexpected:', error);
  }
}
