'use client'
// app/tour/page.tsx
// 1 = Apresentação       → TourStage1
// 2 = Auxiliares de IA   → TourStage3
// 3 = Página Assistente  → TourStage2
// 4 = Do Zero ao Ar      → TourStage4
// 5 = Meu Dashboard      → TourStage5

import { useState, useCallback } from 'react'
import TourStage1 from '@/components/tour/TourStage1'
import TourStage2 from '@/components/tour/TourStage2'
import TourStage3 from '@/components/tour/TourStage3'
import TourStage4 from '@/components/tour/TourStage4'
import TourStage5 from '@/components/tour/TourStage5'
import TourManager from '@/components/tour/TourManager'

type PageState = 'playing' | 'selecting'

export default function TourPage() {
  const [pageState, setPageState]       = useState<PageState>('playing')
  const [activeStage, setActiveStage]   = useState(1)
  const [currentTheme, setCurrentTheme] = useState<'dark' | 'light'>('dark')

  const handleComplete    = useCallback(() => setPageState('selecting'), [])
  const handleSelectStage = useCallback((stage: number) => { setActiveStage(stage); setPageState('playing') }, [])
  const handleThemeChange = useCallback((t: 'dark' | 'light') => setCurrentTheme(t), [])

  const common = { initialTheme: currentTheme, onComplete: handleComplete, onThemeChange: handleThemeChange }

  return (
    <>
      {pageState === 'playing' && activeStage === 1 && <TourStage1 key="s1" {...common} />}
      {pageState === 'playing' && activeStage === 2 && <TourStage3 key="s2" {...common} />}
      {pageState === 'playing' && activeStage === 3 && <TourStage2 key="s3" {...common} />}
      {pageState === 'playing' && activeStage === 4 && <TourStage4 key="s4" {...common} />}
      {pageState === 'playing' && activeStage === 5 && <TourStage5 key="s5" {...common} />}
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