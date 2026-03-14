'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser';

// ─── Form inline (para plugar no FunctionConfigModal genérico) ────────────────

interface MpPointConfigFormProps {
  companyId: string
  functionKey: 'tef_debito' | 'tef_credito'
  onSaved?: () => void
}

export function MpPointConfigForm({ companyId, functionKey, onSaved }: MpPointConfigFormProps) {
  const supabase = createClient()
  const isCreditCard = functionKey === 'tef_credito'

  const [accessToken, setAccessToken] = useState('')
  const [terminalId, setTerminalId] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [maxInstallments, setMaxInstallments] = useState(12)
  const [minInstallmentValue, setMinInstallmentValue] = useState('')
  const [installmentsCost, setInstallmentsCost] = useState<'seller' | 'buyer'>('seller')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: company } = await supabase
        .from('companies')
        .select('mp_access_token, mp_terminal_id')
        .eq('id', companyId)
        .single()

      if (company) {
        setAccessToken(company.mp_access_token || '')
        setTerminalId(company.mp_terminal_id || '')
      }

      // Carregar config de parcelas do company_function_settings
      if (isCreditCard) {
        const { data: settings } = await supabase
          .from('company_function_settings')
          .select('config')
          .eq('company_id', companyId)
          .eq('function_key', functionKey)
          .single()

        if (settings?.config) {
          setMaxInstallments(settings.config.max_installments || 12)
          const minVal = settings.config.min_installment_value_cents
          setMinInstallmentValue(minVal ? (minVal / 100).toFixed(2) : '')
          setInstallmentsCost(settings.config.installments_cost || 'seller')
        }
      }

      setLoading(false)
    }
    load()
  }, [companyId, functionKey, isCreditCard, supabase])

  async function handleSave() {
    if (!accessToken.trim() || !terminalId.trim()) {
      setError('Access Token e Terminal ID são obrigatórios.')
      return
    }
    setError('')
    setSaving(true)

    try {
      // Salvar token e terminal na empresa
      const { error: companyError } = await supabase
        .from('companies')
        .update({
          mp_access_token: accessToken.trim(),
          mp_terminal_id: terminalId.trim()
        })
        .eq('id', companyId)

      if (companyError) throw companyError

      // Salvar config de parcelas (só para crédito)
      if (isCreditCard) {
        const minCents = minInstallmentValue
          ? Math.round(parseFloat(minInstallmentValue.replace(',', '.')) * 100)
          : 0

        const { error: settingsError } = await supabase
          .from('company_function_settings')
          .update({
            config: {
              max_installments: maxInstallments,
              min_installment_value_cents: minCents,
              installments_cost: installmentsCost
            }
          })
          .eq('company_id', companyId)
          .eq('function_key', functionKey)

        if (settingsError) throw settingsError
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      onSaved?.()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar configurações.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-center py-4 text-gray-400 text-sm">Carregando...</div>

  return (
    <div className="space-y-4">
      {/* Info geral */}
      <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700 space-y-1">
        <p>• TEF Débito e TEF Crédito compartilham o mesmo Access Token e Terminal ID.</p>
        <p>• Configure uma vez e ambas as funções estarão prontas.</p>
        <p>• A maquininha precisa estar em <strong>modo PDV</strong> no painel Mercado Pago.</p>
        <p>• Compatível com <strong>Point Smart 2</strong> e <strong>Point Pro 3</strong>.</p>
      </div>

      {/* Access Token */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Access Token (produção)
        </label>
        <div className="relative">
          <input
            type={showToken ? 'text' : 'password'}
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder="APP_USR-..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-red-400"
          />
          <button
            type="button"
            onClick={() => setShowToken(!showToken)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
          >
            {showToken ? '❌' : '👁'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Disponível em mercadopago.com.br/developers → sua app → Credenciais de produção
        </p>
      </div>

      {/* Terminal ID */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Terminal ID (device_id)
        </label>
        <input
          type="text"
          value={terminalId}
          onChange={(e) => setTerminalId(e.target.value)}
          placeholder="PAX_A910__XXXXXXXX ou NEWLAND_N950__XXXXXXXX"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-400"
        />
        <p className="text-xs text-gray-400 mt-1">
          No painel MP: Seu negócio → Pontos de venda → selecione a maquininha → copie o Device ID
        </p>
      </div>

      {/* Config de parcelas — só TEF Crédito */}
      {isCreditCard && (
        <div className="border border-gray-200 rounded-lg p-3 space-y-3">
          <p className="text-sm font-medium text-gray-700">Configuração de Parcelamento</p>

          <div>
            <label className="block text-xs text-gray-600 mb-1">
              Máximo de parcelas disponíveis
            </label>
            <select
              value={maxInstallments}
              onChange={(e) => setMaxInstallments(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              {[1, 2, 3, 4, 6, 8, 10, 12].map((n) => (
                <option key={n} value={n}>
                  {n === 1 ? 'Somente à vista' : `Até ${n}×`}
                </option>
              ))}
            </select>
          </div>

          {maxInstallments > 1 && (
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Juros do parcelamento — quem paga?
              </label>
              <select
                value={installmentsCost}
                onChange={(e) => setInstallmentsCost(e.target.value as 'seller' | 'buyer')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              >
                <option value="seller">Estabelecimento paga os juros</option>
                <option value="buyer">Cliente paga os juros</option>
              </select>
            </div>
          )}

          {maxInstallments > 1 && (
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Valor mínimo por parcela (R$) — opcional
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={minInstallmentValue}
                onChange={(e) => setMinInstallmentValue(e.target.value)}
                placeholder="Ex: 10,00 (deixe vazio para sem mínimo)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
          )}

          <div className="bg-amber-50 rounded-lg p-2 text-xs text-amber-700">
            Os juros do parcelamento são cobrados pelo Mercado Pago diretamente ao lojista.
            As taxas variam conforme o plano contratado com o MP.
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-[#F44336] hover:bg-red-600 disabled:opacity-50 text-white font-bold py-2 rounded-xl transition-colors text-sm"
      >
        {saving ? 'Salvando...' : saved ? '✓ Salvo!' : 'Salvar Configurações'}
      </button>
    </div>
  )
}

// ─── Modal standalone ─────────────────────────────────────────────────────────

interface MpPointConfigModalProps {
  companyId: string
  functionKey: 'tef_debito' | 'tef_credito'
  onClose: () => void
}

export default function MpPointConfigModal({ companyId, functionKey, onClose }: MpPointConfigModalProps) {
  const label = functionKey === 'tef_credito' ? 'TEF Crédito' : 'TEF Débito'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-[#F44336] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚙️</span>
            <p className="text-white font-bold">Configurar {label}</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white text-2xl leading-none">×</button>
        </div>
        <div className="p-5">
          <MpPointConfigForm
            companyId={companyId}
            functionKey={functionKey}
            onSaved={onClose}
          />
        </div>
      </div>
    </div>
  )
}
