'use client'
// components/LeadDemo/LeadDemoTourOverlay.tsx

import { useEffect, useRef, useState } from 'react'
import { STAGE2_SCRIPT }  from '@/lib/tour/stage2-script'
import TourCarrossel      from './tour/TourCarrossel'
import TourAssistente     from './tour/TourAssistente'
import TourModos          from './tour/TourModos'

export type TourType = 'carrossel' | 'assistente' | 'modos'

interface Props {
  type:    TourType
  onClose: () => void
  theme?:  'dark' | 'light'
}

export function getTourScript(type: TourType) {
  if (type === 'carrossel')  return STAGE2_SCRIPT.find(s => s.id === 'assistente-carrossel')!
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

const TOUR_LABELS: Record<TourType, string> = {
  carrossel:  'Carrossel de Categorias',
  assistente: 'A Página do Assistente',
  modos:      'Modos do Assistente',
}

export function LeadDemoTourOverlay({ type, onClose, theme = 'dark' }: Props) {
  const [visible, setVisible] = useState(false)
  const closedRef             = useRef(false)
  const script                = getTourScript(type)
  const isDark                = theme !== 'light'

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

useEffect(() => {
  // Rede de segurança: só dispara se o áudio nunca emitir onended/onerror
  // (ex.: play() bloqueado, erro silencioso). Margem generosa de propósito.
  const safetyMs = script.fallbackDuration + 25000
  const t = setTimeout(handleClose, safetyMs)
  return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [script.fallbackDuration])

  const handleClose = () => {
    if (closedRef.current) return
    closedRef.current = true
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
    setVisible(false)
    setTimeout(onClose, 300)
  }

  const overlayBg = isDark
    ? 'rgba(2, 6, 23, 0.94)'
    : 'rgba(241, 245, 249, 0.96)'

  const borderColor = isDark
    ? 'rgba(255,255,255,0.06)'
    : 'rgba(0,0,0,0.07)'

  const labelColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)'
  const closeBtnClass = isDark
    ? 'text-white/50 hover:text-white hover:bg-white/10'
    : 'text-black/50 hover:text-black hover:bg-black/8'
  const hintColor = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.25)'
  const dotColor  = isDark ? '#60a5fa' : '#3b82f6'

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        background:     overlayBg,
        backdropFilter: 'blur(12px)',
        opacity:        visible ? 1 : 0,
        transition:     'opacity 0.3s ease',
      }}
    >
      {/* Barra superior */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: `1px solid ${borderColor}` }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: dotColor, animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' }}
          />
          <span className="text-sm font-medium" style={{ color: labelColor }}>
            {TOUR_LABELS[type]}
          </span>
        </div>

        <button
          onClick={handleClose}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all text-sm font-medium ${closeBtnClass}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            strokeLinecap="round" className="w-4 h-4">
            <line x1="18" y1="6"  x2="6"  y2="18" />
            <line x1="6"  y1="6"  x2="18" y2="18" />
          </svg>
          Fechar
        </button>
      </div>

      {/* Conteúdo — preenche tudo */}
      <div className="flex-1 flex flex-col min-h-0 p-3 overflow-hidden">
        <div className="w-full h-full">
          {type === 'carrossel'  && <TourCarrossel  theme={theme} />}
          {type === 'assistente' && <TourAssistente theme={theme} />}
          {type === 'modos'      && <TourModos      theme={theme} />}
        </div>
      </div>

      {/* Dica inferior */}
      <div className="px-6 pb-3 flex-shrink-0 text-center">
        <p className="text-xs" style={{ color: hintColor }}>
          Fecha automaticamente · Toque em Fechar para continuar
        </p>
      </div>
    </div>
  )
}