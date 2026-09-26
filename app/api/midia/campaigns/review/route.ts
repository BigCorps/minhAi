import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase-server';
import { adminMidia } from '@/lib/midia/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null) as {
    campaignId?: string;
    action?: 'approve' | 'reject';
    reason?: string;
  } | null;

  const campaignId = String(body?.campaignId || '').trim();
  const action = body?.action;
  const reason = String(body?.reason || '').trim();
  if (!campaignId || !['approve','reject'].includes(String(action))) {
    return NextResponse.json({ error: 'Dados de revisão inválidos.' }, { status: 400 });
  }
  if (action === 'reject' && reason.length < 5) {
    return NextResponse.json({ error: 'Explique brevemente o que precisa ser ajustado.' }, { status: 400 });
  }

  const admin = adminMidia();
  const { data: publisher } = await admin.from('publishers').select('id').eq('user_id', user.id).maybeSingle();
  if (!publisher) return NextResponse.json({ error: 'publisher_not_found' }, { status: 404 });

  const { data, error } = await admin.rpc('review_campaign', {
    p_campaign_id: campaignId,
    p_publisher_id: publisher.id,
    p_reviewer_user_id: user.id,
    p_action: action,
    p_reason: action === 'reject' ? reason : null,
  });

  if (error) {
    console.error('[midia/review]', error);
    const message = String(error.message || '');
    if (message.includes('campaign_window_elapsed')) {
      return NextResponse.json({ error: 'A janela contratada já terminou. A campanha precisa ser reagendada antes de ser aprovada.' }, { status: 409 });
    }
    if (message.includes('campaign_not_under_review')) {
      return NextResponse.json({ error: 'Esta campanha não está mais aguardando revisão.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Não foi possível concluir a revisão.' }, { status: 500 });
  }

  const row = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({
    ok: true,
    status: row?.campaign_status ?? (action === 'approve' ? 'scheduled' : 'rejected'),
    occurrenceCount: Number(row?.occurrence_count ?? 0),
  });
}
