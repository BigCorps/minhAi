'use client'
// components/LeadDemo/LeadDemoTourOverlay.tsx
//
// VERSÃO 2 — conteúdo ocupa a tela inteira (sem max-w nem max-h no container).
// Áudio gerenciado pelo pai (LeadDemoPageClient), que chama speak() dentro do
// contexto de gesto — garantindo funcionamento em iOS/Android.
// Este overlay apenas cancela o áudio ao fechar.

import { useEffect, useRef, useState } from 'react'
import { STAGE2_SCRIPT }  from '@/lib/tour/stage2-script'
import TourCarrossel      from './tour/TourCarrossel'
import TourAssistente     from './tour/TourAssistente'
import TourModos          from './tour/TourModos'

// ── Tipos ────────────────────────────────────────────────────────

export type TourType = 'carrossel' | 'assistente' | 'modos'

interface Props {
  type:    TourType
  onClose: () => void
}

// ── Helper: duração para o timer de auto-close ───────────────────

export function getTourScript(type: TourType) {
  if (type === 'carrossel') return STAGE2_SCRIPT.find(s => s.id === 'assistente-carrossel')!
  if (type === 'assistente') return STAGE2_SCRIPT.find(s => s.id === 'assistente-intro')!
  const v = STAGE2_SCRIPT.find(s => s.id === 'assistente-vendas')!
  const f = STAGE2_SCRIPT.find(s => s.id === 'assistente-fila')!
  const t = STAGE2_SCRIPT.find(s => s.id === 'assistente-totem')!
  return {
    id:               'assistente-modos' as any,
    label:            'Modos do Assistente',
    audioText:        `${v.audioText} ${f.audioText} ${t.audioText}`,
    fallbackDuration: v.fallbackDuration + f.fallbackDuration + t.fallbackDuration,
  }
}

// ── Labels ───────────────────────────────────────────────────────

const TOUR_LABELS: Record<TourType, string> = {
  carrossel:  'Carrossel de Categorias',
  assistente: 'A Página do Assistente',
  modos:      'Modos do Assistente',
}

// ── Componente ───────────────────────────────────────────────────

export function LeadDemoTourOverlay({ type, onClose }: Props) {
  const [visible, setVisible] = useState(false)
  const closedRef             = useRef(false)
  const script                = getTourScript(type)

  // Fade in logo após montagem
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  // Auto-fecha após fallbackDuration
  useEffect(() => {
    const t = setTimeout(handleClose, script.fallbackDuration)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [script.fallbackDuration])

  const handleClose = () => {
    if (closedRef.current) return
    closedRef.current = true

    // Cancela narração (iniciada no pai dentro do gesto)
    if (typeof window !== 'undefined') {
      window.speechSynthesis?.cancel()
    }

    setVisible(false)
    setTimeout(onClose, 300)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        background:     'rgba(2, 6, 23, 0.94)',
        backdropFilter: 'blur(10px)',
        opacity:        visible ? 1 : 0,
        transition:     'opacity 0.3s ease',
      }}
    >
      {/* ── Barra superior ── */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse flex-shrink-0" />
          <span className="text-white/60 text-sm font-medium">{TOUR_LABELS[type]}</span>
        </div>

        <button
          onClick={handleClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
                     text-white/50 hover:text-white hover:bg-white/10
                     transition-all text-sm font-medium"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            strokeLinecap="round" className="w-4 h-4">
            <line x1="18" y1="6"  x2="6"  y2="18" />
            <line x1="6"  y1="6"  x2="18" y2="18" />
          </svg>
          Fechar
        </button>
      </div>

      {/* ── Conteúdo — ocupa todo o espaço restante ──
          Sem max-w nem max-h: o TourAssistente preenche a tela
          igual ao assistente real. Os outros tours também ficam
          generosos.
      ── */}
      <div className="flex-1 flex flex-col min-h-0 p-3 overflow-hidden">
        <div className="w-full h-full">
          {type === 'carrossel'  && <TourCarrossel />}
          {type === 'assistente' && <TourAssistente />}
          {type === 'modos'      && <TourModos />}
        </div>
      </div>

      {/* ── Dica inferior ── */}
      <div className="px-6 pb-3 flex-shrink-0 text-center">
        <p className="text-white/20 text-xs">
          Fecha automaticamente · Toque em Fechar para continuar
        </p>
      </div>
    </div>
  )
}