'use client'
// components/tour/scenes/SceneProducaoOrcamentos.tsx
// Split: Auxiliar de Produção (esquerda) + Orçamentos com PIX (direita)

import { useEffect, useState } from 'react'

const BG = 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'

const PRODUCAO_STEPS = [
  { label: 'Insumo', value: 'Café Verde 1kg · R$ 28,00' },
  { label: 'Embalagem', value: '50 sachês · R$ 6,50' },
  { label: 'Mão de obra', value: '2h · R$ 12,00' },
  { label: 'Custo total', value: 'R$ 46,50', highlight: true },
  { label: 'Margem 40%', value: '+R$ 18,60', highlight: true },
  { label: 'Preço sugerido', value: 'R$ 65,10', accent: true },
]

const ORCAMENTO_ITEMS = [
  { desc: 'Banner 2×1m', qty: '3 un', value: 'R$ 120,00' },
  { desc: 'Cartão de Visita', qty: '500 un', value: 'R$ 89,90' },
  { desc: 'Desconto 10%', qty: '', value: '- R$ 20,99' },
]

export default function SceneProducaoOrcamentos() {
  const [prodStep, setProdStep] = useState(0)
  const [orcVisible, setOrcVisible] = useState(false)
  const [pixVisible, setPixVisible] = useState(false)

  // Avança steps de produção
  useEffect(() => {
    if (prodStep >= PRODUCAO_STEPS.length) return
    const t = setTimeout(() => setProdStep(v => v + 1), prodStep === 0 ? 400 : 500)
    return () => clearTimeout(t)
  }, [prodStep])

  // Após produção, mostra orçamento
  useEffect(() => {
    if (prodStep < PRODUCAO_STEPS.length) return
    const t = setTimeout(() => setOrcVisible(true), 400)
    return () => clearTimeout(t)
  }, [prodStep])

  // PIX após orçamento
  useEffect(() => {
    if (!orcVisible) return
    const t = setTimeout(() => setPixVisible(true), 1200)
    return () => clearTimeout(t)
  }, [orcVisible])

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none"
      style={{ background: BG }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-3 py-2 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(15,23,42,0.8)' }}
      >
        <span className="text-white/60 font-semibold" style={{ fontSize: 'clamp(0.5rem, 1.2vw, 0.65rem)' }}>
          Produção
        </span>
        <div className="w-px h-3 bg-white/15" />
        <span className="text-white/60 font-semibold" style={{ fontSize: 'clamp(0.5rem, 1.2vw, 0.65rem)' }}>
          Orçamentos
        </span>
      </div>

      {/* Split layout */}
      <div className="flex-1 min-h-0 flex gap-2 p-3 overflow-hidden">

        {/* ── Produção ── */}
        <div
          className="flex flex-col gap-1.5 rounded-xl p-2.5 flex-shrink-0"
          style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth={2} strokeLinecap="round" className="w-2.5 h-2.5">
                <path d="M2 20h20M4 20V10l8-6 8 6v10"/>
              </svg>
            </div>
            <p className="text-white/50 font-semibold uppercase tracking-wider" style={{ fontSize: 'clamp(0.35rem, 0.8vw, 0.44rem)' }}>
              Auxiliar de Produção
            </p>
          </div>

          <div className="flex flex-col gap-1 flex-1 overflow-hidden">
            {PRODUCAO_STEPS.slice(0, prodStep).map((s, i) => (
              <div key={s.label} className="flex items-center justify-between gap-1">
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.35rem, 0.8vw, 0.44rem)' }}>{s.label}</span>
                <span
                  className="font-semibold text-right"
                  style={{
                    fontSize: 'clamp(0.35rem, 0.8vw, 0.44rem)',
                    color: (s as any).accent ? '#84cc16' : (s as any).highlight ? '#60a5fa' : 'rgba(255,255,255,0.75)',
                  }}
                >
                  {s.value}
                </span>
              </div>
            ))}
          </div>

          {prodStep >= PRODUCAO_STEPS.length && (
            <div
              className="flex items-center gap-1 rounded-lg px-2 py-1 flex-shrink-0"
              style={{ background: 'rgba(132,204,22,0.1)', border: '1px solid rgba(132,204,22,0.25)' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="#84cc16" strokeWidth={2.5} strokeLinecap="round" className="w-2.5 h-2.5 flex-shrink-0">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span style={{ color: '#84cc16', fontWeight: 700, fontSize: 'clamp(0.35rem, 0.8vw, 0.44rem)' }}>
                Produto criado no catálogo
              </span>
            </div>
          )}
        </div>

        {/* ── Orçamentos ── */}
        <div
          className="flex flex-col gap-1.5 rounded-xl p-2.5 flex-shrink-0"
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            opacity: orcVisible ? 1 : 0,
            transition: 'opacity 400ms ease',
          }}
        >
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth={2} strokeLinecap="round" className="w-2.5 h-2.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <p className="text-white/50 font-semibold uppercase tracking-wider" style={{ fontSize: 'clamp(0.35rem, 0.8vw, 0.44rem)' }}>
              Orçamento
            </p>
          </div>

          {/* Logo mock */}
          <div
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="w-4 h-4 rounded bg-amber-500/80 flex items-center justify-center flex-shrink-0">
              <span style={{ fontSize: '0.45rem', color: 'white', fontWeight: 700 }}>CE</span>
            </div>
            <span className="text-white/60" style={{ fontSize: 'clamp(0.35rem, 0.8vw, 0.44rem)' }}>Café Exemplo · Orçamento #042</span>
          </div>

          {/* Itens */}
          <div className="flex flex-col gap-1 flex-1 overflow-hidden">
            {ORCAMENTO_ITEMS.map((item, i) => (
              <div key={i} className="flex items-center justify-between gap-1">
                <div className="flex-1 min-w-0">
                  <p className="text-white/70 truncate" style={{ fontSize: 'clamp(0.35rem, 0.8vw, 0.44rem)' }}>{item.desc}</p>
                  {item.qty && <p className="text-white/30" style={{ fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)' }}>{item.qty}</p>}
                </div>
                <span
                  className="font-semibold flex-shrink-0"
                  style={{
                    color: item.value.startsWith('-') ? '#f87171' : 'rgba(255,255,255,0.75)',
                    fontSize: 'clamp(0.35rem, 0.8vw, 0.44rem)',
                  }}
                >
                  {item.value}
                </span>
              </div>
            ))}

            <div className="flex items-center justify-between gap-1 mt-auto pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <span className="text-white/50 font-semibold" style={{ fontSize: 'clamp(0.35rem, 0.8vw, 0.44rem)' }}>Total</span>
              <span className="text-white font-bold" style={{ fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)' }}>R$ 188,91</span>
            </div>
          </div>

          {/* PIX */}
          {pixVisible && (
            <div
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 flex-shrink-0"
              style={{ background: 'rgba(50,188,173,0.12)', border: '1px solid rgba(50,188,173,0.3)', opacity: pixVisible ? 1 : 0, transition: 'opacity 400ms ease' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="#32bcad" strokeWidth={2} strokeLinecap="round" className="w-3 h-3 flex-shrink-0">
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
              </svg>
              <span style={{ color: '#32bcad', fontWeight: 700, fontSize: 'clamp(0.35rem, 0.8vw, 0.44rem)' }}>
                PIX enviado · R$ 188,91
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}