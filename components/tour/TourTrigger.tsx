'use client'
// components/tour/TourTrigger.tsx
//
// Botão "Como Funciono?" que aparece após 5s na landing page.
// Abre o TourModal com autoPlay=true.
// O unlockAudioContext roda no clique — mesmo contexto do gesto do usuário.

import { useState, useEffect, useCallback } from 'react'
import TourModal from './TourModal'

function unlockAudioContext(): void {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const buffer = ctx.createBuffer(1, 1024, 22050)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    source.start(0)
    if (ctx.state === 'suspended') ctx.resume()
  } catch {
    // SSR ou sem Web Audio API
  }
}

interface TourTriggerProps {
  theme?: 'dark' | 'light'
  /** Delay em ms antes de aparecer. Padrão: 5000 */
  delay?: number
}

export default function TourTrigger({ theme = 'dark', delay = 5000 }: TourTriggerProps) {
  const [visible, setVisible] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const isDark = theme === 'dark'

  // Aparece após delay
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  const handleOpen = useCallback(() => {
    // Desbloqueia áudio de forma síncrona no clique
    unlockAudioContext()
    setModalOpen(true)
  }, [])

  const handleClose = useCallback(() => {
    setModalOpen(false)
  }, [])

  return (
    <>
      {/* ── Botão trigger ── */}
      <div
        className="flex justify-center w-full"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 600ms ease, transform 600ms ease',
          pointerEvents: visible ? 'auto' : 'none',
        }}
      >
        <button
          onClick={handleOpen}
          className="group flex items-center gap-2.5 rounded-full font-semibold transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          style={{
            padding: 'clamp(8px, 1.5vw, 12px) clamp(16px, 3vw, 28px)',
            fontSize: 'clamp(0.78rem, 1.8vw, 0.95rem)',
            background: isDark
              ? 'rgba(59,130,246,0.15)'
              : 'rgba(59,130,246,0.08)',
            border: `1.5px solid ${isDark ? 'rgba(59,130,246,0.4)' : 'rgba(59,130,246,0.3)'}`,
            color: isDark ? '#60a5fa' : '#2563eb',
            boxShadow: isDark
              ? '0 4px 24px rgba(59,130,246,0.15)'
              : '0 4px 24px rgba(59,130,246,0.08)',
          }}
        >
          {/* Ícone play */}
          <span
            className="flex items-center justify-center rounded-full flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
            style={{
              width: 'clamp(22px, 3vw, 28px)',
              height: 'clamp(22px, 3vw, 28px)',
              background: isDark ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.15)',
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              style={{ width: 'clamp(10px, 1.5vw, 13px)', height: 'clamp(10px, 1.5vw, 13px)', marginLeft: '1px' }}
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>

          {/* Texto */}
          <span>Como Funciono? <span className="font-bold">Fazer Tour</span></span>

          {/* Seta */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="flex-shrink-0 transition-transform duration-300 group-hover:translate-x-0.5"
            style={{ width: 'clamp(12px, 1.8vw, 15px)', height: 'clamp(12px, 1.8vw, 15px)' }}
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* ── Modal ── */}
      <TourModal
        isOpen={modalOpen}
        onClose={handleClose}
        initialTheme={theme}
      />
    </>
  )
}
