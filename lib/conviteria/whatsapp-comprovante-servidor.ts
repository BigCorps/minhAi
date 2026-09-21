import 'server-only';

import { adminConviteria, adminPublic } from './servidor';
import { resumoWhatsApp } from './whatsapp-servidor';

export const TEMPLATE_COMPROVANTE_ENVIO = 'conviteia_envio_concluido';

function telefoneMeta(valor: string | null | undefined) {
  const digitos = String(valor ?? '').replace(/\D/g, '');
  if (digitos.length < 10) return null;
  if (digitos.startsWith('55') && digitos.length >= 12) return digitos.slice(0, 15);
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
  return digitos.slice(-15);
}

async function conexaoRemetente() {
  const pub = adminPublic();
  const companyId = process.env.CONVITEIA_WHATSAPP_COMPANY_ID?.trim();

  let query = pub.from('meta_connections')
    .select('company_id,whatsapp_number_id,user_access_token,encrypted_page_access_token,page_name,updated_at')
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

  return {
    whatsappNumberId: String(data.whatsapp_number_id),
    token: String(token),
  };
}

async function enviarTemplateComprovante({
  to,
  rodada,
  anfitrioes,
  enviados,
  falhas,
}: {
  to: string;
  rodada: 1 | 2;
  anfitrioes: string;
  enviados: number;
  falhas: number;
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
      name: TEMPLATE_COMPROVANTE_ENVIO,
      language: { code: 'pt_BR' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: rodada === 1 ? '1ª' : '2ª' },
            { type: 'text', text: anfitrioes.slice(0, 120) || 'seu evento' },
            { type: 'text', text: String(enviados) },
            { type: 'text', text: String(falhas) },
          ],
        },
      ],
    },
  };

  let response: Response;
  try {
    response = await fetch(`${base}/${remetente.whatsappNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${remetente.token}`,
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
      signal: AbortSignal.timeout(12_000),
    });
  } catch (error: any) {
    throw new Error(`Não foi possível conectar à Meta: ${String(error?.message ?? error).slice(0, 260)}`);
  }

  const resposta = await response.json().catch(() => null) as any;
  if (!response.ok || !resposta?.messages?.[0]?.id) {
    const metaMessage = resposta?.error?.message || `HTTP ${response.status}`;
    throw new Error(`A Meta recusou o comprovante: ${String(metaMessage).slice(0, 320)}`);
  }

  return String(resposta.messages[0].id);
}

export async function salvarTelefoneComprovante(eventoId: string, valor: string | null | undefined) {
  const admin = adminConviteria();
  const texto = String(valor ?? '').trim();
  const telefone = texto ? telefoneMeta(texto) : null;
  if (texto && !telefone) {
    throw new Error('Informe um WhatsApp válido com DDD.');
  }

  const { error } = await admin.from('evento_whatsapp_config')
    .update({ comprovante_telefone: telefone, updated_at: new Date().toISOString() })
    .eq('evento_id', eventoId);

  if (error) {
    console.error('[ConviteIA/WhatsApp] Falha ao salvar telefone de comprovante:', error);
    throw new Error('Não foi possível salvar o WhatsApp dos comprovantes.');
  }

  return telefone;
}

export async function enviarComprovanteRodada(eventoId: string, rodada: 1 | 2) {
  const admin = adminConviteria();
  const { data: cfg, error: cfgError } = await admin.from('evento_whatsapp_config')
    .select('*')
    .eq('evento_id', eventoId)
    .maybeSingle();

  if (cfgError || !cfg) throw new Error('Configuração do WhatsApp do Evento não encontrada.');
  if (cfg.status !== 'ativo') throw new Error('O WhatsApp do Evento ainda não está ativo.');

  const telefone = telefoneMeta(cfg.comprovante_telefone);
  if (!telefone) throw new Error('Informe e salve o WhatsApp que receberá os comprovantes.');

  const campoEnviado = rodada === 1 ? 'primeiro_comprovante_em' : 'segundo_comprovante_em';
  const campoWamid = rodada === 1 ? 'primeiro_comprovante_wamid' : 'segundo_comprovante_wamid';
  const campoErro = rodada === 1 ? 'primeiro_comprovante_erro' : 'segundo_comprovante_erro';

  if (cfg[campoEnviado]) {
    return {
      enviado: true,
      jaEnviado: true,
      enviadoEm: cfg[campoEnviado] as string,
      wamid: cfg[campoWamid] as string | null,
    };
  }

  const resumo = await resumoWhatsApp(eventoId);
  const concluida = rodada === 1
    ? Boolean(resumo.config?.primeiro_disparo_em) && Number(resumo.novosPrimeiroEnvio ?? 0) === 0
    : Boolean(resumo.config?.segundo_disparo_em);

  if (!concluida) {
    throw new Error(`A ${rodada}ª comunicação ainda não terminou. O comprovante será liberado ao final do envio.`);
  }

  const { data: envios, error: enviosError } = await admin.from('evento_whatsapp_envios')
    .select('status')
    .eq('evento_id', eventoId)
    .eq('rodada', rodada);

  if (enviosError) {
    console.error('[ConviteIA/WhatsApp] Falha ao resumir rodada:', enviosError);
    throw new Error('Não foi possível montar o comprovante do envio.');
  }

  const enviados = (envios ?? []).filter((item: any) => item.status === 'enviado').length;
  const falhas = (envios ?? []).filter((item: any) => item.status === 'falhou').length;
  const anfitrioes = String(resumo.evento?.anfitrioes ?? 'seu evento').trim() || 'seu evento';

  try {
    const wamid = await enviarTemplateComprovante({
      to: telefone,
      rodada,
      anfitrioes,
      enviados,
      falhas,
    });
    const agora = new Date().toISOString();
    const update: Record<string, unknown> = {
      [campoEnviado]: agora,
      [campoWamid]: wamid,
      [campoErro]: null,
      updated_at: agora,
    };

    const { error: updateError } = await admin.from('evento_whatsapp_config')
      .update(update)
      .eq('evento_id', eventoId)
      .is(campoEnviado, null);

    if (updateError) {
      console.warn('[ConviteIA/WhatsApp] Comprovante enviado, mas falhou ao registrar status:', updateError);
    }

    return { enviado: true, jaEnviado: false, enviadoEm: agora, wamid, enviados, falhas };
  } catch (error: any) {
    const mensagem = String(error?.message ?? error).slice(0, 500);
    await admin.from('evento_whatsapp_config')
      .update({ [campoErro]: mensagem, updated_at: new Date().toISOString() })
      .eq('evento_id', eventoId);
    throw new Error(mensagem);
  }
}
