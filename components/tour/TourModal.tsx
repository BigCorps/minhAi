'use client'
// components/tour/TourModal.tsx
//
// Monta o TourStage1 em um overlay fullscreen via createPortal.
// Gerencia 3 estados internos:
//   'playing'   → TourStage1 visível e tocando
//   'selecting' → TourManager visível (pausa ou fim)
//   'closed'    → desmontado (controlado pelo pai)

import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import TourStage1 from './TourStage1'
import TourManager from './TourManager'

interface TourModalProps {
  isOpen: boolean
  onClose: () => void
  initialTheme?: 'dark' | 'light'
}

type ModalState = 'playing' | 'selecting'

export default function TourModal({ isOpen, onClose, initialTheme = 'dark' }: TourModalProps) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [modalState, setModalState] = useState<ModalState>('playing')
  const [activeStage, setActiveStage] = useState(1)
  const [currentTheme, setCurrentTheme] = useState<'dark' | 'light'>(initialTheme)
  const selectorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Monta no cliente (evita SSR mismatch com createPortal)
  useEffect(() => { setMounted(true) }, [])

  // Controla animação de entrada/saída
  useEffect(() => {
    if (isOpen) {
      setModalState('playing')
      setActiveStage(1)
      // Tick para acionar a transição CSS
      requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
    }
  }, [isOpen])

  // Pausa ou fim do stage → mostra seletor após 2s
  const handleStageComplete = useCallback(() => {
    selectorTimerRef.current = setTimeout(() => {
      setModalState('selecting')
    }, 2000)
  }, [])

  // Usuário escolhe um stage no seletor
  const handleSelectStage = useCallback((stage: number) => {
    setActiveStage(stage)
    setModalState('playing')
  }, [])

  // Fecha o modal — anima saída e notifica pai
  const handleClose = useCallback(() => {
    if (selectorTimerRef.current) clearTimeout(selectorTimerRef.current)
    setVisible(false)
    // Aguarda animação de saída antes de notificar pai
    setTimeout(onClose, 300)
  }, [onClose])

  useEffect(() => {
    return () => {
      if (selectorTimerRef.current) clearTimeout(selectorTimerRef.current)
    }
  }, [])

  // Bloqueia scroll do body quando aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!mounted || !isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        // Overlay escuro com blur
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 300ms ease',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      {/*
       * Container do tour — fullscreen no mobile, caixinha no desktop.
       * No desktop tem borda e border-radius para parecer modal.
       */}
      <div
        className="relative w-full h-full md:rounded-2xl md:overflow-hidden md:shadow-2xl"
        style={{
          maxWidth: '900px',
          maxHeight: '640px',
          transform: visible ? 'scale(1)' : 'scale(0.96)',
          transition: 'transform 300ms ease',
        }}
      >
        {/* ── TourStage1 ── */}
        {modalState === 'playing' && (
          <TourStage1
            key={`stage-${activeStage}`}
            initialTheme={currentTheme}
            autoPlay={true}
            onClose={handleClose}
            onComplete={handleStageComplete}
            onThemeChange={setCurrentTheme}
          />
        )}

        {/* ── TourManager (seletor de stages) ── */}
        {modalState === 'selecting' && (
          <TourManager
            activeStage={activeStage}
            initialTheme={currentTheme}
            onSelectStage={handleSelectStage}
            onClose={handleClose}
          />
        )}
      </div>
    </div>,
    document.body
  )
}
