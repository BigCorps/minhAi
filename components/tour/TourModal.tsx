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

  // Ao abrir: fixa o body para que position:fixed escape do overflow:hidden da landing
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
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 300ms ease',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      {/*
       * Mobile: fullscreen real — w-full h-full sem max constraints, sem rounded.
       * Desktop (md+): caixinha centralizada com max-width/height e rounded.
       * Os constraints do desktop são aplicados via className, não inline style,
       * para que o mobile não herde maxWidth/maxHeight.
       */}
      <div
        className={[
          'relative w-full h-full',
          // Desktop only: limita tamanho e arredonda
          'md:w-auto md:h-auto md:rounded-2xl md:overflow-hidden md:shadow-2xl',
        ].join(' ')}
        style={{
          // Desktop: max constraints via style (Tailwind não tem md:max-h-[640px] sem config)
          maxWidth: 'min(900px, 100vw)',
          // No mobile maxHeight é 100% da tela — no desktop limita a 640px
          maxHeight: '100%',
          transform: visible
            ? 'translateY(0) scale(1)'
            : 'translateY(20px) scale(0.97)',
          transition: 'transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* Desktop: div adicional que aplica maxHeight de 640px apenas em md+ */}
        <div
          className="w-full h-full md:max-h-[640px]"
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
      </div>
    </div>,
    document.body
  )
}
