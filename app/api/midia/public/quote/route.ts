import { NextResponse } from 'next/server';
import { calculatePublicMidiaQuote, quoteErrorMessage } from '@/lib/midia/public-ads-server';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });

  try {
    const result = await calculatePublicMidiaQuote(body);
    return NextResponse.json({ ok: true, quote: result.quote });
  } catch (error: any) {
    const mapped = quoteErrorMessage(String(error?.message || ''));
    if (mapped.status >= 500) console.error('[midia/public/quote]', error);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}
