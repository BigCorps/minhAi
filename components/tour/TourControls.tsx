'use client'
// components/tour/TourControls.tsx
import { useEffect, useState } from 'react'
import { STAGE1_SCRIPT, SceneId } from '@/lib/tour/stage1-script'

interface TourControlsProps {
  currentId: SceneId
  isPlaying: boolean
  onPrev: () => void
  onNext: () => void
  onTogglePlay: () => void
  onGoTo: (index: number) => void
}

export default function TourControls({
  currentId,
  isPlaying,
  onPrev,
  onNext,
  onTogglePlay,
  onGoTo,
}: TourControlsProps) {
  const currentIndex = STAGE1_SCRIPT.findIndex((s) => s.id === currentId)
  const [hidden, setHidden] = useState(false)

  // Reaparecer quando o tour terminar (isPlaying volta a false)
  useEffect(() => {
    if (!isPlaying) setHidden(false)
  }, [isPlaying])

  const handleToggle = () => {
    if (!isPlaying) {
      setHidden(true)
    }
    onTogglePlay()
  }

  return (
    <div
      className="flex flex-col items-center gap-3 w-full transition-all duration-500"
      style={{
        opacity: hidden ? 0 : 1,
        pointerEvents: hidden ? 'none' : 'auto',
        transform: hidden ? 'translateY(12px)' : 'translateY(0)',
      }}
    >
      {/* Dots de progresso */}
      <div className="flex items-center gap-2">
        {STAGE1_SCRIPT.map((scene, i) => (
          <button
            key={scene.id}
            onClick={() => onGoTo(i)}
            title={scene.label}
            aria-label={`Ir para: ${scene.label}`}
            className="transition-all duration-300 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            style={{
              width: i === currentIndex ? 24 : 8,
              height: 8,
              backgroundColor:
                i === currentIndex
                  ? '#3b82f6'
                  : i < currentIndex
                  ? 'rgba(59,130,246,0.4)'
                  : 'rgba(255,255,255,0.2)',
            }}
          />
        ))}
      </div>

      {/* Botões prev / play-pause / next */}
      <div className="flex items-center gap-4">
        <button
          onClick={onPrev}
          disabled={currentIndex === 0}
          aria-label="Cena anterior"
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200
            bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed
            focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
            <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z" />
          </svg>
        </button>

        <button
          onClick={handleToggle}
          aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200
            bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-900/40
            focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white ml-0.5">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <button
          onClick={onNext}
          disabled={currentIndex === STAGE1_SCRIPT.length - 1}
          aria-label="Próxima cena"
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200
            bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed
            focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
