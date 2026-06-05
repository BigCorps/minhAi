'use client'
// components/tour/TourModal.tsx

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

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (isOpen) {
      setModalState('playing')
      setActiveStage(1)
      requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
    }
  }, [isOpen])

  const handleStageComplete = useCallback(() => {
    selectorTimerRef.current = setTimeout(() => {
      setModalState('selecting')
    }, 2000)
  }, [])

  const handleSelectStage = useCallback((stage: number) => {
    setActiveStage(stage)
    setModalState('playing')
  }, [])

  const handleClose = useCallback(() => {
    if (selectorTimerRef.current) clearTimeout(selectorTimerRef.current)
    setVisible(false)
    setTimeout(onClose, 300)
  }, [onClose])

  useEffect(() => {
    return () => {
      if (selectorTimerRef.current) clearTimeout(selectorTimerRef.current)
    }
  }, [])

  // Fixa o body para que position:fixed escape do overflow:hidden da landing
  useEffect(() => {
    const landingWrapper = document.querySelector<HTMLElement>('[data-landing-wrapper]')
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
      if (landingWrapper) landingWrapper.style.overflow = 'visible'
    } else {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
      if (landingWrapper) landingWrapper.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
      if (landingWrapper) landingWrapper.style.overflow = ''
    }
  }, [isOpen])

  if (!mounted || !isOpen) return null

  return createPortal(
    /* Overlay escuro */
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        background: 'rgba(0,0,0,0.80)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 300ms ease',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      {/*
       * Container do tour — sempre 90vw × 90dvh.
       * Simples, sem media queries, sem max constraints complicados.
       * Rounded e shadow em todos os tamanhos para parecer modal.
       */}
      <div
        className="relative rounded-2xl overflow-hidden shadow-2xl"
        style={{
          width: '90vw',
          height: '90dvh',
          transform: visible
            ? 'scale(1)'
            : 'scale(0.95)',
          transition: 'transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {modalState === 'playing' && (
          <TourStage1
            key={`stage-${activeStage}`}
            initialTheme={currentTheme}
            autoPlay={true}
            inModal={true}
            onClose={handleClose}
            onComplete={handleStageComplete}
            onThemeChange={setCurrentTheme}
          />
        )}

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
