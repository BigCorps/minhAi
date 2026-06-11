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
      <div className="flex items-center justify-between px-3 py-2 flex-shrink-0" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: '#3b82f6' }} />
          <span className="text-white/60 font-semibold" style={{ fontSize: 'clamp(0.48rem, 1.1vw, 0.62rem)' }}>
            Pacotes de Créditos
          </span>
        </div>
        <span className="text-white/30" style={{ fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)' }}>
          Pagamento via PIX
        </span>
      </div>

      {/* Banner grátis */}
      {gratisVisible && (
        <div
          className="mx-3 mt-2 rounded-xl px-3 py-2 flex items-center gap-2 flex-shrink-0"
          style={{ background: 'rgba(176,203,31,0.1)', border: '1px solid rgba(176,203,31,0.25)', opacity: gratisVisible ? 1 : 0, transition: 'opacity 400ms ease' }}
        >
          <span style={{ fontSize: '0.9rem' }}>🎁</span>
          <div>
            <span className="font-bold" style={{ color: '#b0cb1f', fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)' }}>Comece grátis!</span>
            <span className="text-white/50 ml-1.5" style={{ fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)' }}>20 créditos grátis para testar à vontade.</span>
          </div>
        </div>
      )}

      {/* Grid de pacotes */}
      <div className="flex-1 min-h-0 grid grid-cols-2 gap-2 px-3 py-3 content-start">
        {PACOTES.slice(0, visible).map((p, i) => (
          <div
            key={p.nome}
            className="rounded-xl p-3 flex flex-col gap-1 relative"
            style={{
              background: p.popular
                ? 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(59,130,246,0.08))'
                : 'rgba(255,255,255,0.04)',
              border: `1px solid ${p.popular ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.1)'}`,
            }}
          >
            {p.popular && (
              <div
                className="absolute rounded-full px-1.5 py-0.5 font-bold"
                style={{ top: -7, left: '50%', transform: 'translateX(-50%)', background: '#f59e0b', color: '#000', fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)', whiteSpace: 'nowrap' }}
              >
                MAIS POPULAR
              </div>
            )}
            <p
              className="font-bold"
              style={{ color: p.popular ? '#fff' : 'rgba(255,255,255,0.7)', fontSize: 'clamp(0.42rem, 1vw, 0.55rem)' }}
            >
              {p.nome}
            </p>
            <p className="font-bold text-white" style={{ fontSize: 'clamp(0.75rem, 2vw, 1rem)' }}>{p.preco}</p>
            <div className="flex items-center gap-1">
              <svg viewBox="0 0 24 24" fill="none" stroke={p.color} strokeWidth={2} strokeLinecap="round" style={{ width: 9, height: 9, flexShrink: 0 }}>
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              <span style={{ color: p.color, fontSize: 'clamp(0.35rem, 0.8vw, 0.46rem)', fontWeight: 700 }}>
                {p.interacoes} interações
              </span>
            </div>
            <span className="text-white/35" style={{ fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)' }}>{p.porUso}</span>
            <span className="text-white/25" style={{ fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)' }}>Pagamento via PIX</span>
          </div>
        ))}
      </div>
    </div>
  )
}
