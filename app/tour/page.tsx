'use client'
// app/tour/page.tsx
// Stage 1 = Apresentação
// Stage 2 = Auxiliares de IA       → TourStage3
// Stage 3 = Página do Assistente   → TourStage2
// Stage 4 = Do Zero ao Ar          → (futuro)

import { useState, useCallback } from 'react'
import TourStage1 from '@/components/tour/TourStage1'
import TourStage2 from '@/components/tour/TourStage2'
import TourStage3 from '@/components/tour/TourStage3'
import TourManager from '@/components/tour/TourManager'

type PageState = 'playing' | 'selecting'

export default function TourPage() {
  const [pageState, setPageState]       = useState<PageState>('playing')
  const [activeStage, setActiveStage]   = useState(1)
  const [currentTheme, setCurrentTheme] = useState<'dark' | 'light'>('dark')

  const handleComplete    = useCallback(() => setPageState('selecting'), [])
  const handleSelectStage = useCallback((stage: number) => {
    setActiveStage(stage)
    setPageState('playing')
  }, [])
  const handleThemeChange = useCallback((t: 'dark' | 'light') => setCurrentTheme(t), [])

  // Stage 2 (Auxiliares) → TourStage3
  // Stage 3 (Página do Assistente) → TourStage2
  return (
    <>
      {pageState === 'playing' && activeStage === 1 && (
        <TourStage1 key="s1" initialTheme={currentTheme} onComplete={handleComplete} onThemeChange={handleThemeChange} />
      )}
      {pageState === 'playing' && activeStage === 2 && (
        <TourStage3 key="s2" initialTheme={currentTheme} onComplete={handleComplete} onThemeChange={handleThemeChange} />
      )}
      {pageState === 'playing' && activeStage === 3 && (
        <TourStage2 key="s3" initialTheme={currentTheme} onComplete={handleComplete} onThemeChange={handleThemeChange} />
      )}
      {pageState === 'selecting' && (
        <TourManager
          activeStage={activeStage}
          initialTheme={currentTheme}
          onSelectStage={handleSelectStage}
          onClose={() => setPageState('playing')}
        />
      )}
    </>
  )
}