import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get('token_hash')?.trim() || '';
  const eventoId = url.searchParams.get('evento')?.trim() || '';
  const tipoRaw = url.searchParams.get('tipo')?.trim() || 'magiclink';
  const tipo = tipoRaw === 'invite' ? 'invite' : 'magiclink';

  if (!tokenHash || !UUID.test(eventoId)) {
    const destino = UUID.test(eventoId)
      ? `/convite/checkin/${eventoId}?erro=link`
      : '/convite/entrar';
    return NextResponse.redirect(new URL(destino, url.origin));
  }

  try {
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: tipo,
    });

    if (error) {
      console.error('[ConviteIA/checkin] Magic link inválido:', error);
      return NextResponse.redirect(
        new URL(`/convite/checkin/${eventoId}?erro=link`, url.origin),
      );
    }

    return NextResponse.redirect(
      new URL(`/convite/checkin/${eventoId}`, url.origin),
    );
  } catch (e) {
    console.error('[ConviteIA/checkin] Falha ao validar magic link:', e);
    return NextResponse.redirect(
      new URL(`/convite/checkin/${eventoId}?erro=link`, url.origin),
    );
  }
}
