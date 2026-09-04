import { NextResponse, type NextRequest } from 'next/server';
import { adminPublic } from '@/lib/conviteria/servidor';
import { buscarEventoDoDono, pacoteDoEvento } from '@/lib/conviteria/memorias-servidor';
import { MEMORIAS_PRECO_CENTAVOS } from '@/lib/conviteria/memorias-config';
import { PLANOS } from '@/lib/conviteria/precos';
import { urlDoConvite } from '@/lib/conviteria/marca';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const eventoId = new URL(req.url).searchParams.get('eventoId');
  if (!token) return NextResponse.json({ erro: 'Faça login.' }, { status: 401 });
  if (!eventoId) return NextResponse.json({ erro: 'Evento não informado.' }, { status: 400 });

  const evento = await buscarEventoDoDono(token, eventoId);
  if (!evento) return NextResponse.json({ erro: 'Convite não encontrado.' }, { status: 404 });

  const pacote = await pacoteDoEvento(evento.id as string);
  const publicado = Boolean(evento.publicado_em);
  const avulso = PLANOS.find((p) => p.id === 'avulso')!;
  const conviteCentavos = !publicado && evento.origem_plano === 'avulso' ? avulso.centavos : 0;
  const memoriasAtivas = pacote?.status === 'ativo' && (!pacote.expira_em || new Date(pacote.expira_em).getTime() > Date.now());

  const publicAdmin = adminPublic();
  let pixMemoriasPendente = false;
  if (pacote?.status === 'aguardando_pagamento' && pacote.pix_transaction_id) {
    const { data: tx } = await publicAdmin.from('pix_transactions')
      .select('status,expires_at,amount_cents')
      .eq('id', pacote.pix_transaction_id)
      .maybeSingle();
    const totalEsperado = conviteCentavos + MEMORIAS_PRECO_CENTAVOS;
    pixMemoriasPendente = Boolean(
      tx?.status === 'pending' &&
      Number(tx.amount_cents) === totalEsperado &&
      (!tx.expires_at || new Date(tx.expires_at).getTime() > Date.now())
    );
  }

  // Uma cobrança expirada não prende o opcional para sempre. O banco pode
  // continuar com status aguardando até a próxima geração, mas a interface
  // volta a permitir marcar/desmarcar quando o PIX não é mais pagável.
  const memoriasStatus = memoriasAtivas
    ? 'ativo'
    : pacote?.status === 'ativo'
      ? 'expirado'
      : pacote?.status === 'aguardando_pagamento' && !pixMemoriasPendente
        ? 'nao_contratado'
        : (pacote?.status ?? 'nao_contratado');

  let pixConvitePendente = false;
  if (!publicado && evento.pix_transaction_id) {
    const { data: tx } = await publicAdmin.from('pix_transactions')
      .select('status,expires_at,amount_cents')
      .eq('id', evento.pix_transaction_id)
      .maybeSingle();
    pixConvitePendente = Boolean(
      tx?.status === 'pending' &&
      Number(tx.amount_cents) === avulso.centavos &&
      (!tx.expires_at || new Date(tx.expires_at).getTime() > Date.now())
    );
  }

  return NextResponse.json({
    eventoId: evento.id,
    slug: evento.slug,
    url: urlDoConvite(evento.slug as string),
    publicado,
    origemPlano: evento.origem_plano,
    conviteCentavos,
    pixConvitePendente,
    memorias: {
      precoCentavos: MEMORIAS_PRECO_CENTAVOS,
      status: memoriasAtivas ? 'ativo' : memoriasStatus,
      ativas: memoriasAtivas,
      expiraEm: pacote?.expira_em ?? null,
    },
  });
}
