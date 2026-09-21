// WhatsApp webhook compatível com validação de assinatura do meta-webhook.
//
// IMPORTANTE:
// - preserva o corpo bruto recebido da Meta sem parse/re-serialização;
// - encaminha o X-Hub-Signature-256 original;
// - não injeta mais _sender_name: o meta-webhook atual já lê contacts[].profile.name.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const VERIFY_TOKEN = Deno.env.get('META_WEBHOOK_VERIFY_TOKEN') || 'eai_webhook_verify';

declare const EdgeRuntime: { waitUntil: (promise: Promise<any>) => void };

serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  // Verificação inicial do callback feita pela Meta.
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ whatsapp-webhook verificado');
      return new Response(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
    return new Response('Forbidden', { status: 403 });
  }

  if (req.method === 'POST') {
    // A assinatura X-Hub-Signature-256 é calculada pela Meta sobre estes bytes.
    // Qualquer JSON.parse + JSON.stringify antes do meta-webhook invalidaria a
    // assinatura. Por isso o corpo é lido como texto e encaminhado intacto.
    const rawBody = await req.text();
    const signature = req.headers.get('x-hub-signature-256');
    const contentType = req.headers.get('content-type') || 'application/json';

    const response = new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

    EdgeRuntime.waitUntil(
      forwardToMetaWebhook(rawBody, signature, contentType).catch((err) =>
        console.error('❌ whatsapp-webhook forward error:', err.message),
      ),
    );

    return response;
  }

  return new Response('Method not allowed', { status: 405 });
});

async function forwardToMetaWebhook(
  rawBody: string,
  signature: string | null,
  contentType: string,
) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    throw new Error('SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes');
  }

  const headers: Record<string, string> = {
    'Content-Type': contentType,
    Authorization: `Bearer ${serviceKey}`,
  };
  if (signature) headers['X-Hub-Signature-256'] = signature;

  const res = await fetch(`${supabaseUrl}/functions/v1/meta-webhook`, {
    method: 'POST',
    headers,
    body: rawBody,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`meta-webhook retornou ${res.status}: ${body.slice(0, 500)}`);
  }

  console.log('✅ WhatsApp encaminhado ao meta-webhook preservando assinatura');
}
