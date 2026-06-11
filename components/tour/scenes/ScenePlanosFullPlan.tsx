'use client'
// components/tour/scenes/ScenePlanosFullPlan.tsx

import { useEffect, useState } from 'react'

const BG = 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)'

const FEATURES = [
  { label: 'Créditos Ilimitados',        icon: '⚡', color: '#f59e0b' },
  { label: 'Landing Page Personalizada', icon: '🌐', color: '#3b82f6' },
  { label: 'Implementação incluída',     icon: '🛠️', color: '#10b981' },
  { label: 'White Label',                icon: '🏷️', color: '#8b5cf6' },
  { label: 'Domínio e Subdomínios',      icon: '🔗', color: '#32bcad' },
  { label: 'Configuração completa',      icon: '⚙️', color: '#6366f1' },
  { label: 'Suporte 24 horas',           icon: '🆘', color: '#ef4444' },
]

const IDEAL = ['Agências', 'Franquias', 'Grandes operações', 'Revendedores']

export default function ScenePlanosFullPlan() {
  const [featVisible, setFeatVisible] = useState(0)
  const [idealVisible, setIdealVisible] = useState(false)

  useEffect(() => {
    if (featVisible >= FEATURES.length) return
    const t = setTimeout(() => setFeatVisible(v => v + 1), 300)
    return () => clearTimeout(t)
  }, [featVisible])

  useEffect(() => {
    if (featVisible < FEATURES.length) return
    const t = setTimeout(() => setIdealVisible(true), 400)
    return () => clearTimeout(t)
  }, [featVisible])

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none"
      style={{ background: BG }}
    >
      {/* Header */}
      <div
        className="px-3 py-2.5 flex-shrink-0 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, rgba(176,203,31,0.15), rgba(59,130,246,0.1))', borderBottom: '1px solid rgba(176,203,31,0.2)' }}
      >
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-2 h-2 rounded-full" style={{ background: '#b0cb1f' }} />
            <span className="font-bold text-white" style={{ fontSize: 'clamp(0.55rem, 1.3vw, 0.72rem)' }}>Plano Full</span>
          </div>
          <p className="text-white/40" style={{ fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)' }}>Solução completa personalizada</p>
        </div>
        <button
          className="rounded-xl px-3 py-1.5 font-bold text-white flex-shrink-0"
          style={{ background: '#b0cb1f', color: '#0f172a', fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)' }}
        >
          Falar com consultor
        </button>
      </div>

      <div className="flex-1 min-h-0 flex gap-3 px-3 py-3 overflow-hidden">

        {/* Features */}
        <div className="flex-1 flex flex-col gap-1.5 overflow-hidden">
          <p className="text-white/40 uppercase font-semibold tracking-wider flex-shrink-0" style={{ fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)' }}>
            Incluído no plano
          </p>
          {FEATURES.slice(0, featVisible).map((f, i) => (
            <div
              key={f.label}
              className="flex items-center gap-2 rounded-xl px-2.5 py-1.5"
              style={{ background: `${f.color}08`, border: `1px solid ${f.color}20` }}
            >
              <span style={{ fontSize: '0.7rem' }}>{f.icon}</span>
              <span className="font-semibold text-white/70" style={{ fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)' }}>{f.label}</span>
            </div>
          ))}
        </div>

        {/* Ideal para */}
        {idealVisible && (
          <div
            className="flex-shrink-0 flex flex-col gap-1.5 overflow-hidden"
            style={{ width: 'clamp(90px, 35%, 130px)', opacity: idealVisible ? 1 : 0, transition: 'opacity 400ms ease' }}
          >
            <p className="text-white/40 uppercase font-semibold tracking-wider flex-shrink-0" style={{ fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)' }}>
              Ideal para
            </p>
            {IDEAL.map((item, i) => (
              <div
                key={item}
                className="rounded-xl px-2.5 py-2 flex items-center gap-1.5"
                style={{ background: 'rgba(176,203,31,0.08)', border: '1px solid rgba(176,203,31,0.2)' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="#b0cb1f" strokeWidth={2.5} strokeLinecap="round" style={{ width: 9, height: 9, flexShrink: 0 }}>
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span className="font-semibold text-white/70" style={{ fontSize: 'clamp(0.35rem, 0.8vw, 0.46rem)' }}>{item}</span>
              </div>
            ))}

            {/* White label destaque */}
            <div
              className="rounded-xl p-2.5 mt-auto"
              style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)' }}
            >
              <p className="font-bold" style={{ color: '#a78bfa', fontSize: 'clamp(0.35rem, 0.8vw, 0.46rem)' }}>White Label</p>
              <p className="text-white/35" style={{ fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)' }}>Sua marca, sua identidade</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
