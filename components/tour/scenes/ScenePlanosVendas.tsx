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
      <div className="px-3 py-2.5 flex-shrink-0" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2 mb-0.5">
          <div className="w-2 h-2 rounded-full" style={{ background: '#b0cb1f' }} />
          <span className="font-bold text-white" style={{ fontSize: 'clamp(0.55rem, 1.3vw, 0.72rem)' }}>minhAi Vendas</span>
        </div>
        {/* Card gratuito */}
        <div
          className="rounded-xl px-3 py-2 flex items-center justify-between"
          style={{ background: 'rgba(176,203,31,0.08)', border: '1px solid rgba(176,203,31,0.2)' }}
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold" style={{ color: '#b0cb1f', fontSize: 'clamp(0.55rem, 1.3vw, 0.72rem)' }}>Gratuito</span>
              <span className="rounded-full px-1.5 py-0.5 font-semibold" style={{ background: 'rgba(176,203,31,0.2)', color: '#b0cb1f', border: '1px solid rgba(176,203,31,0.3)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)' }}>para o lojista</span>
            </div>
            <p className="text-white/40" style={{ fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)' }}>
              Sem mensalidade, sem créditos, sem surpresa.
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-bold" style={{ color: '#b0cb1f', fontSize: 'clamp(0.85rem, 2.2vw, 1.1rem)' }}>10%</p>
            <p className="text-white/40" style={{ fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)' }}>por venda confirmada</p>
            <p className="text-white/25" style={{ fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)' }}>descontado no saque</p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-2 px-3 py-2 overflow-hidden">

        {/* Formas de recebimento */}
        <div>
          <p className="text-white/30 uppercase font-semibold tracking-wider mb-1 flex-shrink-0" style={{ fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)' }}>
            Formas de recebimento
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {FORMAS.slice(0, formasVisible).map((f, i) => (
              <div
                key={f.label}
                className="rounded-xl p-2 text-center"
                style={{ background: `${f.color}10`, border: `1px solid ${f.color}25` }}
              >
                <p className="font-bold text-white" style={{ fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)' }}>{f.label}</p>
                <p className="text-white/35" style={{ fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)' }}>{f.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Funções incluídas */}
        {funcoesVisible > 0 && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <p className="text-white/30 uppercase font-semibold tracking-wider mb-1 flex-shrink-0" style={{ fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)' }}>
              18 funções incluídas — ative ou desative no painel
            </p>
            <div className="flex flex-wrap gap-1 overflow-hidden content-start">
              {FUNCOES.slice(0, funcoesVisible).map((fn, i) => (
                <div
                  key={fn}
                  className="flex items-center gap-1 rounded-full px-2 py-0.5"
                  style={{ background: 'rgba(176,203,31,0.08)', border: '1px solid rgba(176,203,31,0.2)' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="#b0cb1f" strokeWidth={2.5} strokeLinecap="round" style={{ width: 8, height: 8, flexShrink: 0 }}>
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span className="text-white/60 font-medium" style={{ fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)' }}>{fn}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
