'use client'
// app/tour/page.tsx

import { useState, useCallback } from 'react'
import TourStage1 from '@/components/tour/TourStage1'
import TourStage2 from '@/components/tour/TourStage2'
import TourStage3 from '@/components/tour/TourStage3'
import TourStage4 from '@/components/tour/TourStage4'
import TourStage5 from '@/components/tour/TourStage5'
import TourStage6 from '@/components/tour/TourStage6'
import TourStage7 from '@/components/tour/TourStage7'
import TourStage8 from '@/components/tour/TourStage8'
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
      {pageState === 'playing' && activeStage === 6 && <TourStage6 key="s6" {...common} />}
      {pageState === 'playing' && activeStage === 7 && <TourStage7 key="s7" {...common} />}
      {pageState === 'playing' && activeStage === 8 && <TourStage8 key="s8" {...common} />}
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
