import { NextResponse, type NextRequest } from 'next/server';
import { adminConviteria } from '@/lib/conviteria/servidor';

export const runtime = 'nodejs';

async function contexto(req: NextRequest, eventoId: string) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return { erro: 'Faça login para continuar.', status: 401 as const };

  const admin = adminConviteria();
  const { data: auth } = await admin.auth.getUser(token);
  if (!auth.user) return { erro: 'Sessão inválida.', status: 401 as const };

  const { data: evento } = await admin.from('eventos')
    .select('id, contas!inner(user_id)')
    .eq('id', eventoId).maybeSingle();

  const dono = (evento as any)?.contas?.user_id;
  if (!evento || dono !== auth.user.id)
    return { erro: 'Convite não encontrado.', status: 404 as const };

  return { admin };
}

export async function GET(req: NextRequest) {
  const eventoId = new URL(req.url).searchParams.get('evento')?.trim();
  if (!eventoId) return NextResponse.json({ erro: 'Convite não informado.' }, { status: 400 });

  const ctx = await contexto(req, eventoId);
  if ('erro' in ctx) return NextResponse.json({ erro: ctx.erro }, { status: ctx.status });

  const { data, error } = await ctx.admin.from('recados')
    .select('id,nome,mensagem,aprovado,created_at')
    .eq('evento_id', eventoId)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ erro: 'Falha ao carregar recados.' }, { status: 500 });

  const recados = data ?? [];
  return NextResponse.json({
    recados,
    pendentes: recados.filter((r: any) => !r.aprovado).length,
  });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const eventoId = String(body?.eventoId ?? '');
  const recadoId = String(body?.recadoId ?? '');
  const aprovado = body?.aprovado === true;

  if (!eventoId || !recadoId)
    return NextResponse.json({ erro: 'Dados inválidos.' }, { status: 400 });

  const ctx = await contexto(req, eventoId);
  if ('erro' in ctx) return NextResponse.json({ erro: ctx.erro }, { status: ctx.status });

  const { error } = await ctx.admin.from('recados')
    .update({ aprovado })
    .eq('id', recadoId)
    .eq('evento_id', eventoId);

  if (error) return NextResponse.json({ erro: 'Não foi possível atualizar.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const eventoId = String(body?.eventoId ?? '');
  const recadoId = String(body?.recadoId ?? '');

  if (!eventoId || !recadoId)
    return NextResponse.json({ erro: 'Dados inválidos.' }, { status: 400 });

  const ctx = await contexto(req, eventoId);
  if ('erro' in ctx) return NextResponse.json({ erro: ctx.erro }, { status: ctx.status });

  const { error } = await ctx.admin.from('recados')
    .delete().eq('id', recadoId).eq('evento_id', eventoId);

  if (error) return NextResponse.json({ erro: 'Não foi possível excluir.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
