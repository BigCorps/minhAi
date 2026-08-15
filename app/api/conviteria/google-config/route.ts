import { NextResponse, type NextRequest } from 'next/server';
import { adminConviteria } from '@/lib/conviteria/servidor';

export const runtime = 'nodejs';

type Preferencias = {
  enviarConfirmacao: boolean;
  lembrete30d: boolean;
  lembrete7d: boolean;
  lembrete1d: boolean;
};

const PADRAO: Preferencias = {
  enviarConfirmacao: true,
  lembrete30d: true,
  lembrete7d: true,
  lembrete1d: true,
};

async function contexto(
  req: NextRequest,
  eventoId: string
) {
  const token = req.headers
    .get('authorization')
    ?.replace(/^Bearer\s+/i, '')
    .trim();

  if (!token) {
    return {
      erro: 'Faça login para continuar.',
      status: 401 as const,
    };
  }

  const admin = adminConviteria();

  const { data: auth } =
    await admin.auth.getUser(token);

  if (!auth.user) {
    return {
      erro: 'Sessão inválida.',
      status: 401 as const,
    };
  }

  const { data: evento } = await admin
    .from('eventos')
    .select('id, conta_id')
    .eq('id', eventoId)
    .maybeSingle();

  if (!evento) {
    return {
      erro: 'Convite não encontrado.',
      status: 404 as const,
    };
  }

  const { data: conta } = await admin
    .from('contas')
    .select('user_id')
    .eq('id', evento.conta_id)
    .maybeSingle();

  if (!conta || conta.user_id !== auth.user.id) {
    return {
      erro: 'Convite não encontrado.',
      status: 404 as const,
    };
  }

  return { admin };
}

function eventoDaUrl(req: NextRequest) {
  return new URL(req.url)
    .searchParams
    .get('evento')
    ?.trim() ?? '';
}

function preferenciasDaLinha(
  linha: any
): Preferencias {
  if (!linha) return PADRAO;

  return {
    enviarConfirmacao:
      linha.enviar_confirmacao !== false,
    lembrete30d:
      linha.lembrete_30d !== false,
    lembrete7d:
      linha.lembrete_7d !== false,
    lembrete1d:
      linha.lembrete_1d !== false,
  };
}

export async function GET(req: NextRequest) {
  const eventoId = eventoDaUrl(req);

  if (!eventoId) {
    return NextResponse.json(
      { erro: 'Convite não informado.' },
      { status: 400 }
    );
  }

  const ctx = await contexto(req, eventoId);

  if ('erro' in ctx) {
    return NextResponse.json(
      { erro: ctx.erro },
      { status: ctx.status }
    );
  }

  const [prefsResp, historicoResp] =
    await Promise.all([
      ctx.admin
        .from('google_preferencias')
        .select(
          'enviar_confirmacao,lembrete_30d,lembrete_7d,lembrete_1d'
        )
        .eq('evento_id', eventoId)
        .maybeSingle(),

      ctx.admin
        .from('google_envios')
        .select(
          'id,tipo,to_email,status,agendado_para,enviado_em,ultimo_erro,created_at'
        )
        .eq('evento_id', eventoId)
        .order('created_at', { ascending: false })
        .limit(12),
    ]);

  if (prefsResp.error) {
    console.error(
      'ConviteIA Google preferências:',
      prefsResp.error
    );
  }

  if (historicoResp.error) {
    console.error(
      'ConviteIA Google histórico:',
      historicoResp.error
    );
  }

  return NextResponse.json({
    preferencias: preferenciasDaLinha(
      prefsResp.data
    ),
    historico: (historicoResp.data ?? []).map(
      (r: any) => ({
        id: r.id,
        tipo: r.tipo,
        email: r.to_email,
        status: r.status,
        agendadoPara: r.agendado_para,
        enviadoEm: r.enviado_em,
        erro: r.ultimo_erro,
        criadoEm: r.created_at,
      })
    ),
  });
}

export async function PUT(req: NextRequest) {
  const eventoId = eventoDaUrl(req);

  if (!eventoId) {
    return NextResponse.json(
      { erro: 'Convite não informado.' },
      { status: 400 }
    );
  }

  const ctx = await contexto(req, eventoId);

  if ('erro' in ctx) {
    return NextResponse.json(
      { erro: ctx.erro },
      { status: ctx.status }
    );
  }

  const corpo =
    await req.json().catch(() => null);

  const p = corpo?.preferencias;

  if (
    !p ||
    typeof p.enviarConfirmacao !== 'boolean' ||
    typeof p.lembrete30d !== 'boolean' ||
    typeof p.lembrete7d !== 'boolean' ||
    typeof p.lembrete1d !== 'boolean'
  ) {
    return NextResponse.json(
      { erro: 'Preferências inválidas.' },
      { status: 400 }
    );
  }

  const { error } = await ctx.admin
    .from('google_preferencias')
    .upsert(
      {
        evento_id: eventoId,
        enviar_confirmacao:
          p.enviarConfirmacao,
        lembrete_30d:
          p.lembrete30d,
        lembrete_7d:
          p.lembrete7d,
        lembrete_1d:
          p.lembrete1d,
        updated_at:
          new Date().toISOString(),
      },
      {
        onConflict: 'evento_id',
      }
    );

  if (error) {
    console.error(
      'ConviteIA Google salvar preferências:',
      error
    );

    return NextResponse.json(
      { erro: 'Não foi possível salvar as preferências.' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    preferencias: p,
  });
}
