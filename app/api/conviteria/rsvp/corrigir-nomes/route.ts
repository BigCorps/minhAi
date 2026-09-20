import { NextResponse, type NextRequest } from 'next/server';
import { adminConviteria, buscarEventoAcessivelPorId } from '@/lib/conviteria/servidor';
import { variantesTelefoneBusca } from '@/lib/conviteria/gestao-servidor';

export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function nomeSeguro(valor: unknown) {
  return String(valor ?? '').trim().replace(/\s+/g, ' ').slice(0, 120);
}

async function idsDaFamilia(admin: any, eventoId: string, familiaId: string) {
  const { data, error } = await admin.from('convidados_lista')
    .select('id')
    .eq('evento_id', eventoId)
    .eq('familia_id', familiaId)
    .eq('rsvp_extra', false);
  if (error) throw error;
  return (data ?? []).map((p: any) => p.id as string);
}

async function localizarPorToken(admin: any, eventoId: string, token: string) {
  if (!UUID_RE.test(token)) return null;

  const { data: familia } = await admin.from('convidado_familias')
    .select('id')
    .eq('evento_id', eventoId)
    .eq('qr_token', token)
    .maybeSingle();
  if (familia) return { ids: await idsDaFamilia(admin, eventoId, familia.id as string) };

  const { data: pessoa } = await admin.from('convidados_lista')
    .select('id,familia_id,rsvp_extra')
    .eq('evento_id', eventoId)
    .eq('qr_token', token)
    .maybeSingle();
  if (!pessoa || pessoa.rsvp_extra) return null;
  if (pessoa.familia_id) return { ids: await idsDaFamilia(admin, eventoId, pessoa.familia_id as string) };
  return { ids: [pessoa.id as string] };
}

async function localizarPorContato(admin: any, eventoId: string, contato: string) {
  const variantes = variantesTelefoneBusca(contato);
  if (!variantes.length) return null;

  const { data: familias } = await admin.from('convidado_familias')
    .select('id')
    .eq('evento_id', eventoId)
    .in('telefone_normalizado', variantes)
    .order('created_at')
    .limit(2);
  if ((familias ?? []).length > 1) return { erro: 'Este telefone está associado a mais de um grupo. Use o link individual recebido para confirmar.' };
  if (familias?.length === 1) return { ids: await idsDaFamilia(admin, eventoId, familias[0].id as string) };

  const { data: pessoas } = await admin.from('convidados_lista')
    .select('id,familia_id,rsvp_extra')
    .eq('evento_id', eventoId)
    .in('telefone_normalizado', variantes)
    .eq('rsvp_extra', false)
    .order('created_at')
    .limit(2);
  if ((pessoas ?? []).length > 1) return { erro: 'Este telefone está associado a mais de um convidado. Use o link individual recebido para confirmar.' };
  const pessoa = pessoas?.[0];
  if (!pessoa) return null;
  if (pessoa.familia_id) return { ids: await idsDaFamilia(admin, eventoId, pessoa.familia_id as string) };
  return { ids: [pessoa.id as string] };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as any;
  const eventoId = String(body?.eventoId ?? '').trim();
  if (!eventoId || !(await buscarEventoAcessivelPorId(eventoId))) {
    return NextResponse.json({ erro: 'Convite indisponível.' }, { status: 404 });
  }

  const correcoesBrutas = Array.isArray(body?.correcoes) ? body.correcoes.slice(0, 50) : [];
  const correcoes = correcoesBrutas.map((item: any) => ({
    id: String(item?.id ?? '').trim(),
    nome: nomeSeguro(item?.nome),
  })).filter((item: { id: string; nome: string }) => UUID_RE.test(item.id));

  if (!correcoes.length) return NextResponse.json({ ok: true, atualizados: 0 });
  if (correcoes.some((item: { nome: string }) => item.nome.length < 2)) {
    return NextResponse.json({ erro: 'Cada nome precisa ter pelo menos 2 caracteres.' }, { status: 400 });
  }

  const idsRecebidos = correcoes.map((item: { id: string }) => item.id);
  if (new Set(idsRecebidos).size !== idsRecebidos.length) {
    return NextResponse.json({ erro: 'Há convidados repetidos nesta correção.' }, { status: 400 });
  }

  const admin = adminConviteria();
  const token = String(body?.tokenConvite ?? '').trim();
  const contato = String(body?.contato ?? '').trim();
  let grupo: any = null;

  try {
    grupo = token
      ? await localizarPorToken(admin, eventoId, token)
      : await localizarPorContato(admin, eventoId, contato);
  } catch (e) {
    console.error('ConviteIA: falha ao validar correção de nomes do RSVP:', e);
    return NextResponse.json({ erro: 'Não foi possível validar este convite.' }, { status: 500 });
  }

  if (grupo?.erro) return NextResponse.json({ erro: grupo.erro }, { status: 409 });
  if (!grupo?.ids?.length) return NextResponse.json({ erro: 'Não foi possível localizar esta família na lista.' }, { status: 404 });

  const permitidos = new Set<string>(grupo.ids);
  if (idsRecebidos.some((id: string) => !permitidos.has(id))) {
    return NextResponse.json({ erro: 'Um dos nomes não pertence a este convite.' }, { status: 403 });
  }

  let atualizados = 0;
  for (const item of correcoes as Array<{ id: string; nome: string }>) {
    const { error } = await admin.from('convidados_lista')
      .update({ nome: item.nome })
      .eq('evento_id', eventoId)
      .eq('id', item.id)
      .eq('rsvp_extra', false);
    if (error) {
      console.error('ConviteIA: falha ao corrigir nome de convidado:', error);
      return NextResponse.json({ erro: 'Não foi possível salvar todos os nomes corrigidos.' }, { status: 500 });
    }
    atualizados += 1;
  }

  return NextResponse.json({ ok: true, atualizados });
}
