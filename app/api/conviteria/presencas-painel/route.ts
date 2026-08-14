import { NextResponse, type NextRequest } from 'next/server';
import { adminConviteria } from '@/lib/conviteria/servidor';

export const runtime = 'nodejs';

async function contexto(req: NextRequest, eventoId: string) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return { erro: 'Faca login para continuar.', status: 401 as const };

  const admin = adminConviteria();
  const { data: auth } = await admin.auth.getUser(token);

  if (!auth.user) {
    return { erro: 'Sessao invalida.', status: 401 as const };
  }

  const { data: evento } = await admin
    .from('eventos')
    .select('id, contas!inner(user_id)')
    .eq('id', eventoId)
    .maybeSingle();

  if (!evento || (evento as any)?.contas?.user_id !== auth.user.id) {
    return { erro: 'Convite nao encontrado.', status: 404 as const };
  }

  return { admin };
}

export async function GET(req: NextRequest) {
  const eventoId = new URL(req.url).searchParams.get('evento')?.trim();

  if (!eventoId) {
    return NextResponse.json({ erro: 'Convite nao informado.' }, { status: 400 });
  }

  const ctx = await contexto(req, eventoId);
  if ('erro' in ctx) {
    return NextResponse.json({ erro: ctx.erro }, { status: ctx.status });
  }

  const { data, error } = await ctx.admin
    .from('convidados')
    .select('id,nome,email,acompanhantes,created_at,updated_at')
    .eq('evento_id', eventoId)
    .eq('comparecera', true)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json(
      { erro: 'Nao foi possivel carregar as confirmacoes.' },
      { status: 500 }
    );
  }

  const confirmacoes = (data ?? []).map((r: any) => {
    const acompanhantes = Array.isArray(r.acompanhantes)
      ? r.acompanhantes.filter((x: unknown) => typeof x === 'string')
      : [];

    return {
      id: r.id,
      nome: r.nome,
      email: r.email,
      acompanhantes,
      totalPessoas: 1 + acompanhantes.length,
      criadoEm: r.created_at,
      atualizadoEm: r.updated_at,
    };
  });

  return NextResponse.json({
    confirmacoes,
    totalFamilias: confirmacoes.length,
    totalPessoas: confirmacoes.reduce((s, r) => s + r.totalPessoas, 0),
  });
}

export async function DELETE(req: NextRequest) {
  const corpo = await req.json().catch(() => null);
  const eventoId = String(corpo?.eventoId ?? '').trim();
  const confirmacaoId = String(corpo?.confirmacaoId ?? '').trim();

  if (!eventoId || !confirmacaoId) {
    return NextResponse.json({ erro: 'Dados invalidos.' }, { status: 400 });
  }

  const ctx = await contexto(req, eventoId);
  if ('erro' in ctx) {
    return NextResponse.json({ erro: ctx.erro }, { status: ctx.status });
  }

  const { error } = await ctx.admin
    .from('convidados')
    .delete()
    .eq('id', confirmacaoId)
    .eq('evento_id', eventoId);

  if (error) {
    return NextResponse.json(
      { erro: 'Nao foi possivel remover a confirmacao.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
