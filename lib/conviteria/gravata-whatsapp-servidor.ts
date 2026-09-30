import 'server-only';

import { adminConviteria, adminPublic } from './servidor';
import { acharTipo } from './tiposEvento';
import { sincronizarConfirmacoesEvento } from './convidados-sync';
import { HORA_GRAVATA_TEMPLATE_WHATSAPP } from './gravata-config';

const LIMITE_DISPARO_GRAVATA = 600;

type DestinatarioGravata = {
  familiaId: string | null;
  convidadoId: string | null;
  nome: string;
  telefone: string;
};

function telefoneMeta(valor: string | null | undefined) {
  const digitos = String(valor ?? '').replace(/\D/g, '');
  if (digitos.length < 10) return null;
  if (digitos.startsWith('55') && digitos.length >= 12) return digitos;
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
  return digitos.slice(-15);
}

function nomePrincipalFamilia(nomeFamilia: string, pessoas: any[]) {
  const confirmados = pessoas.filter((p) => !p.rsvp_extra && p.status === 'confirmado');
  const adulto = confirmados.find((p) => p.tipo !== 'crianca') ?? confirmados[0];
  if (adulto?.nome) return String(adulto.nome).trim().slice(0, 80);
  return String(nomeFamilia ?? '')
    .replace(/^fam[ií]lia\s*\/\s*grupo\s+de\s+/i, '')
    .replace(/^fam[ií]lia\s+/i, '')
    .trim()
    .slice(0, 80) || 'Convidado';
}

export function tipoParaAtividade(tipoEventoId: string) {
  const mapa: Record<string, string> = {
    'bodas-prata': 'Evento de Bodas de Prata',
    'bodas-ouro': 'Evento de Bodas de Ouro',
    debutante: 'Evento de 15 anos',
    formatura: 'Evento de Formatura',
    confraternizacao: 'Evento de Confraternização',
    vaquinha: 'Evento',
  };
  return mapa[tipoEventoId] ?? acharTipo(tipoEventoId).nome;
}

async function conexaoRemetente() {
  const pub = adminPublic();
  const companyId = process.env.CONVITEIA_WHATSAPP_COMPANY_ID?.trim();

  let query = pub.from('meta_connections')
    .select('company_id,whatsapp_number_id,user_access_token,encrypted_page_access_token,page_name,whatsapp_number,updated_at')
    .not('whatsapp_number_id', 'is', null);

  query = companyId
    ? query.eq('company_id', companyId)
    : query.ilike('page_name', '%BigCorps%');

  const { data, error } = await query
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.whatsapp_number_id) throw new Error('Número remetente do WhatsApp não configurado.');
  const token = data.user_access_token || data.encrypted_page_access_token;
  if (!token) throw new Error('Token da conexão Meta não encontrado.');
  return { ...data, token: String(token) };
}

async function enviarTemplateAtividade({
  to,
  nome,
  tipo,
  anfitrioes,
  nomeAcao,
  linkToken,
}: {
  to: string;
  nome: string;
  tipo: string;
  anfitrioes: string;
  nomeAcao: string;
  linkToken: string;
}) {
  const remetente = await conexaoRemetente();
  const versao = process.env.META_GRAPH_VERSION?.trim() || 'v23.0';
  const base = `https://graph.facebook.com/${versao.replace(/^\//, '')}`;
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template: {
      name: HORA_GRAVATA_TEMPLATE_WHATSAPP,
      language: { code: 'pt_BR' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: nome },
            { type: 'text', text: tipo },
            { type: 'text', text: anfitrioes },
            { type: 'text', text: nomeAcao },
          ],
        },
        {
          type: 'button',
          sub_type: 'url',
          index: '0',
          parameters: [{ type: 'text', text: linkToken }],
        },
      ],
    },
  };

  let res: Response;
  try {
    res = await fetch(`${base}/${remetente.whatsapp_number_id}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${remetente.token}`,
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
  } catch (e: any) {
    throw new Error(`META_AMBIGUO:${String(e?.message ?? e).slice(0, 450)}`);
  }

  const resposta = await res.json().catch(() => null) as any;
  if (!res.ok || !resposta?.messages?.[0]?.id) {
    const msg = resposta?.error?.message || `Meta retornou HTTP ${res.status}`;
    throw new Error(`META_REJEITADO:${String(msg).slice(0, 450)}`);
  }
  return { wamid: String(resposta.messages[0].id) };
}

async function destinatariosConfirmados(eventoId: string): Promise<DestinatarioGravata[]> {
  await sincronizarConfirmacoesEvento(eventoId);
  const admin = adminConviteria();
  const [{ data: familias }, { data: pessoas }] = await Promise.all([
    admin.from('convidado_familias')
      .select('id,nome,telefone,telefone_normalizado,created_at')
      .eq('evento_id', eventoId)
      .order('created_at'),
    admin.from('convidados_lista')
      .select('id,familia_id,nome,telefone,telefone_normalizado,tipo,status,rsvp_extra,created_at')
      .eq('evento_id', eventoId)
      .order('created_at'),
  ]);

  const todos = pessoas ?? [];
  const usados = new Set<string>();
  const saida: DestinatarioGravata[] = [];

  for (const familia of familias ?? []) {
    const membros = todos.filter((p: any) => p.familia_id === familia.id);
    const confirmados = membros.filter((p: any) => !p.rsvp_extra && p.status === 'confirmado');
    if (!confirmados.length) continue;

    const comTelefone = confirmados.find((p: any) => p.telefone_normalizado || p.telefone);
    const telefone = telefoneMeta(
      familia.telefone_normalizado || familia.telefone || comTelefone?.telefone_normalizado || comTelefone?.telefone,
    );
    if (!telefone || usados.has(telefone)) continue;
    usados.add(telefone);
    saida.push({
      familiaId: familia.id,
      convidadoId: null,
      nome: nomePrincipalFamilia(familia.nome, membros),
      telefone,
    });
  }

  for (const pessoa of todos.filter((p: any) => !p.familia_id && p.status === 'confirmado')) {
    const telefone = telefoneMeta(pessoa.telefone_normalizado || pessoa.telefone);
    if (!telefone || usados.has(telefone)) continue;
    usados.add(telefone);
    saida.push({
      familiaId: null,
      convidadoId: pessoa.id,
      nome: String(pessoa.nome ?? '').trim().slice(0, 80) || 'Convidado',
      telefone,
    });
  }

  return saida.slice(0, LIMITE_DISPARO_GRAVATA);
}

async function prepararRegistro(eventoId: string, d: DestinatarioGravata) {
  const admin = adminConviteria();
  const { data: existente } = await admin.from('evento_gravata_whatsapp_envios')
    .select('id,status,tentativas,link_token')
    .eq('evento_id', eventoId)
    .eq('telefone_normalizado', d.telefone)
    .maybeSingle();

  if (existente && ['enviado', 'reservado'].includes(existente.status)) return null;
  if (existente && Number(existente.tentativas ?? 0) >= 3) return null;

  if (existente) {
    const { data } = await admin.from('evento_gravata_whatsapp_envios').update({
      familia_id: d.familiaId,
      convidado_lista_id: d.convidadoId,
      nome_destinatario: d.nome,
      status: 'reservado',
      tentativas: Number(existente.tentativas ?? 0) + 1,
      reservado_em: new Date().toISOString(),
      erro: null,
      updated_at: new Date().toISOString(),
    })
      .eq('id', existente.id)
      .in('status', ['falhou', 'pendente', 'cancelado'])
      .select('id,link_token')
      .maybeSingle();
    return data ? { id: String(data.id), linkToken: String(data.link_token) } : null;
  }

  const { data, error } = await admin.from('evento_gravata_whatsapp_envios').insert({
    evento_id: eventoId,
    familia_id: d.familiaId,
    convidado_lista_id: d.convidadoId,
    nome_destinatario: d.nome,
    telefone_normalizado: d.telefone,
    status: 'reservado',
    tentativas: 1,
    reservado_em: new Date().toISOString(),
  }).select('id,link_token').single();

  if (error || !data) return null;
  return { id: String(data.id), linkToken: String(data.link_token) };
}

export async function resumoDisparoGravata(eventoId: string) {
  const admin = adminConviteria();
  const [destinos, { data: linhas }] = await Promise.all([
    destinatariosConfirmados(eventoId),
    admin.from('evento_gravata_whatsapp_envios')
      .select('status')
      .eq('evento_id', eventoId),
  ]);
  const envios = linhas ?? [];
  return {
    elegiveis: destinos.length,
    enviados: envios.filter((x: any) => x.status === 'enviado').length,
    falhas: envios.filter((x: any) => x.status === 'falhou').length,
    reservados: envios.filter((x: any) => x.status === 'reservado').length,
  };
}

export async function processarDisparoGravata(eventoId: string, limite = 40) {
  const admin = adminConviteria();
  const [{ data: gravata }, { data: whatsapp }, { data: evento }] = await Promise.all([
    admin.from('evento_gravata_config').select('*').eq('evento_id', eventoId).maybeSingle(),
    admin.from('evento_whatsapp_config').select('status').eq('evento_id', eventoId).maybeSingle(),
    admin.from('eventos').select('id,slug,config,tipo_evento_id,publicado_em,data_evento').eq('id', eventoId).maybeSingle(),
  ]);

  if (!evento?.publicado_em) throw new Error('O convite precisa estar publicado.');
  if (!gravata || gravata.status !== 'ativo') throw new Error('A Hora da Gravata não está ativa.');
  if (whatsapp?.status !== 'ativo') throw new Error('O WhatsApp do Evento não está ativo.');
  if (!gravata.whatsapp_programado_em || gravata.whatsapp_disparo_em) {
    return { enviados: 0, falhas: 0, restantes: 0, processados: 0 };
  }
  if (new Date(gravata.whatsapp_programado_em).getTime() > Date.now()) {
    return { enviados: 0, falhas: 0, restantes: 0, processados: 0 };
  }
  if (!gravata.arrecadacao_aberta) {
    await admin.from('evento_gravata_config').update({
      whatsapp_programado_em: null,
      whatsapp_erro: 'Disparo cancelado porque a atividade estava encerrada no horário programado.',
      updated_at: new Date().toISOString(),
    }).eq('evento_id', eventoId).is('whatsapp_disparo_em', null);
    return { enviados: 0, falhas: 0, restantes: 0, processados: 0, cancelado: true };
  }

  const destinos = await destinatariosConfirmados(eventoId);
  const { data: existentes } = await admin.from('evento_gravata_whatsapp_envios')
    .select('telefone_normalizado,status,tentativas')
    .eq('evento_id', eventoId);
  const porTelefone = new Map((existentes ?? []).map((x: any) => [x.telefone_normalizado, x]));

  const elegiveis = destinos.filter((d) => {
    const atual: any = porTelefone.get(d.telefone);
    if (!atual) return true;
    if (['enviado', 'reservado'].includes(atual.status)) return false;
    return Number(atual.tentativas ?? 0) < 3;
  });

  const lote = elegiveis.slice(0, Math.max(1, Math.min(40, limite)));
  const tipo = tipoParaAtividade(String(evento.tipo_evento_id ?? ''));
  const anfitrioes = String((evento.config as any)?.anfitrioes?.exibicao ?? 'Anfitriões').slice(0, 120);
  const nomeAcao = String(gravata.nome_acao || 'Hora da Gravata').slice(0, 80);

  let enviados = 0;
  let falhas = 0;

  const processarUm = async (d: DestinatarioGravata) => {
    const registro = await prepararRegistro(eventoId, d);
    if (!registro) return;
    try {
      const resposta = await enviarTemplateAtividade({
        to: d.telefone,
        nome: d.nome,
        tipo,
        anfitrioes,
        nomeAcao,
        linkToken: registro.linkToken,
      });
      await admin.from('evento_gravata_whatsapp_envios').update({
        status: 'enviado',
        wamid: resposta.wamid,
        enviado_em: new Date().toISOString(),
        erro: null,
        updated_at: new Date().toISOString(),
      }).eq('id', registro.id);
      enviados += 1;
    } catch (e: any) {
      const mensagem = String(e?.message ?? e);
      const ambiguo = mensagem.startsWith('META_AMBIGUO:');
      await admin.from('evento_gravata_whatsapp_envios').update({
        status: ambiguo ? 'reservado' : 'falhou',
        erro: mensagem.replace(/^META_(?:AMBIGUO|REJEITADO):/, '').slice(0, 1000),
        updated_at: new Date().toISOString(),
      }).eq('id', registro.id);
      falhas += 1;
    }
  };

  for (let i = 0; i < lote.length; i += 5) {
    await Promise.all(lote.slice(i, i + 5).map(processarUm));
  }

  const { data: depois } = await admin.from('evento_gravata_whatsapp_envios')
    .select('telefone_normalizado,status,tentativas')
    .eq('evento_id', eventoId);
  const depoisPorTelefone = new Map((depois ?? []).map((x: any) => [x.telefone_normalizado, x]));
  const restantes = destinos.filter((d) => {
    const registro: any = depoisPorTelefone.get(d.telefone);
    if (!registro) return true;
    if (['enviado', 'reservado'].includes(registro.status)) return false;
    return Number(registro.tentativas ?? 0) < 3;
  }).length;
  const falhasTerminais = (depois ?? []).filter((x: any) =>
    x.status === 'falhou' && Number(x.tentativas ?? 0) >= 3
  ).length;

  if (restantes === 0) {
    const agora = new Date().toISOString();
    await admin.from('evento_gravata_config').update({
      whatsapp_disparo_em: agora,
      whatsapp_erro: falhasTerminais
        ? `${falhasTerminais} envio(s) falharam após as tentativas permitidas.`
        : null,
      updated_at: agora,
    }).eq('evento_id', eventoId).is('whatsapp_disparo_em', null);
  }

  return { enviados, falhas, restantes, processados: lote.length };
}

export async function resolverLinkGravataWhatsApp(token: string) {
  const admin = adminConviteria();
  const { data: envio } = await admin.from('evento_gravata_whatsapp_envios')
    .select('evento_id,familia_id,convidado_lista_id,nome_destinatario,status')
    .eq('link_token', token)
    .maybeSingle();
  if (!envio || !['reservado', 'enviado'].includes(envio.status)) return null;

  const [{ data: evento }, { data: gravata }] = await Promise.all([
    admin.from('eventos').select('id,slug,publicado_em,arquivado').eq('id', envio.evento_id).maybeSingle(),
    admin.from('evento_gravata_config').select('status').eq('evento_id', envio.evento_id).maybeSingle(),
  ]);
  if (!evento?.publicado_em || evento.arquivado || gravata?.status !== 'ativo') return null;
  return {
    eventoId: String(envio.evento_id),
    slug: String(evento.slug),
    familiaId: envio.familia_id ? String(envio.familia_id) : null,
    convidadoId: envio.convidado_lista_id ? String(envio.convidado_lista_id) : null,
    nome: String(envio.nome_destinatario || '').trim() || 'Convidado',
  };
}
