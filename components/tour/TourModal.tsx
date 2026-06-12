'use client'
// components/tour/TourModal.tsx
// Versão com prop startOnMenu — abre direto no TourManager sem autoPlay

import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import TourStage1 from './TourStage1'
import TourStage2 from './TourStage2'
import TourStage3 from './TourStage3'
import TourStage4 from './TourStage4'
import TourStage5 from './TourStage5'
import TourStage6 from './TourStage6'
import TourStage7 from './TourStage7'
import TourStage8 from './TourStage8'
import TourManager from './TourManager'

interface TourModalProps {
  isOpen: boolean
  onClose: () => void
  initialTheme?: 'dark' | 'light'
  /**
   * Quando true, abre diretamente no TourManager (menu de stages)
   * em vez de iniciar a reprodução do Stage 1.
   * Usado no botão Tour do DashboardHeader.
   */
  startOnMenu?: boolean
}

type ModalState = 'playing' | 'selecting'

export default function TourModal({
  isOpen,
  onClose,
  initialTheme = 'dark',
  startOnMenu = false,
}: TourModalProps) {
  const [mounted, setMounted]           = useState(false)
  const [visible, setVisible]           = useState(false)
  const [modalState, setModalState]     = useState<ModalState>(startOnMenu ? 'selecting' : 'playing')
  const [activeStage, setActiveStage]   = useState(1)
  const [currentTheme, setCurrentTheme] = useState<'dark' | 'light'>(initialTheme)
  const selectorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (isOpen) {
      // Se startOnMenu, vai direto para o menu; senão começa tocando o stage 1
      setModalState(startOnMenu ? 'selecting' : 'playing')
      setActiveStage(1)
      requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
    }
  }, [isOpen, startOnMenu])

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

  // Callback para o botão Menu dos TourControls — vai para o seletor
  const handleGoToMenu = useCallback(() => {
    if (selectorTimerRef.current) clearTimeout(selectorTimerRef.current)
    setModalState('selecting')
  }, [])

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
    // Passa o handler de menu para todos os stages — eles repassam para TourControls
    onGoToMenu: handleGoToMenu,
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
        {modalState === 'playing' && activeStage === 6 && <TourStage6 key="s6" {...stageProps} />}
        {modalState === 'playing' && activeStage === 7 && <TourStage7 key="s7" {...stageProps} />}
        {modalState === 'playing' && activeStage === 8 && <TourStage8 key="s8" {...stageProps} />}

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
