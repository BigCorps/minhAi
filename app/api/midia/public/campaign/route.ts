import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { adminMidia, hashMidiaCampaignSecret, hashMidiaIp, midiaIp } from '@/lib/midia/server';
import { calculatePublicMidiaQuote, quoteErrorMessage } from '@/lib/midia/public-ads-server';

const MAX_DRAFTS_15_MIN = 6;
const COOKIE = 'midia_campaign_draft';

function cleanText(value: unknown, max: number) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as any;
  if (!body) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });

  const buyerName = cleanText(body.buyerName, 100);
  const buyerEmail = cleanText(body.buyerEmail, 254).toLowerCase();
  const buyerPhone = cleanText(body.buyerPhone, 30) || null;
  const acceptedContentTerms = body.acceptedContentTerms === true;

  if (buyerName.length < 2) return NextResponse.json({ error: 'Informe seu nome ou o nome da empresa.' }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)) return NextResponse.json({ error: 'Informe um e-mail válido.' }, { status: 400 });
  if (!acceptedContentTerms) return NextResponse.json({ error: 'Confirme a declaração sobre o conteúdo do anúncio.' }, { status: 400 });

  try {
    const preview = await calculatePublicMidiaQuote(body);
    const admin = adminMidia();
    const ipHash = hashMidiaIp(midiaIp(request));
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    const { count } = await admin
      .from('campaigns')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('created_at', since);

    if ((count ?? 0) >= MAX_DRAFTS_15_MIN) {
      return NextResponse.json({ error: 'Muitas campanhas foram preparadas em poucos minutos. Aguarde um pouco e tente novamente.' }, { status: 429 });
    }

    const rawSecret = randomBytes(32).toString('base64url');
    const { data, error } = await admin.rpc('reserve_campaign_draft', {
      p_screen_id: preview.context.screen.id,
      p_product_key: preview.input.productKey,
      p_duration_seconds: preview.input.durationSeconds,
      p_schedule_date: preview.input.scheduleDate,
      p_schedule_time: preview.input.scheduleTime,
      p_start_date: preview.input.startDate,
      p_buyer_name: buyerName,
      p_buyer_email: buyerEmail,
      p_buyer_phone: buyerPhone,
      p_edit_token_hash: hashMidiaCampaignSecret(rawSecret),
      p_ip_hash: ipHash,
      p_accepted_content_terms: true,
    });

    if (error) throw new Error(error.message);
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error('inventory_unavailable');

    const response = NextResponse.json({
      ok: true,
      campaign: {
        id: row.campaign_id,
        quoteExpiresAt: row.quote_expires_at,
        totalPriceCents: Number(row.total_price_cents),
        estimatedOccurrences: Number(row.estimated_occurrences),
        reservedFrom: row.reserved_from,
        reservedUntil: row.reserved_until,
      },
    });

    response.cookies.set(COOKIE, `${row.campaign_id}.${rawSecret}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/midia/public/campaign',
      maxAge: 30 * 60,
    });
    return response;
  } catch (error: any) {
    const mapped = quoteErrorMessage(String(error?.message || ''));
    if (mapped.status >= 500) console.error('[midia/public/campaign]', error);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}
