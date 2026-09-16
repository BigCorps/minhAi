import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()
    const requestedNumber = String(body?.number || '').replace(/\D/g, '')
    const gerenteNomeInput = String(body?.gerente_nome || '').trim()
    const motivo = String(body?.motivo || '').trim()
    const companyId = body?.company_id ? String(body.company_id) : null
    const usageIdempotencyKey = body?.usage_idempotency_key ? String(body.usage_idempotency_key).slice(0, 180) : null

    if (!motivo) return json({ error: 'Parâmetro obrigatório: motivo' }, 400)

    const apiBrasilToken = Deno.env.get('APIBRASIL_API_TOKEN')
    if (!apiBrasilToken) return json({ error: 'Token da API Brasil não configurado' }, 500)

    let number = requestedNumber
    let gerenteNome = gerenteNomeInput
    let isFuncionarIA = false
    let supabase: any = null

    // PHASE6_SMS_CALLER_AUTH — remove o relay público para números arbitrários.
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const authHeader = req.headers.get('authorization') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    const isServiceRole = Boolean(serviceRole) && authHeader === `Bearer ${serviceRole}`
    let authenticatedUserId: string | null = null

    if (companyId) {
      supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceRole)

      const [{ data: settings }, { data: company }] = await Promise.all([
        supabase.from('funcionaria_company_settings').select('company_id').eq('company_id', companyId).maybeSingle(),
        supabase.from('companies').select('id,is_active,is_public').eq('id', companyId).maybeSingle(),
      ])

      if (settings?.company_id && company?.is_active === true && company?.is_public === true) {
        isFuncionarIA = true

        // Em chamadas públicas da FuncionarIA, o destino é sempre o responsável
        // cadastrado no banco. O cliente não pode escolher um número arbitrário.
        const { data: profile } = await supabase
          .from('company_profiles')
          .select('nome,telefone')
          .eq('company_id', companyId)
          .eq('tipo', 'gerente')
          .eq('is_active', true)
          .limit(1)
          .maybeSingle()

        number = String(profile?.telefone || '').replace(/\D/g, '')
        gerenteNome = String(profile?.nome || gerenteNomeInput || 'Responsável').trim()
        if (!number) return json({ error: 'Telefone do responsável não configurado' }, 400)

        // PHASE5_SMS_PREPAID_RESERVATION — a idempotência passa pelo RPC atômico.
        // Proteção simples contra spam do botão público.
        const since = new Date(Date.now() - 10 * 60_000).toISOString()
        const { count } = await supabase
          .from('funcionaria_usage_events')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('usage_key', 'sms_message')
          .eq('source', 'manager_assistance')
          .gte('created_at', since)
        if ((count || 0) >= 3) return json({ error: 'Limite temporário de SMS atingido', reason: 'rate_limited' }, 429)

      }

      if (!isFuncionarIA && !isServiceRole) {
        // Chamada pública de "chamar gerente": destino sempre vem do cadastro,
        // nunca do número informado pelo navegador.
        if (gerenteNomeInput) {
          const { data: profile } = await supabase
            .from('company_profiles')
            .select('nome,telefone')
            .eq('company_id', companyId)
            .eq('tipo', 'gerente')
            .eq('is_active', true)
            .limit(1)
            .maybeSingle()
          number = String(profile?.telefone || '').replace(/\D/g, '')
          gerenteNome = String(profile?.nome || gerenteNomeInput || 'Responsável').trim()
          if (!number) return json({ error: 'Telefone do responsável não configurado' }, 400)

          // Limite de abuso/custo para o fluxo público legado.
          const since = new Date(Date.now() - 10 * 60_000).toISOString()
          const { count } = await supabase
            .from('assistant_function_logs')
            .select('id', { count: 'exact', head: true })
            .eq('company_id', companyId)
            .eq('function_key', 'phase6_public_manager_sms')
            .gte('executed_at', since)
          if ((count || 0) >= 3) return json({ error: 'Limite temporário de SMS atingido', reason: 'rate_limited' }, 429)
        } else {
          // Envio SMS genérico/arbitrário exige sessão real do dono/admin.
          if (!token) return json({ error: 'Autenticação obrigatória' }, 401)
          const { data: authData, error: authError } = await supabase.auth.getUser(token)
          if (authError || !authData?.user?.id) return json({ error: 'Autenticação inválida' }, 401)
          authenticatedUserId = authData.user.id
          const { data: company } = await supabase.from('companies').select('user_id').eq('id', companyId).maybeSingle()
          let allowed = company?.user_id === authenticatedUserId
          if (!allowed) {
            const { data: admin } = await supabase.from('company_admins')
              .select('role').eq('company_id', companyId).eq('user_id', authenticatedUserId).maybeSingle()
            allowed = Boolean(admin && ['owner','manager'].includes(String(admin.role)))
          }
          if (!allowed) return json({ error: 'Acesso não autorizado' }, 403)
        }
      }
    } else if (!isServiceRole) {
      // Sem company_id, só backend pode escolher destino arbitrário.
      return json({ error: 'company_id ou autenticação de backend obrigatória' }, 401)
    }

    if (!number) return json({ error: 'Parâmetro obrigatório: number' }, 400)

    const motivoResumido = motivo.length > 110 ? `${motivo.slice(0, 107)}...` : motivo
    const message = gerenteNome
      ? `${isFuncionarIA ? 'FuncionarIA' : 'minhAi'}: ${gerenteNome}, voce foi chamado(a). Motivo: ${motivoResumido}`
      : motivo

    let smsReservation: any = null
    if (isFuncionarIA && companyId && supabase) {
      const idempotencyKey = usageIdempotencyKey || `manager-sms:${companyId}:${crypto.randomUUID()}`
      const { data: reservation, error: reservationError } = await supabase.rpc('funcionaria_consume_usage', {
        p_company_id: companyId,
        p_usage_key: 'sms_message',
        p_units: 1,
        p_source: 'manager_assistance',
        p_channel: 'sms',
        p_idempotency_key: idempotencyKey,
        p_metadata: {
          phase: '5',
          billing_mode: 'prepaid_reservation',
          manager_name: gerenteNome || null,
          destination_suffix: number.slice(-4),
        },
      })
      if (reservationError || !reservation?.ok) {
        const reason = reservation?.reason || 'usage_reservation_failed'
        return json({
          error: reason === 'insufficient_credits' ? 'Créditos de uso insuficientes para SMS' : 'Não foi possível reservar créditos para SMS',
          reason,
          available_credits: reservation?.available_credits ?? 0,
          credits_required: reservation?.credits_required ?? 1,
        }, reason === 'insufficient_credits' ? 402 : 409)
      }
      if (reservation?.duplicate === true) return json({ success: true, duplicate: true })
      smsReservation = reservation
    }

    async function refundSms(reason: string, metadata: Record<string, unknown> = {}) {
      if (!supabase || !smsReservation?.usage_event_id) return
      const { error } = await supabase.rpc('funcionaria_refund_usage', {
        p_usage_event_id: smsReservation.usage_event_id,
        p_reason: reason,
        p_metadata: metadata,
      })
      if (error) console.warn('[send-sms-gerente] estorno falhou:', error.message)
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30_000)

    try {
      const response = await fetch('https://gateway.apibrasil.io/api/v2/sms/send/credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiBrasilToken}`,
        },
        body: JSON.stringify({ number, message, homolog: false }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        await refundSms('sms_provider_http_error', { status: response.status })
        return json({ error: data?.message || 'Falha ao enviar SMS', details: data }, response.status)
      }

      if (companyId && supabase && gerenteNomeInput && !isFuncionarIA && !isServiceRole) {
        await supabase.from('assistant_function_logs').insert({
          company_id: companyId,
          function_key: 'phase6_public_manager_sms',
          credits_consumed: 0,
          executed_at: new Date().toISOString(),
          metadata: { destination_suffix: number.slice(-4), phase: '6' },
        }).catch(() => null)
      }
      return json({ success: true, data })
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      await refundSms('sms_provider_network_error', { message: String(fetchError?.message || fetchError).slice(0, 160) })
      throw fetchError
    }
  } catch (error: any) {
    return json({ error: error?.message || 'Erro interno ao enviar SMS' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders })
}
