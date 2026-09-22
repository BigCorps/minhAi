import { NextResponse, type NextRequest } from 'next/server';
import { adminConviteria, adminPublic } from '@/lib/conviteria/servidor';
import { buscarEventoDoDono, pacoteDoEvento } from '@/lib/conviteria/memorias-servidor';
import { MEMORIAS_PRECO_CENTAVOS } from '@/lib/conviteria/memorias-config';
import { dataEventoElegivelParaTeste, expiracaoEfetivaTeste } from '@/lib/conviteria/teste';
import { PLANOS } from '@/lib/conviteria/precos';
import { urlDoConvite } from '@/lib/conviteria/marca';
import { WHATSAPP_EVENTO_PRECO_CENTAVOS } from '@/lib/conviteria/whatsapp-servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function transacaoPendente(transactionId: string | null | undefined) {
  if (!transactionId) return null;
  const { data } = await adminPublic().from('pix_transactions')
    .select('id,status,expires_at,amount_cents')
    .eq('id', transactionId)
    .maybeSingle();
  if (!data || data.status !== 'pending') return null;
  if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) return null;
  return data;
}

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const eventoId = new URL(req.url).searchParams.get('eventoId');
  if (!token) return NextResponse.json({ erro: 'Faça login.' }, { status: 401 });
  if (!eventoId) return NextResponse.json({ erro: 'Evento não informado.' }, { status: 400 });

  const evento = await buscarEventoDoDono(token, eventoId);
  if (!evento) return NextResponse.json({ erro: 'Convite não encontrado.' }, { status: 404 });

  const admin = adminConviteria();
  const [pacote, { data: whatsapp }] = await Promise.all([
    pacoteDoEvento(evento.id as string),
    admin.from('evento_whatsapp_config')
      .select('status,pix_transaction_id,pix_txid,comprado_em')
      .eq('evento_id', evento.id)
      .maybeSingle(),
  ]);

  const publicado = Boolean(evento.publicado_em);
  const avulso = PLANOS.find((p) => p.id === 'avulso')!;
  const conviteCentavos = !publicado && evento.origem_plano === 'avulso' ? avulso.centavos : 0;
  const memoriasAtivas = pacote?.status === 'ativo' && (!pacote.expira_em || new Date(pacote.expira_em).getTime() > Date.now());
  const whatsappAtivo = whatsapp?.status === 'ativo';

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

  const pixMemoriasPendente = pacote?.status === 'aguardando_pagamento'
    ? Boolean(await transacaoPendente(pacote.pix_transaction_id))
    : false;

  const memoriasEmTeste = ['teste', 'aguardando_pagamento'].includes(String(pacote?.status)) && testeAtivo &&
    (!pacote?.expira_em || new Date(pacote.expira_em).getTime() > Date.now());

  const memoriasStatus = memoriasAtivas
    ? 'ativo'
    : memoriasEmTeste
      ? 'teste'
      : pacote?.status === 'ativo'
        ? 'expirado'
        : pacote?.status === 'aguardando_pagamento' && !pixMemoriasPendente
          ? 'nao_contratado'
          : (pacote?.status ?? 'nao_contratado');

  const whatsappPendente = whatsapp?.status === 'aguardando_pagamento'
    ? Boolean(await transacaoPendente(whatsapp.pix_transaction_id))
    : false;
  const whatsappStatus = whatsappAtivo
    ? 'ativo'
    : whatsapp?.status === 'aguardando_pagamento' && whatsappPendente
      ? 'aguardando_pagamento'
      : 'nao_contratado';

  const pixConvitePendente = !publicado
    ? Boolean(await transacaoPendente(evento.pix_transaction_id as string | null))
    : false;

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
    whatsapp: {
      precoCentavos: WHATSAPP_EVENTO_PRECO_CENTAVOS,
      status: whatsappStatus,
      ativo: whatsappAtivo,
    },
  });
}
