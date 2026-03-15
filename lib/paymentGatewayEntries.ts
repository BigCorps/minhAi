/**
 * paymentGatewayEntries.ts
 *
 * Cole estas duas entradas no FUNCTIONS_REGISTRY (functions-registry.ts),
 * ANTES das entradas tef_debito / tef_credito / nfc_debito / nfc_credito.
 *
 * Lógica de roteamento:
 *   • Só TEF habilitado   → usa TEF direto (sem perguntar)
 *   • Só NFC habilitado   → usa NFC direto (sem perguntar)
 *   • Ambos habilitados   → pergunta qual o cliente prefere
 *   • Nenhum habilitado   → informa que não está disponível
 *
 * Os triggers genéricos ("débito", "crédito", "cartão", etc.) ficam AQUI.
 * As funções tef_debito / nfc_debito devem manter apenas triggers específicos
 * ("tef débito", "nfc débito", "tap débito", etc.) para não conflitar.
 */

import { createClient } from '@/lib/supabase-browser'
import type { FunctionDefinition } from './functions-registry'   // ajuste o caminho se necessário

// ─── Helper: quais funções de pagamento estão habilitadas ────────────────────

async function getEnabledPaymentKeys(companyId: string, keys: string[]): Promise<Set<string>> {
  const supabase = createClient()
  const { data } = await supabase
    .from('company_function_settings')
    .select('function_key, is_enabled')
    .eq('company_id', companyId)
    .in('function_key', keys)

  const enabled = new Set<string>()
  for (const row of data ?? []) {
    if (row.is_enabled) enabled.add(row.function_key)
  }
  return enabled
}

// ─── Helper: extrair valor do transcript ────────────────────────────────────

function extractAmountCents(transcript: string): number | null {
  const wordMap: Record<string, string> = {
    'zero': '0', 'um': '1', 'uma': '1', 'dois': '2', 'duas': '2',
    'três': '3', 'tres': '3', 'quatro': '4', 'cinco': '5', 'seis': '6',
    'sete': '7', 'oito': '8', 'nove': '9', 'dez': '10', 'onze': '11',
    'doze': '12', 'treze': '13', 'quatorze': '14', 'quinze': '15',
    'dezesseis': '16', 'dezessete': '17', 'dezoito': '18', 'dezenove': '19',
    'vinte': '20', 'trinta': '30', 'quarenta': '40', 'cinquenta': '50',
    'sessenta': '60', 'setenta': '70', 'oitenta': '80', 'noventa': '90',
    'cem': '100', 'cento': '100', 'duzentos': '200', 'trezentos': '300',
    'quatrocentos': '400', 'quinhentos': '500', 'mil': '1000',
  }
  let t = transcript.toLowerCase()
  for (const [word, num] of Object.entries(wordMap)) {
    t = t.replace(new RegExp(`\\b${word}\\b`, 'gi'), num)
  }
  const match = t.match(/(\d+(?:[.,]\d{1,2})?)/)
  if (!match) return null
  const value = parseFloat(match[1].replace(',', '.'))
  return isNaN(value) || value <= 0 ? null : Math.round(value * 100)
}

// ─── Helper: buscar config de parcelamento TEF crédito ───────────────────────

async function getTefCreditoSettings(companyId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('company_function_settings')
    .select('config')
    .eq('company_id', companyId)
    .eq('function_key', 'tef_credito')
    .single()
  return {
    maxInstallments: data?.config?.max_installments ?? 12,
    minInstallmentValueCents: data?.config?.min_installment_value_cents ?? 0,
    installmentsCost: data?.config?.installments_cost ?? 'seller',
  }
}

// ─── Gateway Débito ──────────────────────────────────────────────────────────

export const cobrar_debito: FunctionDefinition = {
  functionKey: 'cobrar_debito',
  functionName: 'Cobrar no Débito',
  category: 'payment',
  responseType: 'voice+modal',

  // Triggers genéricos — sem "tef", "nfc" ou "tap"
  voiceTriggers: [
    'cobrar no débito',
    'cobrar no debito',
    'cobrança no débito',
    'cobranca no debito',
    'pagar no débito',
    'pagar no debito',
    'débito',
    'debito',
    'cartão de débito',
    'cartao de debito',
    'passar no débito',
    'passar no debito',
  ],

  examplePhrases: [
    'Cobrar 50 reais no débito',
    'Pagar no débito',
    'Cartão de débito de R$ 80',
  ],

  requiresInput: true,
  inputType: 'number',
  inputPrompt: 'Qual o valor para o pagamento no débito?',

  description: 'Gateway genérico: roteia débito para TEF ou NFC conforme funções habilitadas.',
  shortDescription: 'Cobrar no débito',
  icon: '💳',
  color: '#F44336',

  saveToHistory: true,
  creditsPerUse: 1,
  requiresPayment: true,
  isPremium: false,

  handler: async ({ transcript, playText, setActiveModal, companyId }) => {
    const enabled = await getEnabledPaymentKeys(companyId, ['tef_debito', 'nfc_debito'])
    const hasTef = enabled.has('tef_debito')
    const hasNfc = enabled.has('nfc_debito')
    const amount = extractAmountCents(transcript ?? '')

    // ── Nenhum habilitado ──────────────────────────────────────────────────
    if (!hasTef && !hasNfc) {
      await playText(
        'A função de pagamento no débito não está disponível no momento. ' +
        'Entre em contato com o suporte para ativar esta função.'
      )
      return false
    }

    // ── Apenas TEF habilitado ──────────────────────────────────────────────
    if (hasTef && !hasNfc) {
      const supabase = createClient()
      const { data: company } = await supabase
        .from('companies')
        .select('mp_access_token, mp_terminal_id')
        .eq('id', companyId)
        .single()

      if (!company?.mp_access_token || !company?.mp_terminal_id) {
        await playText(
          'A maquininha Mercado Pago não está configurada. ' +
          'Configure o Access Token e o Terminal ID no painel.'
        )
        return false
      }

      await playText(
        amount
          ? `Preparando cobrança de ${(amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} no débito na maquininha.`
          : 'Abrindo cobrança por débito na maquininha. Informe o valor.'
      )

      setActiveModal?.({
        type: 'MercadoPagoPointDisplay',
        data: {
          companyId,
          paymentType: 'debit_card',
          initialAmount: amount ?? undefined,
        },
      })
      return true
    }

    // ── Apenas NFC habilitado ──────────────────────────────────────────────
    if (!hasTef && hasNfc) {
      if (!amount) {
        await playText('Por favor, informe o valor para o pagamento no débito.')
        return false
      }

      await playText(
        `Preparando pagamento de ${(amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} no débito via NFC.`
      )

      setActiveModal?.({
        type: 'InfinitePayDisplay',
        data: {
          companyId,
          tipo: 'NFC',
          nfc_payment_method: 'debit',
          amount_cents: amount,
        },
      })
      return true
    }

    // ── Ambos habilitados → perguntar ──────────────────────────────────────
    await playText(
      'Você tem duas opções para débito: ' +
      'a maquininha Point do Mercado Pago, ou o pagamento por aproximação NFC. ' +
      'Qual prefere? Diga "maquininha" ou "aproximação".'
    )

    // Registrar contexto para capturar a resposta na próxima fala
    if (typeof window !== 'undefined') {
      (window as any).eAi_pendingPaymentChoice = {
        mode: 'debit',
        amount,
        companyId,
        expiresAt: Date.now() + 30_000,
      }
    }

    return true
  },
}

// ─── Gateway Crédito ─────────────────────────────────────────────────────────

export const cobrar_credito: FunctionDefinition = {
  functionKey: 'cobrar_credito',
  functionName: 'Cobrar no Crédito',
  category: 'payment',
  responseType: 'voice+modal',

  // Triggers genéricos — sem "tef", "nfc" ou "tap"
  voiceTriggers: [
    'cobrar no crédito',
    'cobrar no credito',
    'cobrança no crédito',
    'cobranca no credito',
    'pagar no crédito',
    'pagar no credito',
    'crédito',
    'credito',
    'cartão de crédito',
    'cartao de credito',
    'passar no crédito',
    'passar no credito',
    'parcelar',
    'parcelado',
    'parcelas',
  ],

  examplePhrases: [
    'Cobrar 100 reais no crédito',
    'Parcelar em 3 vezes',
    'Cartão de crédito de R$ 150',
  ],

  requiresInput: true,
  inputType: 'number',
  inputPrompt: 'Qual o valor para o pagamento no crédito?',

  description: 'Gateway genérico: roteia crédito para TEF ou NFC conforme funções habilitadas.',
  shortDescription: 'Cobrar no crédito',
  icon: '💳',
  color: '#F44336',

  saveToHistory: true,
  creditsPerUse: 1,
  requiresPayment: true,
  isPremium: false,

  handler: async ({ transcript, playText, setActiveModal, companyId }) => {
    const enabled = await getEnabledPaymentKeys(companyId, ['tef_credito', 'nfc_credito'])
    const hasTef = enabled.has('tef_credito')
    const hasNfc = enabled.has('nfc_credito')

    // Extrair valor e parcelas
    const amount = extractAmountCents(transcript ?? '')
    const installmentsMatch = (transcript ?? '').match(/(\d{1,2})\s*(?:vezes|x\b|parcelas?)/)
    const rawInstallments = installmentsMatch ? parseInt(installmentsMatch[1]) : 1

    // ── Nenhum habilitado ──────────────────────────────────────────────────
    if (!hasTef && !hasNfc) {
      await playText(
        'A função de pagamento no crédito não está disponível no momento. ' +
        'Entre em contato com o suporte para ativar esta função.'
      )
      return false
    }

    // ── Apenas TEF habilitado ──────────────────────────────────────────────
    if (hasTef && !hasNfc) {
      const supabase = createClient()
      const { data: company } = await supabase
        .from('companies')
        .select('mp_access_token, mp_terminal_id')
        .eq('id', companyId)
        .single()

      if (!company?.mp_access_token || !company?.mp_terminal_id) {
        await playText(
          'A maquininha Mercado Pago não está configurada. ' +
          'Configure o Access Token e o Terminal ID no painel.'
        )
        return false
      }

      const { maxInstallments, minInstallmentValueCents, installmentsCost } =
        await getTefCreditoSettings(companyId)
      const installments = Math.min(rawInstallments, maxInstallments)

      const amountFormatted = amount
        ? (amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        : null

      await playText(
        amountFormatted
          ? installments > 1
            ? `Preparando cobrança de ${amountFormatted} no crédito em ${installments} vezes na maquininha.`
            : `Preparando cobrança de ${amountFormatted} no crédito à vista na maquininha.`
          : 'Abrindo cobrança por crédito na maquininha. Informe o valor e as parcelas.'
      )

      setActiveModal?.({
        type: 'MercadoPagoPointDisplay',
        data: {
          companyId,
          paymentType: 'credit_card',
          initialAmount: amount ?? undefined,
          initialInstallments: installments,
          maxInstallments,
          minInstallmentValueCents,
          installmentsCost,
        },
      })
      return true
    }

    // ── Apenas NFC habilitado ──────────────────────────────────────────────
    if (!hasTef && hasNfc) {
      if (!amount) {
        await playText('Por favor, informe o valor para o pagamento no crédito.')
        return false
      }

      await playText(
        `Preparando pagamento de ${(amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} no crédito via NFC.`
      )

      setActiveModal?.({
        type: 'InfinitePayDisplay',
        data: {
          companyId,
          tipo: 'NFC',
          nfc_payment_method: 'credit',
          amount_cents: amount,
        },
      })
      return true
    }

    // ── Ambos habilitados → perguntar ──────────────────────────────────────
    await playText(
      'Você tem duas opções para crédito: ' +
      'a maquininha Point do Mercado Pago, ou o pagamento por aproximação NFC. ' +
      'Qual prefere? Diga "maquininha" ou "aproximação".'
    )

    if (typeof window !== 'undefined') {
      (window as any).eAi_pendingPaymentChoice = {
        mode: 'credit',
        amount,
        installments: rawInstallments,
        companyId,
        expiresAt: Date.now() + 30_000,
      }
    }

    return true
  },
}

// ─── Resolver de escolha (TEF vs NFC quando ambos estão habilitados) ─────────
//
// Adicione esta função no detectVoiceCommand ou no handleGoogleTranscript
// do VoiceAssistantWithWakeWord, ANTES da detecção de wake word:
//
//   const resolved = await resolvePendingPaymentChoice(transcript, setActiveModal, playText)
//   if (resolved) return
//
// ─────────────────────────────────────────────────────────────────────────────

export async function resolvePendingPaymentChoice(
  transcript: string,
  setActiveModal: (modal: any) => void,
  playText: (text: string) => Promise<void>,
): Promise<boolean> {
  if (typeof window === 'undefined') return false

  const pending = (window as any).eAi_pendingPaymentChoice
  if (!pending) return false
  if (Date.now() > pending.expiresAt) {
    delete (window as any).eAi_pendingPaymentChoice
    return false
  }

  const t = transcript.toLowerCase()
  const wantsTef = /maquininha|point|mercado pago|tef/.test(t)
  const wantsNfc = /aproxima[çc][aã]o|nfc|tap|celular|infinitepay/.test(t)

  if (!wantsTef && !wantsNfc) return false   // resposta não reconhecida, não consome o contexto

  delete (window as any).eAi_pendingPaymentChoice

  const { mode, amount, installments = 1, companyId } = pending

  // ── Escolheu maquininha (TEF) ──────────────────────────────────────────────
  if (wantsTef) {
    if (mode === 'debit') {
      const amountFormatted = amount
        ? (amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        : null

      await playText(
        amountFormatted
          ? `Preparando cobrança de ${amountFormatted} no débito na maquininha.`
          : 'Abrindo cobrança por débito na maquininha. Informe o valor.'
      )

      setActiveModal({
        type: 'MercadoPagoPointDisplay',
        data: {
          companyId,
          paymentType: 'debit_card',
          initialAmount: amount ?? undefined,
        },
      })
    } else {
      // crédito
      const supabase = createClient()
      const { data: settings } = await supabase
        .from('company_function_settings')
        .select('config')
        .eq('company_id', companyId)
        .eq('function_key', 'tef_credito')
        .single()

      const maxInstallments = settings?.config?.max_installments ?? 12
      const minInstallmentValueCents = settings?.config?.min_installment_value_cents ?? 0
      const installmentsCost = settings?.config?.installments_cost ?? 'seller'
      const parsedInstallments = Math.min(installments, maxInstallments)
      const amountFormatted = amount
        ? (amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        : null

      await playText(
        amountFormatted
          ? parsedInstallments > 1
            ? `Preparando cobrança de ${amountFormatted} no crédito em ${parsedInstallments} vezes na maquininha.`
            : `Preparando cobrança de ${amountFormatted} no crédito à vista na maquininha.`
          : 'Abrindo cobrança por crédito na maquininha. Informe o valor e as parcelas.'
      )

      setActiveModal({
        type: 'MercadoPagoPointDisplay',
        data: {
          companyId,
          paymentType: 'credit_card',
          initialAmount: amount ?? undefined,
          initialInstallments: parsedInstallments,
          maxInstallments,
          minInstallmentValueCents,
          installmentsCost,
        },
      })
    }
    return true
  }

  // ── Escolheu NFC ───────────────────────────────────────────────────────────
  if (!amount) {
    await playText(`Por favor, informe o valor para o pagamento no ${mode === 'debit' ? 'débito' : 'crédito'}.`)
    return true
  }

  await playText(
    `Preparando pagamento de ${(amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} no ${
      mode === 'debit' ? 'débito' : 'crédito'
    } via NFC.`
  )

  setActiveModal({
    type: 'InfinitePayDisplay',
    data: {
      companyId,
      tipo: 'NFC',
      nfc_payment_method: mode === 'debit' ? 'debit' : 'credit',
      amount_cents: amount,
    },
  })
  return true
}
