'use client'
// components/tour/scenes/SceneConclusaoZero.tsx
// Conclusão — checklist dos passos + contador < 5 min

import { useEffect, useState } from 'react'

const BG = 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'

const PASSOS = [
  { label: 'Conta criada',           time: '0:30' },
  { label: 'Assistente configurado', time: '2:15' },
  { label: 'Funções ativadas',       time: '3:40' },
  { label: 'Link publicado',         time: '4:10' },
  { label: 'WebApp no ar',           time: '4:48' },
]

export default function SceneConclusaoZero() {
  const [stepCount, setStepCount] = useState(0)
  const [showTotal, setShowTotal] = useState(false)

  useEffect(() => {
    if (stepCount >= PASSOS.length) return
    const t = setTimeout(() => setStepCount(v => v + 1), 500)
    return () => clearTimeout(t)
  }, [stepCount])

  useEffect(() => {
    if (stepCount < PASSOS.length) return
    const t = setTimeout(() => setShowTotal(true), 500)
    return () => clearTimeout(t)
  }, [stepCount])

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col items-center justify-center select-none gap-3 px-4"
      style={{ background: BG }}
    >
      {/* Timer grande */}
      <div className="text-center flex-shrink-0">
        <p className="text-white/40 font-semibold uppercase tracking-widest" style={{ fontSize: 'clamp(0.42rem, 1vw, 0.55rem)' }}>
          Tempo total
        </p>
        <p
          className="font-bold"
          style={{
            fontSize: 'clamp(2rem, 8vw, 4rem)',
            background: 'linear-gradient(135deg, #84cc16, #10b981)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            lineHeight: 1.1,
          }}
        >
          4:48
        </p>
        <p className="text-white/30" style={{ fontSize: 'clamp(0.42rem, 1vw, 0.55rem)' }}>
          Do zero ao assistente funcionando
        </p>
      </div>

      {/* Checklist */}
      <div className="w-full max-w-xs flex flex-col gap-1.5">
        {PASSOS.slice(0, stepCount).map((p, i) => (
          <div
            key={p.label}
            className="flex items-center gap-2 rounded-xl px-3 py-1.5"
            style={{
              background: 'rgba(132,204,22,0.08)',
              border: '1px solid rgba(132,204,22,0.2)',
              opacity: 1,
              transition: 'all 300ms ease',
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="#84cc16" strokeWidth={2.5} strokeLinecap="round" className="w-3 h-3 flex-shrink-0">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span className="text-white/70 flex-1" style={{ fontSize: 'clamp(0.42rem, 1vw, 0.55rem)' }}>{p.label}</span>
            <span className="text-white/30 font-mono" style={{ fontSize: 'clamp(0.38rem, 0.85vw, 0.5rem)' }}>{p.time}</span>
          </div>
        ))}
      </div>

      {/* CTA final */}
      {showTotal && (
        <div
          className="text-center flex-shrink-0"
          style={{ opacity: showTotal ? 1 : 0, transition: 'opacity 400ms ease' }}
        >
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 font-bold text-white"
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #10b981)',
              fontSize: 'clamp(0.52rem, 1.2vw, 0.68rem)',
              boxShadow: '0 4px 20px rgba(59,130,246,0.3)',
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" className="w-3.5 h-3.5">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
            Comece grátis agora
          </div>
          <p className="text-white/25 mt-1.5" style={{ fontSize: 'clamp(0.35rem, 0.8vw, 0.44rem)' }}>
            Sem cartão · Sem código · Sem contrato
          </p>
        </div>
      )}
    </div>
  )
}