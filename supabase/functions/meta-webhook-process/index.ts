// supabase/functions/meta-webhook-process/index.ts
// Encapsula processMessage — chamado pelo meta-webhook e pelo meta-debounce-processor

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
 
serve(async (req) => {
  // PHASE5_SERVICE_ROLE_ONLY — worker interno: somente service_role.
  if (req.method !== 'OPTIONS') {
    const expectedServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const receivedAuthorization = req.headers.get('authorization') ?? ''
    if (!expectedServiceRole || receivedAuthorization !== `Bearer ${expectedServiceRole}`) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }
 
  try {
    const { data } = await req.json()
    if (!data) throw new Error('data obrigatório')
    await processMessage(data)
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('❌ meta-webhook-process erro:', err.message)
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
 
// ─── Processar mensagem individual ────────────────────────────────────────
async function processMessage(data: {
  platform:     string
  page_id:      string
  from_id:      string
  message_id:   string
  message_text: string
  sender_name?: string
  media_id?:    string
  mime_type?:   string
}) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
 
  console.log(`\n💬 [${data.platform}] "${data.message_text.substring(0, 60)}" de ${data.from_id}`)
 
  // Deduplicação atômica via INSERT com PRIMARY KEY
  const { error: claimError } = await supabase
    .from('processed_webhook_messages')
    .insert({ message_id: data.message_id })
 
  if (claimError) {
    console.log(`🚫 Mensagem já processada ou em processamento (${claimError.code}): ${data.message_id}`)
    return
  }
  console.log(`✅ Claim obtido para message_id: ${data.message_id}`)
 
  // ── DESVIO PARA DEMO (Passo 3 do funil /lead) ─────────────────────────
  // Só atua em WhatsApp (a demo não usa Instagram/Messenger). Se o
  // telefone remetente não corresponder a nenhuma demo_session ativa,
  // meta-demo-router retorna { matched: false } e seguimos o fluxo
  // normal abaixo, sem nenhuma alteração de comportamento.
  if (data.platform === 'whatsapp') {
    try {
      const demoRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/meta-demo-router`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from_id: data.from_id,
          message_text: data.message_text,
          page_id: data.page_id,
        }),
      })
      if (demoRes.ok) {
        const demoResult = await demoRes.json()
        if (demoResult?.matched) {
          console.log(`🎭 Mensagem tratada pelo funil de demonstração (handled: ${demoResult.handled})`)
          return // Encerra aqui — NÃO continua para o fluxo real abaixo.
        }
      } else {
        console.warn('⚠️ meta-demo-router retornou erro HTTP — seguindo fluxo normal:', demoRes.status)
      }
    } catch (demoErr: any) {
      // Falha no desvio de demo NUNCA deve bloquear o atendimento real.
      console.warn('⚠️ meta-demo-router erro/timeout (não-crítico, seguindo fluxo normal):', demoErr.message)
    }
  }
  // ── Fim do desvio para demo ───────────────────────────────────────────
 
  // ── VERIFICAR se é usuário minhAi com MCP WhatsApp ───────────────────
  if (data.platform === 'whatsapp') {
    const normalizedFrom = data.from_id.replace(/\D/g, '')
    const { data: mcpUser } = await supabase
      .from('user_profiles')
      .select('user_id, mcp_whatsapp_company_id')
      .eq('mcp_whatsapp', normalizedFrom)
      .eq('mcp_whatsapp_enabled', true)
      .maybeSingle()
 
    if (mcpUser) {
      console.log(`🔑 MCP WhatsApp: usuário ${mcpUser.user_id} → company ${mcpUser.mcp_whatsapp_company_id}`)
      fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/mcp-whatsapp-handler`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          userId:    mcpUser.user_id,
          companyId: mcpUser.mcp_whatsapp_company_id,
        }),
      }).catch((e: any) => console.error('❌ mcp-whatsapp-handler dispatch falhou:', e.message))
      return
    }
  }
  // ── fim verificação MCP ───────────────────────────────────────────────
 
  // ── BLOCO A: Salvar mensagem do usuário + guardar sharedConvId ────────
  let sharedConvId: string | null = null
 
  try {
    let { data: convRow } = await supabase
      .from('conversations')
      .select('id')
      .eq('meta_from_id', data.from_id)
      .eq('meta_page_id', data.page_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
 
    if (!convRow) {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({
          company_id:     null,
          status:         'active',
          total_messages: 0,
          meta_from_id:   data.from_id,
          meta_page_id:   data.page_id,
          meta_platform:  data.platform,
        })
        .select('id')
        .single()
      convRow = newConv
    }
 
    if (convRow?.id) {
      sharedConvId = convRow.id
      await supabase.from('messages').insert({
        conversation_id: sharedConvId,
        role:            'user',
        content:         data.message_text,
        created_at:      new Date().toISOString(),
      })
      console.log(`✅ Mensagem usuário salva: conversation_id=${sharedConvId}`)
    }
  } catch (histErr: any) {
    console.warn('⚠️ Histórico usuário (não crítico):', histErr.message)
  }
 
  try {
    // Buscar conexão
    const selectFields = 'user_access_token, *, companies(id, user_id, system_prompt, name, slug, brand_description, business_hours, business_address, orcamento_prompt, whatsapp_number, instagram_username, website, email_contato, telefone_fixo, facebook, linkedin, tiktok, twitter, greeting_message, assistant_type, startup_function_key)'
    let connection: any = null
 
    if (data.platform === 'instagram') {
      const { data: c } = await supabase.from('meta_connections').select(selectFields).eq('instagram_account_id', data.page_id).maybeSingle()
      connection = c
    } else if (data.platform === 'whatsapp') {
      const { data: c } = await supabase.from('meta_connections').select(selectFields).eq('whatsapp_number_id', data.page_id).maybeSingle()
      connection = c
    } else {
      const { data: c } = await supabase.from('meta_connections').select(selectFields).eq('meta_page_id', data.page_id).maybeSingle()
      connection = c
    }
 
    if (!connection) {
      console.error(`❌ Conexão não encontrada para page_id: ${data.page_id} (platform: ${data.platform})`)
      return
    }
 
    const company = connection.companies
    if (!company) {
      console.error(`❌ JOIN companies retornou null. connection.id: ${connection.id}, company_id: ${connection.company_id}`)
      return
    }
 
    const userId    = company.user_id
    const companyId = company.id
    console.log(`✅ Conexão: ${connection.page_name} → "${company.name}" (company_id: ${companyId})`)
 
    if (sharedConvId) {
      await supabase
        .from('conversations')
        .update({ company_id: companyId })
        .eq('id', sharedConvId)
        .is('company_id', null)
      console.log(`✅ company_id retroativo aplicado: conversation_id=${sharedConvId} → company_id=${companyId}`)
    }
 
    if (!connection.agent_enabled) {
      console.log('🚫 Agente desabilitado')
      await upsertAiControl(supabase, data, companyId, false)
      return
    }
 
    const { data: ctrl } = await supabase
      .from('conversation_ai_control')
      .select('*')
      .eq('conversation_id', data.from_id)
      .eq('page_id', data.page_id)
      .maybeSingle()
 
    let isPaused = ctrl?.is_paused === true
    if (isPaused && ctrl?.paused_until && new Date() > new Date(ctrl.paused_until)) {
      await supabase.from('conversation_ai_control')
        .update({ is_paused: false, paused_until: null, updated_at: new Date().toISOString() })
        .eq('conversation_id', data.from_id).eq('page_id', data.page_id)
      isPaused = false
    }
    if (isPaused) { console.log('🚫 Conversa pausada'); return }
 
    const pauseKeywords: string[] = connection.pause_keywords || ['ATENDENTE', 'ATENDIMENTO']
    const pauseMsg = connection.pause_message || 'Um atendente humano entrará em contato. Aguarde!'
    if (pauseKeywords.some((kw: string) => data.message_text.toUpperCase().includes(kw.toUpperCase()))) {
      console.log('🛑 Palavra-chave de pausa detectada')
      await supabase.from('conversation_ai_control').upsert({
        conversation_id: data.from_id, page_id: data.page_id, company_id: companyId,
        platform: data.platform, is_paused: true, paused_until: null, ai_enabled: true,
        last_message_id: data.message_id, updated_at: new Date().toISOString(),
      }, { onConflict: 'conversation_id,page_id' })
      const waPhoneId = data.platform === 'whatsapp' ? data.page_id : undefined
      await sendMetaMessage(data.from_id, pauseMsg, connection.encrypted_page_access_token, data.platform, waPhoneId, connection.user_access_token)
      return
    }
 
    const GREETING_WINDOW_HOURS = 24
    const isFirstMessage = !ctrl || (
      ctrl.last_ai_response_at
        ? (Date.now() - new Date(ctrl.last_ai_response_at).getTime()) > GREETING_WINDOW_HOURS * 60 * 60 * 1000
        : true
    )
 
    console.log(`🔍 [GREETING] isFirstMessage: ${isFirstMessage} | ctrl existe: ${!!ctrl} | last_ai_response_at: ${ctrl?.last_ai_response_at ?? 'nunca'}`)
    
    if (isFirstMessage) {
      const startupFnKey = connection.startup_function_key_meta
      const greetingText = connection.greeting_message
      
      console.log(`🔍 [GREETING] startupFnKey: ${startupFnKey ?? 'null/undefined'}`)
      console.log(`🔍 [GREETING] greetingText: ${greetingText ?? 'null/undefined'}`)
      console.log(`🔍 [GREETING] Caminho escolhido: ${startupFnKey ? 'FUNÇÃO DE BOAS-VINDAS' : greetingText ? 'TEXTO CONFIGURADO NA TABELA' : 'NENHUMA SAUDAÇÃO CONFIGURADA'}`)
 
      if (startupFnKey) {
        console.log(`🚀 [GREETING] ► ORIGEM: FUNÇÃO | Executando função de boas-vindas: ${startupFnKey}`)
        try {
          const routerRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/meta-message-router`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              data: { ...data, message_text: `__startup__:${startupFnKey}` },
              connection, company, userId, companyId,
              isStartupFunction: true,
              startupFunctionKey: startupFnKey,
            })
          })
          
          console.log(`🔍 [GREETING] routerRes.ok: ${routerRes.ok} | status: ${routerRes.status}`)
          
          if (routerRes.ok) {
            const routeResult = await routerRes.json()
            console.log(`🔍 [GREETING] routeResult completo:`, JSON.stringify(routeResult))
            console.log(`🔍 [GREETING] routeResult.responseText: ${routeResult?.responseText ?? 'null/undefined'}`)
            
            if (routeResult?.responseText) {
              const msgs = Array.isArray(routeResult.responseText) ? routeResult.responseText : [routeResult.responseText]
              console.log(`🚀 [GREETING] ► ORIGEM: FUNÇÃO | Enviando ${msgs.length} mensagem(ns) da função "${startupFnKey}":`, msgs)
              for (const msg of msgs) {
                console.log(`📤 [GREETING] ► ORIGEM: FUNÇÃO | Enviando msg: "${msg}"`)
                await sendMetaMessage(data.from_id, msg, connection.encrypted_page_access_token, data.platform, data.platform === 'whatsapp' ? data.page_id : undefined, connection.user_access_token)
                if (msgs.length > 1) await new Promise(r => setTimeout(r, 300))
              }
            } else {
              console.warn(`⚠️ [GREETING] Função "${startupFnKey}" retornou sem responseText — nenhuma mensagem enviada`)
            }
          } else {
            const errBody = await routerRes.text()
            console.warn(`⚠️ [GREETING] routerRes não ok. Status: ${routerRes.status} | Body: ${errBody}`)
          }
        } catch (startupErr: any) {
          console.warn('⚠️ [GREETING] Erro na função de boas-vindas (não-crítico):', startupErr.message)
        }
      } else if (greetingText) {
        console.log(`👋 [GREETING] ► ORIGEM: TEXTO DA TABELA | Enviando greeting_message: "${greetingText}"`)
        await sendMetaMessage(data.from_id, greetingText, connection.encrypted_page_access_token, data.platform, data.platform === 'whatsapp' ? data.page_id : undefined, connection.user_access_token)
        console.log('👋 [GREETING] ► ORIGEM: TEXTO DA TABELA | Saudação inicial enviada com sucesso')
      } else {
        console.log(`🔕 [GREETING] Nenhuma saudação configurada — nem função nem texto. Nada enviado.`)
      }
    } else {
      console.log(`🔍 [GREETING] Não é primeira mensagem (ctrl existe) — saudação ignorada`)
    }

// ── OPT-IN POR PALAVRA DE ATIVAÇÃO ───────────────────────────────────────
// Se a conexão exige palavra de ativação E a conversa ainda não foi ativada,
// o assistente só responde quando o usuário digitar a palavra correta.
// Enquanto isso, mensagens chegam, são registradas, mas não são processadas.

if (connection.activation_keyword) {
  const alreadyActivated = ctrl?.ai_activated === true

  if (!alreadyActivated) {
    const keyword = connection.activation_keyword.trim().toLowerCase()
    const userMsg = data.message_text.trim().toLowerCase()
    const isActivation = userMsg.includes(keyword)

    if (isActivation) {
      console.log(`✅ Palavra de ativação detectada: "${connection.activation_keyword}" — ativando IA`)
      await supabase.from('conversation_ai_control').upsert({
        conversation_id: data.from_id,
        page_id: data.page_id,
        company_id: companyId,
        platform: data.platform,
        ai_activated: true,
        ai_enabled: true,
        is_paused: false,
        last_message_id: data.message_id,
        updated_at: new Date().toISOString(),
        ...(data.sender_name ? { sender_name: data.sender_name } : {}),
        ...(data.message_text ? { last_message_text: data.message_text.substring(0, 120) } : {}),
      }, { onConflict: 'conversation_id,page_id' })
      // Continua para o roteamento normal abaixo
    } else {
      console.log(`⏸️ IA aguardando ativação — usuário não digitou "${connection.activation_keyword}". Mensagem ignorada.`)
      await supabase.from('conversation_ai_control').upsert({
        conversation_id: data.from_id,
        page_id: data.page_id,
        company_id: companyId,
        platform: data.platform,
        ai_activated: false,
        ai_enabled: true,
        is_paused: false,
        last_message_id: data.message_id,
        updated_at: new Date().toISOString(),
        ...(data.sender_name ? { sender_name: data.sender_name } : {}),
        ...(data.message_text ? { last_message_text: data.message_text.substring(0, 120) } : {}),
      }, { onConflict: 'conversation_id,page_id' })
      return // ← Sai sem responder nada
    }
  } else {
    console.log(`✅ IA já ativada para esta conversa — seguindo fluxo normal`)
  }
}
// ── Fim do opt-in ─────────────────────────────────────────────────────────
 
    const isVendasCompany = company.assistant_type === 'vendas'
    if (!isVendasCompany) {
      const { data: userCredits } = await supabase
        .from('user_credits').select('available_credits').eq('user_id', userId).single()
      if (!userCredits || userCredits.available_credits < 1) {
        console.log(`⚠️ Créditos insuficientes: ${userCredits?.available_credits ?? 0}`)
        return
      }
    }
 
    const isAudio = data.media_id && (
      !data.mime_type ||
      data.mime_type.startsWith('audio/') ||
      data.mime_type === 'application/ogg'
    )
 
    if (isAudio) {
      if (connection.transcrever_audio_enabled !== true) {
        console.log('🔕 Transcrição de áudio desabilitada para esta conexão — ignorando')
        return
      }
      const authToken = connection.user_access_token || connection.encrypted_page_access_token
      try {
        console.log(`🎙️ Transcrevendo áudio de ${data.from_id}...`)
        const mediaUrl    = await getMediaUrl(data.media_id, authToken)
        const audioBuffer = await downloadMediaAsBuffer(mediaUrl, authToken)
        const transcricao = await transcribeWithWhisper(audioBuffer)
 
        if (!transcricao) {
          console.warn('⚠️ Whisper retornou transcrição vazia — abortando')
          return
        }
 
        console.log(`📝 Transcrição: "${transcricao.substring(0, 80)}"`)
        data.message_text = transcricao
 
        const { error: whisperRpcError } = await supabase.rpc('register_function_usage', {
          p_company_id: companyId, p_function_key: 'transcrever_audio', p_credits_consumed: 1,
        })
        if (whisperRpcError) {
          console.warn('⚠️ register_function_usage (transcrever_audio) falhou:', whisperRpcError.message)
        } else {
          console.log('💳 1 crédito computado para transcrever_audio')
        }
      } catch (err: any) {
        console.error(`❌ Erro na transcrição: ${err.message}`)
        return
      }
    }
 
    await sendTypingIndicator(
      data.from_id,
      connection.encrypted_page_access_token,
      data.platform,
      data.platform === 'whatsapp' ? data.page_id : undefined,
      data.message_id,
      connection.user_access_token,
    )
 
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
 
    console.log('🔀 Chamando meta-message-router...')
    const routerRes = await fetch(`${supabaseUrl}/functions/v1/meta-message-router`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, connection, company, userId, companyId })
    })
 
    if (!routerRes.ok) {
      console.error('❌ meta-message-router falhou:', await routerRes.text())
      return
    }
 
    const routeResult = await routerRes.json()
    if (!routeResult) {
      console.log('⚠️ Nenhuma rota tratou a mensagem')
      return
    }
 
    const { responseText, functionKey, creditsUsed, meta_flow_state: newFlowState } = routeResult
 
    const messages = Array.isArray(responseText) ? responseText : [responseText]
    for (const msg of messages) {
      await sendMetaMessage(data.from_id, msg, connection.encrypted_page_access_token, data.platform, data.platform === 'whatsapp' ? data.page_id : undefined, connection.user_access_token)
      if (messages.length > 1) await new Promise((r) => setTimeout(r, 300))
    }
 
    try {
      if (!sharedConvId) {
        const { data: convRow } = await supabase
          .from('conversations')
          .select('id')
          .eq('meta_from_id', data.from_id)
          .eq('meta_page_id', data.page_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        sharedConvId = convRow?.id ?? null
      }
 
      if (sharedConvId) {
        const assistantContent = Array.isArray(responseText)
          ? responseText.join('\n')
          : responseText
 
        await supabase.from('messages').insert({
          conversation_id: sharedConvId,
          role:            'assistant',
          content:         assistantContent,
          created_at:      new Date().toISOString(),
        })
        console.log(`✅ Resposta assistant salva: conversation_id=${sharedConvId}`)
      }
    } catch (histErr: any) {
      console.warn('⚠️ Erro ao salvar histórico assistant (não crítico):', histErr.message)
    }
 
    const assistantContent = Array.isArray(responseText) ? responseText.join('\n') : responseText
 
    if (creditsUsed > 0 && !isVendasCompany) {
      await supabase.rpc('register_function_usage', {
        p_company_id:       companyId,
        p_function_key:     functionKey,
        p_credits_consumed: creditsUsed,
      })
      await supabase
        .from('assistant_function_logs')
        .update({
          metadata: {
            platform:           data.platform,
            source:             'meta_webhook',
            user_input:         data.message_text,
            assistant_response: assistantContent,
          },
        })
        .eq('company_id', companyId)
        .eq('function_key', functionKey)
        .is('metadata', null)
        .order('executed_at', { ascending: false })
        .limit(1)
      console.log(`💳 ${creditsUsed} crédito(s) para ${functionKey}`)
    } else {
      await supabase.from('assistant_function_logs').insert({
        company_id:       companyId,
        user_id:          userId,
        function_key:     functionKey,
        credits_consumed: 0,
        metadata: {
          platform:           data.platform,
          source:             'meta_webhook',
          user_input:         data.message_text,
          assistant_response: assistantContent,
        },
      })
      console.log(`💳 0 créditos (${functionKey})`)
    }
 
    if (isFirstMessage) {
      try {
        fetch('https://www.minhai.app/api/send-push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': Deno.env.get('PUSH_SECRET_KEY') ?? '',
          },
          body: JSON.stringify({
            userId,
            title:   '💬 Novo cliente!',
            message: `${data.sender_name || 'Cliente novo'} iniciou uma conversa via ${data.platform}.`,
            url:     'https://www.minhai.app/dashboard/atendimentos',
          }),
        }).catch(() => {})
 
        fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/enviar-email-novo-cliente`, {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({
            user_id:       userId,
            company_name:  company.name,
            sender_name:   data.sender_name || data.from_id,
            platform:      data.platform,
            first_message: data.message_text.substring(0, 200),
            timestamp:     new Date().toISOString(),
          }),
        }).catch(() => {})
 
        console.log('📣 Notificações de cliente novo disparadas')
      } catch (e) {
        console.warn('⚠️ Erro nas notificações:', e)
      }
    }
 
    try {
      fetch('https://www.minhai.app/api/send-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': Deno.env.get('PUSH_SECRET_KEY') ?? '',
        },
        body: JSON.stringify({
          userId,
          title:   `💬 ${data.sender_name || data.from_id}`,
          message: data.message_text.substring(0, 80),
          url:     'https://www.minhai.app/dashboard/atendimentos',
        }),
      }).catch((pushErr) => console.warn('⚠️ Push nova mensagem (não crítico):', pushErr))
    } catch (pushErr) {
      console.warn('⚠️ Push nova mensagem (não crítico):', pushErr)
    }
 
    await supabase.from('conversation_ai_control').upsert({
      conversation_id: data.from_id, page_id: data.page_id, company_id: companyId,
      platform: data.platform, ai_enabled: true, is_paused: false,
      last_ai_response_at: new Date().toISOString(), last_message_id: data.message_id,
      updated_at: new Date().toISOString(),
      meta_flow_state: newFlowState !== undefined ? newFlowState : null,
      ...(data.sender_name ? { sender_name: data.sender_name } : {}),
      ...(data.message_text ? { last_message_text: data.message_text.substring(0, 120) } : {}),
    }, { onConflict: 'conversation_id,page_id' })
 
    console.log('✅ Mensagem processada com sucesso')
 
  } catch (err: any) {
    console.error('❌ Erro:', err.message)
  }
}
 
// ─── Helpers ──────────────────────────────────────────────────────────────
 
async function upsertAiControl(supabase: any, data: any, companyId: string, aiEnabled: boolean) {
  await supabase.from('conversation_ai_control').upsert({
    conversation_id: data.from_id, page_id: data.page_id, company_id: companyId,
    platform: data.platform, ai_enabled: aiEnabled, is_paused: false,
    last_message_id: data.message_id, updated_at: new Date().toISOString(),
    ...(data.sender_name ? { sender_name: data.sender_name } : {}),
    ...(data.message_text ? { last_message_text: data.message_text.substring(0, 120) } : {}),
  }, { onConflict: 'conversation_id,page_id' })
}
 
async function sendMetaMessage(
  recipientId: string,
  message: string,
  pageAccessToken: string,
  platform: string,
  phoneNumberId?: string,
  userAccessToken?: string,
): Promise<void> {
  if (!recipientId) { console.error('❌ sendMetaMessage: recipientId vazio!'); return }
  if (!message)     { console.error('❌ sendMetaMessage: message vazio!'); return }
 
  let url: string
  let payload: any
  let headers: Record<string, string> = { 'Content-Type': 'application/json' }
 
  if (platform === 'whatsapp') {
    const waMsgPhoneId = phoneNumberId || recipientId
    url = `https://graph.facebook.com/v19.0/${waMsgPhoneId}/messages`
    headers['Authorization'] = `Bearer ${userAccessToken || pageAccessToken}`
    payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipientId,
      type: 'text',
      text: { preview_url: false, body: message },
    }
  } else {
    url = `https://graph.facebook.com/v19.0/me/messages?access_token=${pageAccessToken}`
    payload = {
      recipient: { id: recipientId },
      message: { text: message },
      messaging_type: 'RESPONSE',
    }
  }
 
  console.log(`📤 sendMetaMessage [${platform}] → ${recipientId}`)
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) })
  const d = await res.json()
  if (!res.ok) throw new Error(`Meta API Error: ${d.error?.message || JSON.stringify(d)}`)
  console.log(`✅ sendMetaMessage [${platform}] ok`)
}
 
async function sendTypingIndicator(
  recipientId:      string,
  pageAccessToken:  string,
  platform:         string,
  phoneNumberId?:   string,
  messageId?:       string,
  userAccessToken?: string,
): Promise<void> {
  try {
    if (platform === 'whatsapp' && phoneNumberId && messageId) {
      await fetch(
        `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
        {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${userAccessToken || pageAccessToken}`,
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            status:     'read',
            message_id: messageId,
          }),
        }
      )
      console.log(`✓✓ Mensagem marcada como lida: ${messageId}`)
    } else if (platform === 'instagram' || platform === 'facebook') {
      await fetch(
        `https://graph.facebook.com/v19.0/me/messages?access_token=${pageAccessToken}`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient:     { id: recipientId },
            sender_action: 'typing_on',
          }),
        }
      )
      console.log(`💬 Typing indicator enviado para ${recipientId} [${platform}]`)
    }
  } catch (err: any) {
    console.warn(`⚠️ sendTypingIndicator falhou (não-crítico): ${err.message}`)
  }
}
 
async function getMediaUrl(mediaId: string, accessToken: string): Promise<string> {
  const res  = await fetch(
    `https://graph.facebook.com/v19.0/${mediaId}`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  )
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(`Erro ao buscar URL da mídia: ${data.error?.message}`)
  return data.url
}
 
async function downloadMediaAsBuffer(mediaUrl: string, accessToken: string): Promise<Uint8Array> {
  const res = await fetch(mediaUrl, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  })
  if (!res.ok) throw new Error(`Erro ao baixar mídia: ${res.status}`)
  return new Uint8Array(await res.arrayBuffer())
}
 
async function transcribeWithWhisper(audioBuffer: Uint8Array): Promise<string> {
  const openaiKey = Deno.env.get('OPENAI_API_KEY')
  if (!openaiKey) throw new Error('OPENAI_API_KEY não configurada')
 
  const formData = new FormData()
  formData.append('file', new Blob([audioBuffer], { type: 'audio/ogg' }), 'audio.ogg')
  formData.append('model', 'whisper-1')
  formData.append('language', 'pt')
 
  const res  = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${openaiKey}` },
    body:    formData,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`Whisper error: ${data.error?.message || 'Unknown'}`)
  return data.text?.trim() || ''
}