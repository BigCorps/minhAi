import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { jsPDF } from 'npm:jspdf@2.5.1';
import 'npm:jspdf-autotable@3.8.2';
import PDFDocument from 'npm:pdfkit@0.13.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// URLs das APIs gratuitas
const AWESOME_API_URL = 'https://economia.awesomeapi.com.br/json/last';
const VIACEP_API_URL = 'https://viacep.com.br/ws';
const BRASIL_API_BASE_URL = 'https://brasilapi.com.br/api';
const RECEITAWS_API_URL = 'https://www.receitaws.com.br/v1';

// PHASE6_CONSULTA_LEDGER — reserva antes do provedor + cache/idempotência.
const PHASE6_PAID_COSTS: Record<string, number> = {
  consultar_placa: 300,
  consultar_protestos: 1000,
  restricoes_cpf: 1500,
  restricoes_cnpj: 2000,
  dados_cpf: 300,
  dados_cnpj: 300,
  completa_cpf: 2800,
}
const PHASE6_ALLOWED = new Set([
  'consultar_cambio','consultar_cep','consultar_cnpj','consultar_cpf',
  'consultar_feriados','consultar_ddd',
  ...Object.keys(PHASE6_PAID_COSTS),
])
const PHASE6_APIBRASIL = new Set([
  'consultar_placa','consultar_protestos','restricoes_cpf','restricoes_cnpj','dados_cpf','completa_cpf',
])

function phase6Json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function phase6Bearer(req: Request) {
  return (req.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1] ?? ''
}

function phase6Canonical(value: any): any {
  if (Array.isArray(value)) return value.map(phase6Canonical)
  if (!value || typeof value !== 'object') return value
  return Object.keys(value).sort().reduce((out: Record<string, any>, key) => {
    out[key] = phase6Canonical(value[key])
    return out
  }, {})
}

async function phase6Sha256(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function phase6NormalizeParams(action: string, params: Record<string, any>) {
  const out = { ...params }
  const documento = String(out.documento || '').replace(/\D/g, '')
  if (documento) {
    if (['dados_cpf','restricoes_cpf','completa_cpf','consultar_cpf','consultar_protestos'].includes(action)) out.cpf = out.cpf || documento
    if (['dados_cnpj','restricoes_cnpj','consultar_cnpj'].includes(action)) out.cnpj = out.cnpj || documento
  }
  if (action === 'consultar_cambio' && !out.currency && out.moedas) {
    out.currency = String(out.moedas).split(',')[0].split('-')[0].toUpperCase()
  }
  return out
}

function phase6Validate(action: string, params: Record<string, any>) {
  if (!PHASE6_ALLOWED.has(action)) return 'Ação não reconhecida'
  if (['dados_cpf','restricoes_cpf','completa_cpf','consultar_cpf','consultar_protestos'].includes(action)) {
    const cpf = String(params.cpf || '').replace(/\D/g, '')
    if (!validateCPF(cpf)) return 'CPF inválido'
  }
  if (['dados_cnpj','restricoes_cnpj','consultar_cnpj'].includes(action)) {
    const cnpj = String(params.cnpj || '').replace(/\D/g, '')
    if (!validateCNPJ(cnpj)) return 'CNPJ inválido'
  }
  if (action === 'consultar_placa') {
    const placa = String(params.placa || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (!/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(placa) && !/^[A-Z]{3}[0-9]{4}$/.test(placa)) return 'Placa inválida'
  }
  if (action === 'consultar_cep' && String(params.cep || '').replace(/\D/g, '').length !== 8) return 'CEP inválido'
  if (action === 'consultar_ddd' && !/^\d{2}$/.test(String(params.ddd || '').replace(/\D/g, ''))) return 'DDD inválido'
  if (action === 'consultar_feriados') {
    const year = Number(params.ano)
    if (!Number.isInteger(year) || year < 2000 || year > 2100) return 'Ano inválido'
  }
  if (action === 'consultar_cambio' && !/^[A-Z]{3}$/.test(String(params.currency || '').toUpperCase())) return 'Moeda inválida'
  return null
}

async function phase6CanUseBalance(admin: any, req: Request, company: any, isServiceRole: boolean) {
  if (isServiceRole) return true
  const token = phase6Bearer(req)
  if (!token) return false
  const { data, error } = await admin.auth.getUser(token)
  const uid = error ? null : data?.user?.id
  if (!uid) return false
  if (uid === company.user_id) return true
  const { data: membership } = await admin.from('company_admins')
    .select('role').eq('company_id', company.id).eq('user_id', uid).maybeSingle()
  return Boolean(membership && ['owner','manager'].includes(String(membership.role)))
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return phase6Json({ success: false, error: 'Método não permitido' }, 405)

  let operationId: string | null = null
  let providerStarted = false
  let idempotencyKey = ''

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !serviceRole) throw new Error('Configuração do servidor indisponível')
    const admin = createClient(supabaseUrl, serviceRole)
    const authHeader = req.headers.get('authorization') ?? ''
    const isServiceRole = authHeader === `Bearer ${serviceRole}`

    const body = await req.json().catch(() => ({})) as Record<string, any>
    const companyId = String(body.company_id || '')
    const action = String(body.action || '')
    if (!companyId || !action) return phase6Json({ success: false, error: 'company_id e action são obrigatórios' }, 400)

    const { data: company, error: companyError } = await admin.from('companies')
      .select('id,user_id,is_active,consultas_payment_method')
      .eq('id', companyId).maybeSingle()
    if (companyError || !company?.id || company.is_active !== true || !company.user_id) {
      return phase6Json({ success: false, error: 'Empresa não encontrada' }, 404)
    }

    const special = new Set([
      'company_id','action','payment_confirmed','payment_transaction_id','idempotency_key','funcionaria_usage_context',
    ])
    const rawParams = Object.fromEntries(Object.entries(body).filter(([key]) => !special.has(key)))
    const queryParams = phase6NormalizeParams(action, rawParams)
    const validationError = phase6Validate(action, queryParams)
    if (validationError) return phase6Json({ success: false, error: validationError }, 400)

    if (PHASE6_APIBRASIL.has(action) && !Deno.env.get('APIBRASIL_API_TOKEN')) {
      return phase6Json({ success: false, error: 'Serviço de consulta não configurado' }, 503)
    }

    const inputHash = await phase6Sha256(JSON.stringify(phase6Canonical(queryParams)))
    const trustedUsageContext = isServiceRole && body.funcionaria_usage_context?.mode === 'funcionaria'
      ? body.funcionaria_usage_context
      : null
    const explicitKey = typeof body.idempotency_key === 'string' ? body.idempotency_key.trim().slice(0, 180) : ''
    const bucket = Math.floor(Date.now() / 300_000)
    idempotencyKey = explicitKey || (trustedUsageContext?.messageId
      ? `meta:${String(trustedUsageContext.messageId).slice(0,100)}:${action}:${inputHash.slice(0,24)}`
      : `legacy:${action}:${inputHash.slice(0,32)}:${bucket}`)

    const amountCents = PHASE6_PAID_COSTS[action] ?? null
    let paymentTransactionId = body.payment_transaction_id ? String(body.payment_transaction_id) : null

    // payment_confirmed do browser é apenas um sinal. A prova é o UUID exato + status bancário confirmado.
    if (amountCents !== null && paymentTransactionId) {
      let { data: pix } = await admin.from('pix_transactions')
        .select('id,company_id,amount_cents,purpose,status')
        .eq('id', paymentTransactionId).maybeSingle()
      if (!pix || pix.company_id !== companyId || pix.amount_cents !== amountCents || pix.purpose !== 'consulta_fee') {
        return phase6Json({ success: false, requires_payment: true, reason: 'payment_binding_invalid', amount_cents: amountCents, amount_brl: (amountCents/100).toFixed(2), idempotency_key: idempotencyKey }, 200)
      }
      if (pix.status !== 'confirmed') {
        const confirmRes = await fetch(`${supabaseUrl}/functions/v1/confirmar-pix-assistente`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${serviceRole}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ transaction_id: paymentTransactionId }),
          signal: AbortSignal.timeout(20_000),
        }).catch(() => null)
        if (confirmRes?.ok) {
          const reread = await admin.from('pix_transactions').select('status').eq('id', paymentTransactionId).maybeSingle()
          pix.status = reread.data?.status || pix.status
        }
      }
      if (pix.status !== 'confirmed') {
        return phase6Json({ success: false, requires_payment: true, reason: 'payment_not_confirmed', amount_cents: amountCents, amount_brl: (amountCents/100).toFixed(2), idempotency_key: idempotencyKey }, 200)
      }
    } else if (amountCents !== null && body.payment_confirmed === true) {
      // Não tenta adivinhar uma transação recente: isso poderia vincular o PIX de outro cliente.
      paymentTransactionId = null
    }

    const allowBalance = trustedUsageContext ? false : await phase6CanUseBalance(admin, req, company, isServiceRole)
    const billingMode = trustedUsageContext ? 'funcionaria_usage' : 'legacy'
    const documentValue = String(queryParams.cpf || queryParams.cnpj || queryParams.placa || queryParams.cep || '')
    const { data: prep, error: prepError } = await admin.rpc('funcionaria_prepare_consulta', {
      p_company_id: companyId,
      p_action: action,
      p_input_hash: inputHash,
      p_idempotency_key: idempotencyKey,
      p_document_last4: documentValue.replace(/\D/g,'').slice(-4) || documentValue.slice(-4),
      p_payment_transaction_id: paymentTransactionId,
      p_allow_balance: allowBalance,
      p_metadata: {
        phase: '6',
        channel: trustedUsageContext?.channel || 'web',
        message_id: trustedUsageContext?.messageId || null,
      },
      p_billing_mode: billingMode,
    })
    if (prepError) throw new Error(`Falha ao preparar consulta: ${prepError.message}`)

    operationId = prep?.operation_id || null
    if (prep?.cached === true) {
      return phase6Json({
        success: true,
        cached: true,
        result: prep.result,
        speech_text: prep.speech_text || '',
        resultado_formatado: formatarResultado(prep.result),
        idempotency_key: idempotencyKey,
      })
    }
    if (!prep?.ok) {
      if (prep?.requires_payment) {
        return phase6Json({
          success: false,
          requires_payment: true,
          reason: prep.reason || 'payment_required',
          amount_cents: prep.amount_cents ?? amountCents,
          amount_brl: ((prep.amount_cents ?? amountCents ?? 0) / 100).toFixed(2),
          current_balance_brl: prep.available_cents !== undefined ? (Number(prep.available_cents)/100).toFixed(2) : undefined,
          idempotency_key: idempotencyKey,
          operation_id: operationId,
        })
      }
      const status = prep?.reason === 'insufficient_credits' ? 402 : 409
      return phase6Json({ success: false, error: prep?.reason || 'Não foi possível reservar a consulta', ...prep, idempotency_key: idempotencyKey }, status)
    }

    // A partir daqui a reserva já existe. Marcamos ANTES de qualquer fetch dos handlers.
    providerStarted = true
    let result: any
    let speech_text = ''
    switch (action) {
      case 'consultar_cambio': ({ result, speech_text } = await handleCotacaoMoedas(queryParams)); break
      case 'consultar_cep': ({ result, speech_text } = await handleConsultarCEP(queryParams)); break
      case 'consultar_cnpj': ({ result, speech_text } = await handleConsultarCNPJ(queryParams)); break
      case 'consultar_cpf': ({ result, speech_text } = await handleConsultarCPF(queryParams)); break
      case 'restricoes_cpf': ({ result, speech_text } = await handleRestricoesCPF(queryParams)); break
      case 'restricoes_cnpj': ({ result, speech_text } = await handleRestricoesCNPJ(queryParams)); break
      case 'consultar_feriados': ({ result, speech_text } = await handleFeriadosNacionais(queryParams)); break
      case 'consultar_ddd': ({ result, speech_text } = await handleConsultarDDD(queryParams)); break
      case 'consultar_placa': ({ result, speech_text } = await handleConsultarPlaca(queryParams)); break
      case 'consultar_protestos': ({ result, speech_text } = await handleConsultarProtestos(queryParams)); break
      case 'dados_cpf': ({ result, speech_text } = await handleDadosCPF(queryParams)); break
      case 'dados_cnpj': ({ result, speech_text } = await handleDadosCNPJ(queryParams)); break
      case 'completa_cpf': ({ result, speech_text } = await handleCompletaCPF(queryParams)); break
      default: throw new Error('Ação não reconhecida')
    }

    const { data: completed, error: completeError } = await admin.rpc('funcionaria_complete_consulta', {
      p_operation_id: operationId,
      p_result: result,
      p_speech_text: speech_text,
      p_metadata: { provider_completed: true },
    })
    if (completeError || !completed?.ok) {
      try {
        await admin.rpc('funcionaria_mark_consulta_indeterminate', {
          p_operation_id: operationId,
          p_reason: 'provider_succeeded_finalize_failed',
          p_metadata: { detail: completeError?.message || completed?.reason || null },
        })
      } catch { /* best-effort */ }
    }

    // Histórico/log são best-effort e nunca disparam o provedor novamente.
    const resultadoFormatado = formatarResultado(result)
    try {
      const { error: historyError } = await admin.from('historico_consultas').insert({
        user_id: company.user_id,
        company_id: companyId,
        tipo_consulta: action,
        dados_entrada: { ...queryParams, phase6_input_hash: inputHash },
        resultado: result,
        custo: amountCents !== null ? amountCents / 100 : Number(prep?.credits_consumed || 0),
        status_pagamento: 'PAGO',
        cobranca_txid: paymentTransactionId || String(prep?.payment_method || 'CREDITO_RESERVADO').toUpperCase(),
        pdf_base64: null,
      })
      if (historyError) console.warn('[ferramentas-consultas phase6] histórico:', historyError.message)
      const { error: logError } = await admin.from('assistant_function_logs').insert({
        company_id: companyId,
        user_id: company.user_id,
        function_key: action,
        credits_consumed: Number(prep?.credits_consumed || 0),
        executed_at: new Date().toISOString(),
        metadata: { phase: '6', operation_id: operationId, idempotency_key: idempotencyKey, payment_method: prep?.payment_method || null },
      })
      if (logError) console.warn('[ferramentas-consultas phase6] log:', logError.message)
    } catch (logError) {
      console.warn('[ferramentas-consultas phase6] histórico/log best-effort:', logError)
    }

    return phase6Json({
      success: true,
      result,
      speech_text,
      resultado_formatado: resultadoFormatado,
      cached: false,
      idempotency_key: idempotencyKey,
      operation_id: operationId,
      billing_state: completeError || !completed?.ok ? 'indeterminate_finalize' : 'completed',
    })
  } catch (error: any) {
    console.error('[ferramentas-consultas phase6]', error)
    if (operationId) {
      const recoveryAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
      try {
        if (providerStarted) {
          await recoveryAdmin.rpc('funcionaria_mark_consulta_indeterminate', {
            p_operation_id: operationId,
            p_reason: 'provider_result_indeterminate',
            p_metadata: { message: String(error?.message || error).slice(0,160) },
          })
        } else {
          await recoveryAdmin.rpc('funcionaria_fail_consulta', {
            p_operation_id: operationId,
            p_reason: 'pre_provider_failure',
            p_metadata: { message: String(error?.message || error).slice(0,160) },
          })
        }
      } catch { /* best-effort */ }
    }
    return phase6Json({
      success: false,
      error: providerStarted
        ? 'Não foi possível concluir a consulta. Para evitar cobrança duplicada, ela não será repetida automaticamente.'
        : (error?.message || 'Erro ao realizar consulta'),
      reason: providerStarted ? 'provider_result_indeterminate' : 'pre_provider_failure',
      idempotency_key: idempotencyKey || undefined,
      operation_id: operationId || undefined,
    }, providerStarted ? 502 : 400)
  }
})


// ========================================
// FORMATAÇÃO DE RESULTADO (DO POUPEJA)
// ========================================
function formatarResultado(resultado: any): [string, string][] {
  const mapaDeLabels: Record<string, string> = {
    nome: 'Nome',
    mae: 'Nome da Mãe',
    data_nascimento: 'Nascimento',
    idade: 'Idade',
    sexo: 'Sexo',
    razao_social: 'Razão Social',
    nome_fantasia: 'Nome Fantasia',
    cnpj: 'CNPJ',
    cpf: 'CPF',
    situacao_cadastral: 'Situação Cadastral',
    situacao: 'Situação',
    data_inicio_atividades: 'Início das Atividades',
    cnae_descricao: 'CNAE (Descrição)',
    capital_social: 'Capital Social',
    logradouro: 'Logradouro',
    numero: 'Número',
    complemento: 'Complemento',
    bairro: 'Bairro',
    cep: 'CEP',
    municipio: 'Município',
    municipio_descricao: 'Município',
    localidade: 'Localidade',
    uf: 'UF',
    correio_eletronico: 'E-mail',
    email: 'E-mail',
    telefone: 'Telefone',
    ddd1: 'DDD 1',
    telefone1: 'Telefone 1',
    state: 'Estado',
    cities: 'Cidades',
    cidades: 'Cidades',
    date: 'Data',
    data: 'Data',
    type: 'Tipo',
    tipo: 'Tipo',
    status: 'Status',
    data_nascimento_fundacao: 'Nascimento / Fundação',
    situacao_receita: 'Situação na Receita',
    tipo_pessoa: 'Tipo de Pessoa',
    observacoes: 'Observações',
    titulo: 'Título',
    probabilidade_inadimplencia: 'Prob. de Inadimplência',
    risco: 'Risco',
    score: 'Score',
    credor: 'Credor',
    data_inclusao: 'Data de Inclusão',
    data_vencimento: 'Data de Vencimento',
    modalidade: 'Modalidade',
    origem: 'Origem',
    descricao: 'Descrição',
    restricoes: 'Restrições',
    total_restricoes: 'Total de Restrições',
    digito_verificador: 'Dígito Verificador',
    currency: 'Moeda',
    name: 'Nome',
    bid: 'Compra',
    ask: 'Venda',
    variation: 'Variação',
    timestamp: 'Data/Hora',
    ano: 'Ano',
    total: 'Total',
    feriados: 'Feriados',
    ddd: 'DDD',
    estado: 'Estado',
    consta_protestos: 'Consta Protestos',
    protestos_situacao: 'Protestos',
    total_protestos: 'Total de Protestos',
    valor_total_protestos: 'Valor Total Protestos',
    possui_pendencias: 'Possui Pendências',
    pendencias_situacao: 'Pendências Tributárias',
    total_pendencias: 'Total de Pendências',
    data_consulta: 'Data da Consulta',
    nome_empresarial: 'Nome Empresarial',
    situacao_simples_nacional: 'Simples Nacional',
    situacao_simei: 'SIMEI',
    cartorio: 'Cartório',
    situacao: 'Situação',
  };

  if (!resultado) return [];
  const formatado: [string, string][] = [];

  const processarObjeto = (obj: any) => {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== null && obj[key] !== undefined) {
        const valor = obj[key];
        const label = mapaDeLabels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

        if (Array.isArray(valor) && valor.length > 0) {
          if (typeof valor[0] === 'object') {
            valor.forEach((item) => {
              formatado.push(['---', `--- ${label} ---`]);
              processarObjeto(item);
            });
          } else {
            formatado.push([label, valor.join(', ')]);
          }
        } else if (typeof valor === 'object' && !Array.isArray(valor)) {
          formatado.push(['---', `--- ${label} ---`]);
          processarObjeto(valor);
        } else if (typeof valor !== 'object' && String(valor).trim() !== '') {
          formatado.push([label, String(valor)]);
        }
      }
    }
  };

  processarObjeto(resultado);
  return formatado;
}

function gerarPDFProfissional(tipoConsulta: string, resultadoFormatado: [string, string][]) {
  return new Promise((resolve) => {
    const chunks: Uint8Array[] = [];
    const doc = new PDFDocument();
    
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => {
      const buffer = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
      let offset = 0;
      for (const chunk of chunks) {
        buffer.set(chunk, offset);
        offset += chunk.length;
      }
      const base64 = btoa(String.fromCharCode(...buffer));
      resolve(base64);
    });
    
    doc.fontSize(18).text('Relatório de Consulta', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`Tipo: ${tipoConsulta}`);
    doc.moveDown();
    
    resultadoFormatado.forEach(([campo, valor]) => {
      doc.fontSize(12).text(`${campo}: ${valor}`);
    });
    
    doc.end();
  });
}

// ========================================
// CONSULTAR PLACA (API BRASIL - PAGA)
// ========================================
async function handleConsultarPlaca(params: any) {
  const { placa } = params;

  if (!placa) {
    throw new Error('placa é obrigatório');
  }

  const placaLimpa = placa.toUpperCase().replace(/[^A-Z0-9]/g, '');

  const response = await handleAPIBrasil(
    '/consulta/veiculos/credits',
    { tipo: 'agregados-propria', placa: placaLimpa, homolog: false },
    'Placa'
  );

  console.log('[PLACA] Resposta completa:', JSON.stringify(response));

  // Dados ficam em response.data — ignorar user/balance/message da conta
  const d = response.data || {};

  // Extrair especificações técnicas (consumo, desempenho, dimensões, etc.)
  const especificacoes: Record<string, string> = {};
  if (Array.isArray(d.especificacoes) && d.especificacoes.length > 0) {
    const informacoes = d.especificacoes[0]?.informacoes || [];
    for (const grupo of informacoes) {
      for (const [categoria, itens] of Object.entries(grupo)) {
        if (Array.isArray(itens)) {
          for (const item of itens as any[]) {
            if (item.descricao && item.valor) {
              especificacoes[item.descricao] = String(item.valor);
            }
          }
        }
      }
    }
  }

  const result: Record<string, any> = {
    placa: d.placa || placaLimpa,
    placa_mercosul: d.placaMercosul || '',
    chassi: d.chassi || '',
    fabricante: d.fabricante || '',
    marca: d.marca || '',
    modelo: d.modelo || '',
    versao: d.versao || '',
    ano_fabricacao: d.ano_fabricacao || '',
    ano_modelo: d.ano_modelo || '',
    combustivel: d.combustivel || '',
    tipo_veiculo: d.tipo_veiculo || '',
    cor: d.cor || '',
    nacionalidade: d.nacionalidade || '',
    numero_motor: d.numero_motor || '',
    potencia: d.potencia ? `${d.potencia} cv` : '',
    cilindradas: d.cilindradas || '',
    quantidade_portas: d.quantidade_portas || '',
    quantidade_eixos: d.quantidade_eixo || '',
    capacidade_max_tracao: d.capacidade_max_tracao || '',
    peso_bruto_total: d.peso_bruto_total || '',
    tipo_carroceria: d.tipo_carroceria || '',
    especie: d.especie || '',
    pais_fabricacao: d.pais_fabricacao || '',
    tipo_faturado: d.tipo_faturado || '',
    uf_faturado: d.uf_faturado || '',
    ...especificacoes,
  };

  // Remover campos vazios
  for (const key of Object.keys(result)) {
    if (result[key] === '' || result[key] === null || result[key] === undefined) {
      delete result[key];
    }
  }

  const speech_text = `Veículo ${result.marca} ${result.modelo} ${result.versao}, ano ${result.ano_modelo}. Cor: ${result.cor}.`;

  return { result, speech_text };
}

// ========================================
// CONSULTAR PROTESTOS (API BRASIL - PAGA)
// ========================================
async function handleConsultarProtestos(params: any) {
  const { cpf } = params;

  if (!cpf) throw new Error('cpf é obrigatório');

  const cleanCpf = cpf.replace(/\D/g, '');
  if (!validateCPF(cleanCpf)) throw new Error('CPF inválido');

  // handleAPIBrasil lança erro se error===true, então tratamos aqui diretamente
  const token = Deno.env.get('APIBRASIL_API_TOKEN');
  if (!token) throw new Error('Token da API Brasil não configurado.');

  const response = await fetch('https://gateway.apibrasil.io/api/v2/consulta/cpf/credits', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ cpf: cleanCpf, tipo: 'protestos-nacional-base', homolog: false }),
  });

  const apiResult = await response.json();

  console.log('[PROTESTOS] Resposta completa:', JSON.stringify(apiResult));

  // A API retorna error:true quando não encontra dados — tratamos como "sem protestos"
  const d = apiResult.data || {};
  const semDados = apiResult.error === true || !apiResult.data;

  const protestos = semDados ? [] : (d.protestos || []).map((p: any) => ({
    cartorio: p.cartorio || '',
    data: p.data || '',
    valor: p.valor || '',
    situacao: p.situacao || '',
  }));

  const pendencias = semDados ? [] : (d.pendencias || []).map((p: any) => ({
    tipo: p.tipo || '',
    descricao: p.descricao || '',
    valor: p.valor || '',
  }));

  const result = {
    cpf: semDados ? formatCPF(cleanCpf) : (d.documentoConsultado || formatCPF(cleanCpf)),
    nome: semDados ? 'N/A' : (d.nome || 'N/A'),
    nome_empresarial: semDados ? '' : (d.nomeEmpresarial || ''),
    data_consulta: semDados ? new Date().toLocaleString('pt-BR') : (d.dataConsulta || ''),
    consta_protestos: semDados ? false : (d.constamProtestos || false),
    protestos_situacao: (semDados || !d.constamProtestos) ? 'Nada Consta' : `${d.totalNumProtestos} protesto(s) — Total: R$ ${d.valorTotalProtestos}`,
    total_protestos: semDados ? 0 : (d.totalNumProtestos || 0),
    valor_total_protestos: semDados ? '0,00' : (d.valorTotalProtestos || '0,00'),
    possui_pendencias: semDados ? false : (d.possuiPendencias || false),
    pendencias_situacao: (semDados || !d.possuiPendencias) ? 'Nada Consta' : `${d.totalPendencias} pendência(s)`,
    total_pendencias: semDados ? 0 : (d.totalPendencias || 0),
    status: semDados ? 'Nenhum protesto ou pendência encontrado.' : (d.status || ''),
    observacoes: semDados ? '' : (d.observacoes || ''),
    protestos,
    pendencias,
    situacao_simples_nacional: semDados ? '' : (d.situacaoSimplesNacional || ''),
    situacao_simei: semDados ? '' : (d.situacaoSIMEI || ''),
  };

  const partes = [];
  if (result.consta_protestos) {
    partes.push(`${result.total_protestos} protesto(s) totalizando R$ ${result.valor_total_protestos}`);
  } else {
    partes.push('nenhum protesto encontrado');
  }
  if (result.possui_pendencias) {
    partes.push(`${result.total_pendencias} pendência(s) tributária(s)`);
  }

  const speech_text = result.nome !== 'N/A'
    ? `${result.nome}: ${partes.join(' e ')}.`
    : `CPF ${result.cpf}: ${partes.join(' e ')}.`;

  return { result, speech_text };
}

// ========================================
// COMPLETA CPF (Dados + Restrições + Protestos)
// ========================================
async function handleCompletaCPF(params: any) {
  const { cpf } = params;
  if (!cpf) throw new Error('cpf é obrigatório');

  const [dados, restricoes, protestos] = await Promise.all([
    handleDadosCPF(params),
    handleRestricoesCPF(params),
    handleConsultarProtestos(params),
  ]);

  const result = {
    dados: dados.result,
    restricoes: restricoes.result,
    protestos: protestos.result,
  };

  const speech_text = `${dados.speech_text} ${restricoes.speech_text} ${protestos.speech_text}`;

  return { result, speech_text };
}

// ========================================
// COTAÇÃO DE MOEDAS (Frankfurter BCE + CoinGecko para BTC)
// ========================================
async function handleCotacaoMoedas(params: any) {
  const { currency } = params;

  if (!currency) {
    throw new Error('currency é obrigatório');
  }

  // Bitcoin via CoinGecko (gratuito, sem chave)
  if (currency === 'BTC') {
    const apiUrl = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=brl&include_24hr_change=true';
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error('Falha ao consultar cotação do Bitcoin');
    }

    const data = await response.json();
    const rate = data?.bitcoin?.brl;
    const change = data?.bitcoin?.brl_24h_change;

    if (!rate) throw new Error('Bitcoin não encontrado');

    const result = {
      currency: 'BTC',
      name: 'Bitcoin/BRL',
      bid: rate.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      ask: rate.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      variation: change ? `${change.toFixed(2)}%` : 'N/A',
      timestamp: new Date().toLocaleDateString('pt-BR'),
    };

    const speech_text = `Bitcoin: R$ ${result.bid}. Variação 24h: ${result.variation}.`;
    return { result, speech_text };
  }

  // Demais moedas via Frankfurter (Banco Central Europeu)
  const apiUrl = `https://api.frankfurter.app/latest?from=${currency}&to=BRL`;
  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new Error('Falha ao consultar cotação');
  }

  const data = await response.json();

  if (!data.rates?.BRL) {
    throw new Error('Moeda não encontrada');
  }

  const rate = data.rates.BRL;

  const result = {
    currency: currency,
    name: `${currency}/BRL`,
    bid: rate.toFixed(4),
    ask: rate.toFixed(4),
    variation: 'N/A',
    timestamp: new Date(data.date).toLocaleDateString('pt-BR'),
  };

  const speech_text = `${result.name}: R$ ${result.bid}. Data: ${result.timestamp}.`;
  return { result, speech_text };
}

// ========================================
// CONSULTAR CEP (ViaCEP - GRATUITA)
// ========================================
async function handleConsultarCEP(params: any) {
  const { cep } = params;

  if (!cep) {
    throw new Error('cep é obrigatório');
  }

  const cleanCep = cep.replace(/\D/g, '');
  const apiUrl = `${VIACEP_API_URL}/${cleanCep}/json/`;
  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new Error('Falha ao consultar CEP');
  }

  const data = await response.json();

  if (data.erro) {
    throw new Error('CEP não encontrado');
  }

  const result = {
    cep: data.cep,
    logradouro: data.logradouro || '',
    complemento: data.complemento || '',
    bairro: data.bairro || '',
    localidade: data.localidade || '',
    uf: data.uf || '',
  };

  const speech_text = `CEP ${result.cep}: ${result.logradouro}, ${result.bairro}, ${result.localidade} - ${result.uf}.`;

  return { result, speech_text };
}

// ========================================
// CONSULTAR CNPJ (ReceitaWS - GRATUITA)
// ========================================
async function handleConsultarCNPJ(params: any) {
  const { cnpj } = params;

  if (!cnpj) {
    throw new Error('cnpj é obrigatório');
  }

  const cleanCnpj = cnpj.replace(/\D/g, '');

  // Validar CNPJ
  if (!validateCNPJ(cleanCnpj)) {
    throw new Error('CNPJ inválido');
  }

  const apiUrl = `${RECEITAWS_API_URL}/cnpj/${cleanCnpj}`;
  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new Error('Falha ao consultar CNPJ');
  }

  const data = await response.json();

  if (data.status === 'ERROR') {
    throw new Error(data.message || 'CNPJ não encontrado');
  }

  const result = {
    cnpj: data.cnpj,
    razao_social: data.nome || '',
    nome_fantasia: data.fantasia || '',
    situacao: data.situacao || '',
    abertura: data.abertura || '',
    capital_social: data.capital_social || '',
    logradouro: data.logradouro || '',
    numero: data.numero || '',
    bairro: data.bairro || '',
    municipio: data.municipio || '',
    uf: data.uf || '',
    cep: data.cep || '',
    telefone: data.telefone || '',
    email: data.email || '',
  };

  const speech_text = `${result.razao_social}, CNPJ ${result.cnpj}. Situação: ${result.situacao}.`;

  return { result, speech_text };
}

// ========================================
// CONSULTAR CPF (Mock - Validação básica)
// ========================================
async function handleConsultarCPF(params: any) {
  const { cpf } = params;

  if (!cpf) {
    throw new Error('cpf é obrigatório');
  }

  const cleanCpf = cpf.replace(/\D/g, '');
  const isValid = validateCPF(cleanCpf);

  if (!isValid) {
    throw new Error('CPF inválido');
  }

  const result = {
    cpf: formatCPF(cleanCpf),
    nome: 'CONSULTA LIMITADA - USE API OFICIAL PARA DADOS COMPLETOS',
    data_nascimento: 'N/A',
    situacao: isValid ? 'REGULAR' : 'IRREGULAR',
    digito_verificador: cleanCpf.slice(-2),
  };

  const speech_text = `CPF ${result.cpf}. Situação: ${result.situacao}. Nota: Esta é uma validação básica.`;

  return { result, speech_text };
}

// ========================================
// RESTRIÇÕES CPF (API BRASIL - PAGA)
// ========================================
async function handleRestricoesCPF(params: any) {
  const { cpf } = params;

  if (!cpf) {
    throw new Error('cpf é obrigatório');
  }

  const cleanCpf = cpf.replace(/\D/g, '');

  // Validar CPF
  if (!validateCPF(cleanCpf)) {
    throw new Error('CPF inválido');
  }

  // Chamar API Brasil - Quod Restrições PF
  const endpoint = '/quod/cpf/credits';
  const body = {
    cpf: cleanCpf,
    tipo: 'quod-restricao-pf',
    homolog: false
  };

  const response = await handleAPIBrasil(endpoint, body, 'Restrições CPF (Quod)');

  console.log('[RESTRICOES CPF] Resposta completa:', JSON.stringify(response));

  // ✅ CORREÇÃO FINAL: Dados vêm dentro de response.data
  const data = response.data || {};

  // Extrair restrições de todas as categorias
  const restricoes = [];

  // Protestos
  if (data.protestos && parseInt(data.protestos.quantidade_ocorrencia) > 0) {
    restricoes.push({
      tipo: 'Protestos',
      quantidade: data.protestos.quantidade_ocorrencia,
      valor_total: data.protestos.valor_total,
      data_primeiro: data.protestos.data_primeiro,
      data_ultimo: data.protestos.data_ultimo,
    });
  }

  // Pendências Financeiras
  if (data.pend_financeiras && parseInt(data.pend_financeiras.quantidade_ocorrencia) > 0) {
    restricoes.push({
      tipo: 'Pendências Financeiras',
      quantidade: data.pend_financeiras.quantidade_ocorrencia,
      valor_total: data.pend_financeiras.valor_total,
      data_primeiro: data.pend_financeiras.data_primeiro,
      provedores: data.pend_financeiras.provedores?.map((p: any) => p.provedor).join(', ') || '',
    });
  }

  // Pendências Vencidas
  if (data.pend_vencidas && parseInt(data.pend_vencidas.quantidade_ocorrencia) > 0) {
    restricoes.push({
      tipo: 'Pendências Vencidas',
      quantidade: data.pend_vencidas.quantidade_ocorrencia,
      valor_total: data.pend_vencidas.valor_total,
      ultimo_vencimento: data.pend_vencidas.ultimo_vencimento,
    });
  }

  // Pendências Refin
  if (data.pend_refin && parseInt(data.pend_refin.quantidade_ocorrencia) > 0) {
    restricoes.push({
      tipo: 'Pendências Refin',
      quantidade: data.pend_refin.quantidade_ocorrencia,
      valor_total: data.pend_refin.valor_total,
    });
  }

  // Ações Cíveis
  if (data.acoes_civeis && parseInt(data.acoes_civeis.quantidade_ocorrencia) > 0) {
    restricoes.push({
      tipo: 'Ações Cíveis',
      quantidade: data.acoes_civeis.quantidade_ocorrencia,
      valor_total: data.acoes_civeis.valor_total,
    });
  }

  // Cheques sem Fundos
  if (data.ch_sem_fundos_bacen && parseInt(data.ch_sem_fundos_bacen.quantidade_ocorrencia) > 0) {
    restricoes.push({
      tipo: 'Cheques sem Fundos (Bacen)',
      quantidade: data.ch_sem_fundos_bacen.quantidade_ocorrencia,
      correntista: data.ch_sem_fundos_bacen.correntista,
    });
  }

  const totalRestricoes = restricoes.length;
  const status = totalRestricoes > 0 ? 'PENDÊNCIAS ENCONTRADAS' : 'LIMPO';

  // ✅ Buscar PDF da API na edge (evita CORS no frontend)
  let pdf_base64: string | null = null;
  if (data.pdf) {
    try {
      const pdfRes = await fetch(data.pdf);
      const arrayBuffer = await pdfRes.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      pdf_base64 = `data:application/pdf;base64,${btoa(binary)}`;
    } catch (e) {
      console.error('[RESTRICOES CPF] Falha ao buscar PDF:', e);
    }
  }

  const result = {
    cpf: formatCPF(cleanCpf),
    status: status,
    total_restricoes: totalRestricoes,
    restricoes: restricoes,
    pdf_base64: pdf_base64,
  };

  const speech_text =
    totalRestricoes > 0
      ? `CPF com ${totalRestricoes} tipo(s) de restrição encontrado(s).`
      : `CPF sem restrições encontradas.`;

  return { result, speech_text };
}

// ========================================
// RESTRIÇÕES CNPJ (API BRASIL - PAGA)
// ========================================
async function handleRestricoesCNPJ(params: any) {
  const { cnpj, cpf_socio } = params;

  if (!cnpj) {
    throw new Error('cnpj é obrigatório');
  }

  const cleanCnpj = cnpj.replace(/\D/g, '');
  const cleanCpfSocio = cpf_socio ? cpf_socio.replace(/\D/g, '') : '';

  // Validar CPF do sócio se fornecido
  if (cleanCpfSocio && !validateCPF(cleanCpfSocio)) {
    throw new Error('CPF do sócio inválido');
  }

  // Chamar API Brasil - Quod Restrições PJ
  const endpoint = '/quod/cnpj/credits';
  const body = {
    cnpj: cleanCnpj,
    cpf: cleanCpfSocio,
    tipo: 'quod-restricao-pj',
    homolog: false
  };

  const response = await handleAPIBrasil(endpoint, body, 'Restrições CNPJ (Quod)');

  console.log('[RESTRICOES CNPJ] Resposta completa:', JSON.stringify(response));

  // ✅ CORREÇÃO FINAL: Dados vêm dentro de response.data
  const data = response.data || {};

  // Extrair restrições de todas as categorias
  const restricoes = [];

  if (data.protestos && parseInt(data.protestos.quantidade_ocorrencia) > 0) {
    restricoes.push({
      tipo: 'Protestos',
      quantidade: data.protestos.quantidade_ocorrencia,
      valor_total: data.protestos.valor_total,
    });
  }

  if (data.pend_financeiras && parseInt(data.pend_financeiras.quantidade_ocorrencia) > 0) {
    restricoes.push({
      tipo: 'Pendências Financeiras',
      quantidade: data.pend_financeiras.quantidade_ocorrencia,
      valor_total: data.pend_financeiras.valor_total,
    });
  }

  if (data.pend_vencidas && parseInt(data.pend_vencidas.quantidade_ocorrencia) > 0) {
    restricoes.push({
      tipo: 'Pendências Vencidas',
      quantidade: data.pend_vencidas.quantidade_ocorrencia,
      valor_total: data.pend_vencidas.valor_total,
    });
  }

  if (data.acoes_civeis && parseInt(data.acoes_civeis.quantidade_ocorrencia) > 0) {
    restricoes.push({
      tipo: 'Ações Cíveis',
      quantidade: data.acoes_civeis.quantidade_ocorrencia,
      valor_total: data.acoes_civeis.valor_total,
    });
  }

  const totalRestricoes = restricoes.length;
  const status = totalRestricoes > 0 ? 'PENDÊNCIAS ENCONTRADAS' : 'LIMPO';

  // ✅ Buscar PDF da API na edge (evita CORS no frontend)
  let pdf_base64: string | null = null;
  if (data.pdf) {
    try {
      const pdfRes = await fetch(data.pdf);
      const arrayBuffer = await pdfRes.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      pdf_base64 = `data:application/pdf;base64,${btoa(binary)}`;
    } catch (e) {
      console.error('[RESTRICOES CNPJ] Falha ao buscar PDF:', e);
    }
  }

  const result = {
    cnpj: formatCNPJ(cleanCnpj),
    status: status,
    total_restricoes: totalRestricoes,
    restricoes: restricoes,
    pdf_base64: pdf_base64,
  };

  const speech_text =
    totalRestricoes > 0
      ? `CNPJ com ${totalRestricoes} tipo(s) de restrição encontrado(s).`
      : `CNPJ sem restrições encontradas.`;

  return { result, speech_text };
}

// ========================================
// FERIADOS NACIONAIS (BrasilAPI - GRATUITA)
// ========================================
async function handleFeriadosNacionais(params: any) {
  const { ano } = params;

  if (!ano) {
    throw new Error('ano é obrigatório');
  }

  const apiUrl = `${BRASIL_API_BASE_URL}/feriados/v1/${ano}`;
  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new Error('Falha ao consultar feriados');
  }

  const data = await response.json();

  const feriados = data.map((f: any) => ({
    data: new Date(f.date).toLocaleDateString('pt-BR'),
    nome: f.name,
    tipo: f.type === 'national' ? 'Nacional' : 'Facultativo',
  }));

  const result = {
    ano,
    total: feriados.length,
    feriados,
  };

  const speech_text = `${feriados.length} feriados nacionais em ${ano}.`;

  return { result, speech_text };
}

// ========================================
// CONSULTAR DDD (BrasilAPI - GRATUITA)
// ========================================
async function handleConsultarDDD(params: any) {
  const { ddd } = params;

  if (!ddd) {
    throw new Error('ddd é obrigatório');
  }

  const cleanDdd = ddd.replace(/\D/g, '');
  const apiUrl = `${BRASIL_API_BASE_URL}/ddd/v1/${cleanDdd}`;
  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new Error('DDD não encontrado');
  }

  const data = await response.json();

  const result = {
    ddd: cleanDdd,
    estado: data.state,
    uf: data.state,
    cidades: data.cities || [],
  };

  const speech_text = `DDD ${cleanDdd}: ${result.estado}. ${result.cidades.length} cidades atendidas.`;

  return { result, speech_text };
}

// ========================================
// API BRASIL (PAGA) - PARA CONSULTAS PREMIUM
// ========================================
async function handleAPIBrasil(endpoint: string, body: any, consultaNome: string) {
  const token = Deno.env.get('APIBRASIL_API_TOKEN');

  if (!token) {
    throw new Error('Token da API Brasil não configurado');
  }

  const APIBRASIL_GATEWAY_URL = 'https://gateway.apibrasil.io/api/v2';

  console.log(`[API BRASIL] Enviando para ${endpoint}: ${JSON.stringify(body)}`);

  const response = await fetch(`${APIBRASIL_GATEWAY_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const resultado = await response.json();

  if (!response.ok || resultado.error === true) {
    console.error(`[API BRASIL] Erro na resposta: ${JSON.stringify(resultado)}`);
    throw new Error(`Falha na consulta de ${consultaNome}. Status: ${response.status}`);
  }

  return resultado;
}

// ========================================
// DADOS CPF (API BRASIL - PAGA)
// ========================================
async function handleDadosCPF(params: any) {
  const { cpf } = params;
  if (!cpf) throw new Error('cpf é obrigatório');

  const cleanCpf = cpf.replace(/\D/g, '');
  if (!validateCPF(cleanCpf)) throw new Error('CPF inválido');

  const data = await handleAPIBrasil(
    '/consulta/cpf/credits',
    { tipo: 'cpf-lite', cpf: cleanCpf, homolog: false },
    'Dados CPF'
  );

  console.log('[DADOS CPF] Resposta completa:', JSON.stringify(data));

  const d = data.data || data;

  const result = {
    cpf: formatCPF(cleanCpf),
    nome: d.nome || 'N/A',
    nome_mae: d.nome_mae || 'N/A',
    data_nascimento: d.data_nascimento || 'N/A',
    idade: d.idade || 'N/A',
    situacao: d.situacao || d.status || 'N/A',
    sexo: d.sexo || 'N/A',
  };

  const speech_text = `CPF ${result.cpf}. Nome: ${result.nome}. Situação: ${result.situacao}.`;
  return { result, speech_text };
}

// ========================================
// DADOS CNPJ (ReceitaWS - GRATUITA)
// ========================================
async function handleDadosCNPJ(params: any) {
  const { cnpj } = params;
  if (!cnpj) throw new Error('cnpj é obrigatório');

  const cleanCnpj = cnpj.replace(/\D/g, '');
  if (!validateCNPJ(cleanCnpj)) throw new Error('CNPJ inválido');

  const response = await fetch(`https://www.receitaws.com.br/v1/cnpj/${cleanCnpj}`);
  if (!response.ok) throw new Error('Falha ao consultar CNPJ');

  const data = await response.json();
  if (data.status === 'ERROR') throw new Error(data.message || 'CNPJ não encontrado');

  const result = {
    cnpj: data.cnpj,
    razao_social: data.nome || '',
    nome_fantasia: data.fantasia || '',
    situacao: data.situacao || '',
    abertura: data.abertura || '',
    capital_social: data.capital_social || '',
    logradouro: data.logradouro || '',
    numero: data.numero || '',
    bairro: data.bairro || '',
    municipio: data.municipio || '',
    uf: data.uf || '',
    cep: data.cep || '',
    telefone: data.telefone || '',
    email: data.email || '',
  };

  const speech_text = `${result.razao_social}, CNPJ ${result.cnpj}. Situação: ${result.situacao}.`;
  return { result, speech_text };
}

// ========================================
// FUNÇÕES AUXILIARES
// ========================================
function validateCPF(cpf: string): boolean {
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  let remainder;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(10, 11))) return false;

  return true;
}

function formatCPF(cpf: string): string {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function formatCNPJ(cnpj: string): string {
  return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

function validateCNPJ(cnpj: string): boolean {
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  let length = cnpj.length - 2;
  let numbers = cnpj.substring(0, length);
  const digits = cnpj.substring(length);
  let sum = 0;
  let pos = length - 7;

  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;

  length += 1;
  numbers = cnpj.substring(0, length);
  sum = 0;
  pos = length - 7;

  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;

  return true;
}