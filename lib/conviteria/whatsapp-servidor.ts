import 'server-only';

import { adminConviteria, adminPublic } from './servidor';
import { acharTipo } from './tiposEvento';
import { sincronizarConfirmacoesEvento } from './convidados-sync';

export const WHATSAPP_EVENTO_PRECO_CENTAVOS = 1990;
export const WHATSAPP_EVENTO_LIMITE = 600;
export const TEMPLATE_PRIMEIRO = 'conviteia_confirmacao_evento';
export const TEMPLATE_LEMBRETE = 'conviteia_lembrete_evento';

export type LembreteWhatsApp = '2_meses' | '1_mes' | '15_dias';

type Destinatario = {
  chave: string;
  familiaId: string | null;
  convidadoId: string | null;
  nome: string;
  telefone: string;
  token: string;
  respondido: boolean;
};

function telefoneMeta(valor: string | null | undefined) {
  const digitos = String(valor ?? '').replace(/\D/g, '');
  if (digitos.length < 10) return null;
  if (digitos.startsWith('55') && digitos.length >= 12) return digitos;
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
  return digitos.slice(-15);
}

function nomePrincipalFamilia(nomeFamilia: string, pessoas: any[]) {
  const fixos = pessoas.filter((p) => !p.rsvp_extra);
  const adulto = fixos.find((p) => p.tipo !== 'crianca') ?? fixos[0] ?? pessoas.find((p) => p.tipo !== 'crianca') ?? pessoas[0];
  if (adulto?.nome) return String(adulto.nome).trim().slice(0, 80);
  return nomeFamilia
    .replace(/^fam[ií]lia\s*\/\s*grupo\s+de\s+/i, '')
    .replace(/^fam[ií]lia\s+/i, '')
    .trim()
    .slice(0, 80) || 'Convidado';
}

function dataPorExtenso(data: string | null | undefined) {
  if (!data) return 'data informada no convite';
  const d = new Date(data);
  if (Number.isNaN(d.getTime())) return 'data informada no convite';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo',
  }).format(d);
}

function tipoParaTemplate(tipoEventoId: string) {
  const mapa: Record<string, string> = {
    'bodas-prata': 'Evento de Bodas de Prata',
    'bodas-ouro': 'Evento de Bodas de Ouro',
    'debutante': 'Evento de 15 anos',
    'formatura': 'Evento de Formatura',
    'confraternizacao': 'Evento de Confraternização',
    'vaquinha': 'Evento da Vaquinha',
  };
  return mapa[tipoEventoId] ?? acharTipo(tipoEventoId).nome;
}

function subtrairMesesSemEstourar(data: Date, meses: number) {
  const originalDia = data.getUTCDate();
  const alvo = new Date(data);
  alvo.setUTCDate(1);
  alvo.setUTCMonth(alvo.getUTCMonth() - meses);
  const ultimoDia = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
  alvo.setUTCDate(Math.min(originalDia, ultimoDia));
  return alvo;
}

export function calcularSegundoEnvio(dataEvento: string | null | undefined, modo: LembreteWhatsApp) {
  if (!dataEvento) return null;
  const d = new Date(dataEvento);
  if (Number.isNaN(d.getTime())) return null;
  let alvo = new Date(d);
  if (modo === '15_dias') alvo.setUTCDate(alvo.getUTCDate() - 15);
  if (modo === '1_mes') alvo = subtrairMesesSemEstourar(alvo, 1);
  if (modo === '2_meses') alvo = subtrairMesesSemEstourar(alvo, 2);
  alvo.setUTCHours(12, 0, 0, 0);
  return alvo.toISOString();
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
  if (error || !data?.whatsapp_number_id) {
    throw new Error('Número remetente do WhatsApp não configurado.');
  }
  const token = data.user_access_token || data.encrypted_page_access_token;
  if (!token) throw new Error('Token da conexão Meta não encontrado.');
  return { ...data, token: String(token) };
}

async function enviarTemplate({
  to, template, nome, tipo, anfitrioes, data, tokenConvite,
}: {
  to: string;
  template: string;
  nome: string;
  tipo: string;
  anfitrioes: string;
  data: string;
  tokenConvite: string;
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
      name: template,
      language: { code: 'pt_BR' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: nome },
            { type: 'text', text: tipo },
            { type: 'text', text: anfitrioes },
            { type: 'text', text: data },
          ],
        },
        {
          type: 'button', sub_type: 'url', index: '0',
          parameters: [{ type: 'text', text: tokenConvite }],
        },
        {
          type: 'button', sub_type: 'url', index: '1',
          parameters: [{ type: 'text', text: tokenConvite }],
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
    // Sem resposta HTTP não sabemos se a Meta recebeu a requisição. Mantemos
    // a reserva para não correr o risco de duplicar uma mensagem cobrada.
    throw new Error(`META_AMBIGUO:${String(e?.message ?? e).slice(0, 450)}`);
  }
  const resposta = await res.json().catch(() => null) as any;
  if (!res.ok || !resposta?.messages?.[0]?.id) {
    const msg = resposta?.error?.message || `Meta retornou HTTP ${res.status}`;
    throw new Error(`META_REJEITADO:${String(msg).slice(0, 450)}`);
  }
  return { wamid: String(resposta.messages[0].id), remetente: remetente.whatsapp_number ?? null };
}

export async function reconciliarCompraWhatsApp(eventoId: string) {
  const admin = adminConviteria();
  const { data: cfg } = await admin.from('evento_whatsapp_config').select('*').eq('evento_id', eventoId).maybeSingle();
  if (!cfg || cfg.status !== 'aguardando_pagamento' || !cfg.pix_transaction_id) return cfg ?? null;

  const pub = adminPublic();
  const { data: tx } = await pub.from('pix_transactions')
    .select('id,status,confirmed_at,expires_at,txid')
    .eq('id', cfg.pix_transaction_id)
    .maybeSingle();

  if (tx?.status === 'confirmed') {
    const agora = tx.confirmed_at ?? new Date().toISOString();
    const { data } = await admin.from('evento_whatsapp_config').update({
      status: 'ativo', comprado_em: agora, updated_at: new Date().toISOString(),
    }).eq('evento_id', eventoId).select('*').single();
    return data;
  }

  if (tx?.status === 'expired' || (tx?.expires_at && new Date(tx.expires_at).getTime() < Date.now())) {
    const { data } = await admin.from('evento_whatsapp_config').update({
      status: 'nao_contratado', pix_transaction_id: null, pix_txid: null, updated_at: new Date().toISOString(),
    }).eq('evento_id', eventoId).select('*').single();
    return data;
  }
  return cfg;
}

async function destinatariosDoEvento(eventoId: string): Promise<Destinatario[]> {
  const admin = adminConviteria();
  const [{ data: familias }, { data: pessoas }] = await Promise.all([
    admin.from('convidado_familias')
      .select('id,nome,telefone,telefone_normalizado,qr_token,created_at')
      .eq('evento_id', eventoId).order('created_at'),
    admin.from('convidados_lista')
      .select('id,familia_id,nome,telefone,telefone_normalizado,qr_token,tipo,status,rsvp_extra,created_at')
      .eq('evento_id', eventoId).order('created_at'),
  ]);

  const lista: Destinatario[] = [];
  const usados = new Set<string>();
  const todasPessoas = pessoas ?? [];

  for (const fam of familias ?? []) {
    const membros = todasPessoas.filter((p: any) => p.familia_id === fam.id);
    const membrosFixos = membros.filter((p: any) => !p.rsvp_extra);
    if (!membrosFixos.length) continue;
    const fone = telefoneMeta(
      fam.telefone_normalizado || fam.telefone || membros.find((p: any) => p.telefone_normalizado || p.telefone)?.telefone_normalizado || membros.find((p: any) => p.telefone)?.telefone,
    );
    if (!fone || usados.has(fone)) continue;
    usados.add(fone);
    lista.push({
      chave: `familia:${fam.id}`,
      familiaId: fam.id,
      convidadoId: null,
      nome: nomePrincipalFamilia(fam.nome, membros),
      telefone: fone,
      token: fam.qr_token,
      respondido: membrosFixos.every((p: any) => p.status !== 'pendente'),
    });
  }

  for (const p of todasPessoas.filter((x: any) => !x.familia_id)) {
    const fone = telefoneMeta(p.telefone_normalizado || p.telefone);
    if (!fone || usados.has(fone)) continue;
    usados.add(fone);
    lista.push({
      chave: `pessoa:${p.id}`,
      familiaId: null,
      convidadoId: p.id,
      nome: String(p.nome).trim().slice(0, 80) || 'Convidado',
      telefone: fone,
      token: p.qr_token,
      respondido: p.status !== 'pendente',
    });
  }

  return lista;
}

async function enviosDoEvento(eventoId: string, rodada?: 1 | 2) {
  const admin = adminConviteria();
  let q = admin.from('evento_whatsapp_envios')
    .select('id,rodada,telefone_normalizado,status,tentativas,enviado_em')
    .eq('evento_id', eventoId);
  if (rodada) q = q.eq('rodada', rodada);
  const { data } = await q;
  return data ?? [];
}

export async function resumoWhatsApp(eventoId: string) {
  await sincronizarConfirmacoesEvento(eventoId);
  const admin = adminConviteria();
  const cfg = await reconciliarCompraWhatsApp(eventoId);
  const destinos = await destinatariosDoEvento(eventoId);
  const envios = await enviosDoEvento(eventoId);
  const primeiroPorTel = new Map(envios.filter((e: any) => e.rodada === 1).map((e: any) => [e.telefone_normalizado, e]));
  const segundoPorTel = new Map(envios.filter((e: any) => e.rodada === 2).map((e: any) => [e.telefone_normalizado, e]));
  const usados = envios.filter((e: any) => e.status === 'enviado' || e.status === 'reservado').length;

  const podeEnviar = (e: any) => !e || (!['enviado','reservado'].includes(e.status) && Number(e.tentativas ?? 0) < 3);
  const elegiveisPrimeiro = destinos.filter((d) => !d.respondido && podeEnviar(primeiroPorTel.get(d.telefone)));
  const elegiveisSegundo = destinos.filter((d) => podeEnviar(segundoPorTel.get(d.telefone)));

  const { data: evento } = await admin.from('eventos').select('data_evento,config,tipo_evento_id').eq('id', eventoId).maybeSingle();
  let configAtual = cfg;
  if (cfg?.lembrete_modo && !cfg.segundo_disparo_em && evento?.data_evento) {
    const recalculado = calcularSegundoEnvio(evento.data_evento as string, cfg.lembrete_modo as LembreteWhatsApp);
    if (recalculado && recalculado !== cfg.segundo_programado_em) {
      const { data: atualizado } = await admin.from('evento_whatsapp_config')
        .update({ segundo_programado_em: recalculado })
        .eq('evento_id', eventoId)
        .select('*')
        .single();
      if (atualizado) configAtual = atualizado;
    }
  }
  return {
    config: configAtual,
    contatosComWhatsApp: destinos.length,
    pendentesRsvp: destinos.filter((d) => !d.respondido).length,
    novosPrimeiroEnvio: elegiveisPrimeiro.length,
    faltamSegundoEnvio: elegiveisSegundo.length,
    mensagensUsadas: usados,
    mensagensRestantes: Math.max(0, WHATSAPP_EVENTO_LIMITE - usados),
    evento: evento ? {
      dataEvento: evento.data_evento,
      anfitrioes: (evento.config as any)?.anfitrioes?.exibicao ?? 'Evento',
      tipo: tipoParaTemplate(evento.tipo_evento_id as string),
    } : null,
  };
}

async function prepararRegistro(eventoId: string, d: Destinatario, rodada: 1 | 2, template: string) {
  const admin = adminConviteria();
  const { data: existente } = await admin.from('evento_whatsapp_envios')
    .select('id,status,tentativas')
    .eq('evento_id', eventoId).eq('rodada', rodada).eq('telefone_normalizado', d.telefone)
    .maybeSingle();

  if (existente && ['enviado', 'reservado'].includes(existente.status)) return null;
  if (existente && Number(existente.tentativas ?? 0) >= 3) return null;

  if (existente) {
    const { data, error } = await admin.from('evento_whatsapp_envios').update({
      familia_id: d.familiaId,
      convidado_lista_id: d.convidadoId,
      status: 'reservado',
      template_nome: template,
      tentativas: Number(existente.tentativas ?? 0) + 1,
      reservado_em: new Date().toISOString(),
      erro: null,
      updated_at: new Date().toISOString(),
    }).eq('id', existente.id).eq('status', 'falhou').select('id').maybeSingle();
    if (error || !data) return null;
    return data.id as string;
  }

  const { data, error } = await admin.from('evento_whatsapp_envios').insert({
    evento_id: eventoId,
    familia_id: d.familiaId,
    convidado_lista_id: d.convidadoId,
    telefone_normalizado: d.telefone,
    rodada,
    status: 'reservado',
    template_nome: template,
    tentativas: 1,
    reservado_em: new Date().toISOString(),
  }).select('id').single();
  if (error || !data) return null;
  return data.id as string;
}

export async function processarRodada(eventoId: string, rodada: 1 | 2, limite = 40) {
  await sincronizarConfirmacoesEvento(eventoId);
  const admin = adminConviteria();
  const { data: cfg } = await admin.from('evento_whatsapp_config').select('*').eq('evento_id', eventoId).maybeSingle();
  if (!cfg || cfg.status !== 'ativo') throw new Error('O pacote WhatsApp ainda não está ativo.');
  if (rodada === 2 && !cfg.primeiro_disparo_em) throw new Error('Envie a primeira comunicação antes do lembrete.');

  const { data: evento } = await admin.from('eventos')
    .select('id,data_evento,config,tipo_evento_id,publicado_em')
    .eq('id', eventoId).maybeSingle();
  if (!evento?.publicado_em) throw new Error('O convite precisa estar publicado.');

  const destinos = await destinatariosDoEvento(eventoId);
  const envios = await enviosDoEvento(eventoId, rodada);
  const porTel = new Map(envios.map((e: any) => [e.telefone_normalizado, e]));
  const todosEnvios = await enviosDoEvento(eventoId);
  const usados = todosEnvios.filter((e: any) => e.status === 'enviado' || e.status === 'reservado').length;
  const disponivel = Math.max(0, WHATSAPP_EVENTO_LIMITE - usados);
  if (disponivel <= 0) throw new Error('O limite de 600 mensagens deste evento foi atingido.');

  let elegiveis = destinos.filter((d) => rodada === 2 || !d.respondido);
  elegiveis = elegiveis.filter((d) => {
    const e: any = porTel.get(d.telefone);
    if (!e) return true;
    if (e.status === 'enviado' || e.status === 'reservado') return false;
    return Number(e.tentativas ?? 0) < 3;
  });

  const lote = elegiveis.slice(0, Math.min(Math.max(1, limite), disponivel));
  const template = rodada === 1 ? TEMPLATE_PRIMEIRO : TEMPLATE_LEMBRETE;
  const tipo = tipoParaTemplate(evento.tipo_evento_id as string);
  const anfitrioes = String((evento.config as any)?.anfitrioes?.exibicao ?? 'Evento').slice(0, 120);
  const data = dataPorExtenso(evento.data_evento as string | null);

  let enviados = 0;
  let falhas = 0;
  const processarUm = async (d: Destinatario) => {
    const id = await prepararRegistro(eventoId, d, rodada, template);
    if (!id) return;
    try {
      const resp = await enviarTemplate({
        to: d.telefone,
        template,
        nome: d.nome,
        tipo,
        anfitrioes,
        data,
        tokenConvite: d.token,
      });
      await admin.from('evento_whatsapp_envios').update({
        status: 'enviado', wamid: resp.wamid, enviado_em: new Date().toISOString(), erro: null, updated_at: new Date().toISOString(),
      }).eq('id', id);
      enviados += 1;
    } catch (e: any) {
      const mensagem = String(e?.message ?? e);
      const ambiguo = mensagem.startsWith('META_AMBIGUO:');
      await admin.from('evento_whatsapp_envios').update({
        status: ambiguo ? 'reservado' : 'falhou',
        erro: mensagem.replace(/^META_(?:AMBIGUO|REJEITADO):/, '').slice(0, 1000),
        updated_at: new Date().toISOString(),
      }).eq('id', id);
      falhas += 1;
    }
  };

  for (let i = 0; i < lote.length; i += 5) {
    await Promise.all(lote.slice(i, i + 5).map(processarUm));
  }

  const agora = new Date().toISOString();
  if (rodada === 1 && enviados > 0 && !cfg.primeiro_disparo_em) {
    await admin.from('evento_whatsapp_config').update({ primeiro_disparo_em: agora, updated_at: agora }).eq('evento_id', eventoId);
  }

  const depois = await enviosDoEvento(eventoId, rodada);
  const depoisPorTel = new Map(depois.map((e: any) => [e.telefone_normalizado, e]));
  const restantes = destinos.filter((d) => (rodada === 2 || !d.respondido)).filter((d) => {
    const e: any = depoisPorTel.get(d.telefone);
    if (!e) return true;
    if (e.status === 'enviado' || e.status === 'reservado') return false;
    return Number(e.tentativas ?? 0) < 3;
  }).length;

  if (rodada === 2 && restantes === 0 && enviados > 0) {
    await admin.from('evento_whatsapp_config').update({ segundo_disparo_em: agora, updated_at: agora }).eq('evento_id', eventoId);
  }

  return { enviados, falhas, restantes, processados: lote.length };
}

export async function telefonesPendentesParaTransmissao(eventoId: string) {
  const destinos = await destinatariosDoEvento(eventoId);
  return destinos.filter((d) => !d.respondido).map((d) => d.telefone);
}
