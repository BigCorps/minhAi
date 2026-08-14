import { NextResponse, type NextRequest } from 'next/server';
import { adminConviteria, hashIp, ipDaRequisicao } from '@/lib/conviteria/servidor';

export const runtime = 'nodejs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FAMILIA = 20;
const MAX_CONFIRMACOES_10_MIN = 8;

function nomesFamilia(valor: unknown) {
  if (!Array.isArray(valor)) return [] as string[];

  const vistos = new Set<string>();
  const nomes: string[] = [];

  for (const item of valor) {
    const nome = String(item ?? '').trim().replace(/\s+/g, ' ').slice(0, 120);
    if (!nome) continue;

    const chave = nome.toLocaleLowerCase('pt-BR');
    if (vistos.has(chave)) continue;

    vistos.add(chave);
    nomes.push(nome);
    if (nomes.length >= MAX_FAMILIA) break;
  }

  return nomes;
}

export async function POST(req: NextRequest) {
  const ip = ipDaRequisicao(req);
  const ipHash = hashIp(ip);

  const corpo = (await req.json().catch(() => null)) as {
    eventoId?: string;
    nome?: string;
    email?: string;
    acompanhantes?: string[];
  } | null;

  const eventoId = corpo?.eventoId?.trim();
  const nome = corpo?.nome?.trim().replace(/\s+/g, ' ').slice(0, 120) ?? '';
  const email = corpo?.email?.trim().toLowerCase().slice(0, 180) ?? '';
  const acompanhantes = nomesFamilia(corpo?.acompanhantes);

  if (!eventoId || nome.length < 2) {
    return NextResponse.json({ erro: 'Informe seu nome.' }, { status: 400 });
  }

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ erro: 'Informe um e-mail valido.' }, { status: 400 });
  }

  const familia = acompanhantes.filter(
    (p) => p.toLocaleLowerCase('pt-BR') !== nome.toLocaleLowerCase('pt-BR')
  );

  const admin = adminConviteria();

  const { data: evento } = await admin
    .from('eventos')
    .select('id')
    .eq('id', eventoId)
    .not('publicado_em', 'is', null)
    .eq('arquivado', false)
    .maybeSingle();

  if (!evento) {
    return NextResponse.json({ erro: 'Convite indisponivel.' }, { status: 404 });
  }

  const { data: existente } = await admin
    .from('convidados')
    .select('id')
    .eq('evento_id', eventoId)
    .eq('email_normalizado', email)
    .maybeSingle();

  if (!existente) {
    const desde = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const { count } = await admin
      .from('convidados')
      .select('id', { count: 'exact', head: true })
      .eq('evento_id', eventoId)
      .eq('ip_hash', ipHash)
      .gte('created_at', desde);

    if ((count ?? 0) >= MAX_CONFIRMACOES_10_MIN) {
      return NextResponse.json(
        { erro: 'Muitas confirmacoes deste dispositivo. Aguarde alguns minutos.' },
        { status: 429 }
      );
    }
  }

  const dados = {
    evento_id: eventoId,
    nome,
    email,
    contato: email,
    comparecera: true,
    adultos: 1 + familia.length,
    criancas: 0,
    acompanhantes: familia,
    ip_hash: ipHash,
    updated_at: new Date().toISOString(),
  };

  let erro: any = null;
  let atualizado = false;

  if (existente) {
    const r = await admin.from('convidados').update(dados).eq('id', existente.id);
    erro = r.error;
    atualizado = true;
  } else {
    const r = await admin.from('convidados').insert(dados);
    erro = r.error;

    if (erro?.code === '23505') {
      const r2 = await admin
        .from('convidados')
        .update(dados)
        .eq('evento_id', eventoId)
        .eq('email_normalizado', email);
      erro = r2.error;
      atualizado = !r2.error;
    }
  }

  if (erro) {
    console.error('ConviteIA RSVP:', erro);
    return NextResponse.json(
      { erro: 'Nao foi possivel confirmar sua presenca.' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    atualizado,
    totalPessoas: 1 + familia.length,
  });
}
