import { NextResponse, type NextRequest } from 'next/server';
import { adminConviteria } from '@/lib/conviteria/servidor';

export const runtime = 'nodejs';

// Rascunho anonimo do wizard: existe antes de haver conta. A identidade e o
// `token` que o navegador guarda em localStorage. Nao ha nada sensivel aqui —
// e o convite que a propria pessoa esta digitando — mas o token e a unica
// chave, entao ele nunca aparece em log nem em resposta de erro.

/** Teto de tamanho do config. Um convite normal fica abaixo de 20 KB. */
const LIMITE_CONFIG = 256 * 1024;

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token')?.trim();
  if (!token) {
    return NextResponse.json({ erro: 'Token ausente.' }, { status: 400 });
  }

  const admin = adminConviteria();

  const { data, error } = await admin
    .from('rascunhos')
    .select('config, etapa, expires_at')
    .eq('token', token)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ erro: 'Falha ao ler o rascunho.' }, { status: 500 });
  }

  // 404 tambem quando expirou: o wizard trata os dois casos igual, comecando
  // do zero. A limpeza da linha velha fica para o TTL.
  if (!data || new Date(data.expires_at as string) < new Date()) {
    return NextResponse.json({ erro: 'Rascunho não encontrado.' }, { status: 404 });
  }

  return NextResponse.json({
    estado: { etapa: data.etapa ?? 0, cfg: data.config ?? {} },
  });
}

export async function POST(req: NextRequest) {
  let corpo: { token?: string; estado?: { etapa?: number; cfg?: unknown } };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 });
  }

  const token = corpo.token?.trim();
  if (!token || token.length > 100) {
    return NextResponse.json({ erro: 'Token inválido.' }, { status: 400 });
  }

  const cfg = corpo.estado?.cfg;
  if (!cfg || typeof cfg !== 'object') {
    return NextResponse.json({ erro: 'Estado inválido.' }, { status: 400 });
  }

  // Sem limite, um POST de 50 MB de jsonb passaria direto: o autosave dispara
  // a cada 900 ms e nao ha autenticacao nesta rota.
  if (JSON.stringify(cfg).length > LIMITE_CONFIG) {
    return NextResponse.json({ erro: 'Rascunho grande demais.' }, { status: 413 });
  }

  const etapa = Number.isInteger(corpo.estado?.etapa) ? corpo.estado!.etapa! : 0;

  const admin = adminConviteria();

  // upsert por token: o wizard salva o estado inteiro a cada mudanca, entao a
  // ultima escrita e sempre a boa. `expires_at` renova a cada save para quem
  // volta ao rascunho depois de dias nao perder o trabalho.
  const { error } = await admin
    .from('rascunhos')
    .upsert(
      {
        token,
        config: cfg,
        etapa,
        expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      },
      { onConflict: 'token' }
    );

  if (error) {
    return NextResponse.json({ erro: 'Falha ao salvar o rascunho.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}