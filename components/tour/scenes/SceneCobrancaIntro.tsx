'use client'
// components/tour/scenes/SceneCobrancaIntro.tsx

import { useEffect, useState } from 'react'

const BG = 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)'

const METODOS = [
  {
    id: 'pix',
    label: 'PIX',
    desc: 'QR Code instantâneo',
    color: '#32bcad',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" style={{ width: '100%', height: '100%' }}>
        <path d="M10 3H6a2 2 0 00-2 2v4m6-6h8a2 2 0 012 2v4M10 3v18m0 0H6a2 2 0 01-2-2v-4m6 6h8a2 2 0 002-2v-4M3 10h18M3 14h18"/>
      </svg>
    ),
  },
  {
    id: 'tef',
    label: 'TEF',
    desc: 'Maquininha Point',
    color: '#3b82f6',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" style={{ width: '100%', height: '100%' }}>
        <rect x="2" y="5" width="20" height="14" rx="2"/>
        <line x1="2" y1="10" x2="22" y2="10"/>
        <line x1="6" y1="15" x2="10" y2="15"/>
        <line x1="14" y1="15" x2="18" y2="15"/>
      </svg>
    ),
  },
  {
    id: 'nfc',
    label: 'NFC',
    desc: 'Aproxime o cartão',
    color: '#8b5cf6',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" style={{ width: '100%', height: '100%' }}>
        <rect x="5" y="2" width="14" height="20" rx="2"/>
        <path d="M12 18h.01"/>
        <path d="M8.5 7.5A5 5 0 0115.5 7.5"/>
        <path d="M10.5 9.5A2.5 2.5 0 0113.5 9.5"/>
      </svg>
    ),
  },
  {
    id: 'link',
    label: 'Links',
    desc: 'PIX e InfinitePay',
    color: '#f59e0b',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" style={{ width: '100%', height: '100%' }}>
        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
      </svg>
    ),
  },
]

export default function SceneCobrancaIntro() {
  const [visible, setVisible] = useState(0)
  const [totalVisible, setTotalVisible] = useState(false)

  useEffect(() => {
    if (visible >= METODOS.length) return
    const t = setTimeout(() => setVisible(v => v + 1), 400)
    return () => clearTimeout(t)
  }, [visible])

  useEffect(() => {
    if (visible < METODOS.length) return
    const t = setTimeout(() => setTotalVisible(true), 400)
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
          Formas de pagamento
        </p>
        <p className="font-bold text-white" style={{ fontSize: 'clamp(0.75rem, 2vw, 1.1rem)' }}>
          Receba de <span style={{ color: '#32bcad' }}>qualquer jeito</span>
        </p>
      </div>

      {/* Grid 2×2 */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
        {METODOS.slice(0, visible).map((m, i) => (
          <div
            key={m.id}
            className="flex flex-col items-center gap-2 rounded-2xl p-4"
            style={{
              background: `${m.color}10`,
              border: `1px solid ${m.color}25`,
            }}
          >
            <div
              className="rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                width: 'clamp(28px, 5vw, 36px)',
                height: 'clamp(28px, 5vw, 36px)',
                background: `${m.color}20`,
                color: m.color,
                padding: 6,
              }}
            >
              {m.icon}
            </div>
            <p className="font-bold text-white text-center" style={{ fontSize: 'clamp(0.55rem, 1.3vw, 0.72rem)' }}>
              {m.label}
            </p>
            <p className="text-white/40 text-center" style={{ fontSize: 'clamp(0.35rem, 0.8vw, 0.46rem)' }}>
              {m.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Rodapé */}
      {totalVisible && (
        <div
          className="flex items-center gap-2 rounded-full px-4 py-1.5 flex-shrink-0"
          style={{
            background: 'rgba(50,188,173,0.12)',
            border: '1px solid rgba(50,188,173,0.25)',
            opacity: totalVisible ? 1 : 0,
            transition: 'opacity 400ms ease',
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="#32bcad" strokeWidth={2.5} strokeLinecap="round" className="w-3 h-3 flex-shrink-0">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span className="text-white/60 font-medium" style={{ fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)' }}>
            Tudo integrado, sem aplicativo extra
          </span>
        </div>
      )}
    </div>
  )
}
