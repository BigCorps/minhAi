import { randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import {
  adminConviteria,
  hashIp,
  ipDaRequisicao,
} from '@/lib/conviteria/servidor';
import { urlGoogleAgenda } from '@/lib/conviteria/calendario';
import type { ConviteConfig } from '@/lib/conviteria/tipos';

export const runtime = 'nodejs';

const EMAIL_RE =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_FAMILIA = 20;
const MAX_CONFIRMACOES_10_MIN = 8;

function nomesFamilia(
  valor: unknown
) {
  if (!Array.isArray(valor)) {
    return [] as string[];
  }

  const vistos =
    new Set<string>();

  const nomes:
    string[] = [];

  for (const item of valor) {
    const nome =
      String(item ?? '')
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 120);

    if (!nome) continue;

    const chave =
      nome.toLocaleLowerCase(
        'pt-BR'
      );

    if (vistos.has(chave)) {
      continue;
    }

    vistos.add(chave);
    nomes.push(nome);

    if (
      nomes.length >=
      MAX_FAMILIA
    ) {
      break;
    }
  }

  return nomes;
}

async function enviarConfirmacaoGoogle({
  eventoId,
  convidadoId,
  atualizado,
  idempotencyKey,
}: {
  eventoId: string;
  convidadoId: string;
  atualizado: boolean;
  idempotencyKey: string;
}) {
  const base =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  const serviceRole =
    process.env
      .SUPABASE_SERVICE_ROLE_KEY;

  if (
    !base ||
    !serviceRole
  ) {
    return {
      emailStatus:
        'falhou' as const,
    };
  }

  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () =>
        controller.abort(),
      7000
    );

  try {
    const r =
      await fetch(
        `${base}/functions/v1/conviteia-google-confirmacao`,
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
            Authorization:
              `Bearer ${serviceRole}`,
            apikey:
              serviceRole,
          },
          body: JSON.stringify({
            evento_id:
              eventoId,
            convidado_id:
              convidadoId,
            atualizado,
            idempotency_key:
              idempotencyKey,
          }),
          signal:
            controller.signal,
          cache: 'no-store',
        }
      );

    const d =
      await r
        .json()
        .catch(() => null);

    if (
      d?.sent === true
    ) {
      return {
        emailStatus:
          'enviado' as const,
      };
    }

    if (
      d?.reason ===
      'google_nao_conectado'
    ) {
      return {
        emailStatus:
          'sem_google' as const,
      };
    }

    return {
      emailStatus:
        'falhou' as const,
    };
  } catch (error) {
    console.error(
      'ConviteIA RSVP Google:',
      error
    );

    return {
      emailStatus:
        'falhou' as const,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(
  req: NextRequest
) {
  const ip =
    ipDaRequisicao(req);

  const ipHash =
    hashIp(ip);

  const corpo =
    (await req
      .json()
      .catch(() => null)) as {
      eventoId?: string;
      nome?: string;
      email?: string;
      acompanhantes?: string[];
      solicitacaoId?: string;
    } | null;

  const eventoId =
    corpo?.eventoId?.trim();

  const nome =
    corpo?.nome
      ?.trim()
      .replace(/\s+/g, ' ')
      .slice(0, 120) ??
    '';

  const email =
    corpo?.email
      ?.trim()
      .toLowerCase()
      .slice(0, 180) ??
    '';

  const acompanhantes =
    nomesFamilia(
      corpo?.acompanhantes
    );

  const solicitacaoId =
    UUID_RE.test(
      corpo?.solicitacaoId ?? ''
    )
      ? corpo!.solicitacaoId!
      : randomUUID();

  if (
    !eventoId ||
    nome.length < 2
  ) {
    return NextResponse.json(
      {
        erro:
          'Informe seu nome.',
      },
      {
        status: 400,
      }
    );
  }

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      {
        erro:
          'Informe um e-mail valido.',
      },
      {
        status: 400,
      }
    );
  }

  const familia =
    acompanhantes.filter(
      (p) =>
        p.toLocaleLowerCase(
          'pt-BR'
        ) !==
        nome.toLocaleLowerCase(
          'pt-BR'
        )
    );

  const admin =
    adminConviteria();

  const { data: evento } =
    await admin
      .from('eventos')
      .select(
        'id, slug, config'
      )
      .eq('id', eventoId)
      .not(
        'publicado_em',
        'is',
        null
      )
      .eq(
        'arquivado',
        false
      )
      .maybeSingle();

  if (!evento) {
    return NextResponse.json(
      {
        erro:
          'Convite indisponivel.',
      },
      {
        status: 404,
      }
    );
  }

  const { data: existente } =
    await admin
      .from('convidados')
      .select('id')
      .eq(
        'evento_id',
        eventoId
      )
      .eq(
        'email_normalizado',
        email
      )
      .maybeSingle();

  if (!existente) {
    const desde =
      new Date(
        Date.now() -
          10 * 60 * 1000
      ).toISOString();

    const { count } =
      await admin
        .from('convidados')
        .select(
          'id',
          {
            count: 'exact',
            head: true,
          }
        )
        .eq(
          'evento_id',
          eventoId
        )
        .eq(
          'ip_hash',
          ipHash
        )
        .gte(
          'created_at',
          desde
        );

    if (
      (count ?? 0) >=
      MAX_CONFIRMACOES_10_MIN
    ) {
      return NextResponse.json(
        {
          erro:
            'Muitas confirmacoes deste dispositivo. Aguarde alguns minutos.',
        },
        {
          status: 429,
        }
      );
    }
  }

  const dados = {
    evento_id:
      eventoId,
    nome,
    email,
    contato: email,
    comparecera: true,
    adultos:
      1 + familia.length,
    criancas: 0,
    acompanhantes:
      familia,
    ip_hash:
      ipHash,
    updated_at:
      new Date().toISOString(),
  };

  let erro: any = null;
  let atualizado = false;
  let convidadoId:
    string | null = null;

  if (existente) {
    const r =
      await admin
        .from('convidados')
        .update(dados)
        .eq(
          'id',
          existente.id
        )
        .select('id')
        .single();

    erro = r.error;
    convidadoId =
      r.data?.id ?? null;
    atualizado = true;
  } else {
    const r =
      await admin
        .from('convidados')
        .insert(dados)
        .select('id')
        .single();

    erro = r.error;
    convidadoId =
      r.data?.id ?? null;

    if (
      erro?.code ===
      '23505'
    ) {
      const r2 =
        await admin
          .from('convidados')
          .update(dados)
          .eq(
            'evento_id',
            eventoId
          )
          .eq(
            'email_normalizado',
            email
          )
          .select('id')
          .single();

      erro =
        r2.error;

      convidadoId =
        r2.data?.id ??
        null;

      atualizado =
        !r2.error;
    }
  }

  if (
    erro ||
    !convidadoId
  ) {
    console.error(
      'ConviteIA RSVP:',
      erro
    );

    return NextResponse.json(
      {
        erro:
          'Nao foi possivel confirmar sua presenca.',
      },
      {
        status: 500,
      }
    );
  }

  const agendaUrl =
    urlGoogleAgenda(
      evento.config as ConviteConfig,
      evento.slug as string
    );

  // O RSVP já está persistido neste ponto.
  // Qualquer falha abaixo é apenas falha de comunicação, não de presença.
  const google =
    await enviarConfirmacaoGoogle({
      eventoId,
      convidadoId,
      atualizado,
      idempotencyKey:
        `confirmacao:${solicitacaoId}`,
    });

  return NextResponse.json({
    ok: true,
    atualizado,
    totalPessoas:
      1 + familia.length,
    agendaUrl,
    emailStatus:
      google.emailStatus,
  });
}
