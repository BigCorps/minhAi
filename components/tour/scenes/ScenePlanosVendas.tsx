'use client'
// components/tour/scenes/ScenePlanosVendas.tsx

import { useEffect, useState } from 'react'

const BG = 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)'

const FORMAS = [
  { label: 'PIX',        sub: 'Banco Inter · 10% no saque',      color: '#32bcad' },
  { label: 'NFC + Link', sub: 'InfinitePay · Taxa da operadora',  color: '#8b5cf6' },
  { label: 'TEF',        sub: 'Mercado Pago · Taxa da operadora', color: '#3b82f6' },
]

const FUNCOES = [
  'Modo Venda', 'Ver Produtos', 'Fazer Pedido', 'Registrar Venda',
  'Cardápio', 'PIX', 'NFC Débito', 'NFC Crédito',
  'Link de Pagamento', 'TEF Débito', 'TEF Crédito', 'Agendar',
  'Ver Agenda', 'Perguntas Gerais', 'Nossa Marca', 'Minha Conta',
  'Cadastrar Produto', 'Sobre o Sistema',
]

export default function ScenePlanosVendas() {
  const [formasVisible, setFormasVisible] = useState(0)
  const [funcoesVisible, setFuncoesVisible] = useState(0)

  useEffect(() => {
    if (formasVisible >= FORMAS.length) return
    const t = setTimeout(() => setFormasVisible(v => v + 1), 400)
    return () => clearTimeout(t)
  }, [formasVisible])

  useEffect(() => {
    if (formasVisible < FORMAS.length) return
    if (funcoesVisible >= FUNCOES.length) return
    const t = setTimeout(() => setFuncoesVisible(v => v + 1), 120)
    return () => clearTimeout(t)
  }, [formasVisible, funcoesVisible])

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none"
      style={{ background: BG }}
    >
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex-shrink-0" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#b0cb1f' }} />
          <span className="font-bold text-white text-base tracking-tight">minhAi Vendas</span>
        </div>

        {/* Card gratuito */}
        <div
          className="rounded-2xl px-5 py-4 flex items-center justify-between"
          style={{ background: 'rgba(176,203,31,0.07)', border: '1px solid rgba(176,203,31,0.22)' }}
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2.5">
              <span className="font-extrabold text-2xl" style={{ color: '#b0cb1f' }}>Gratuito</span>
              <span
                className="rounded-full px-2.5 py-1 font-semibold text-xs"
                style={{ background: 'rgba(176,203,31,0.18)', color: '#b0cb1f', border: '1px solid rgba(176,203,31,0.3)' }}
              >
                para o lojista
              </span>
            </div>
            <p className="text-white/45 text-sm">Sem mensalidade, sem créditos, sem surpresa.</p>
          </div>
          <div className="text-right flex-shrink-0 ml-4">
            <p className="font-extrabold leading-none" style={{ color: '#b0cb1f', fontSize: '2.8rem' }}>10%</p>
            <p className="text-white/45 text-sm mt-0.5">por venda confirmada</p>
            <p className="text-white/30 text-xs mt-0.5">descontado no saque</p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col px-5 py-4 gap-4 overflow-hidden">

        {/* Formas de recebimento */}
        <div className="flex-shrink-0">
          <p className="text-white/35 uppercase font-semibold tracking-widest text-xs mb-2.5">
            Formas de recebimento
          </p>
          <div className="grid grid-cols-3 gap-2.5">
            {FORMAS.slice(0, formasVisible).map((f) => (
              <div
                key={f.label}
                className="rounded-2xl p-3.5 flex flex-col items-center justify-center gap-1"
                style={{ background: `${f.color}12`, border: `1px solid ${f.color}30` }}
              >
                <p className="font-bold text-white text-base">{f.label}</p>
                <p className="text-white/40 text-xs text-center leading-tight">{f.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Funções incluídas */}
        {funcoesVisible > 0 && (
          <div className="flex-1 min-h-0 flex flex-col">
            <p className="text-white/35 uppercase font-semibold tracking-widest text-xs mb-2.5 flex-shrink-0">
              18 funções incluídas — ative ou desative no painel
            </p>
            <div className="flex flex-wrap gap-2 content-start overflow-hidden">
              {FUNCOES.slice(0, funcoesVisible).map((fn) => (
                <div
                  key={fn}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
                  style={{ background: 'rgba(176,203,31,0.08)', border: '1px solid rgba(176,203,31,0.22)' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="#b0cb1f" strokeWidth={2.5} strokeLinecap="round" style={{ width: 11, height: 11, flexShrink: 0 }}>
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span className="text-white/65 font-medium text-xs">{fn}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
