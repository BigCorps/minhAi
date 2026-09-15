import { NextResponse, type NextRequest } from 'next/server';
import { adminConviteria, adminPublic } from '@/lib/conviteria/servidor';
import { buscarEventoDoDono, pacoteDoEvento } from '@/lib/conviteria/memorias-servidor';
import { MEMORIAS_PRECO_CENTAVOS } from '@/lib/conviteria/memorias-config';
import { dataEventoElegivelParaTeste, expiracaoEfetivaTeste } from '@/lib/conviteria/teste';
import { PLANOS } from '@/lib/conviteria/precos';
import { urlDoConvite } from '@/lib/conviteria/marca';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

  const admin = adminConviteria();
  const { data: testeRow } = await admin.from('evento_testes')
    .select('id,evento_id,iniciado_em,expira_em,convertido_em,limpo_em')
    .eq('conta_id', evento.conta_id)
    .maybeSingle();

  const testeExpiraEfetiva = testeRow?.evento_id === evento.id
    ? expiracaoEfetivaTeste(testeRow.expira_em, evento.data_evento as string | null)
    : null;
  const testeAtivo = Boolean(
    testeRow &&
    testeRow.evento_id === evento.id &&
    !testeRow.convertido_em &&
    testeExpiraEfetiva &&
    new Date(testeExpiraEfetiva).getTime() > Date.now(),
  );
  const testeUsado = Boolean(testeRow);
  const testeElegivel = !publicado &&
    evento.origem_plano === 'avulso' &&
    !testeUsado &&
    dataEventoElegivelParaTeste(evento.data_evento as string | null);

  let motivoTeste: string | null = null;
  if (!testeElegivel && !testeAtivo) {
    if (publicado) motivoTeste = 'Este convite já está publicado.';
    else if (evento.origem_plano !== 'avulso') motivoTeste = 'Seu plano já publica o convite sem precisar do teste.';
    else if (testeUsado) motivoTeste = 'O teste gratuito de 24 horas já foi utilizado nesta conta.';
    else if (!dataEventoElegivelParaTeste(evento.data_evento as string | null)) motivoTeste = 'O evento precisa estar a pelo menos 48 horas de distância para iniciar o teste.';
  }

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

  const memoriasEmTeste = ['teste', 'aguardando_pagamento'].includes(String(pacote?.status)) && testeAtivo &&
    (!pacote.expira_em || new Date(pacote.expira_em).getTime() > Date.now());

  const memoriasStatus = memoriasAtivas
    ? 'ativo'
    : memoriasEmTeste
      ? 'teste'
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
    teste: {
      usado: testeUsado,
      ativo: testeAtivo,
      elegivel: testeElegivel,
      iniciadoEm: testeRow?.iniciado_em ?? null,
      expiraEm: testeExpiraEfetiva,
      motivo: motivoTeste,
    },
    memorias: {
      precoCentavos: MEMORIAS_PRECO_CENTAVOS,
      status: memoriasStatus,
      ativas: memoriasAtivas,
      emTeste: memoriasEmTeste,
      expiraEm: pacote?.expira_em ?? null,
    },
  });
}
