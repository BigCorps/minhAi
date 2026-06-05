'use client'
// app/tour/page.tsx

import { useState, useCallback } from 'react'
import TourStage1 from '@/components/tour/TourStage1'
import TourStage2 from '@/components/tour/TourStage2'
import TourManager from '@/components/tour/TourManager'

type PageState = 'playing' | 'selecting'

export default function TourPage() {
  const [pageState, setPageState]     = useState<PageState>('playing')
  const [activeStage, setActiveStage] = useState(1)
  const [currentTheme, setCurrentTheme] = useState<'dark' | 'light'>('dark')

  const handleComplete = useCallback(() => {
    setPageState('selecting')
  }, [])

  const handleSelectStage = useCallback((stage: number) => {
    setActiveStage(stage)
    setPageState('playing')
  }, [])

  const handleThemeChange = useCallback((theme: 'dark' | 'light') => {
    setCurrentTheme(theme)
  }, [])

  return (
    <>
      {pageState === 'playing' && activeStage === 1 && (
        <TourStage1
          key="stage-1"
          initialTheme={currentTheme}
          onComplete={handleComplete}
          onThemeChange={handleThemeChange}
        />
      )}

      {pageState === 'playing' && activeStage === 2 && (
        <TourStage2
          key="stage-2"
          initialTheme={currentTheme}
          onComplete={handleComplete}
          onThemeChange={handleThemeChange}
        />
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