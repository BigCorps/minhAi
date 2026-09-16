// supabase/functions/meta-agenda/index.ts
// Ver Agenda, Horários Disponíveis, Agendar, Cancelar, Confirmar, Reagendar, Email

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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
    const { msg, msgLower, connection, companyId, company } = await req.json()
    const result = await detectAndRun(msg, msgLower, connection, companyId, company)
    return Response.json(result)
  } catch (err: any) {
    console.error('❌ meta-agenda erro:', err.message)
    return Response.json(null)
  }
})

async function detectAndRun(
  msg: string,
  msgLower: string,
  connection: any,
  companyId: string,
  company: any
) {

  // ── VER AGENDA ────────────────────────────────────────────────────────
  if (connection.ver_agenda_enabled === true) {
    const verTriggers = ['ver agenda','minha agenda','compromissos','eventos','agenda do dia','agenda de hoje','próximos eventos','proximos eventos','meus agendamentos']
    if (verTriggers.some(t => msgLower.includes(t))) {
      console.log('📅 Rota: Ver Agenda')
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/listar-eventos-google`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ company_id: companyId, max_results: 5 })
        })
        const data = await res.json()

        if (!data.success || !data.events?.length) {
          return {
            responseText: `📅 Nenhum compromisso encontrado nos próximos dias.\n\nPara agendar, diga: *quero agendar*`,
            functionKey: 'ver_agenda',
            creditsUsed: 1
          }
        }

        const lista = data.events.map((e: any) => {
          const inicio = new Date(e.start?.dateTime || e.start?.date)
          const dataStr = inicio.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
          const horaStr = e.start?.dateTime
            ? inicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
            : 'Dia todo'
          return `📌 ${dataStr} ${horaStr} — ${e.summary}`
        })

        return {
          responseText: [`📅 *Próximos compromissos:*`, ``, ...lista].join('\n'),
          functionKey: 'ver_agenda',
          creditsUsed: 1
        }
      } catch (e: any) {
        return { responseText: `❌ Não foi possível acessar a agenda: ${e.message}`, functionKey: 'ver_agenda', creditsUsed: 0 }
      }
    }
  }

  // ── HORÁRIOS DISPONÍVEIS ──────────────────────────────────────────────
  if (connection.ver_agenda_enabled === true) {
    const horariosTriggers = ['horários disponíveis','horarios disponiveis','quando tem horário','quando tem vaga','disponibilidade','tem horário livre','tem vaga']
    if (horariosTriggers.some(t => msgLower.includes(t))) {
      console.log('🕐 Rota: Horários Disponíveis')
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/consultar-disponibilidade`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ company_id: companyId })
        })
        const data = await res.json()

        if (!data.success || !data.slots?.length) {
          return {
            responseText: `📅 Nenhum horário disponível encontrado.\nEntre em contato diretamente para verificar disponibilidade.`,
            functionKey: 'horarios_disponiveis',
            creditsUsed: 1
          }
        }

        const slots = data.slots.slice(0, 6).map((s: any) => `🕐 ${s.label}`)
        return {
          responseText: [
            `📅 *Horários disponíveis:*`,
            ``,
            ...slots,
            ``,
            `Para agendar, diga: *quero agendar* + data e horário`,
          ].join('\n'),
          functionKey: 'horarios_disponiveis',
          creditsUsed: 1
        }
      } catch (e: any) {
        return { responseText: `❌ Não foi possível verificar horários: ${e.message}`, functionKey: 'horarios_disponiveis', creditsUsed: 0 }
      }
    }
  }

  // ── AGENDAR COMPROMISSO ───────────────────────────────────────────────
  if (connection.agendar_enabled === true) {
    const agendarTriggers = ['agendar','marcar horário','marcar horario','marcar consulta','quero agendar','fazer agendamento','reservar horário','reservar horario','marcar reunião','marcar reuniao','quero marcar']
    if (agendarTriggers.some(t => msgLower.includes(t))) {
      console.log('📅 Rota: Agendar Compromisso')
      try {
        // Extrair data, hora e serviço via GPT
        const dadosJson = await callOpenAI(
          `Extraia do texto do usuário: data, hora, serviço/motivo e nome do cliente (se mencionado).
           Data de referência: ${new Date().toISOString().split('T')[0]} (hoje)
           Exemplos de interpretação:
           - "amanhã" → próximo dia
           - "segunda" → próxima segunda-feira
           - "15h" → "15:00"
           - "3 da tarde" → "15:00"
           Responda APENAS em JSON válido (sem markdown): {"data": "YYYY-MM-DD", "hora": "HH:MM", "servico": "...", "nome": "..."}
           Se não encontrar data/hora, use null no campo.`,
          msg
        )

        let parsed: any = {}
        try {
          const clean = dadosJson.replace(/```json|```/g, '').trim()
          parsed = JSON.parse(clean)
        } catch { /* segue sem dados extraídos */ }

        if (!parsed.data || !parsed.hora) {
          return {
            responseText: [
              `📅 *Agendamento*`,
              ``,
              `Para agendar, informe:`,
              `• Data desejada (ex: amanhã, 15/05, próxima segunda)`,
              `• Horário (ex: 14h, 14:30)`,
              `• Serviço ou motivo`,
              ``,
              `Ex: *Agendar corte de cabelo amanhã às 14h*`,
            ].join('\n'),
            functionKey: 'agendar_compromisso',
            creditsUsed: 0
          }
        }

        const res = await fetch(`${supabaseUrl}/functions/v1/criar-evento-calendario`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_id: companyId,
            summary: parsed.servico || 'Agendamento via WhatsApp',
            start_datetime: `${parsed.data}T${parsed.hora}:00`,
            duration_minutes: 60,
            description: `Agendado via Meta (minhAi).\nCliente: ${parsed.nome || 'não informado'}`,
          })
        })
        const data = await res.json()

        if (!data.success) throw new Error(data.error || 'Erro ao criar evento na agenda')

        const dataFormatada = new Date(`${parsed.data}T${parsed.hora}:00`)
          .toLocaleString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            weekday: 'long', day: '2-digit', month: '2-digit',
            hour: '2-digit', minute: '2-digit'
          })

        return {
          responseText: [
            `✅ *Agendamento confirmado!*`,
            ``,
            `📌 ${parsed.servico || 'Compromisso'}`,
            `📅 ${dataFormatada}`,
            parsed.nome ? `👤 Cliente: ${parsed.nome}` : '',
            ``,
            `Para cancelar ou reagendar, nos avise com antecedência.`,
          ].filter(Boolean).join('\n'),
          functionKey: 'agendar_compromisso',
          creditsUsed: 2
        }
      } catch (e: any) {
        return { responseText: `❌ Não foi possível realizar o agendamento: ${e.message}`, functionKey: 'agendar_compromisso', creditsUsed: 0 }
      }
    }
  }

  // ── CANCELAR AGENDAMENTO ──────────────────────────────────────────────
  if (connection.agendar_enabled === true) {
    const cancelarTriggers = ['cancelar agendamento','cancelar consulta','desmarcar','não vou mais','nao vou mais','quero cancelar meu agendamento','cancelar minha consulta']
    if (cancelarTriggers.some(t => msgLower.includes(t))) {
      console.log('❌ Rota: Cancelar Agendamento')
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/cancelar-agendamento`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ company_id: companyId, message: msg })
        })
        const data = await res.json()

        return {
          responseText: data.success
            ? `✅ *Agendamento cancelado com sucesso.*\n\nSe quiser remarcar, é só nos avisar! 😊`
            : `❌ Não encontrei um agendamento para cancelar.\nVerifique a data ou entre em contato diretamente.`,
          functionKey: 'cancelar_agendamento',
          creditsUsed: data.success ? 1 : 0
        }
      } catch (e: any) {
        return { responseText: `❌ Erro ao cancelar: ${e.message}`, functionKey: 'cancelar_agendamento', creditsUsed: 0 }
      }
    }
  }

  // ── CONFIRMAR PRESENÇA ────────────────────────────────────────────────
  if (connection.agendar_enabled === true) {
    const confirmarTriggers = ['confirmar presença','confirmar presenca','vou comparecer','confirmo minha presença','confirmo presenca','sim vou comparecer','confirmo o agendamento']
    if (confirmarTriggers.some(t => msgLower.includes(t))) {
      console.log('✅ Rota: Confirmar Presença')
      return {
        responseText: [
          `✅ *Presença confirmada!*`,
          ``,
          `Obrigado por confirmar. Te esperamos! 😊`,
          ``,
          `Caso precise reagendar, nos avise com antecedência.`,
        ].join('\n'),
        functionKey: 'confirmar_presenca',
        creditsUsed: 1
      }
    }
  }

  // ── REAGENDAR ─────────────────────────────────────────────────────────
  if (connection.agendar_enabled === true) {
    const reagendarTriggers = ['reagendar','remarcar','mudar horário','mudar horario','trocar data','outra data','outro horário','outro horario','preciso remarcar']
    if (reagendarTriggers.some(t => msgLower.includes(t))) {
      console.log('🔄 Rota: Reagendar')
      return {
        responseText: [
          `📅 *Reagendamento*`,
          ``,
          `Para remarcar, informe a nova data e horário desejados.`,
          `Ex: *Quero remarcar para sexta às 15h*`,
        ].join('\n'),
        functionKey: 'reagendar_compromisso',
        creditsUsed: 0
      }
    }
  }

  // ── ENVIAR EMAIL ──────────────────────────────────────────────────────
  if (connection.email_enabled === true) {
    const emailTriggers = ['enviar email','mandar email','enviar e-mail','mandar e-mail','quero enviar um email','me manda por email','envie um email']
    if (emailTriggers.some(t => msgLower.includes(t))) {
      console.log('📧 Rota: Enviar Email')
      try {
        // Extrair destinatário, assunto e corpo via GPT
        const dadosJson = await callOpenAI(
          `Extraia do texto: email do destinatário, assunto e corpo da mensagem.
           Responda APENAS em JSON válido (sem markdown): {"para": "email@exemplo.com", "assunto": "...", "corpo": "..."}
           Se não encontrar o email do destinatário, use null.`,
          msg
        )

        let parsed: any = {}
        try {
          const clean = dadosJson.replace(/```json|```/g, '').trim()
          parsed = JSON.parse(clean)
        } catch { /* segue */ }

        if (!parsed.para || !parsed.para.includes('@')) {
          return {
            responseText: [
              `📧 *Enviar Email*`,
              ``,
              `Para enviar, informe:`,
              `• Email do destinatário`,
              `• Assunto`,
              `• Mensagem`,
              ``,
              `Ex: *Enviar email para joao@empresa.com - Assunto: Orçamento - Mensagem: Segue nosso orçamento conforme solicitado.*`,
            ].join('\n'),
            functionKey: 'enviar_email',
            creditsUsed: 0
          }
        }

        const res = await fetch(`${supabaseUrl}/functions/v1/enviar-email-google`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_id: companyId,
            to: parsed.para,
            subject: parsed.assunto || 'Mensagem via minhAi',
            body: parsed.corpo || msg,
          })
        })
        const data = await res.json()

        return {
          responseText: data.success
            ? `✅ Email enviado com sucesso para *${parsed.para}*!`
            : `❌ Não foi possível enviar o email: ${data.error || 'Erro desconhecido'}`,
          functionKey: 'enviar_email',
          creditsUsed: data.success ? 1 : 0
        }
      } catch (e: any) {
        return { responseText: `❌ Erro ao enviar email: ${e.message}`, functionKey: 'enviar_email', creditsUsed: 0 }
      }
    }
  }

  return null
}

// ── Helper OpenAI ─────────────────────────────────────────────────────────
async function callOpenAI(systemPrompt: string, userMessage: string): Promise<string> {
  const key = Deno.env.get('OPENAI_API_KEY')
  if (!key) throw new Error('OPENAI_API_KEY não configurada')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage },
      ],
      temperature: 0.2,
      max_tokens: 400,
    }),
  })

  const d = await res.json()
  if (!res.ok) throw new Error(`OpenAI Error: ${d.error?.message || 'Unknown'}`)
  return d.choices[0].message.content
}