// supabase/functions/enviar-whatsapp/index.ts
// VERSÃO FINAL: Template UTILITY específico para cada tipo de notificação

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TEMPLATE_PIX = 'confirmacao_pix_recebido'; // Nome do template no Meta

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // PHASE6_SERVICE_ROLE_ONLY — remove relay público para destinos arbitrários.
  const expectedServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const receivedAuthorization = req.headers.get('authorization') ?? '';
  if (!expectedServiceRole || receivedAuthorization !== `Bearer ${expectedServiceRole}`) {
    return new Response(JSON.stringify({ success: false, error: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const body = await req.json();
    const { company_id, to, message, messages, pix_data, force_template } = body;

    const textos: string[] = messages?.length ? messages : message ? [message] : [];
    if (textos.length === 0) throw new Error('message ou messages é obrigatório');

    const notifyCompanyId = Deno.env.get('NOTIFY_COMPANY_ID');
    if (!notifyCompanyId) throw new Error('NOTIFY_COMPANY_ID não configurado');

    const { data: conn, error: connErr } = await supabase
      .from('meta_connections')
      .select('whatsapp_number_id, user_access_token, encrypted_page_access_token, company_id')
      .eq('company_id', notifyCompanyId)
      .not('whatsapp_number_id', 'is', null)
      .maybeSingle();

    if (connErr || !conn?.whatsapp_number_id) throw new Error('Conexão remetente não encontrada');

    const authToken = conn.user_access_token || conn.encrypted_page_access_token;
    const phoneNumberId = conn.whatsapp_number_id;

    // Determinar destino
    let toNormalized: string | null = null;
    if (company_id) {
      const { data: company } = await supabase.from('companies').select('whatsapp_number, name').eq('id', company_id).maybeSingle();
      if (company?.whatsapp_number) {
        const raw = company.whatsapp_number.replace(/\D/g, '');
        toNormalized = raw.startsWith('55') ? raw : `55${raw}`;
      }
    }
    if (!toNormalized) {
      const fallbackTo = to || Deno.env.get('NOTIFY_WHATSAPP_TO');
      if (!fallbackTo) throw new Error('Destinatário não encontrado');
      const rawFallback = fallbackTo.replace(/\D/g, '');
      toNormalized = rawFallback.startsWith('55') ? rawFallback : `55${rawFallback}`;
    }

    console.log(`📱 Destino: ${toNormalized}`);

let janelaAberta = false

if (force_template) {
  console.log('🔁 force_template=true — pulando checagem de janela (retry pós-falha de entrega)')
} else {
  // Verificar janela de 24h — busca em QUALQUER page_id da empresa
  const { data: controls } = await supabase
    .from('conversation_ai_control')
    .select('updated_at, page_id')
    .eq('conversation_id', toNormalized)
    .eq('company_id', notifyCompanyId)

  const agora = new Date()
  const limite24h = new Date(agora.getTime() - 24 * 60 * 60 * 1000)
  janelaAberta = controls?.some(c => new Date(c.updated_at) > limite24h) ?? false

  console.log(`🔍 Janela aberta: ${janelaAberta} (controles encontrados: ${controls?.length ?? 0}) - page_id atual: ${phoneNumberId}`)
}

    // --- JANELA ABERTA: Mensagem DIRETA (GRÁTIS) ---
    if (janelaAberta) {
      console.log(`📤 Enviando mensagem direta (janela aberta)...`);
      
      const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: toNormalized,
          type: 'text',
          text: { body: textos[0] }, // Primeira mensagem
        }),
      });

      if (res.ok) {
        const result = await res.json();
        const wamid = result.messages?.[0]?.id;
        console.log(`✅ Enviado: ${wamid}`);

        // Guardar contexto — se a Meta reportar falha depois (131047),
        // o meta-webhook usa isso pra reenviar via template automaticamente.
        if (wamid && pix_data) {
          await supabase.from('whatsapp_notification_retry').insert({
            wamid,
            company_id,
            phone_number_id: phoneNumberId,
            to_number: toNormalized,
            pix_data,
            message: textos[0],
          }).then(({ error }) => {
            if (error) console.warn('⚠️ Erro ao salvar contexto de retry (não-crítico):', error.message);
          });
        }

        return new Response(JSON.stringify({ 
          success: true, 
          direct: true,
          message_id: wamid 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // --- JANELA FECHADA: Template UTILITY ---
    console.log(`📤 Janela fechada. Enviando template UTILITY...`);

    // Se temos dados estruturados do PIX, usar template
    if (pix_data) {
      const { valor, assistente, data_hora, txid } = pix_data;
      
      const templatePayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: toNormalized,
        type: 'template',
        template: {
          name: TEMPLATE_PIX,
          language: { code: 'pt_BR' },
components: [
  {
    type: 'body',
    parameters: [
      { type: 'text', text: String(valor) },
      { type: 'text', text: assistente },
      { type: 'text', text: data_hora },
      { type: 'text', text: txid || 'N/A' }
    ]
  },
  {
    type: 'button',
    sub_type: 'quick_reply',
    index: '0',
    parameters: [{ type: 'payload', payload: 'REATIVAR_AVISOS' }]
  }
]
        },
      };

      console.log(`📦 Template:`, JSON.stringify(templatePayload, null, 2));

      const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify(templatePayload),
      });

      const result = await res.json();

      if (res.ok) {
        console.log(`✅ Template enviado: ${result.messages?.[0]?.id}`);
        
        // Criar/atualizar controle
        await supabase
          .from('conversation_ai_control')
          .upsert({
            conversation_id: toNormalized,
            page_id: phoneNumberId,
            platform: 'whatsapp',
            company_id: conn.company_id,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'conversation_id,page_id' });

        return new Response(JSON.stringify({ 
          success: true, 
          template: true,
          message_id: result.messages?.[0]?.id 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        console.error(`❌ Erro no template:`, result);
        throw new Error(`Template falhou: ${result.error?.message}`);
      }
    }

    // Fallback: mensagem direta (vai falhar se janela fechada, mas tentamos)
    console.warn('⚠️ Sem dados estruturados de PIX. Tentando mensagem direta como fallback...');
    const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: toNormalized,
        type: 'text',
        text: { body: textos[0] },
      }),
    });

    const fallbackResult = await res.json();
    
    return new Response(JSON.stringify({ 
      success: res.ok,
      fallback: true,
      error: res.ok ? null : fallbackResult.error 
    }), {
      status: res.ok ? 200 : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('❌ Erro:', err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});