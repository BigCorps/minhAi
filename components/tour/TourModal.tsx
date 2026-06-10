'use client'
// components/tour/TourModal.tsx

import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import TourStage1 from './TourStage1'
import TourStage2 from './TourStage2'
import TourStage3 from './TourStage3'
import TourStage4 from './TourStage4'
import TourStage5 from './TourStage5'
import TourManager from './TourManager'

// Mapeamento: ID do stage no Manager → componente
// 1 = Apresentação       → TourStage1
// 2 = Auxiliares de IA   → TourStage3
// 3 = Página Assistente  → TourStage2
// 4 = Do Zero ao Ar      → TourStage4
// 5 = Meu Dashboard      → TourStage5

interface TourModalProps {
  isOpen: boolean
  onClose: () => void
  initialTheme?: 'dark' | 'light'
}

type ModalState = 'playing' | 'selecting'

export default function TourModal({ isOpen, onClose, initialTheme = 'dark' }: TourModalProps) {
  const [mounted, setMounted]           = useState(false)
  const [visible, setVisible]           = useState(false)
  const [modalState, setModalState]     = useState<ModalState>('playing')
  const [activeStage, setActiveStage]   = useState(1)
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
    selectorTimerRef.current = setTimeout(() => setModalState('selecting'), 2000)
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
    return () => { if (selectorTimerRef.current) clearTimeout(selectorTimerRef.current) }
  }, [])

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

  const stageProps = {
    initialTheme: currentTheme,
    autoPlay: true,
    inModal: true,
    onClose: handleClose,
    onComplete: handleStageComplete,
    onThemeChange: setCurrentTheme,
  }

  return createPortal(
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
      <div
        className="relative rounded-2xl overflow-hidden shadow-2xl w-[90vw] h-[90dvh] md:w-[80vw] md:h-[80dvh]"
        style={{
          transform: visible ? 'scale(1)' : 'scale(0.95)',
          transition: 'transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {modalState === 'playing' && activeStage === 1 && <TourStage1 key="s1" {...stageProps} />}
        {modalState === 'playing' && activeStage === 2 && <TourStage3 key="s2" {...stageProps} />}
        {modalState === 'playing' && activeStage === 3 && <TourStage2 key="s3" {...stageProps} />}
        {modalState === 'playing' && activeStage === 4 && <TourStage4 key="s4" {...stageProps} />}
        {modalState === 'playing' && activeStage === 5 && <TourStage5 key="s5" {...stageProps} />}

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