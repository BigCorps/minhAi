// supabase/functions/meta-consultas/index.ts
// CEP, CNPJ, CPF, Placa, Câmbio, DDD, Feriados, Protestos
// ⚠️ ferramentas-consultas já desconta créditos internamente — retornar creditsUsed: 0

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
    const { msg, msgLower, connection, companyId } = await req.json()
    const result = await detectAndRun(msg, msgLower, connection, companyId)
    return Response.json(result)
  } catch (err: any) {
    console.error('❌ meta-consultas erro:', err.message)
    return Response.json(null)
  }
})

async function callFerramentasConsultas(action: string, params: Record<string, any>, companyId: string): Promise<string> {
  const res = await fetch(`${supabaseUrl}/functions/v1/ferramentas-consultas`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ company_id: companyId, action, ...params })
  })
  const data = await res.json()
  if (!data.success) throw new Error(data.error || 'Erro na consulta')
  return data.speech_text || 'Consulta realizada.'
}

async function detectAndRun(msg: string, msgLower: string, connection: any, companyId: string) {

  // ── CEP ───────────────────────────────────────────────────────────────
  if (connection.consultar_cep_enabled === true) {
    const cepMatch = msg.match(/\b(\d{5}-?\d{3})\b/)
    const hasTrigger = ['cep','código postal','consultar cep','buscar cep'].some(t => msgLower.includes(t))
    if (hasTrigger && cepMatch) {
      console.log('📮 Rota: Consultar CEP')
      try {
        const texto = await callFerramentasConsultas('consultar_cep', { cep: cepMatch[1] }, companyId)
        return { responseText: texto, functionKey: 'consultar_cep', creditsUsed: 0 }
      } catch (e: any) {
        return { responseText: `❌ ${e.message}`, functionKey: 'consultar_cep', creditsUsed: 0 }
      }
    }
    // Trigger sem CEP — pedir o número
    if (hasTrigger && !cepMatch) {
      return { responseText: `📮 Para consultar um CEP, envie no formato:\n*CEP 01310-100*`, functionKey: 'consultar_cep', creditsUsed: 0 }
    }
  }

  // ── CNPJ ──────────────────────────────────────────────────────────────
  if (connection.consultar_cnpj_enabled === true) {
    const cnpjMatch = msg.match(/\b(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})\b/)
    const hasTrigger = ['cnpj','consultar cnpj','dados cnpj','empresa cnpj'].some(t => msgLower.includes(t))
    if (hasTrigger && cnpjMatch) {
      console.log('🏢 Rota: Consultar CNPJ')
      try {
        const texto = await callFerramentasConsultas('dados_cnpj', { cnpj: cnpjMatch[1] }, companyId)
        return { responseText: texto, functionKey: 'dados_cnpj', creditsUsed: 0 }
      } catch (e: any) {
        return { responseText: `❌ ${e.message}`, functionKey: 'consultar_cnpj', creditsUsed: 0 }
      }
    }
    if (hasTrigger && !cnpjMatch) {
      return { responseText: `🏢 Para consultar um CNPJ, envie no formato:\n*CNPJ 00.000.000/0001-00*`, functionKey: 'consultar_cnpj', creditsUsed: 0 }
    }
  }

  // ── CÂMBIO ────────────────────────────────────────────────────────────
  if (connection.consultar_cambio_enabled === true) {
    const cambioTriggers = ['câmbio','cambio','cotação','cotacao','dólar','dolar','euro','libra','bitcoin','moeda']
    if (cambioTriggers.some(t => msgLower.includes(t))) {
      console.log('💱 Rota: Consultar Câmbio')
      let moedas = 'USD-BRL,EUR-BRL'
      if (msgLower.includes('euro'))                                     moedas = 'EUR-BRL'
      else if (msgLower.includes('libra'))                               moedas = 'GBP-BRL'
      else if (msgLower.includes('bitcoin') || msgLower.includes('btc')) moedas = 'BTC-BRL'
      else if (msgLower.includes('dolar') || msgLower.includes('dólar')) moedas = 'USD-BRL'
      try {
        const texto = await callFerramentasConsultas('consultar_cambio', { moedas }, companyId)
        return { responseText: texto, functionKey: 'consultar_cambio', creditsUsed: 0 }
      } catch (e: any) {
        return { responseText: `❌ ${e.message}`, functionKey: 'consultar_cambio', creditsUsed: 0 }
      }
    }
  }

  // ── CPF (dados básicos — API paga, desconta company_balance) ──────────
  if (connection.consultar_cpf_enabled === true) {
    const cpfMatch = msg.match(/\b(\d{3}\.?\d{3}\.?\d{3}-?\d{2})\b/)
    const hasTrigger = ['cpf','consultar cpf','dados cpf','verificar cpf'].some(t => msgLower.includes(t))
    if (hasTrigger && cpfMatch) {
      console.log('👤 Rota: Consultar CPF')
      try {
        const texto = await callFerramentasConsultas('dados_cpf', { cpf: cpfMatch[1] }, companyId)
        return { responseText: texto, functionKey: 'consultar_cpf', creditsUsed: 0 }
      } catch (e: any) {
        return { responseText: `❌ ${e.message}`, functionKey: 'consultar_cpf', creditsUsed: 0 }
      }
    }
    if (hasTrigger && !cpfMatch) {
      return { responseText: `👤 Para consultar um CPF, envie no formato:\n*CPF 000.000.000-00*`, functionKey: 'consultar_cpf', creditsUsed: 0 }
    }
  }

  // ── PLACA (API paga, desconta company_balance) ────────────────────────
  if (connection.consultar_placa_enabled === true) {
    // Suporta padrão antigo (ABC-1234) e Mercosul (ABC1D23)
    const placaMatch = msg.match(/\b([A-Z]{3}-?\d{1}[A-Z0-9]\d{2}|[A-Z]{3}-?\d{4})\b/i)
    const hasTrigger = ['placa','consultar placa','veículo','veiculo','carro','moto'].some(t => msgLower.includes(t))
    if (hasTrigger && placaMatch) {
      console.log('🚗 Rota: Consultar Placa')
      try {
        const texto = await callFerramentasConsultas('consultar_placa', { placa: placaMatch[1].toUpperCase().replace('-','') }, companyId)
        return { responseText: texto, functionKey: 'consultar_placa', creditsUsed: 0 }
      } catch (e: any) {
        return { responseText: `❌ ${e.message}`, functionKey: 'consultar_placa', creditsUsed: 0 }
      }
    }
    if (hasTrigger && !placaMatch) {
      return { responseText: `🚗 Para consultar uma placa, envie no formato:\n*Placa ABC1234* ou *Placa ABC-1234*`, functionKey: 'consultar_placa', creditsUsed: 0 }
    }
  }

  // ── RESTRIÇÕES CPF (API paga) ─────────────────────────────────────────
  if (connection.restricoes_cpf_enabled === true) {
    const cpfMatch = msg.match(/\b(\d{3}\.?\d{3}\.?\d{3}-?\d{2})\b/)
    const hasTrigger = ['restrição cpf','restricao cpf','cpf restrito','score cpf','pendência cpf','pendencia cpf','debito cpf'].some(t => msgLower.includes(t))
    if (hasTrigger && cpfMatch) {
      console.log('🔍 Rota: Restrições CPF')
      try {
        const texto = await callFerramentasConsultas('restricoes_cpf', { cpf: cpfMatch[1] }, companyId)
        return { responseText: texto, functionKey: 'restricoes_cpf', creditsUsed: 0 }
      } catch (e: any) {
        return { responseText: `❌ ${e.message}`, functionKey: 'restricoes_cpf', creditsUsed: 0 }
      }
    }
    if (hasTrigger && !cpfMatch) {
      return { responseText: `🔍 Para consultar restrições de CPF, envie no formato:\n*Restrições CPF 000.000.000-00*`, functionKey: 'restricoes_cpf', creditsUsed: 0 }
    }
  }

  // ── RESTRIÇÕES CNPJ (API paga) ────────────────────────────────────────
  if (connection.restricoes_cnpj_enabled === true) {
    const cnpjMatch = msg.match(/\b(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})\b/)
    const hasTrigger = ['restrição cnpj','restricao cnpj','cnpj restrito','pendência cnpj','pendencia cnpj'].some(t => msgLower.includes(t))
    if (hasTrigger && cnpjMatch) {
      console.log('🔍 Rota: Restrições CNPJ')
      try {
        const texto = await callFerramentasConsultas('restricoes_cnpj', { cnpj: cnpjMatch[1] }, companyId)
        return { responseText: texto, functionKey: 'restricoes_cnpj', creditsUsed: 0 }
      } catch (e: any) {
        return { responseText: `❌ ${e.message}`, functionKey: 'restricoes_cnpj', creditsUsed: 0 }
      }
    }
    if (hasTrigger && !cnpjMatch) {
      return { responseText: `🔍 Para consultar restrições de CNPJ, envie no formato:\n*Restrições CNPJ 00.000.000/0001-00*`, functionKey: 'restricoes_cnpj', creditsUsed: 0 }
    }
  }

  // ── PROTESTOS (API paga) ──────────────────────────────────────────────
  if (connection.consultar_protestos_enabled === true) {
    const docMatch = msg.match(/\b(\d{3}\.?\d{3}\.?\d{3}-?\d{2}|\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})\b/)
    const hasTrigger = ['protesto','protestos','consultar protesto','serasa','dívida','divida','negativado'].some(t => msgLower.includes(t))
    if (hasTrigger && docMatch) {
      console.log('⚖️ Rota: Consultar Protestos')
      try {
        const texto = await callFerramentasConsultas('consultar_protestos', { documento: docMatch[1] }, companyId)
        return { responseText: texto, functionKey: 'consultar_protestos', creditsUsed: 0 }
      } catch (e: any) {
        return { responseText: `⚖️ ...`, functionKey: 'consultar_protestos', creditsUsed: 0 }
      }
    }
    if (hasTrigger && !docMatch) {
      return { responseText: `⚖️ Para consultar protestos, envie o CPF ou CNPJ:\n*Protestos 000.000.000-00*`, functionKey: 'consultar_leilao', creditsUsed: 0 }
    }
  }

  // ── DDD ───────────────────────────────────────────────────────────────
  if (connection.consultar_ddd_enabled === true) {
    const hasTrigger = ['ddd','código de área','codigo de area','consultar ddd'].some(t => msgLower.includes(t))
    const dddMatch = msg.match(/\b(\d{2})\b/)
    if (hasTrigger && dddMatch) {
      console.log('📞 Rota: Consultar DDD')
      try {
        const texto = await callFerramentasConsultas('consultar_ddd', { ddd: dddMatch[1] }, companyId)
        return { responseText: texto, functionKey: 'consultar_ddd', creditsUsed: 0 }
      } catch (e: any) {
        return { responseText: `❌ ${e.message}`, functionKey: 'consultar_ddd', creditsUsed: 0 }
      }
    }
    if (hasTrigger && !dddMatch) {
      return { responseText: `📞 Para consultar um DDD, envie:\n*DDD 11*`, functionKey: 'consultar_ddd', creditsUsed: 0 }
    }
  }

  // ── FERIADOS ──────────────────────────────────────────────────────────
  if (connection.consultar_feriados_enabled === true) {
    const hasTrigger = ['feriado','feriados','feriados nacionais','dias úteis','dias uteis'].some(t => msgLower.includes(t))
    if (hasTrigger) {
      console.log('📅 Rota: Feriados Nacionais')
      const anoMatch = msg.match(/\b(20\d{2})\b/)
      const ano = anoMatch ? anoMatch[1] : new Date().getFullYear().toString()
      try {
        const texto = await callFerramentasConsultas('consultar_feriados', { ano }, companyId)
        return { responseText: texto, functionKey: 'consultar_feriados', creditsUsed: 0 }
      } catch (e: any) {
        return { responseText: `❌ ${e.message}`, functionKey: 'consultar_feriados', creditsUsed: 0 }
      }
    }
  }

  return null // nenhuma consulta detectada
}