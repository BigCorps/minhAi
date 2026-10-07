import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import {
  AREA_OPTIONS,
  BR_UFS,
  BIGCORPS_CONSENT_TEXT,
  FATURAMENTO_OPTIONS,
  GESTAO_OPTIONS,
  INFRAESTRUTURA_OPTIONS,
  CHECKOUT_PROVIDER_OPTIONS,
  MELHOR_HORARIO_OPTIONS,
  PORTE_OPTIONS,
  SEGMENTO_OPTIONS,
  TEMPO_EMPRESA_OPTIONS,
  TIPO_EMPRESA_OPTIONS,
  calculateLeadPriority,
  calculatePriorityAreas,
  inferProductOpportunities,
  type Area,
  type SymptomAnswer,
  isValidBrazilPhone,
} from '@/lib/bigcorps-leads';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 24_000;
const RATE_LIMIT = 5;
const RATE_WINDOW_SECONDS = 15 * 60;

const asText = (value: unknown, max = 180) => String(value ?? '').trim().slice(0, max);
const asNullableText = (value: unknown, max = 180) => {
  const text = asText(value, max);
  return text || null;
};
const isOneOf = (value: string, options: readonly string[]) => options.includes(value);

function normalizePhone(value: unknown) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) return digits;
  return '';
}

function validEmail(value: string | null) {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function clientIp(request: Request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    'unknown'
  );
}

function safePageUrl(value: unknown, requestUrl: string) {
  const raw = asText(value, 800);
  try {
    const url = new URL(raw);
    const apiUrl = new URL(requestUrl);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (url.hostname !== apiUrl.hostname) return null;
    return url.toString().slice(0, 800);
  } catch {
    return null;
  }
}

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function parseSymptoms(value: unknown, selectedAreas: Area[]) {
  const raw = value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
  const out: Partial<Record<Area, SymptomAnswer>> = {};
  for (const area of selectedAreas) {
    const answer = String(raw[area] ?? '');
    if (answer === 'sim' || answer === 'as_vezes' || answer === 'nao') out[area] = answer;
  }
  return out;
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function systemGmailToken(admin: ReturnType<typeof createAdminClient>) {
  const { data: account, error } = await admin
    .from('system_email_account')
    .select('id,google_email,access_token,refresh_token,expires_at,is_active')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (error || !account) {
    console.error('[bigcorps-leads] Conta Gmail de sistema não configurada:', error);
    return null;
  }

  const expiresAt = new Date(account.expires_at).getTime();
  if (account.access_token && Number.isFinite(expiresAt) && expiresAt > Date.now() + 5 * 60 * 1000) {
    return { token: account.access_token as string, from: String(account.google_email || '') };
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
  if (!account.refresh_token || !clientId || !clientSecret) {
    console.error('[bigcorps-leads] Gmail de sistema sem refresh token/client OAuth.');
    return null;
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: account.refresh_token,
        grant_type: 'refresh_token',
      }),
      signal: AbortSignal.timeout(5_000),
    });
    const data = await response.json().catch(() => ({})) as { access_token?: string; expires_in?: number };
    if (!response.ok || !data.access_token) {
      console.error('[bigcorps-leads] Falha ao renovar Gmail de sistema:', response.status);
      return null;
    }

    const nextExpiresAt = new Date(Date.now() + Number(data.expires_in ?? 3600) * 1000).toISOString();
    const { error: updateError } = await admin
      .from('system_email_account')
      .update({
        access_token: data.access_token,
        expires_at: nextExpiresAt,
        last_token_refresh: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', account.id);

    if (updateError) {
      console.error('[bigcorps-leads] Gmail renovado, mas token não persistido:', updateError);
    }
    return { token: data.access_token, from: String(account.google_email || '') };
  } catch (error) {
    console.error('[bigcorps-leads] Gmail de sistema indisponível:', error);
    return null;
  }
}

async function notifyGmailLead(
  admin: ReturnType<typeof createAdminClient>,
  input: {
    id: string;
    prioridade: string;
    areasPrioritarias: string[];
    nome: string;
    empresa: string;
    phoneE164: string;
    email: string | null;
    cidade: string;
    uf: string;
    melhorHorario: string;
    segmento: string;
    porte: string;
    faturamentoFaixa: string;
    infraestrutura: string[];
    checkoutProvider: string | null;
    productOpportunities: string[];
    utmSource: string | null;
    utmCampaign: string | null;
  },
) {
  const gmail = await systemGmailToken(admin);
  if (!gmail?.token || !gmail.from) return;

  const recipient = process.env.BIGCORPS_LEADS_NOTIFY_EMAIL?.trim() || gmail.from;
  if (!recipient) return;

  const adminUrl = 'https://admin.minhai.app/bigcorps-leads';
  const whatsappMessage = `Olá ${input.nome}, aqui é da BigCorps. Recebemos sua análise gratuita (código ${input.id}) e vou te ajudar com os próximos passos.`;
  const whatsappUrl = `https://wa.me/${input.phoneE164}?text=${encodeURIComponent(whatsappMessage)}`;
  const priorityLabel = input.prioridade === 'alta' ? 'ALTA' : input.prioridade === 'media' ? 'MÉDIA' : 'BAIXA';
  const subject = `Novo lead BigCorps · ${priorityLabel} · ${input.empresa}`;
  const areas = input.areasPrioritarias.length ? input.areasPrioritarias.join(', ') : '—';
  const infraestrutura = input.infraestrutura.length ? input.infraestrutura.join(', ') : '—';
  const products = input.productOpportunities.length ? input.productOpportunities.join(', ') : 'Nenhum sinal direto';

  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f6f7f9;font-family:Arial,sans-serif;color:#1f1f1f">
    <div style="max-width:620px;margin:28px auto;background:#fff;border:1px solid #ececec;border-radius:18px;overflow:hidden">
      <div style="padding:24px 28px;background:#FD9219;color:#1f1f1f">
        <div style="font-size:13px;font-weight:700;opacity:.8">BigCorps · Diagnóstico gratuito</div>
        <div style="font-size:25px;font-weight:800;margin-top:5px">Novo lead ${escapeHtml(priorityLabel)}</div>
      </div>
      <div style="padding:28px">
        <div style="font-size:22px;font-weight:800">${escapeHtml(input.nome)}</div>
        <div style="margin-top:3px;color:#5f6368">${escapeHtml(input.empresa)} · ${escapeHtml(input.cidade)}/${escapeHtml(input.uf)}</div>
        <div style="margin-top:20px;padding:16px;border-radius:12px;background:#fff8ef;border:1px solid #ffd7a8">
          <strong>Prioridades:</strong> ${escapeHtml(areas)}
        </div>
        <table style="width:100%;margin-top:20px;border-collapse:collapse;font-size:14px;line-height:1.5">
          <tr><td style="padding:7px 0;color:#6b7280">WhatsApp</td><td style="padding:7px 0;font-weight:700">+${escapeHtml(input.phoneE164)}</td></tr>
          <tr><td style="padding:7px 0;color:#6b7280">E-mail</td><td style="padding:7px 0">${escapeHtml(input.email || 'Não informado')}</td></tr>
          <tr><td style="padding:7px 0;color:#6b7280">Melhor horário</td><td style="padding:7px 0">${escapeHtml(input.melhorHorario)}</td></tr>
          <tr><td style="padding:7px 0;color:#6b7280">Segmento</td><td style="padding:7px 0">${escapeHtml(input.segmento)}</td></tr>
          <tr><td style="padding:7px 0;color:#6b7280">Porte</td><td style="padding:7px 0">${escapeHtml(input.porte)}</td></tr>
          <tr><td style="padding:7px 0;color:#6b7280">Faturamento</td><td style="padding:7px 0">${escapeHtml(input.faturamentoFaixa)}</td></tr>
          <tr><td style="padding:7px 0;color:#6b7280">Estrutura atual</td><td style="padding:7px 0">${escapeHtml(infraestrutura)}</td></tr>
          <tr><td style="padding:7px 0;color:#6b7280">Confirmação de pagamentos</td><td style="padding:7px 0">${escapeHtml(input.checkoutProvider || 'Não informado')}</td></tr>
          <tr><td style="padding:7px 0;color:#6b7280">Produtos com sinal</td><td style="padding:7px 0;font-weight:700;color:#A45100">${escapeHtml(products)}</td></tr>
          <tr><td style="padding:7px 0;color:#6b7280">Origem</td><td style="padding:7px 0">${escapeHtml(input.utmSource || 'Direto')}${input.utmCampaign ? ` · ${escapeHtml(input.utmCampaign)}` : ''}</td></tr>
          <tr><td style="padding:7px 0;color:#6b7280">Código</td><td style="padding:7px 0;font-family:monospace">${escapeHtml(input.id)}</td></tr>
        </table>
        <div style="margin-top:24px">
          <a href="${whatsappUrl}" style="display:inline-block;background:#1f1f1f;color:#fff;text-decoration:none;padding:13px 18px;border-radius:10px;font-weight:700;margin-right:8px">Responder no WhatsApp</a>
          <a href="${adminUrl}" style="display:inline-block;background:#FD9219;color:#1f1f1f;text-decoration:none;padding:13px 18px;border-radius:10px;font-weight:700">Abrir no Admin</a>
        </div>
      </div>
      <div style="padding:15px 28px;background:#fafafa;color:#8a8a8a;font-size:12px">Enviado automaticamente pela conta Google de sistema já conectada à BigCorps. Nenhum Resend é usado.</div>
    </div>
  </body></html>`;

  const subjectEncoded = `=?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`;
  const raw = [
    `To: ${recipient}`,
    `From: BigCorps <${gmail.from}>`,
    ...(input.email ? [`Reply-To: ${input.email}`] : []),
    `Subject: ${subjectEncoded}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    html,
  ].join('\r\n');

  try {
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${gmail.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: Buffer.from(raw, 'utf8').toString('base64url') }),
      signal: AbortSignal.timeout(6_000),
    });
    if (!response.ok) {
      console.error('[bigcorps-leads] Gmail recusou notificação:', response.status, await response.text().catch(() => ''));
    }
  } catch (error) {
    // O lead já está salvo; notificação nunca invalida o cadastro.
    console.error('[bigcorps-leads] Falha ao enviar notificação Gmail:', error);
  }
}

async function notifyWebhook(payload: Record<string, unknown>) {
  const webhook = process.env.LEADS_WEBHOOK_URL?.trim();
  if (!webhook) return;
  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(4_000),
    });
  } catch (error) {
    console.error('[bigcorps-leads] Falha ao notificar webhook:', error);
  }
}

async function sendMetaLead(input: {
  id: string;
  email: string | null;
  phoneE164: string;
  fbc: string | null;
  fbp: string | null;
  ip: string;
  userAgent: string;
  pageUrl: string | null;
}) {
  const token = process.env.META_CAPI_TOKEN_BIGCORPS?.trim();
  const pixelId = process.env.NEXT_PUBLIC_BIGCORPS_META_PIXEL_ID?.trim();
  if (!token || !pixelId) return;

  const userData: Record<string, unknown> = {
    client_ip_address: input.ip === 'unknown' ? undefined : input.ip,
    client_user_agent: input.userAgent || undefined,
    fbc: input.fbc || undefined,
    fbp: input.fbp || undefined,
    ph: [sha256(input.phoneE164)],
  };
  if (input.email) userData.em = [sha256(input.email.trim().toLowerCase())];

  const version = (process.env.META_GRAPH_VERSION?.trim() || 'v23.0').replace(/^\//, '');
  const endpoint = `https://graph.facebook.com/${version}/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(token)}`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [{
          event_name: 'Lead',
          event_time: Math.floor(Date.now() / 1000),
          event_id: input.id,
          action_source: 'website',
          event_source_url: input.pageUrl || 'https://ajuda.bigcorps.com.br/',
          user_data: userData,
        }],
      }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) {
      console.error('[bigcorps-leads] Meta CAPI recusou Lead:', response.status, await response.text().catch(() => ''));
    }
  } catch (error) {
    // A conversão nunca pode bloquear o cadastro do lead.
    console.error('[bigcorps-leads] Meta CAPI indisponível:', error);
  }
}

export async function POST(request: Request) {
  try {
    const declaredLength = Number(request.headers.get('content-length') || 0);
    if (declaredLength > MAX_BODY_BYTES) {
      return NextResponse.json({ ok: false, error: 'payload_too_large' }, { status: 413 });
    }

    const rawBody = await request.text();
    if (rawBody.length > MAX_BODY_BYTES) {
      return NextResponse.json({ ok: false, error: 'payload_too_large' }, { status: 413 });
    }
    let body: Record<string, unknown> | null = null;
    try {
      body = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      // Mantém a rota previsível também para clientes/bots que enviem JSON inválido.
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
    }

    // Honeypot: bots recebem uma resposta neutra, sem gravar nem disparar conversão.
    if (asText(body.website, 120)) {
      // Resposta neutra para não ensinar o honeypot ao robô. Sem lead.id, o
      // frontend também não dispara generate_lead nem o evento Lead do Pixel.
      return NextResponse.json({ ok: true, ignored: true });
    }

    const nome = asText(body.nome, 120);
    const empresa = asText(body.empresa, 160);
    const phoneE164 = normalizePhone(body.whatsapp);
    const whatsapp = phoneE164.startsWith('55') ? phoneE164.slice(2) : phoneE164;
    const email = asNullableText(body.email, 180)?.toLowerCase() ?? null;
    const cidade = asText(body.cidade, 120);
    const uf = asText(body.uf, 2).toUpperCase();
    const melhorHorario = asText(body.melhor_horario, 80);
    const tipoEmpresa = asText(body.tipo_empresa, 80);
    const segmento = asText(body.segmento, 80);
    const porte = asText(body.porte, 100);
    const tempoEmpresa = asText(body.tempo_empresa, 80);
    const faturamentoFaixa = asText(body.faturamento_faixa, 80);
    const consentimento = body.consentimento === true;

    const areas = Array.isArray(body.areas)
      ? body.areas
          .map((item) => String(item))
          .filter((area): area is Area => (AREA_OPTIONS as readonly string[]).includes(area))
          .slice(0, 3)
      : [];

    const respostasRaw = body.respostas && typeof body.respostas === 'object' && !Array.isArray(body.respostas)
      ? body.respostas as Record<string, unknown>
      : {};
    const sintomas = parseSymptoms(respostasRaw.sintomas, areas);
    const gestao = Array.isArray(respostasRaw.gestao)
      ? respostasRaw.gestao
          .map((item) => String(item))
          .filter((item) => (GESTAO_OPTIONS as readonly string[]).includes(item))
          .slice(0, 4)
      : [];

    const infraestrutura = Array.isArray(respostasRaw.infraestrutura)
      ? respostasRaw.infraestrutura
          .map((item) => String(item))
          .filter((item) => (INFRAESTRUTURA_OPTIONS as readonly string[]).includes(item))
          .slice(0, 5)
      : [];
    const checkoutSelected = infraestrutura.includes('Precisa confirmar pagamentos ou saber quando o Pix caiu');
    const checkoutProviderRaw = asNullableText(respostasRaw.checkout_provider, 100);
    const checkoutProvider = checkoutSelected && checkoutProviderRaw && isOneOf(checkoutProviderRaw, CHECKOUT_PROVIDER_OPTIONS)
      ? checkoutProviderRaw
      : null;

    if (
      !nome || !empresa || !phoneE164 || !isValidBrazilPhone(whatsapp) || !cidade || !(BR_UFS as readonly string[]).includes(uf) || !melhorHorario ||
      !isOneOf(tipoEmpresa, TIPO_EMPRESA_OPTIONS) ||
      !isOneOf(segmento, SEGMENTO_OPTIONS) ||
      !isOneOf(porte, PORTE_OPTIONS) ||
      !isOneOf(tempoEmpresa, TEMPO_EMPRESA_OPTIONS) ||
      !isOneOf(faturamentoFaixa, FATURAMENTO_OPTIONS) ||
      !isOneOf(melhorHorario, MELHOR_HORARIO_OPTIONS) ||
      areas.length < 1 || new Set(areas).size !== areas.length || Object.keys(sintomas).length !== areas.length ||
      gestao.length < 1 || (gestao.includes('Nenhum') && gestao.length > 1) ||
      infraestrutura.length < 1 || (infraestrutura.includes('Nenhum destes') && infraestrutura.length > 1) ||
      (checkoutSelected && !checkoutProvider) ||
      !validEmail(email) || !consentimento
    ) {
      return NextResponse.json({ ok: false, error: 'Confira os dados do diagnóstico e tente novamente.' }, { status: 400 });
    }

    const ip = clientIp(request);
    const ipHash = sha256(`bigcorps-ajuda:${ip}`);
    const admin = createAdminClient();
    const { data: allowed, error: rateError } = await admin.rpc('bigcorps_consume_lead_quota', {
      p_ip_hash: ipHash,
      p_limit: RATE_LIMIT,
      p_window_seconds: RATE_WINDOW_SECONDS,
    });
    if (rateError) {
      console.error('[bigcorps-leads] Falha no rate limit:', rateError);
      return NextResponse.json({ ok: false, error: 'Serviço temporariamente indisponível.' }, { status: 503 });
    }
    if (allowed !== true) {
      return NextResponse.json({ ok: false, error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' }, { status: 429 });
    }

    const priority = calculateLeadPriority({ porte, faturamentoFaixa, sintomas });
    const areasPrioritarias = calculatePriorityAreas({ areas, sintomas });
    const productOpportunities = inferProductOpportunities({ infraestrutura, checkoutProvider });
    const userAgent = asText(request.headers.get('user-agent'), 500);
    const pageUrl = safePageUrl(body.page_url, request.url);

    const insert = {
      nome,
      empresa,
      whatsapp,
      email,
      cidade,
      uf,
      melhor_horario: melhorHorario,
      tipo_empresa: tipoEmpresa,
      segmento,
      porte,
      tempo_empresa: tempoEmpresa,
      faturamento_faixa: faturamentoFaixa,
      areas,
      respostas: {
        sintomas,
        gestao,
        infraestrutura,
        checkout_provider: checkoutProvider,
        produtos_sugeridos: productOpportunities.labels,
        produtos_sugeridos_chaves: productOpportunities.keys,
        produtos_sugeridos_motivos: productOpportunities.reasons,
        prioridade_score: priority.score,
        sintomas_sim: priority.sintomasSim,
      },
      areas_prioritarias: areasPrioritarias,
      prioridade: priority.prioridade,
      utm_source: asNullableText(body.utm_source, 180),
      utm_medium: asNullableText(body.utm_medium, 180),
      utm_campaign: asNullableText(body.utm_campaign, 240),
      utm_content: asNullableText(body.utm_content, 240),
      fbclid: asNullableText(body.fbclid, 300),
      fbc: asNullableText(body.fbc, 300),
      fbp: asNullableText(body.fbp, 300),
      user_agent: userAgent || null,
      consentimento_em: new Date().toISOString(),
      consentimento_texto: BIGCORPS_CONSENT_TEXT,
      status: 'novo',
      notas: null,
    };

    const { data: lead, error } = await admin
      .from('bigcorps_leads')
      .insert(insert)
      .select('id,prioridade,areas_prioritarias,status,created_at')
      .single();

    if (error || !lead) {
      console.error('[bigcorps-leads] Falha ao salvar:', error);
      return NextResponse.json({ ok: false, error: 'Não foi possível salvar sua análise agora.' }, { status: 500 });
    }

    const commonNotification = {
      event: 'bigcorps_lead_created',
      lead_id: lead.id,
      prioridade: lead.prioridade,
      areas_prioritarias: lead.areas_prioritarias,
      nome,
      empresa,
      whatsapp,
      email,
      cidade,
      uf,
      infraestrutura,
      checkout_provider: checkoutProvider,
      produtos_sugeridos: productOpportunities.labels,
      admin_url: 'https://admin.minhai.app/bigcorps-leads',
      created_at: lead.created_at,
    };
    const sideEffects: Promise<void>[] = [
      notifyGmailLead(admin, {
        id: lead.id,
        prioridade: String(lead.prioridade || priority.prioridade),
        areasPrioritarias: Array.isArray(lead.areas_prioritarias) ? lead.areas_prioritarias.map(String) : areasPrioritarias,
        nome,
        empresa,
        phoneE164,
        email,
        cidade,
        uf,
        melhorHorario,
        segmento,
        porte,
        faturamentoFaixa,
        infraestrutura,
        checkoutProvider,
        productOpportunities: productOpportunities.labels,
        utmSource: insert.utm_source,
        utmCampaign: insert.utm_campaign,
      }),
      notifyWebhook(commonNotification),
    ];

    // A CAPI só é chamada quando o visitante consentiu com medição. O evento
    // usa o mesmo UUID retornado ao navegador, permitindo deduplicação no Meta.
    if (body.analytics_consent === true) {
      sideEffects.push(sendMetaLead({
        id: lead.id,
        email,
        phoneE164,
        fbc: insert.fbc,
        fbp: insert.fbp,
        ip,
        userAgent,
        pageUrl,
      }));
    }

    // Em ambiente serverless não deixamos fetch crítico em fire-and-forget: a
    // função pode ser congelada assim que a resposta sai. Os timeouts internos
    // limitam o impacto, e qualquer falha continua sem invalidar o lead salvo.
    await Promise.allSettled(sideEffects);

    return NextResponse.json({ ok: true, lead });
  } catch (error) {
    console.error('[bigcorps-leads] Erro inesperado:', error);
    return NextResponse.json({ ok: false, error: 'Não foi possível concluir agora.' }, { status: 500 });
  }
}
