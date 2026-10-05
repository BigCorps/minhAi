// supabase/functions/reativar-janelas-whatsapp/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TEMPLATE_NAME = 'notificacoes_minhai_disponiveis';
const TEMPLATE_LANG = 'pt_BR';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const authorization = req.headers.get('authorization') || '';
    const bearer = authorization.replace(/^Bearer /i, '');
    const trusted = bearer === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const { data: caller } = trusted ? { data: { user: null } } : await supabase.auth.getUser(bearer);
    if (!trusted && !caller?.user) return new Response(JSON.stringify({ok:false,error:'unauthorized'}), {status:401,headers:{...corsHeaders,'Content-Type':'application/json'}});
    const { conversation_id, whatsapp_number_id } = await req.json();

    if (!conversation_id || !whatsapp_number_id) {
      throw new Error('Parâmetros conversation_id e whatsapp_number_id são obrigatórios.');
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔄 REATIVAÇÃO DE JANELA WHATSAPP`);
    console.log(`   Conversation: ${conversation_id}`);
    console.log(`   Phone Number ID: ${whatsapp_number_id}`);
    console.log(`${'='.repeat(60)}\n`);

    // Busca a conexão específica para obter o token de acesso
    const { data: conn, error: connErr } = await supabase
      .from('meta_connections')
      .select('user_access_token, encrypted_page_access_token, page_name, company_id')
      .eq('whatsapp_number_id', whatsapp_number_id)
      .single();

    if (connErr || !conn) {
      console.error(`❌ Conexão não encontrada:`, connErr);
      throw new Error(`Conexão não encontrada para o ID: ${whatsapp_number_id}`);
    }

    if (!trusted) {
      const { data: owned } = await supabase.from('companies').select('id').eq('id',conn.company_id).eq('user_id',caller.user.id).maybeSingle();
      if (!owned) return new Response(JSON.stringify({ok:false,error:'forbidden'}), {status:403,headers:{...corsHeaders,'Content-Type':'application/json'}});
    }


    const authToken = conn.user_access_token || conn.encrypted_page_access_token;

    if (!authToken) {
      console.error('❌ Token de autenticação ausente');
      throw new Error('Token de autenticação (Meta) não encontrado para esta conexão.');
    }

    // A template does not reopen the 24-hour customer service window.
    const { data: lastInbound } = await supabase.rpc('sdr_whatsapp_last_inbound', {
      p_phone: conversation_id, p_page: whatsapp_number_id,
    });
    const windowOpen = !!lastInbound && Date.now() - new Date(lastInbound).getTime() < 86400000;

    // Preparar payload do template SEM variáveis
    // (o template atual não usa variáveis no cabeçalho)
    const templatePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: conversation_id,
      type: 'template',
      template: {
        name: TEMPLATE_NAME,
        language: { code: TEMPLATE_LANG },
      },
    };

    console.log(`\n📦 Payload do Template:`);
    console.log(JSON.stringify(templatePayload, null, 2));

    const metaUrl = `https://graph.facebook.com/${Deno.env.get('META_GRAPH_VERSION') || 'v23.0'}/${whatsapp_number_id}/messages`;
    console.log(`\n📤 Enviando para: ${metaUrl}`);

    // Dispara o Template de Reativação
    const response = await fetch(metaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(templatePayload),
    });

    const result = await response.json();

    console.log(`\n📥 Resposta do Meta (Status ${response.status}):`);
    console.log(JSON.stringify(result, null, 2));

    if (!response.ok || result.error) {
      const errorMsg = result.error?.message || 'Erro desconhecido na API da Meta';
      const errorCode = result.error?.code || 'N/A';
      const errorType = result.error?.type || 'N/A';
      
      console.error(`\n❌ ERRO NO ENVIO DO TEMPLATE`);
      console.error(`   Code: ${errorCode}`);
      console.error(`   Type: ${errorType}`);
      console.error(`   Message: ${errorMsg}`);
      
      // 131047 means the free-form customer service window is closed.
      if (errorCode === 131047) {
        console.warn('⚠️ Janela de atendimento encerrada. Marcando mensagens como expiradas.');
        await supabase
          .from('whatsapp_pending_messages')
          .update({ status: 'expired' })
          .eq('conversation_id', conversation_id)
          .eq('whatsapp_number_id', whatsapp_number_id)
          .eq('status', 'pending');
      }
      
      return new Response(JSON.stringify({ ok: false, error: errorMsg, details: result }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const messageId = result.messages?.[0]?.id;
    
    console.log(`\n✅ TEMPLATE ENVIADO COM SUCESSO`);
    console.log(`   Message ID: ${messageId}`);
    console.log(`   Destinatário: ${conversation_id}`);
    console.log(`${'='.repeat(60)}\n`);

    // Atualiza o controle de IA para registrar reativação
    await supabase
      .from('conversation_ai_control')
      .upsert({
        conversation_id,
        page_id: whatsapp_number_id,
        platform: 'whatsapp',
        company_id: conn.company_id,
        reactivated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(), // Bookkeeping only; never used as inbound activity.
      }, { 
        onConflict: 'conversation_id,page_id' 
      });

    return new Response(JSON.stringify({ 
      ok: true, 
      message: 'Template enviado; aguardando resposta do usuário',
      customer_service_window_open: windowOpen, 
      message_id: messageId,
      template_name: TEMPLATE_NAME
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error(`\n❌ ERRO CRÍTICO NA REATIVAÇÃO`);
    console.error(`   Message: ${err.message}`);
    console.error(`   Stack: ${err.stack}`);
    
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
