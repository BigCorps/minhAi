import { randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { adminConviteria, buscarEventoAcessivelPorId, hashIp, ipDaRequisicao } from '@/lib/conviteria/servidor';
import { normalizarEmail, normalizarTelefone } from '@/lib/conviteria/gestao-servidor';
import { urlGoogleAgenda } from '@/lib/conviteria/calendario';
import type { ConviteConfig } from '@/lib/conviteria/tipos';

export const runtime = 'nodejs';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_FAMILIA = 20;
const MAX_CONFIRMACOES_10_MIN = 8;

function nomesFamilia(valor: unknown) {
  if (!Array.isArray(valor)) return [] as string[];
  const vistos = new Set<string>(); const nomes: string[] = [];
  for (const item of valor) {
    const nome = String(item ?? '').trim().replace(/\s+/g, ' ').slice(0, 120);
    if (!nome) continue;
    const chave = nome.toLocaleLowerCase('pt-BR');
    if (vistos.has(chave)) continue;
    vistos.add(chave); nomes.push(nome);
    if (nomes.length >= MAX_FAMILIA) break;
  }
  return nomes;
}

async function enviarConfirmacaoGoogle({ eventoId, convidadoId, atualizado, idempotencyKey }: { eventoId: string; convidadoId: string; atualizado: boolean; idempotencyKey: string; }) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceRole) return { emailStatus: 'falhou' as const };
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 7000);
  try {
    const r = await fetch(`${base}/functions/v1/conviteia-google-confirmacao`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceRole}`, apikey: serviceRole },
      body: JSON.stringify({ evento_id: eventoId, convidado_id: convidadoId, atualizado, idempotency_key: idempotencyKey }), signal: controller.signal, cache: 'no-store',
    });
    const d = await r.json().catch(() => null);
    if (d?.sent === true) return { emailStatus: 'enviado' as const };
    if (d?.reason === 'google_nao_conectado') return { emailStatus: 'sem_google' as const };
    return { emailStatus: 'falhou' as const };
  } catch { return { emailStatus: 'falhou' as const }; }
  finally { clearTimeout(timer); }
}

async function configRestrito(eventoId: string) {
  const admin = adminConviteria();
  const { data } = await admin.from('evento_gestao_config').select('rsvp_restrito').eq('evento_id', eventoId).maybeSingle();
  return !!data?.rsvp_restrito;
}

async function buscarGrupo(eventoId: string, contato: string) {
  const admin = adminConviteria();
  const email = normalizarEmail(contato); const tel = normalizarTelefone(contato);
  if (!email && !tel) return null;
  let familia: any = null;
  if (email) {
    const { data } = await admin.from('convidado_familias').select('id,nome').eq('evento_id', eventoId).eq('email_normalizado', email).limit(1).maybeSingle(); familia = data;
  } else if (tel) {
    const { data } = await admin.from('convidado_familias').select('id,nome').eq('evento_id', eventoId).eq('telefone_normalizado', tel).limit(1).maybeSingle(); familia = data;
  }
  if (familia) {
    const { data: pessoas } = await admin.from('convidados_lista').select('id,nome,tipo,status').eq('evento_id', eventoId).eq('familia_id', familia.id).order('created_at');
    return { familiaId: familia.id as string, titulo: familia.nome as string, pessoas: pessoas ?? [] };
  }
  let pessoa: any = null;
  if (email) {
    const { data } = await admin.from('convidados_lista').select('id,nome,tipo,status,familia_id').eq('evento_id', eventoId).eq('email_normalizado', email).limit(1).maybeSingle(); pessoa = data;
  } else if (tel) {
    const { data } = await admin.from('convidados_lista').select('id,nome,tipo,status,familia_id').eq('evento_id', eventoId).eq('telefone_normalizado', tel).limit(1).maybeSingle(); pessoa = data;
  }
  if (!pessoa) return null;
  if (pessoa.familia_id) {
    const { data: fam } = await admin.from('convidado_familias').select('id,nome').eq('evento_id', eventoId).eq('id', pessoa.familia_id).maybeSingle();
    const { data: pessoas } = await admin.from('convidados_lista').select('id,nome,tipo,status').eq('evento_id', eventoId).eq('familia_id', pessoa.familia_id).order('created_at');
    return { familiaId: pessoa.familia_id as string, titulo: fam?.nome ?? 'Sua família', pessoas: pessoas ?? [] };
  }
  return { familiaId: null, titulo: pessoa.nome as string, pessoas: [pessoa] };
}

export async function GET(req: NextRequest) {
  const eventoId = new URL(req.url).searchParams.get('eventoId')?.trim();
  if (!eventoId || !(await buscarEventoAcessivelPorId(eventoId))) return NextResponse.json({ erro: 'Convite indisponível.' }, { status: 404 });
  return NextResponse.json({ restrito: await configRestrito(eventoId) });
}

export async function POST(req: NextRequest) {
  const ipHash = hashIp(ipDaRequisicao(req));
  const corpo = await req.json().catch(() => null) as any;
  const eventoId = String(corpo?.eventoId ?? '').trim();
  if (!eventoId) return NextResponse.json({ erro: 'Convite não informado.' }, { status: 400 });
  const acesso = await buscarEventoAcessivelPorId(eventoId);
  if (!acesso) return NextResponse.json({ erro: 'Convite indisponível.' }, { status: 404 });
  const restrito = await configRestrito(eventoId);

  if (corpo?.acao === 'buscar_restrito') {
    if (!restrito) return NextResponse.json({ erro: 'Este convite usa confirmação livre.' }, { status: 400 });
    const grupo = await buscarGrupo(eventoId, String(corpo?.contato ?? ''));
    if (!grupo) return NextResponse.json({ erro: 'Não encontramos este contato na lista de convidados.' }, { status: 404 });
    return NextResponse.json({ ok: true, grupo });
  }

  const evento = acesso.evento;
  const testeId = acesso.acesso.modo === 'teste' ? acesso.acesso.testeId : null;
  const emTeste = Boolean(testeId);
  const admin = adminConviteria();
  const solicitacaoId = UUID_RE.test(corpo?.solicitacaoId ?? '') ? corpo.solicitacaoId : randomUUID();

  if (corpo?.acao === 'confirmar_restrito') {
    if (!restrito) return NextResponse.json({ erro: 'Este convite usa confirmação livre.' }, { status: 400 });
    const grupo = await buscarGrupo(eventoId, String(corpo?.contato ?? ''));
    if (!grupo) return NextResponse.json({ erro: 'Contato não encontrado.' }, { status: 404 });
    const permitidos = new Map((grupo.pessoas as any[]).map((p) => [p.id as string, p]));
    const ids: string[] = Array.isArray(corpo?.convidadoIds) ? Array.from(new Set<string>(corpo.convidadoIds.map((x: unknown) => String(x)))).filter((id) => permitidos.has(id)).slice(0, 50) : [];
    if (!ids.length) return NextResponse.json({ erro: 'Selecione quem irá ao evento.' }, { status: 400 });
    const pessoas = ids.map((id) => permitidos.get(id)!);
    const principal = pessoas[0];
    const emailBusca = normalizarEmail(String(corpo?.contato ?? ''));
    let existente: any = null;
    if (grupo.familiaId) {
      let q = admin.from('convidados').select('id').eq('evento_id', eventoId).eq('familia_lista_id', grupo.familiaId); q = testeId ? q.eq('teste_id', testeId) : q.is('teste_id', null); const { data } = await q.maybeSingle(); existente = data;
    } else {
      let q = admin.from('convidados').select('id').eq('evento_id', eventoId).eq('convidado_lista_id', principal.id); q = testeId ? q.eq('teste_id', testeId) : q.is('teste_id', null); const { data } = await q.maybeSingle(); existente = data;
    }
    const dados = {
      evento_id: eventoId, nome: principal.nome, email: emailBusca, contato: String(corpo?.contato ?? '').trim().slice(0, 180), comparecera: true,
      adultos: pessoas.filter((p: any) => p.tipo !== 'crianca').length, criancas: pessoas.filter((p: any) => p.tipo === 'crianca').length,
      acompanhantes: pessoas.slice(1).map((p: any) => p.nome), ip_hash: ipHash, teste_id: testeId,
      familia_lista_id: grupo.familiaId, convidado_lista_id: grupo.familiaId ? null : principal.id, updated_at: new Date().toISOString(),
    };
    let resp = existente
      ? await admin.from('convidados').update(dados).eq('id', existente.id).select('id').single()
      : await admin.from('convidados').insert(dados).select('id').single();
    // Se houve confirmação no trial com o mesmo e-mail e o evento foi publicado
    // antes da limpeza, a chave única antiga pode colidir. Só convertemos aquela
    // linha quando o próprio convidado está confirmando novamente agora.
    if (resp.error?.code === '23505' && emailBusca) {
      resp = await admin.from('convidados').update(dados)
        .eq('evento_id', eventoId).eq('email_normalizado', emailBusca)
        .select('id').single();
    }
    if (resp.error || !resp.data) return NextResponse.json({ erro: 'Não foi possível confirmar sua presença.' }, { status: 500 });
    await admin.from('convidado_confirmacoes_membros').delete().eq('confirmacao_id', resp.data.id);
    await admin.from('convidado_confirmacoes_membros').insert(ids.map((id) => ({ evento_id: eventoId, confirmacao_id: resp.data.id, convidado_lista_id: id })));
    if (!emTeste) {
      const todos = (grupo.pessoas as any[]).map((p) => p.id);
      await admin.from('convidados_lista').update({ status: 'nao_vai' }).eq('evento_id', eventoId).in('id', todos);
      await admin.from('convidados_lista').update({ status: 'confirmado' }).eq('evento_id', eventoId).in('id', ids);
    }
    const agendaUrl = urlGoogleAgenda(evento.config as ConviteConfig, evento.slug as string);
    const google = emTeste ? { emailStatus: 'sem_google' as const } : await enviarConfirmacaoGoogle({ eventoId, convidadoId: resp.data.id, atualizado: !!existente, idempotencyKey: `confirmacao:${solicitacaoId}` });
    return NextResponse.json({ ok: true, atualizado: !!existente, totalPessoas: ids.length, agendaUrl, emailStatus: google.emailStatus, modoTeste: emTeste });
  }

  if (restrito) return NextResponse.json({ erro: 'Use a identificação do convidado para confirmar.' }, { status: 400 });

  const nome = String(corpo?.nome ?? '').trim().replace(/\s+/g, ' ').slice(0, 120);
  const email = String(corpo?.email ?? '').trim().toLowerCase().slice(0, 180);
  const acompanhantes = nomesFamilia(corpo?.acompanhantes).filter((p) => p.toLocaleLowerCase('pt-BR') !== nome.toLocaleLowerCase('pt-BR'));
  if (nome.length < 2) return NextResponse.json({ erro: 'Informe seu nome.' }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ erro: 'Informe um e-mail válido.' }, { status: 400 });
  const { data: existente } = await admin.from('convidados').select('id').eq('evento_id', eventoId).eq('email_normalizado', email).maybeSingle();
  if (!existente) {
    const desde = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await admin.from('convidados').select('id', { count: 'exact', head: true }).eq('evento_id', eventoId).eq('ip_hash', ipHash).gte('created_at', desde);
    if ((count ?? 0) >= MAX_CONFIRMACOES_10_MIN) return NextResponse.json({ erro: 'Muitas confirmações deste dispositivo. Aguarde alguns minutos.' }, { status: 429 });
  }
  const dados = { evento_id: eventoId, nome, email, contato: email, comparecera: true, adultos: 1 + acompanhantes.length, criancas: 0, acompanhantes, ip_hash: ipHash, teste_id: testeId, updated_at: new Date().toISOString() };
  let resp = existente
    ? await admin.from('convidados').update(dados).eq('id', existente.id).select('id').single()
    : await admin.from('convidados').insert(dados).select('id').single();
  if (resp.error?.code === '23505') resp = await admin.from('convidados').update(dados).eq('evento_id', eventoId).eq('email_normalizado', email).select('id').single();
  if (resp.error || !resp.data) return NextResponse.json({ erro: 'Não foi possível confirmar sua presença.' }, { status: 500 });
  const agendaUrl = urlGoogleAgenda(evento.config as ConviteConfig, evento.slug as string);
  const google = emTeste ? { emailStatus: 'sem_google' as const } : await enviarConfirmacaoGoogle({ eventoId, convidadoId: resp.data.id, atualizado: !!existente, idempotencyKey: `confirmacao:${solicitacaoId}` });
  return NextResponse.json({ ok: true, atualizado: !!existente, totalPessoas: 1 + acompanhantes.length, agendaUrl, emailStatus: google.emailStatus, modoTeste: emTeste });
}
