import { NextResponse, type NextRequest } from 'next/server';
import { adminConviteria } from '@/lib/conviteria/servidor';

export const runtime = 'nodejs';

const GMAIL_SEND =
  'https://www.googleapis.com/auth/gmail.send';

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

  return {
    admin,
    userId: auth.user.id,
  };
}

function eventoDaUrl(req: NextRequest) {
  return new URL(req.url)
    .searchParams
    .get('evento')
    ?.trim() ?? '';
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

  const { data, error } = await ctx.admin
    .from('google_conexoes')
    .select(
      'google_email, scopes, expires_at, is_active, last_token_refresh, created_at, updated_at'
    )
    .eq('evento_id', eventoId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('ConviteIA Google status:', error);

    return NextResponse.json(
      { erro: 'Não foi possível consultar a conexão Google.' },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json({
      conectado: false,
      agenda: true,
    });
  }

  const scopes = Array.isArray(data.scopes)
    ? data.scopes
    : [];

  return NextResponse.json({
    conectado: true,
    email: data.google_email,
    gmail: scopes.includes(GMAIL_SEND),

    // "Adicionar ao Google Agenda" e o .ics são gerados pelo ConviteIA
    // para o convidado; não dependem de um escopo Calendar do anfitrião.
    agenda: true,

    expiraEm: data.expires_at,
    atualizadoEm:
      data.last_token_refresh ||
      data.updated_at ||
      data.created_at,
  });
}

export async function DELETE(req: NextRequest) {
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

  const { data: conexao } = await ctx.admin
    .from('google_conexoes')
    .select('refresh_token, access_token')
    .eq('evento_id', eventoId)
    .maybeSingle();

  if (conexao) {
    const tokenParaRevogar =
      conexao.refresh_token ||
      conexao.access_token;

    if (tokenParaRevogar) {
      try {
        await fetch(
          `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(
            tokenParaRevogar
          )}`,
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/x-www-form-urlencoded',
            },
          }
        );
      } catch (error) {
        console.error(
          'ConviteIA Google revoke:',
          error
        );
      }
    }
  }

  const { error } = await ctx.admin
    .from('google_conexoes')
    .delete()
    .eq('evento_id', eventoId);

  if (error) {
    console.error(
      'ConviteIA Google disconnect:',
      error
    );

    return NextResponse.json(
      { erro: 'Não foi possível desconectar a conta Google.' },
      { status: 500 }
    );
  }

  await ctx.admin
    .from('google_oauth_states')
    .delete()
    .eq('evento_id', eventoId)
    .eq('user_id', ctx.userId);

  // Preferências NÃO são apagadas na desconexão.
  return NextResponse.json({
    ok: true,
  });
}
