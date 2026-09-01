'use client'
// components/tour/scenes/ScenePlanosSmartCreditos.tsx

import { useEffect, useState } from 'react'

const BG = 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)'

const PACOTES = [
  { nome: 'Starter',      preco: 'R$ 29,90',  interacoes: '200',    porUso: 'R$ 0,15/interação', color: '#6b7280', popular: false },
  { nome: 'Professional', preco: 'R$ 99,90',  interacoes: '1.000',  porUso: 'R$ 0,10/interação', color: '#3b82f6', popular: true  },
  { nome: 'Business',     preco: 'R$ 249,90', interacoes: '3.600',  porUso: 'R$ 0,07/interação', color: '#8b5cf6', popular: false },
  { nome: 'Enterprise',   preco: 'R$ 499,90', interacoes: '10.000', porUso: 'R$ 0,05/interação', color: '#10b981', popular: false },
]

export default function ScenePlanosSmartCreditos() {
  const [visible, setVisible] = useState(0)
  const [gratisVisible, setGratisVisible] = useState(false)

  useEffect(() => {
    if (visible >= PACOTES.length) return
    const t = setTimeout(() => setVisible(v => v + 1), 400)
    return () => clearTimeout(t)
  }, [visible])

  useEffect(() => {
    if (visible < PACOTES.length) return
    const t = setTimeout(() => setGratisVisible(true), 300)
    return () => clearTimeout(t)
  }, [visible])

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none"
      style={{ background: BG }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 flex-shrink-0" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#3b82f6' }} />
          <span className="text-white/60 font-semibold" style={{ fontSize: 'clamp(0.55rem, 1.2vw, 0.72rem)' }}>
            Pacotes de Créditos
          </span>
        </div>
        <span className="text-white/30" style={{ fontSize: 'clamp(0.42rem, 0.9vw, 0.55rem)' }}>
          Pagamento via PIX
        </span>
      </div>

      {/* Banner grátis */}
      <div
        className="mx-4 mt-3 rounded-xl px-3 py-2.5 flex items-center gap-3 flex-shrink-0"
        style={{
          background: 'rgba(176,203,31,0.1)',
          border: '1px solid rgba(176,203,31,0.25)',
          opacity: gratisVisible ? 1 : 0,
          transition: 'opacity 400ms ease',
        }}
      >
        {/* SVG gift */}
        <svg viewBox="0 0 24 24" fill="none" stroke="#b0cb1f" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, flexShrink: 0 }}>
          <polyline points="20 12 20 22 4 22 4 12"/>
          <rect x="2" y="7" width="20" height="5"/>
          <line x1="12" y1="22" x2="12" y2="7"/>
          <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
          <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
        </svg>
        <div>
          <span className="font-bold" style={{ color: '#b0cb1f', fontSize: 'clamp(0.5rem, 1.1vw, 0.65rem)' }}>Comece grátis!</span>
          <span className="text-white/50 ml-2" style={{ fontSize: 'clamp(0.45rem, 1vw, 0.6rem)' }}>20 créditos grátis para testar à vontade.</span>
        </div>
      </div>

      {/* Grid de pacotes */}
      <div className="flex-1 min-h-0 grid grid-cols-2 gap-3 px-4 py-3">
        {PACOTES.slice(0, visible).map((p) => (
          <div
            key={p.nome}
            className="rounded-xl p-4 flex flex-col justify-between relative"
            style={{
              background: p.popular
                ? 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(59,130,246,0.08))'
                : 'rgba(255,255,255,0.04)',
              border: `1px solid ${p.popular ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.1)'}`,
            }}
          >
            {p.popular && (
              <div
                className="absolute rounded-full px-2 py-0.5 font-bold"
                style={{ top: -8, left: '50%', transform: 'translateX(-50%)', background: '#f59e0b', color: '#000', fontSize: 'clamp(0.3rem, 0.7vw, 0.4rem)', whiteSpace: 'nowrap' }}
              >
                MAIS POPULAR
              </div>
            )}

            {/* Topo: nome + preço */}
            <div className="flex flex-col gap-1">
              <p
                className="font-bold"
                style={{ color: p.popular ? '#fff' : 'rgba(255,255,255,0.7)', fontSize: 'clamp(0.55rem, 1.3vw, 0.75rem)' }}
              >
                {p.nome}
              </p>
              <p className="font-bold text-white" style={{ fontSize: 'clamp(1rem, 2.6vw, 1.5rem)' }}>{p.preco}</p>
            </div>

            {/* Base: interações + custo unitário */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" stroke={p.color} strokeWidth={2} strokeLinecap="round" style={{ width: 12, height: 12, flexShrink: 0 }}>
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
                <span style={{ color: p.color, fontSize: 'clamp(0.48rem, 1.1vw, 0.65rem)', fontWeight: 700 }}>
                  {p.interacoes} interações
                </span>
              </div>
              <span className="text-white/40" style={{ fontSize: 'clamp(0.42rem, 0.95vw, 0.58rem)' }}>{p.porUso}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
