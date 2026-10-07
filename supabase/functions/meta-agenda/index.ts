// supabase/functions/meta-agenda/index.ts
// Ver Agenda, Horários Disponíveis, Agendar, Cancelar, Confirmar, Reagendar, Email

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { findAppointment, actionTimes } from '../_shared/calendar-security.ts'

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
        const res = await fetch(`${supabaseUrl}/functions/v1/listar-eventos-google-v2`, {
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

  // Ações existentes são resolvidas ANTES do trigger genérico "agendar".
  if (connection.agendar_enabled === true) {
    const action = /cancelar|desmarcar|não vou mais|nao vou mais/.test(msgLower) ? 'cancel'
      : /reagendar|remarcar|mudar horário|mudar horario|trocar data|outra data|outro horário|outro horario/.test(msgLower) ? 'reschedule'
      : /confirmar presença|confirmar presenca|vou comparecer|confirmo.*presen|confirmo o agendamento/.test(msgLower) ? 'confirm' : null
    if (action) return await runAppointmentAction(msg, companyId, action)
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

        const res = await fetch(`${supabaseUrl}/functions/v1/enviar-email-google-v2`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email_type: 'meta_manual',
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

// Extração é apenas sugestão. Identidade/ambiguidade são decididas no banco.
async function runAppointmentAction(msg: string, companyId: string, action: string) {
  const functionKey = action === 'cancel' ? 'cancelar_agendamento' : action === 'confirm' ? 'confirmar_presenca' : 'reagendar_compromisso'
  const reply = (responseText: string, success = false) => ({ responseText, functionKey, creditsUsed: success ? 1 : 0 })
  try {
    const extracted = await callOpenAI(
      `Extraia SOMENTE informações explicitamente fornecidas para identificar o agendamento EXISTENTE e, se solicitado, a NOVA data/hora.
       Referência hoje: ${new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })}.
       Nunca invente nome, data ou hora. Não confunda data nova com data original.
       JSON sem markdown: {"nome":null,"data":null,"hora":null,"nova_data":null,"nova_hora":null}.
       Datas YYYY-MM-DD, horas HH:MM. Ausência = null.`, msg)
    let parsed: any
    try { parsed = JSON.parse(extracted.replace(/```json|```/g, '').trim()) } catch { return reply('Informe a data e o horário ou nome completo do agendamento existente.') }
    if (!parsed?.data || (!parsed.hora && !parsed.nome)) return reply('Informe a data e o horário ou nome completo do agendamento existente. Para reagendar, informe também a nova data e horário.')
    const admin = createClient(supabaseUrl, serviceKey)
    const { appointment, error } = await findAppointment(admin, companyId, { date: parsed.data, time: parsed.hora || undefined, name: parsed.nome || undefined })
    if (error) return reply(error === 'appointment_ambiguous' ? 'Mais de um agendamento corresponde. Informe o nome completo e horário para identificar apenas um.' : error === 'appointment_not_found' ? 'Agendamento não encontrado. Confira a data, horário e nome completo.' : 'Não foi possível identificar o agendamento. Informe a data, horário e nome completo.')
    const payload: any = { company_id: companyId, appointment_id: appointment.id, action }
    if (action === 'reschedule') {
      if (!parsed.nova_data || !parsed.nova_hora) return reply('Informe a nova data e horário desejados, além dos dados do agendamento existente.')
      const start = `${parsed.nova_data}T${parsed.nova_hora}:00-03:00`
      const duration = Date.parse(appointment.appointment_end) - Date.parse(appointment.appointment_date)
      if (!Number.isFinite(Date.parse(start)) || !Number.isFinite(duration) || duration <= 0) return reply('Informe uma nova data e horário válidos.')
      const times = actionTimes({ new_start: start, new_end: new Date(Date.parse(start) + duration).toISOString() })
      if (!times) return reply('Informe uma nova data e horário válidos.')
      payload.new_start = times.start; payload.new_end = times.end
    }
    const response = await fetch(`${supabaseUrl}/functions/v1/appointment-actions-v2`, {
      method: 'POST', headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(60000),
    })
    const result = await response.json().catch(() => null)
    if (!response.ok || result?.success !== true) return reply(result?.error === 'slot_unavailable' ? 'Este horário não está disponível. Escolha outro.' : 'Não foi possível concluir a alteração do agendamento. Tente novamente.')
    return reply(action === 'confirm' ? '✅ Presença confirmada! Te esperamos.' : action === 'cancel' ? '✅ Agendamento cancelado com sucesso.' : '✅ Agendamento reagendado com sucesso.', true)
  } catch { return reply('Não foi possível concluir a operação. Confira os dados do agendamento e tente novamente.') }
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