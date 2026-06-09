'use client'
// app/tour/menu/page.tsx
// Abre direto no TourManager — útil para testes

import { useState, useCallback } from 'react'
import TourStage1 from '@/components/tour/TourStage1'
import TourStage2 from '@/components/tour/TourStage2'
import TourStage3 from '@/components/tour/TourStage3'
import TourStage4 from '@/components/tour/TourStage4'
import TourManager from '@/components/tour/TourManager'

type PageState = 'playing' | 'selecting'

export default function TourMenuPage() {
  const [pageState, setPageState]       = useState<PageState>('selecting')
  const [activeStage, setActiveStage]   = useState(1)
  const [currentTheme, setCurrentTheme] = useState<'dark' | 'light'>('dark')

  const handleComplete    = useCallback(() => setPageState('selecting'), [])
  const handleSelectStage = useCallback((stage: number) => {
    setActiveStage(stage)
    setPageState('playing')
  }, [])
  const handleThemeChange = useCallback((t: 'dark' | 'light') => setCurrentTheme(t), [])

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
      {pageState === 'playing' && activeStage === 4 && (
        <TourStage4 key="s4" initialTheme={currentTheme} onComplete={handleComplete} onThemeChange={handleThemeChange} />
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
