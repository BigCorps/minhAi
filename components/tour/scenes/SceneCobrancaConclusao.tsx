'use client'
// components/tour/scenes/SceneCobrancaConclusao.tsx

import { useEffect, useState } from 'react'

const BG = 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)'

const METODOS = [
  { label: 'PIX',   desc: 'QR Code instantâneo',    color: '#32bcad', value: 'R$ 258,30' },
  { label: 'TEF',   desc: 'Maquininha Point',        color: '#3b82f6', value: 'R$ 149,70' },
  { label: 'NFC',   desc: 'Aproximar no Android',    color: '#8b5cf6', value: 'R$ 89,50'  },
  { label: 'Links', desc: 'PIX e InfinitePay',       color: '#f59e0b', value: 'R$ 57,50'  },
]

export default function SceneCobrancaConclusao() {
  const [visible, setVisible] = useState(0)
  const [totalVisible, setTotalVisible] = useState(false)

  useEffect(() => {
    if (visible >= METODOS.length) return
    const t = setTimeout(() => setVisible(v => v + 1), 400)
    return () => clearTimeout(t)
  }, [visible])

  useEffect(() => {
    if (visible < METODOS.length) return
    const t = setTimeout(() => setTotalVisible(true), 500)
    return () => clearTimeout(t)
  }, [visible])

  const total = 555.00

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col items-center justify-center select-none gap-3 px-4"
      style={{ background: BG }}
    >
      {/* Título */}
      <div className="text-center flex-shrink-0">
        <p className="text-white/40 font-semibold uppercase tracking-widest" style={{ fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)' }}>
          Recebimentos do dia
        </p>
        <p className="font-bold text-white" style={{ fontSize: 'clamp(0.75rem, 2vw, 1.1rem)' }}>
          Todas as formas, <span style={{ color: '#32bcad' }}>um só lugar</span>
        </p>
      </div>

      {/* Grid métodos */}
      <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
        {METODOS.slice(0, visible).map((m, i) => (
          <div
            key={m.label}
            className="rounded-xl p-3 flex flex-col gap-1"
            style={{
              background: `${m.color}08`,
              border: `1px solid ${m.color}20`,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-white" style={{ fontSize: 'clamp(0.48rem, 1.1vw, 0.62rem)' }}>{m.label}</span>
              <span className="font-bold" style={{ color: m.color, fontSize: 'clamp(0.42rem, 1vw, 0.55rem)' }}>{m.value}</span>
            </div>
            <span className="text-white/35" style={{ fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)' }}>{m.desc}</span>
          </div>
        ))}
      </div>

      {/* Total */}
      {totalVisible && (
        <div
          className="w-full max-w-xs rounded-xl px-4 py-3 flex items-center justify-between flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, rgba(50,188,173,0.15), rgba(16,185,129,0.1))',
            border: '1px solid rgba(50,188,173,0.3)',
            opacity: totalVisible ? 1 : 0,
            transition: 'opacity 400ms ease',
          }}
        >
          <div>
            <p className="text-white/40" style={{ fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)' }}>Total recebido hoje</p>
            <p className="font-bold text-white" style={{ fontSize: 'clamp(0.75rem, 2vw, 1rem)', color: '#32bcad' }}>
              R$ {total.toFixed(2).replace('.', ',')}
            </p>
          </div>
          <div
            className="rounded-full px-3 py-1.5 font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #32bcad, #10b981)', fontSize: 'clamp(0.35rem, 0.8vw, 0.46rem)' }}
          >
            Sacar agora
          </div>
        </div>
      )}
    </div>
  )
}
