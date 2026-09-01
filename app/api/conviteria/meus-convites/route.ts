import { NextResponse, type NextRequest } from 'next/server';
import { adminConviteria } from '@/lib/conviteria/servidor';
import { urlDoConvite } from '@/lib/conviteria/marca';

export const runtime = 'nodejs';

/**
 * Convites da conta logada.
 *
 * A conta e a mesma da minhAi (auth.users). `conviteria.contas` e o perfil
 * dentro do produto, ligado por `user_id` — quem entrou pelo Pix Wiki e nunca
 * criou convite existe em auth.users mas nao em contas, e recebe lista vazia
 * em vez de erro.
 */
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ erro: 'Faça login para continuar.' }, { status: 401 });
  }

  const admin = adminConviteria();

  const { data: auth, error: erroAuth } = await admin.auth.getUser(token);
  if (erroAuth || !auth.user) {
    return NextResponse.json({ erro: 'Sessão inválida.' }, { status: 401 });
  }

  const { data: conta } = await admin
    .from('contas')
    .select('id, nome, plano')
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (!conta) {
    return NextResponse.json({ convites: [], plano: null });
  }

  const { data: eventos, error } = await admin
    .from('eventos')
    .select('id, slug, config, data_evento, publicado_em, created_at')
    .eq('conta_id', conta.id)
    .eq('arquivado', false)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ erro: 'Falha ao listar seus convites.' }, { status: 500 });
  }

  return NextResponse.json({
    plano: conta.plano ?? null,
    convites: (eventos ?? []).map((e) => {
      const cfg = (e.config ?? {}) as Record<string, any>;
      return {
        id: e.id,
        slug: e.slug,
        titulo: cfg.anfitrioes?.exibicao || 'Convite sem nome',
        dataExtenso: cfg.evento?.dataExtenso ?? null,
        publicado: !!e.publicado_em,
        url: urlDoConvite(e.slug as string),
      };
    }),
  });
}
