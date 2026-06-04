'use client'
// app/tour/page.tsx

import { useState, useCallback } from 'react'
import TourStage1 from '@/components/tour/TourStage1'
import TourManager from '@/components/tour/TourManager'

type PageState = 'playing' | 'selecting'

export default function TourPage() {
  const [pageState, setPageState] = useState<PageState>('playing')
  const [activeStage, setActiveStage] = useState(1)

  // Chamado quando o stage termina ou o usuário pausa
  const handleComplete = useCallback(() => {
    setPageState('selecting')
  }, [])

  // Usuário escolhe um stage no manager
  const handleSelectStage = useCallback((stage: number) => {
    setActiveStage(stage)
    setPageState('playing')
  }, [])

  return (
    <>
      {pageState === 'playing' && (
        <TourStage1
          key={`stage-${activeStage}`}
          onComplete={handleComplete}
        />
      )}

      {pageState === 'selecting' && (
        <TourManager
          activeStage={activeStage}
          onSelectStage={handleSelectStage}
          // Na página standalone não tem onClose — passa undefined
          // TourManager precisa lidar com onClose opcional
          onClose={() => setPageState('playing')}
        />
      )}
    </>
  )
}
