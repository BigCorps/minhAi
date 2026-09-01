'use client'
// components/tour/scenes/SceneFuncoesConclusao.tsx

import { useEffect, useState } from 'react'

const BG = 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)'

const STATS = [
  { label: 'Funções',    value: '+105',  color: '#32bcad' },
  { label: 'Categorias', value: '14',    color: '#8b5cf6' },
  { label: 'Auxiliares',     value: '10',     color: '#a78bfa' },
  { label: 'Premium',    value: '18',    color: '#f59e0b' },
]

export default function SceneFuncoesConclusao() {
  const [visible, setVisible] = useState(0)
  const [phraseVisible, setPhraseVisible] = useState(false)

  useEffect(() => {
    if (visible >= STATS.length) return
    const t = setTimeout(() => setVisible(v => v + 1), 400)
    return () => clearTimeout(t)
  }, [visible])

  useEffect(() => {
    if (visible < STATS.length) return
    const t = setTimeout(() => setPhraseVisible(true), 500)
    return () => clearTimeout(t)
  }, [visible])

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col items-center justify-center select-none gap-4 px-4"
      style={{ background: BG }}
    >
      {/* Título */}
      <div className="text-center flex-shrink-0">
        <p className="text-white/40 font-semibold uppercase tracking-widest" style={{ fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)' }}>
          Funções e Habilidades
        </p>
        <p className="font-bold text-white" style={{ fontSize: 'clamp(0.75rem, 2vw, 1.1rem)' }}>
          Ativadas só quando <span style={{ color: '#32bcad' }}>fazem sentido</span>
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 w-full max-w-xs">
        {STATS.slice(0, visible).map((s, i) => (
          <div
            key={s.label}
            className="flex flex-col items-center gap-1 rounded-xl p-3"
            style={{ background: `${s.color}10`, border: `1px solid ${s.color}20` }}
          >
            <p className="font-bold" style={{ fontSize: 'clamp(0.75rem, 2vw, 1rem)', color: s.color }}>
              {s.value}
            </p>
            <p className="text-white/40 text-center" style={{ fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)' }}>
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Frase */}
      {phraseVisible && (
        <div
          className="text-center max-w-xs flex-shrink-0"
          style={{ opacity: phraseVisible ? 1 : 0, transition: 'opacity 600ms ease' }}
        >
          <p className="text-white/60 italic" style={{ fontSize: 'clamp(0.48rem, 1.1vw, 0.62rem)', lineHeight: 1.6 }}>
            "Realmente uma IA pra chamar de sua!"
          </p>
        </div>
      )}
    </div>
  )
}
