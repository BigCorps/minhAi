import { NextResponse, type NextRequest } from 'next/server';
import { enviarEmailConviteIA, escaparHtml } from '@/lib/conviteria/email';
import { exigirEventoDoUsuario, normalizarEmail, texto } from '@/lib/conviteria/gestao-servidor';

export const runtime = 'nodejs';

const LIMITE_RESPONSAVEIS = 10;

function tituloEvento(config: unknown) {
  const cfg = config as { anfitrioes?: { exibicao?: unknown } } | null;
  return texto(cfg?.anfitrioes?.exibicao, 160) || 'seu evento';
}

function urlBase(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') return 'https://conviteia.com';
  return req.nextUrl.origin;
}

async function gerarTokenAcesso(admin: any, email: string) {
  let tipo: 'magiclink' | 'invite' = 'magiclink';
  let gerado = await admin.auth.admin.generateLink({ type: 'magiclink', email });

  if (gerado.error || !gerado.data?.properties?.hashed_token) {
    tipo = 'invite';
    gerado = await admin.auth.admin.generateLink({ type: 'invite', email });
  }

  if (gerado.error || !gerado.data?.properties?.hashed_token) {
    throw new Error(gerado.error?.message || 'Não foi possível gerar o link de acesso.');
  }

  const tipoRetornado = gerado.data.properties.verification_type;
  const verificacao: 'magiclink' | 'invite' =
    tipoRetornado === 'invite' || tipoRetornado === 'magiclink'
      ? tipoRetornado
      : tipo;

  return {
    tokenHash: gerado.data.properties.hashed_token as string,
    tipo: verificacao,
  };
}

export async function GET(req: NextRequest) {
  const eventoId = req.nextUrl.searchParams.get('eventoId')?.trim() || '';
  if (!eventoId) return NextResponse.json({ erro: 'Convite não informado.' }, { status: 400 });

  const r = await exigirEventoDoUsuario(req, eventoId);
  if ('erro' in r) return NextResponse.json({ erro: r.erro }, { status: r.status });

  const { data, error } = await r.admin
    .from('checkin_acessos')
    .select('id,email,ativo,user_id,convite_enviado_em,ultimo_acesso_em,created_at')
    .eq('evento_id', eventoId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[ConviteIA/checkin] Falha ao listar responsáveis:', error);
    return NextResponse.json(
      { erro: 'Não foi possível carregar os responsáveis de check-in. Confira se a migration de acessos já foi aplicada.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ acessos: data ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as any;
  const eventoId = texto(body?.eventoId, 80);
  const email = normalizarEmail(body?.email);

  if (!eventoId || !email) {
    return NextResponse.json({ erro: 'Informe um e-mail válido.' }, { status: 400 });
  }

  const r = await exigirEventoDoUsuario(req, eventoId);
  if ('erro' in r) return NextResponse.json({ erro: r.erro }, { status: r.status });

  const { data: existente, error: existenteErro } = await r.admin
    .from('checkin_acessos')
    .select('id,ativo')
    .eq('evento_id', eventoId)
    .eq('email', email)
    .maybeSingle();

  if (existenteErro) {
    console.error('[ConviteIA/checkin] Falha ao consultar responsável:', existenteErro);
    return NextResponse.json(
      { erro: 'Não foi possível preparar o acesso. Confira se a migration de check-in já foi aplicada.' },
      { status: 500 },
    );
  }

  if (!existente) {
    const { count } = await r.admin
      .from('checkin_acessos')
      .select('id', { count: 'exact', head: true })
      .eq('evento_id', eventoId)
      .eq('ativo', true);

    if ((count ?? 0) >= LIMITE_RESPONSAVEIS) {
      return NextResponse.json(
        { erro: `Este evento já possui ${LIMITE_RESPONSAVEIS} responsáveis ativos de check-in.` },
        { status: 400 },
      );
    }
  }

  const agora = new Date().toISOString();
  const { data: acesso, error: upsertErro } = await r.admin
    .from('checkin_acessos')
    .upsert(
      {
        evento_id: eventoId,
        email,
        ativo: true,
        criado_por: r.user.id,
        convite_enviado_em: agora,
        updated_at: agora,
      },
      { onConflict: 'evento_id,email' },
    )
    .select('id,email,ativo,user_id,convite_enviado_em,ultimo_acesso_em,created_at')
    .single();

  if (upsertErro || !acesso) {
    console.error('[ConviteIA/checkin] Falha ao salvar responsável:', upsertErro);
    return NextResponse.json({ erro: 'Não foi possível salvar o responsável.' }, { status: 500 });
  }

  try {
    const { tokenHash, tipo } = await gerarTokenAcesso(r.admin, email);
    const destino = new URL('/auth/checkin', urlBase(req));
    destino.searchParams.set('token_hash', tokenHash);
    destino.searchParams.set('tipo', tipo);
    destino.searchParams.set('evento', eventoId);

    const titulo = tituloEvento(r.evento.config);
    const tituloHtml = escaparHtml(titulo);
    const linkHtml = escaparHtml(destino.toString());

    await enviarEmailConviteIA({
      para: email,
      assunto: `Acesso ao check-in — ${titulo}`,
      html: `
        <div style="font-family:Arial,sans-serif;background:#fff9fb;padding:28px;color:#40232c">
          <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #ead7dd;border-radius:18px;padding:28px">
            <p style="margin:0 0 6px;color:#a04a63;font-size:13px;font-weight:700;letter-spacing:.04em">CONVITEIA · CHECK-IN</p>
            <h1 style="font-size:22px;margin:0 0 14px">Você foi convidado para ajudar no check-in</h1>
            <p style="font-size:15px;line-height:1.6;margin:0 0 12px">
              O responsável por <strong>${tituloHtml}</strong> liberou um acesso restrito para você.
            </p>
            <p style="font-size:14px;line-height:1.6;color:#7c5560;margin:0 0 22px">
              Este acesso permite somente conferir convidados e registrar entradas. Ele não libera edição do convite,
              financeiro, presentes, comunicações, Memórias ou outras áreas da gestão.
            </p>
            <p style="margin:24px 0">
              <a href="${linkHtml}" style="display:inline-block;background:#c06078;color:white;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:12px">
                Abrir check-in
              </a>
            </p>
            <p style="font-size:12px;line-height:1.5;color:#9b7b84;margin:0">
              O link é pessoal e deve ser aberto pelo destinatário deste e-mail. O anfitrião pode revogar o acesso a qualquer momento.
            </p>
          </div>
        </div>
      `,
    });
  } catch (e: any) {
    console.error('[ConviteIA/checkin] Falha ao enviar magic link:', e);
    return NextResponse.json(
      {
        erro: 'O responsável foi salvo, mas não foi possível enviar o link agora. Use “Reenviar acesso” para tentar novamente.',
        acesso,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    acesso,
    mensagem: 'Link de acesso enviado por e-mail.',
  });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => null) as any;
  const eventoId = texto(body?.eventoId, 80);
  const acessoId = texto(body?.acessoId, 80);

  if (!eventoId || !acessoId) {
    return NextResponse.json({ erro: 'Dados incompletos.' }, { status: 400 });
  }

  const r = await exigirEventoDoUsuario(req, eventoId);
  if ('erro' in r) return NextResponse.json({ erro: r.erro }, { status: r.status });

  const { error } = await r.admin
    .from('checkin_acessos')
    .update({ ativo: false, updated_at: new Date().toISOString() })
    .eq('id', acessoId)
    .eq('evento_id', eventoId);

  if (error) {
    return NextResponse.json({ erro: 'Não foi possível revogar o acesso.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
