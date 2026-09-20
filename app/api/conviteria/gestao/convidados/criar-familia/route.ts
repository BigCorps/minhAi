import { NextResponse, type NextRequest } from 'next/server';
import {
  exigirEventoDoUsuario,
  normalizarEmail,
  normalizarTelefone,
  texto,
  variantesTelefoneBusca,
} from '@/lib/conviteria/gestao-servidor';
import { sincronizarConfirmacoesEvento } from '@/lib/conviteria/convidados-sync';

export const runtime = 'nodejs';

const LADOS = new Set(['noiva', 'noivo', 'ambos', 'outro']);
const STATUS = new Set(['pendente', 'confirmado', 'nao_vai']);

function idadeCrianca(tipo: 'adulto' | 'crianca', valor: unknown) {
  if (tipo !== 'crianca') return { idade: null as number | null, erro: null as string | null };
  if (valor === '' || valor == null) return { idade: null, erro: null };
  const idade = Number(valor);
  if (!Number.isInteger(idade) || idade < 1 || idade > 12) {
    return { idade: null, erro: 'A idade da criança deve ficar entre 1 e 12 anos.' };
  }
  return { idade, erro: null };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as any;
  const eventoId = texto(body?.eventoId, 80);
  if (!eventoId) return NextResponse.json({ erro: 'Convite não informado.' }, { status: 400 });

  const r = await exigirEventoDoUsuario(req, eventoId);
  if ('erro' in r) return NextResponse.json({ erro: r.erro }, { status: r.status });

  const pessoaId = texto(body?.id, 80) || null;
  const nome = texto(body?.nome, 120);
  const nomeFamilia = texto(body?.novaFamiliaNome, 120);
  if (!nome) return NextResponse.json({ erro: 'Informe o nome do convidado.' }, { status: 400 });
  if (!nomeFamilia) return NextResponse.json({ erro: 'Informe o nome da nova família/grupo.' }, { status: 400 });

  let pessoaAtual: any = null;
  if (pessoaId) {
    const { data } = await r.admin.from('convidados_lista')
      .select('*')
      .eq('evento_id', eventoId)
      .eq('id', pessoaId)
      .maybeSingle();
    if (!data) return NextResponse.json({ erro: 'Convidado não encontrado.' }, { status: 404 });
    if (data.rsvp_extra) return NextResponse.json({ erro: 'Um acompanhante extra não pode ser transformado em uma nova família por esta tela.' }, { status: 409 });
    if (data.familia_id) return NextResponse.json({ erro: 'Este convidado já pertence a uma família/grupo.' }, { status: 409 });
    pessoaAtual = data;
  }

  const telefone = texto(body?.telefone, 40) || pessoaAtual?.telefone || null;
  const email = texto(body?.email, 180) || pessoaAtual?.email || null;
  const telefoneN = normalizarTelefone(telefone);
  const emailN = normalizarEmail(email);
  const lado = LADOS.has(body?.lado) ? body.lado : (LADOS.has(pessoaAtual?.lado) ? pessoaAtual.lado : 'ambos');
  const tipo: 'adulto' | 'crianca' = body?.tipo === 'crianca' ? 'crianca' : 'adulto';
  const idadeValidada = idadeCrianca(tipo, body?.idade ?? pessoaAtual?.idade);
  if (idadeValidada.erro) return NextResponse.json({ erro: idadeValidada.erro }, { status: 400 });

  if (telefoneN) {
    const variantes = variantesTelefoneBusca(telefone);
    const [{ data: familiasMesmoTelefone }, { data: pessoasMesmoTelefone }] = await Promise.all([
      r.admin.from('convidado_familias')
        .select('id,nome')
        .eq('evento_id', eventoId)
        .in('telefone_normalizado', variantes)
        .limit(2),
      r.admin.from('convidados_lista')
        .select('id,familia_id,nome')
        .eq('evento_id', eventoId)
        .in('telefone_normalizado', variantes)
        .limit(3),
    ]);
    const outraFamilia = (familiasMesmoTelefone ?? [])[0];
    const outraPessoa = (pessoasMesmoTelefone ?? []).find((p: any) => p.id !== pessoaId);
    if (outraFamilia || outraPessoa) {
      return NextResponse.json({
        erro: 'Este telefone já está ligado a outro convidado ou família. Escolha a família existente ou use outro contato para evitar conflito no RSVP.',
      }, { status: 409 });
    }
  }

  const { data: familia, error: erroFamilia } = await r.admin.from('convidado_familias').insert({
    evento_id: eventoId,
    nome: nomeFamilia,
    telefone,
    telefone_normalizado: telefoneN,
    email,
    email_normalizado: emailN,
    lado,
    extras_permitidos: 0,
    observacoes: texto(body?.observacoes, 1000) || null,
  }).select('*').single();

  if (erroFamilia || !familia) {
    return NextResponse.json({ erro: 'Não foi possível criar a nova família/grupo.' }, { status: 500 });
  }

  const dadosPessoa: any = {
    evento_id: eventoId,
    familia_id: familia.id,
    nome,
    telefone,
    telefone_normalizado: telefoneN,
    email,
    email_normalizado: emailN,
    tipo,
    idade: idadeValidada.idade,
    lado,
    observacoes: texto(body?.observacoes, 1000) || pessoaAtual?.observacoes || null,
    status: STATUS.has(body?.status) ? body.status : (pessoaAtual?.status ?? 'pendente'),
    rsvp_extra: false,
  };

  const respostaPessoa = pessoaId
    ? await r.admin.from('convidados_lista')
        .update(dadosPessoa)
        .eq('evento_id', eventoId)
        .eq('id', pessoaId)
        .is('familia_id', null)
        .select('*')
        .single()
    : await r.admin.from('convidados_lista').insert(dadosPessoa).select('*').single();

  if (respostaPessoa.error || !respostaPessoa.data) {
    await r.admin.from('convidado_familias').delete().eq('evento_id', eventoId).eq('id', familia.id);
    return NextResponse.json({ erro: 'A família não foi criada porque não foi possível mover/salvar o convidado.' }, { status: 500 });
  }

  try {
    await sincronizarConfirmacoesEvento(eventoId);
  } catch (e) {
    console.error('ConviteIA: família criada, mas a sincronização de confirmações falhou:', e);
  }

  return NextResponse.json({ ok: true, familia, convidado: respostaPessoa.data });
}
