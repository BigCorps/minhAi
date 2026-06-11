'use client'
// components/tour/scenes/ScenePlanosFullPlan.tsx

import { useEffect, useState } from 'react'

const BG = 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)'

const FEATURES = [
  {
    label: 'Créditos Ilimitados',
    color: '#f59e0b',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth={2} strokeLinecap="round" style={{ width: 14, height: 14, flexShrink: 0 }}>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    ),
  },
  {
    label: 'Landing Page Personalizada',
    color: '#3b82f6',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinecap="round" style={{ width: 14, height: 14, flexShrink: 0 }}>
        <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
    ),
  },
  {
    label: 'Implementação incluída',
    color: '#10b981',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth={2} strokeLinecap="round" style={{ width: 14, height: 14, flexShrink: 0 }}>
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
      </svg>
    ),
  },
  {
    label: 'Domínio e Subdomínios',
    color: '#32bcad',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#32bcad" strokeWidth={2} strokeLinecap="round" style={{ width: 14, height: 14, flexShrink: 0 }}>
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>
    ),
  },
  {
    label: 'Configuração completa',
    color: '#6366f1',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth={2} strokeLinecap="round" style={{ width: 14, height: 14, flexShrink: 0 }}>
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  },
  {
    label: 'Suporte 24 horas',
    color: '#ef4444',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={2} strokeLinecap="round" style={{ width: 14, height: 14, flexShrink: 0 }}>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.78a16 16 0 0 0 6.29 6.29l.97-.97a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
      </svg>
    ),
  },
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
        className="px-4 py-3 flex-shrink-0 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, rgba(176,203,31,0.15), rgba(59,130,246,0.1))', borderBottom: '1px solid rgba(176,203,31,0.2)' }}
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#b0cb1f' }} />
            <span className="font-bold text-white" style={{ fontSize: 'clamp(0.75rem, 1.8vw, 1rem)' }}>Plano Full</span>
          </div>
          <p className="text-white/40" style={{ fontSize: 'clamp(0.45rem, 1vw, 0.6rem)' }}>Solução completa personalizada</p>
        </div>
        <div
          className="rounded-xl px-3 py-1.5 font-bold flex-shrink-0"
          style={{ background: 'rgba(176,203,31,0.15)', border: '1px solid rgba(176,203,31,0.3)', color: '#b0cb1f', fontSize: 'clamp(0.45rem, 1vw, 0.6rem)' }}
        >
          Falar com consultor
        </div>
      </div>

      <div className="flex-1 min-h-0 flex gap-3 px-4 py-4 overflow-hidden">

        {/* Features */}
        <div className="flex-1 flex flex-col gap-2 overflow-hidden">
          <p className="text-white/40 uppercase font-semibold tracking-wider flex-shrink-0" style={{ fontSize: 'clamp(0.42rem, 0.95vw, 0.55rem)' }}>
            Incluído no plano
          </p>
          <div className="flex-1 flex flex-col justify-between">
            {FEATURES.slice(0, featVisible).map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-3 rounded-xl px-3 py-0"
                style={{
                  background: `${f.color}0d`,
                  border: `1px solid ${f.color}25`,
                  height: `calc((100%) / ${FEATURES.length})`,
                  minHeight: 0,
                  alignItems: 'center',
                }}
              >
                {f.icon}
                <span className="font-semibold text-white/80" style={{ fontSize: 'clamp(0.5rem, 1.1vw, 0.65rem)' }}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Ideal para */}
        <div
          className="flex-shrink-0 flex flex-col gap-2 overflow-hidden"
          style={{ width: 'clamp(100px, 36%, 140px)', opacity: idealVisible ? 1 : 0, transition: 'opacity 400ms ease' }}
        >
          <p className="text-white/40 uppercase font-semibold tracking-wider flex-shrink-0" style={{ fontSize: 'clamp(0.42rem, 0.95vw, 0.55rem)' }}>
            Ideal para
          </p>
          <div className="flex-1 flex flex-col justify-between">
            {IDEAL.map((item) => (
              <div
                key={item}
                className="rounded-xl px-3 flex items-center gap-2"
                style={{
                  background: 'rgba(176,203,31,0.08)',
                  border: '1px solid rgba(176,203,31,0.2)',
                  height: `calc(100% / ${IDEAL.length} - 6px)`,
                  minHeight: 0,
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="#b0cb1f" strokeWidth={2.5} strokeLinecap="round" style={{ width: 12, height: 12, flexShrink: 0 }}>
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span className="font-semibold text-white/75" style={{ fontSize: 'clamp(0.48rem, 1.1vw, 0.63rem)' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
