import { NextResponse, type NextRequest } from 'next/server';
import { adminConviteria } from '@/lib/conviteria/servidor';
import { urlDoConvite } from '@/lib/conviteria/marca';
import { expiracaoEfetivaTeste } from '@/lib/conviteria/teste';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ erro: 'Faça login para continuar.' }, { status: 401 });

  const admin = adminConviteria();
  const { data: auth, error: erroAuth } = await admin.auth.getUser(token);
  if (erroAuth || !auth.user) return NextResponse.json({ erro: 'Sessão inválida.' }, { status: 401 });

  const { data: conta } = await admin
    .from('contas')
    .select('id,nome,plano')
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (!conta) return NextResponse.json({ convites: [], plano: null });

  const { data: eventos, error } = await admin
    .from('eventos')
    .select('id,slug,config,data_evento,publicado_em,created_at')
    .eq('conta_id', conta.id)
    .eq('arquivado', false)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ erro: 'Falha ao listar seus convites.' }, { status: 500 });

  const { data: teste } = await admin.from('evento_testes')
    .select('id,evento_id,iniciado_em,expira_em,convertido_em,limpo_em')
    .eq('conta_id', conta.id)
    .maybeSingle();

  const agora = Date.now();

  return NextResponse.json({
    plano: conta.plano ?? null,
    convites: (eventos ?? []).map((e) => {
      const cfg = (e.config ?? {}) as Record<string, any>;
      const desteEvento = teste?.evento_id === e.id;
      const expiraEfetiva = desteEvento && teste?.expira_em
        ? expiracaoEfetivaTeste(teste.expira_em, e.data_evento as string | null)
        : null;
      const ativo = Boolean(desteEvento && !teste?.convertido_em && expiraEfetiva && new Date(expiraEfetiva).getTime() > agora);
      return {
        id: e.id,
        slug: e.slug,
        titulo: cfg.anfitrioes?.exibicao || 'Convite sem nome',
        dataExtenso: cfg.evento?.dataExtenso ?? null,
        publicado: Boolean(e.publicado_em),
        url: urlDoConvite(e.slug as string),
        teste: {
          usado: Boolean(teste),
          desteEvento,
          ativo,
          expiraEm: expiraEfetiva,
        },
      };
    }),
  });
}
