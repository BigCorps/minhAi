'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase-browser'

// ─── Tipos ───────────────────────────────────────────────────────────────────

type Stage = 'input' | 'generating' | 'awaiting' | 'paid' | 'cancelled' | 'error'
type PaymentType = 'debit_card' | 'credit_card'

interface MercadoPagoPointDisplayProps {
  companyId: string
  paymentType: PaymentType
  initialAmount?: number          // em centavos, extraído da voz
  initialInstallments?: number    // parcelas extraídas da voz
  maxInstallments?: number        // config da empresa
  minInstallmentValueCents?: number
  playText?: (text: string) => Promise<void>
  onClose: () => void
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
  playText,
  onClose,
}: MercadoPagoPointDisplayProps) {
  const supabase = createClient()
  const isCreditCard = paymentType === 'credit_card'

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
        const { data: { session } } = await supabase.auth.getSession()
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

  async function handleGerar() {
    const cents = Math.round(parseFloat(amountInput.replace(',', '.')) * 100)
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

    setErrorMsg('')
    setIsLoading(true)
    setStage('generating')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessão expirada')

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

  function handleClose() {
    clearPolling()
    window.speechSynthesis?.cancel()
    onClose()
  }

  // ── Valor atual em centavos (para cálculos inline) ────────────────────────

  const currentCents = Math.round(parseFloat(amountInput.replace(',', '.') || '0') * 100)

  // ─── Render ───────────────────────────────────────────────────────────────

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

        {/* Header */}
        <div className="bg-[#F44336] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💳</span>
            <div>
              <p className="text-white font-bold text-lg leading-tight">
                TEF {isCreditCard ? 'Crédito' : 'Débito'}
              </p>
              <p className="text-white/80 text-xs">Mercado Pago Point</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white transition-colors text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-5">

          {/* ── INPUT ── */}
          {(stage === 'input' || (stage === 'error' && !orderId)) && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor (R$)
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={amountInput}
                  onChange={(e) => { setAmountInput(e.target.value); setErrorMsg('') }}
                  placeholder="0,00"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-lg font-semibold text-center focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>

              {/* Parcelas — só crédito */}
              {isCreditCard && maxInstallments > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parcelas
                  </label>
                  <select
                    value={installments}
                    onChange={(e) => setInstallments(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400"
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
                    <p className="text-xs text-amber-600 mt-1">
                      ⚠️ Juros do parcelamento são cobrados pelo Mercado Pago ao lojista.
                    </p>
                  )}
                </div>
              )}

              {errorMsg && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{errorMsg}</p>
              )}

              <button
                onClick={handleGerar}
                disabled={isLoading || !amountInput}
                className="w-full bg-[#F44336] hover:bg-red-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
              >
                Enviar para Maquininha
              </button>
            </div>
          )}

          {/* ── GENERATING ── */}
          {stage === 'generating' && (
            <div className="text-center py-6 space-y-3">
              <div className="animate-spin w-10 h-10 border-4 border-red-400 border-t-transparent rounded-full mx-auto" />
              <p className="text-gray-700 font-medium">Enviando para a maquininha...</p>
            </div>
          )}

          {/* ── AWAITING ── */}
          {stage === 'awaiting' && (
            <div className="text-center space-y-4">
              <div className="bg-amber-50 rounded-xl p-4">
                <p className="text-4xl mb-2">🖥️</p>
                <p className="font-bold text-gray-800 text-lg">Aguardando pagamento</p>
                <p className="text-gray-500 text-sm mt-1">
                  A maquininha já recebeu a cobrança.<br />
                  Peça ao cliente para passar o cartão.
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">Valor</p>
                <p className="text-2xl font-bold text-gray-800">
                  {formatBRL(currentCents)}
                </p>
                {isCreditCard && installments > 1 && currentCents > 0 && (
                  <p className="text-sm text-gray-500">
                    {installments}× de {formatBRL(Math.ceil(currentCents / installments))}
                  </p>
                )}
              </div>

              {timeLeft && (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <span>⏱</span>
                  <span>Expira em <span className="font-mono font-bold text-gray-700">{timeLeft}</span></span>
                </div>
              )}

              <div className="flex items-center gap-2 justify-center">
                <div className="animate-pulse w-2 h-2 bg-amber-400 rounded-full" />
                <span className="text-sm text-gray-500">Aguardando confirmação...</span>
              </div>
            </div>
          )}

          {/* ── PAID ── */}
          {stage === 'paid' && (
            <div className="text-center py-4 space-y-3">
              <div className="text-6xl">✅</div>
              <p className="text-xl font-bold text-green-700">Pagamento Confirmado!</p>
              <p className="text-gray-500 text-sm">
                {isCreditCard ? 'Crédito' : 'Débito'} processado com sucesso.
              </p>
              <button
                onClick={handleClose}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition-colors"
              >
                Fechar
              </button>
            </div>
          )}

          {/* ── CANCELLED ── */}
          {stage === 'cancelled' && (
            <div className="text-center py-4 space-y-3">
              <div className="text-5xl">⏱️</div>
              <p className="text-lg font-bold text-gray-700">Pagamento Cancelado</p>
              <p className="text-gray-500 text-sm">
                O tempo expirou ou o pagamento foi cancelado na maquininha.
              </p>
              <button
                onClick={handleClose}
                className="w-full bg-gray-400 hover:bg-gray-500 text-white font-bold py-3 rounded-xl transition-colors"
              >
                Fechar
              </button>
            </div>
          )}

          {/* ── ERROR (após tentar criar) ── */}
          {stage === 'error' && orderId && (
            <div className="text-center py-4 space-y-3">
              <div className="text-5xl">❌</div>
              <p className="text-lg font-bold text-gray-700">Erro no Pagamento</p>
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{errorMsg}</p>
              <button
                onClick={handleClose}
                className="w-full bg-gray-400 hover:bg-gray-500 text-white font-bold py-3 rounded-xl transition-colors"
              >
                Fechar
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(content, document.body)
}
