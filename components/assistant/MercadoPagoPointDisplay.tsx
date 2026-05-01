'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase-browser'
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand'
import {
  X,
  CreditCard,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  Monitor,
} from 'lucide-react'

// ─── Tipos ───────────────────────────────────────────────────────────────────

type Stage = 'input' | 'generating' | 'awaiting' | 'paid' | 'cancelled' | 'error'
type PaymentType = 'debit_card' | 'credit_card'

interface MercadoPagoPointDisplayProps {
  companyId: string
  paymentType: PaymentType
  initialAmount?: number
  initialInstallments?: number
  maxInstallments?: number
  minInstallmentValueCents?: number
  installmentsCost?: 'seller' | 'buyer'
  playText?: (text: string) => Promise<void>
  onClose: () => void
  theme?: 'dark' | 'light'
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ─── Componente ──────────────────────────────────────────────────────────────

export default function MercadoPagoPointDisplay({
  companyId,
  paymentType,
  initialAmount,
  initialInstallments,
  maxInstallments = 12,
  minInstallmentValueCents = 0,
  installmentsCost = 'seller',
  playText,
  onClose,
  theme = 'dark',
}: MercadoPagoPointDisplayProps) {
  const supabase = createClient()
  const isCreditCard = paymentType === 'credit_card'
  const isDark = theme === 'dark'

  const [stage, setStage] = useState<Stage>('input')
  const [amountInput, setAmountInput] = useState(
    initialAmount ? (initialAmount / 100).toFixed(2) : ''
  )
  const [installments, setInstallments] = useState(initialInstallments ?? 1)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)
  const [timeLeft, setTimeLeft] = useState('')

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const handleGerarRef = useRef<(overrideCents?: number) => void>(() => {})
  const handleCloseRef = useRef<() => void>(() => {})

  // ── Limpeza ────────────────────────────────────────────────────────────────

  const clearPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  useEffect(() => {
    return () => {
      clearPolling()
      window.speechSynthesis?.cancel()
    }
  }, [clearPolling])

  // ── Reconhecimento de voz no modal ────────────────────────────────────────
  // stage 'input'   → ouve valor em reais e dispara a cobrança
  // stage 'awaiting' → ouve "fechar" / "cancelar" e encerra

  useModalVoiceCommand({
    active: stage === 'input' || stage === 'awaiting',
    onTranscript: (transcript) => {
      const t = transcript.toLowerCase().trim()

      // ── Fechar / cancelar (qualquer stage ativo) ──────────────────────────
      const CLOSE_TRIGGERS = ['fechar', 'fecha', 'cancelar', 'cancela', 'sair', 'sai', 'não', 'nao']
      if (CLOSE_TRIGGERS.some(w => t.includes(w))) {
        window.speechSynthesis?.cancel()
        handleCloseRef.current()
        return
      }

      // ── Extrair valor e cobrar (só no stage input) ────────────────────────
      if (stage === 'input') {
        const cents = extractCentsFromTranscript(t)
        if (cents && cents >= 100) {
          handleGerarRef.current(cents)
        }
      }
    },
  })

  // ── Countdown ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!expiresAt || stage !== 'awaiting') return
    timerRef.current = setInterval(() => {
      const diff = expiresAt.getTime() - Date.now()
      if (diff <= 0) {
        setTimeLeft('00:00')
        clearPolling()
        setStage('cancelled')
        playText?.('O tempo para pagamento expirou.')
      } else {
        const m = String(Math.floor(diff / 60000)).padStart(2, '0')
        const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0')
        setTimeLeft(`${m}:${s}`)
      }
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [expiresAt, stage, clearPolling, playText])

  // ── Polling ────────────────────────────────────────────────────────────────

  const startPolling = useCallback((oId: string) => {
    pollRef.current = setInterval(async () => {
      try {
        let { data: { session } } = await supabase.auth.getSession()
if (!session) {
  const { data: refreshData } = await supabase.auth.refreshSession()
  session = refreshData.session
}
if (!session) return

        const resp = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/consultar-order-mp-point`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ order_id: oId }),
          }
        )
        const result = await resp.json()

        if (result.status === 'paid') {
          clearPolling()
          setStage('paid')
          playText?.('Pagamento confirmado! Obrigado.')
        } else if (['cancelled', 'error', 'rejected'].includes(result.status)) {
          clearPolling()
          setStage(result.status === 'cancelled' ? 'cancelled' : 'error')
          playText?.('O pagamento foi cancelado ou recusado.')
        }
      } catch (err) {
        console.error('Polling error:', err)
      }
    }, 5000)
  }, [supabase, clearPolling, playText])

  // ── Auto-envio quando initialAmount é fornecido pela voz ──────────────────

  const autoSubmittedRef = useRef(false)

  useEffect(() => {
    if (initialAmount && initialAmount >= 100 && !autoSubmittedRef.current) {
      autoSubmittedRef.current = true
      handleGerar(initialAmount)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Parcelas disponíveis com base no valor atual ───────────────────────────

  function getAvailableInstallments(): number[] {
    const cents = Math.round(parseFloat(amountInput.replace(',', '.') || '0') * 100)
    const options: number[] = [1]
    for (let i = 2; i <= maxInstallments; i++) {
      if (minInstallmentValueCents > 0 && cents > 0) {
        const installmentValue = Math.ceil(cents / i)
        if (installmentValue < minInstallmentValueCents) break
      }
      options.push(i)
    }
    return options
  }

  // ── Gerar cobrança ─────────────────────────────────────────────────────────
  // Aceita `overrideCents` para auto-envio via voz (evita race condition com estado)

  async function handleGerar(overrideCents?: number) {
    const cents = overrideCents ?? Math.round(parseFloat(amountInput.replace(',', '.')) * 100)
    if (!cents || cents < 100) {
      setErrorMsg('Valor mínimo é R$ 1,00')
      return
    }

    if (isCreditCard && installments > 1 && minInstallmentValueCents > 0) {
      const installmentValue = Math.ceil(cents / installments)
      if (installmentValue < minInstallmentValueCents) {
        setErrorMsg(
          `Valor mínimo por parcela é ${formatBRL(minInstallmentValueCents)}. ` +
          `Para ${installments}x o mínimo é ${formatBRL(minInstallmentValueCents * installments)}.`
        )
        return
      }
    }

    // Sincronizar o input visual quando o valor veio por voz
    if (overrideCents) {
      setAmountInput((overrideCents / 100).toFixed(2))
    }

    setErrorMsg('')
    setIsLoading(true)
    setStage('generating')

    try {
      let { data: { session } } = await supabase.auth.getSession()
if (!session) {
  const { data: refreshData } = await supabase.auth.refreshSession()
  session = refreshData.session
}
if (!session) throw new Error('Sessão expirada. Faça login novamente.')

      const resp = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/criar-order-mp-point`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            company_id: companyId,
            amount_cents: cents,
            payment_type: paymentType,
            installments: isCreditCard ? installments : 1,
            description: `Cobrança ${isCreditCard ? 'crédito' : 'débito'} ${formatBRL(cents)}`,
          }),
        }
      )

      const data = await resp.json()

      if (!resp.ok || !data.success) {
        throw new Error(data.mp_error || data.error || 'Erro ao criar cobrança')
      }

      setOrderId(data.order_id)
      setExpiresAt(new Date(data.expires_at))
      setStage('awaiting')
      startPolling(data.order_id)

      const tipoMsg = isCreditCard
        ? installments > 1 ? `crédito em ${installments} vezes` : 'crédito à vista'
        : 'débito'
      playText?.(`Cobrança de ${formatBRL(cents)} no ${tipoMsg} enviada para a maquininha. Aguardando pagamento.`)
    } catch (err: unknown) {
      console.error(err)
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      setErrorMsg(msg)
      setStage('error')
      playText?.('Não foi possível enviar a cobrança para a maquininha.')
    } finally {
      setIsLoading(false)
    }
  }

  // ── Fechar ─────────────────────────────────────────────────────────────────

  async function handleClose() {
    clearPolling()
    window.speechSynthesis?.cancel()

    if (orderId && stage === 'awaiting') {
      let { data: { session } } = await supabase.auth.getSession()
if (!session) {
  const { data: refreshData } = await supabase.auth.refreshSession()
  session = refreshData.session
}
if (session) {
        fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/cancelar-order-mp-point`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ order_id: orderId }),
          }
        ).catch(() => {})
      }
    }

    onClose()
  }

  // Manter refs atualizados com as funções mais recentes
  useEffect(() => { handleGerarRef.current = handleGerar })
  useEffect(() => { handleCloseRef.current = handleClose })

  // ── Helper: extrair centavos de um transcript ────────────────────────────

  function extractCentsFromTranscript(t: string): number | null {
    // Converter palavras numéricas para dígitos
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
    let normalized = t
    for (const [word, num] of Object.entries(wordMap)) {
      normalized = normalized.replace(new RegExp(`\\b${word}\\b`, 'gi'), num)
    }
    // Capturar padrão numérico com vírgula ou ponto (ex: "10,50", "10.50", "10")
    const match = normalized.match(/(\d+(?:[.,]\d{1,2})?)/)
    if (!match) return null
    const value = parseFloat(match[1].replace(',', '.'))
    if (isNaN(value) || value <= 0) return null
    // Se o valor parece centavos literais (ex: "1050" sem separador), assumir reais
    return Math.round(value * 100)
  }

  // ── Valor atual em centavos (para cálculos inline) ────────────────────────

  const currentCents = Math.round(parseFloat(amountInput.replace(',', '.') || '0') * 100)

  // ─── Render ───────────────────────────────────────────────────────────────

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className={`w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-300 ${
        isDark ? 'bg-slate-800 border border-white/10' : 'bg-white border border-gray-200'
      }`}>

        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${
          isDark ? 'border-white/10' : 'border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <CreditCard className={`w-5 h-5 ${isCreditCard ? 'text-red-400' : 'text-emerald-400'}`} />
            <div>
              <h2 className={`text-base font-bold leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                TEF {isCreditCard ? 'Crédito' : 'Débito'}
              </h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                Mercado Pago Point
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className={`p-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-white/10 text-white/70' : 'hover:bg-gray-100 text-gray-500'
            }`}
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">

          {/* ── INPUT ── */}
          {(stage === 'input' || (stage === 'error' && !orderId)) && (
            <div className="space-y-4">

              {/* Indicador de voz ativo */}
              <div className="flex justify-center">
                <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium ${
                  isDark
                    ? 'bg-green-900/30 text-green-300 border border-green-700'
                    : 'bg-green-50 text-green-700 border border-green-200'
                }`}>
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  Ouvindo... diga o valor ou "FECHAR"
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  Valor (R$)
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={amountInput}
                  onChange={(e) => { setAmountInput(e.target.value); setErrorMsg('') }}
                  placeholder="0,00"
                  className={`w-full border rounded-lg px-3 py-2 text-lg font-semibold text-center focus:outline-none focus:ring-2 focus:ring-red-400 ${
                    isDark
                      ? 'bg-slate-700 border-white/10 text-white placeholder-slate-500'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              {/* Parcelas — só crédito */}
              {isCreditCard && maxInstallments > 1 && (
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    Parcelas
                  </label>
                  <select
                    value={installments}
                    onChange={(e) => setInstallments(Number(e.target.value))}
                    className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400 ${
                      isDark
                        ? 'bg-slate-700 border-white/10 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    {getAvailableInstallments().map((n) => {
                      const installmentValue = currentCents > 0 ? Math.ceil(currentCents / n) : 0
                      return (
                        <option key={n} value={n}>
                          {n === 1
                            ? `À vista${currentCents > 0 ? ` — ${formatBRL(currentCents)}` : ''}`
                            : `${n}× de ${currentCents > 0 ? formatBRL(installmentValue) : '—'}`}
                        </option>
                      )
                    })}
                  </select>

                  {isCreditCard && installments > 1 && (
                    <div className={`flex items-start gap-2 mt-2 p-2 rounded-lg ${
                      isDark ? 'bg-amber-900/20 border border-amber-700/40' : 'bg-amber-50 border border-amber-200'
                    }`}>
                      <AlertCircle className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
                      <p className={`text-xs ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                        {installmentsCost === 'buyer'
                          ? 'Juros do parcelamento são cobrados do cliente pelo Mercado Pago.'
                          : 'Juros do parcelamento são cobrados do estabelecimento pelo Mercado Pago.'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {errorMsg && (
                <div className={`flex items-start gap-2 p-3 rounded-lg ${
                  isDark ? 'bg-red-900/20 border border-red-700/40' : 'bg-red-50 border border-red-200'
                }`}>
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className={`text-sm ${isDark ? 'text-red-300' : 'text-red-600'}`}>{errorMsg}</p>
                </div>
              )}

              <button
                onClick={() => handleGerar()}
                disabled={isLoading || !amountInput}
                className="w-full bg-[#F44336] hover:bg-red-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                Enviar para Maquininha
              </button>
            </div>
          )}

          {/* ── GENERATING ── */}
          {stage === 'generating' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <Loader2 className="w-10 h-10 text-red-400 animate-spin" />
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                Enviando para a maquininha...
              </p>
            </div>
          )}

          {/* ── AWAITING ── */}
          {stage === 'awaiting' && (
            <div className="space-y-4">
              <div className={`flex flex-col items-center gap-3 py-4 px-4 rounded-xl ${
                isDark ? 'bg-slate-700/50' : 'bg-gray-50'
              }`}>
                <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                  isDark ? 'bg-amber-500/20' : 'bg-amber-100'
                }`}>
                  <Monitor className={`w-7 h-7 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
                </div>
                <p className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  Aguardando pagamento
                </p>
                <p className={`text-sm text-center ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  A maquininha já recebeu a cobrança.<br />
                  Peça ao cliente para passar o cartão.
                </p>
              </div>

              <div className={`rounded-xl p-3 text-center ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                <p className={`text-xs mb-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Valor</p>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  {formatBRL(currentCents)}
                </p>
                {isCreditCard && installments > 1 && currentCents > 0 && (
                  <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    {installments}× de {formatBRL(Math.ceil(currentCents / installments))}
                  </p>
                )}
              </div>

              {timeLeft && (
                <div className={`flex items-center justify-center gap-2 text-sm ${
                  isDark ? 'text-slate-400' : 'text-gray-500'
                }`}>
                  <Clock className="w-4 h-4" />
                  <span>Expira em <span className="font-mono font-bold">{timeLeft}</span></span>
                </div>
              )}

              <div className="flex items-center gap-2 justify-center">
                <div className="animate-pulse w-2 h-2 bg-amber-400 rounded-full" />
                <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  Aguardando confirmação...
                </span>
              </div>
            </div>
          )}

          {/* ── PAID ── */}
          {stage === 'paid' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="w-9 h-9 text-emerald-400" />
              </div>
              <div className="text-center space-y-1">
                <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Pagamento Confirmado!
                </p>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  {isCreditCard ? 'Crédito' : 'Débito'} processado com sucesso.
                </p>
              </div>
              <button
                onClick={handleClose}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Fechar
              </button>
            </div>
          )}

          {/* ── CANCELLED ── */}
          {stage === 'cancelled' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                isDark ? 'bg-slate-700' : 'bg-gray-100'
              }`}>
                <Clock className={`w-9 h-9 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
              </div>
              <div className="text-center space-y-1">
                <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-700'}`}>
                  Pagamento Cancelado
                </p>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  O tempo expirou ou o pagamento foi cancelado na maquininha.
                </p>
              </div>
              <button
                onClick={handleClose}
                className={`w-full font-bold py-3 rounded-xl transition-colors ${
                  isDark
                    ? 'bg-slate-600 hover:bg-slate-500 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                Fechar
              </button>
            </div>
          )}

          {/* ── ERROR (após tentar criar) ── */}
          {stage === 'error' && orderId && (
            <div className="space-y-4">
              <div className={`flex items-start gap-3 p-4 rounded-xl ${
                isDark ? 'bg-red-900/20 border border-red-700/40' : 'bg-red-50 border border-red-200'
              }`}>
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className={`text-sm font-medium ${isDark ? 'text-red-300' : 'text-red-700'}`}>
                    Erro no Pagamento
                  </p>
                  <p className={`text-xs mt-1 ${isDark ? 'text-red-400' : 'text-red-500'}`}>
                    {errorMsg}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className={`w-full font-bold py-3 rounded-xl transition-colors ${
                  isDark
                    ? 'bg-slate-600 hover:bg-slate-500 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                Fechar
              </button>
            </div>
          )}

        </div>

        {stage === 'paid' && <div className="h-1 bg-emerald-500" />}
      </div>
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(content, document.body)
}
