import { createAdminClient } from '@/lib/supabase-admin';
import { variantesTelefoneBusca } from '@/lib/conviteria/gestao-servidor';

export type BigCorpsWhatsappSource = 'conviteia' | 'pixwiki' | 'minhai' | 'outros';

export type BigCorpsWhatsappSettings = {
  id: string;
  company_id: string;
  whatsapp_number_id: string;
  support_number: string;
  auto_reply_text: string;
  auto_reply_enabled: boolean;
  window_hours: number;
  callback_url: string;
  webhook_secret: string;
};

export type BigCorpsWhatsappSourceInfo = {
  source: BigCorpsWhatsappSource;
  senderName: string | null;
  context: Record<string, unknown>;
  timestamp: string | null;
};

function safeDate(value: unknown): number {
  const ms = new Date(String(value ?? '')).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function cleanName(value: unknown): string | null {
  const text = String(value ?? '').trim().replace(/\s+/g, ' ');
  return text ? text.slice(0, 160) : null;
}

export function normalizeWhatsappRecipient(value: string) {
  return value.replace(/\D/g, '').slice(0, 20);
}

export async function getBigCorpsWhatsappSettings(
  admin = createAdminClient(),
  pageId?: string | null,
): Promise<BigCorpsWhatsappSettings | null> {
  let query = admin
    .from('bigcorps_whatsapp_settings')
    .select('id,company_id,whatsapp_number_id,support_number,auto_reply_text,auto_reply_enabled,window_hours,callback_url,webhook_secret');

  query = pageId
    ? query.eq('whatsapp_number_id', pageId)
    : query.eq('id', 'shared');

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error('[bigcorps-whatsapp] Falha ao carregar configuração:', error);
    return null;
  }
  return (data as BigCorpsWhatsappSettings | null) ?? null;
}

export async function classifyBigCorpsWhatsappSource(
  admin: ReturnType<typeof createAdminClient>,
  fromId: string,
): Promise<BigCorpsWhatsappSourceInfo> {
  const variants = variantesTelefoneBusca(fromId);
  if (!variants.length) {
    return { source: 'outros', senderName: null, context: {}, timestamp: null };
  }

  const cutoff = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString();
  const convite = admin.schema('conviteria');

  const convitePromise = convite
    .from('evento_whatsapp_envios')
    .select('evento_id,familia_id,convidado_lista_id,enviado_em,created_at')
    .in('telefone_normalizado', variants)
    .eq('status', 'enviado')
    .gte('created_at', cutoff)
    .order('enviado_em', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const pixPhoneVariants = Array.from(new Set([
    ...variants,
    ...variants.map((v) => `+${v}`),
  ]));

  const pixPromise = admin
    .from('whatsapp_notification_retry')
    .select('company_id,pix_data,created_at,to_number')
    .in('to_number', pixPhoneVariants)
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const [{ data: conviteRow }, { data: pixRow }] = await Promise.all([
    convitePromise,
    pixPromise,
  ]);

  let conviteInfo: BigCorpsWhatsappSourceInfo | null = null;
  if (conviteRow?.evento_id) {
    const [eventoRes, nomeRes] = await Promise.all([
      convite
        .from('eventos')
        .select('id,slug,config')
        .eq('id', conviteRow.evento_id)
        .maybeSingle(),
      conviteRow.familia_id
        ? convite
            .from('convidado_familias')
            .select('nome')
            .eq('id', conviteRow.familia_id)
            .maybeSingle()
        : conviteRow.convidado_lista_id
          ? convite
              .from('convidados_lista')
              .select('nome')
              .eq('id', conviteRow.convidado_lista_id)
              .maybeSingle()
          : Promise.resolve({ data: null as { nome?: string } | null }),
    ]);

    const evento = eventoRes.data as any;
    const pessoa = nomeRes.data as any;
    const anfitrioes = evento?.config?.anfitrioes;
    const eventoLabel = cleanName(anfitrioes?.exibicao)
      ?? cleanName(anfitrioes?.titulo)
      ?? cleanName(evento?.slug);

    conviteInfo = {
      source: 'conviteia',
      senderName: cleanName(pessoa?.nome),
      timestamp: conviteRow.enviado_em ?? conviteRow.created_at ?? null,
      context: {
        eventoId: conviteRow.evento_id,
        eventoSlug: evento?.slug ?? null,
        eventoLabel,
        contatoNome: cleanName(pessoa?.nome),
      },
    };
  }

  let pixInfo: BigCorpsWhatsappSourceInfo | null = null;
  if (pixRow) {
    const { data: company } = pixRow.company_id
      ? await admin
          .from('companies')
          .select('id,name,slug')
          .eq('id', pixRow.company_id)
          .maybeSingle()
      : { data: null as any };

    const pixData = (pixRow.pix_data && typeof pixRow.pix_data === 'object')
      ? pixRow.pix_data as Record<string, unknown>
      : {};

    pixInfo = {
      source: 'pixwiki',
      senderName: null,
      timestamp: pixRow.created_at ?? null,
      context: {
        companyId: pixRow.company_id ?? null,
        companyName: cleanName((company as any)?.name),
        companySlug: (company as any)?.slug ?? null,
        txid: pixData.txid ?? pixData.pix_txid ?? null,
      },
    };
  }

  if (conviteInfo && pixInfo) {
    return safeDate(conviteInfo.timestamp) >= safeDate(pixInfo.timestamp)
      ? conviteInfo
      : pixInfo;
  }
  if (conviteInfo) return conviteInfo;
  if (pixInfo) return pixInfo;

  return {
    source: 'minhai',
    senderName: null,
    context: {},
    timestamp: null,
  };
}

export async function sendBigCorpsWhatsappText({
  admin,
  pageId,
  to,
  message,
}: {
  admin: ReturnType<typeof createAdminClient>;
  pageId: string;
  to: string;
  message: string;
}) {
  const recipient = normalizeWhatsappRecipient(to);
  if (!recipient) throw new Error('Destinatário inválido.');

  const { data: connection, error } = await admin
    .from('meta_connections')
    .select('whatsapp_number_id,user_access_token,encrypted_page_access_token')
    .eq('whatsapp_number_id', pageId)
    .maybeSingle();

  if (error || !connection) {
    throw new Error('Conexão WhatsApp BigCorps não encontrada.');
  }

  const token = connection.user_access_token || connection.encrypted_page_access_token;
  if (!token) throw new Error('Token da conexão WhatsApp não disponível.');

  const version = (process.env.META_GRAPH_VERSION?.trim() || 'v23.0').replace(/^\//, '');
  const response = await fetch(
    `https://graph.facebook.com/${version}/${pageId}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipient,
        type: 'text',
        text: { preview_url: false, body: message },
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(12_000),
    },
  );

  const payload = await response.json().catch(() => null) as any;
  if (!response.ok) {
    const err = new Error(payload?.error?.message || 'A Meta recusou o envio da mensagem.') as Error & {
      code?: number;
      meta?: unknown;
    };
    err.code = Number(payload?.error?.code || 0) || undefined;
    err.meta = payload?.error ?? payload;
    throw err;
  }

  return {
    wamid: payload?.messages?.[0]?.id ? String(payload.messages[0].id) : null,
  };
}

export async function latestWhatsappConversation(
  admin: ReturnType<typeof createAdminClient>,
  pageId: string,
  fromId: string,
) {
  const { data, error } = await admin
    .from('conversations')
    .select('id,company_id,meta_from_id,meta_page_id,meta_platform,created_at,updated_at')
    .eq('meta_from_id', fromId)
    .eq('meta_page_id', pageId)
    .eq('meta_platform', 'whatsapp')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}
