'use client'
// components/tour/TourTrigger.tsx

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
  /**
   * Quando true, exibe um X para dispensar o botão.
   * Usado no mobile onde o trigger flutua sobre o DomainPreviewPicker.
   */
  dismissible?: boolean
}

export default function TourTrigger({
  theme = 'dark',
  delay = 5000,
  dismissible = false,
}: TourTriggerProps) {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const isDark = theme === 'dark'

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  const handleOpen = useCallback(() => {
    unlockAudioContext()
    setModalOpen(true)
  }, [])

  const handleClose = useCallback(() => {
    setModalOpen(false)
  }, [])

  const handleDismiss = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setDismissed(true)
  }, [])

  // Dispensado ou ainda não apareceu: não renderiza nada (deixa o picker visível)
  if (dismissed || !visible) return null

  return (
    <>
      {/* ── Wrapper do botão + X ── */}
      <div className="flex items-center gap-1.5">
        {/* Botão principal */}
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
              style={{
                width: 'clamp(10px, 1.5vw, 13px)',
                height: 'clamp(10px, 1.5vw, 13px)',
                marginLeft: '1px',
              }}
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>

          <span>Como Funciono? <span className="font-bold">Fazer Tour</span></span>

          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="flex-shrink-0 transition-transform duration-300 group-hover:translate-x-0.5"
            style={{
              width: 'clamp(12px, 1.8vw, 15px)',
              height: 'clamp(12px, 1.8vw, 15px)',
            }}
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>

        {/* Botão X para dispensar — só quando dismissible */}
        {dismissible && (
          <button
            onClick={handleDismiss}
            aria-label="Fechar sugestão de tour"
            className="flex items-center justify-center rounded-full flex-shrink-0 transition-all duration-200 hover:scale-110 active:scale-95"
            style={{
              width: 28,
              height: 28,
              background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="w-3 h-3">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
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
