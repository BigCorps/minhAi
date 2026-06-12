'use client'
// components/tour/TourControls.tsx
// Versão com botão Menu (esquerda) e botão Velocidade (direita)
import { useEffect, useState, useRef } from 'react'
import { STAGE1_SCRIPT, SceneId } from '@/lib/tour/stage1-script'

type SpeedOption = 1 | 1.5 | 2

interface TourControlsProps {
  currentId: SceneId
  isPlaying: boolean
  theme: 'dark' | 'light'
  isWakeLockActive: boolean
  isWakeLockSupported: boolean
  speed?: SpeedOption
  onPrev: () => void
  onNext: () => void
  onTogglePlay: () => void
  onGoTo: (index: number) => void
  onToggleTheme: () => void
  onToggleWakeLock: () => void
  onGoToMenu?: () => void
  onCycleSpeed?: (speed: SpeedOption) => void
  overlayMode?: boolean
  forceVisible?: boolean
}

export default function TourControls({
  currentId,
  isPlaying,
  theme,
  isWakeLockActive,
  isWakeLockSupported,
  speed = 1,
  onPrev,
  onNext,
  onTogglePlay,
  onGoTo,
  onToggleTheme,
  onToggleWakeLock,
  onGoToMenu,
  onCycleSpeed,
  overlayMode = false,
  forceVisible = false,
}: TourControlsProps) {
  const currentIndex = STAGE1_SCRIPT.findIndex((s) => s.id === currentId)
  const [hidden, setHidden] = useState(false)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDark = theme === 'dark'
  const isVisible = overlayMode ? forceVisible : !hidden

  const handleCycleSpeed = () => {
    if (!onCycleSpeed) return
    const next: SpeedOption = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1
    onCycleSpeed(next)
  }

  const speedLabel = speed === 1 ? '1×' : speed === 1.5 ? '1.5×' : '2×'
  const speedColor = speed === 1
    ? (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.10)')
    : speed === 1.5 ? 'rgba(245,158,11,0.25)' : 'rgba(249,115,22,0.30)'
  const speedTextColor = speed === 1
    ? (isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)')
    : speed === 1.5 ? '#f59e0b' : '#f97316'

  useEffect(() => {
    if (!isPlaying) setHidden(false)
  }, [isPlaying])

  const handleToggle = () => {
    if (!overlayMode) {
      if (!isPlaying) hideTimerRef.current = setTimeout(() => setHidden(true), 1000)
      else setHidden(false)
    }
    onTogglePlay()
  }

  const handleReveal = () => {
    if (overlayMode) return
    if (!hidden) return
    setHidden(false)
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    if (isPlaying) hideTimerRef.current = setTimeout(() => setHidden(true), 2000)
  }

  useEffect(() => {
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current) }
  }, [])

  const iconBtn = `w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400`
  const iconBtnColors = isDark ? 'bg-white/15 hover:bg-white/25 text-white' : 'bg-black/10 hover:bg-black/20 text-gray-800'
  const iconBtnDisabled = 'disabled:opacity-30 disabled:cursor-not-allowed'

  const content = (
    <div
      className="flex flex-col items-center gap-3 w-full transition-all duration-400"
      style={{ opacity: isVisible ? 1 : 0, pointerEvents: isVisible ? 'auto' : 'none', transform: isVisible ? 'translateY(0)' : 'translateY(6px)' }}
    >
      {/* Dots */}
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
              backgroundColor: i === currentIndex
                ? '#3b82f6'
                : i < currentIndex
                ? 'rgba(59,130,246,0.4)'
                : isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
            }}
          />
        ))}
      </div>

      {/* Botões */}
      <div className="flex items-center gap-2">

        {/* Menu */}
        {onGoToMenu && (
          <button onClick={onGoToMenu} aria-label="Ver menu de stages" title="Menu" className={`${iconBtn} ${iconBtnColors}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
          </button>
        )}

        {/* Tema */}
        <button onClick={onToggleTheme} aria-label={isDark ? 'Modo claro' : 'Modo escuro'} className={`${iconBtn} ${iconBtnColors}`}>
          {isDark ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>

        {/* Prev */}
        <button onClick={onPrev} disabled={currentIndex === 0} aria-label="Cena anterior" className={`${iconBtn} ${iconBtnColors} ${iconBtnDisabled}`}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z"/></svg>
        </button>

        {/* Play/Pause */}
        <button onClick={handleToggle} aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-900/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
          {isPlaying
            ? <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            : <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white ml-0.5"><path d="M8 5v14l11-7z"/></svg>
          }
        </button>

        {/* Next / Manager */}
        {currentIndex === STAGE1_SCRIPT.length - 1 ? (
          <button onClick={onNext} aria-label="Ver todos os stages" title="Ver todos os stages" className={`${iconBtn} ${iconBtnColors}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
          </button>
        ) : (
          <button onClick={onNext} aria-label="Próxima cena" className={`${iconBtn} ${iconBtnColors}`}>
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>
          </button>
        )}

        {/* Wake Lock */}
        {isWakeLockSupported && (
          <button onClick={onToggleWakeLock} aria-label={isWakeLockActive ? 'Desativar tela sempre ligada' : 'Manter tela sempre ligada'}
            className={`${iconBtn} ${isWakeLockActive ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400 ring-2 ring-green-500/50' : iconBtnColors}`}>
            {isWakeLockActive ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            )}
          </button>
        )}

        {/* Velocidade */}
        {onCycleSpeed && (
          <button
            onClick={handleCycleSpeed}
            aria-label={`Velocidade atual: ${speedLabel}. Clique para alterar.`}
            title={`Velocidade: ${speedLabel}`}
            className="h-10 min-w-[44px] px-2 rounded-full flex items-center justify-center transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 font-semibold tabular-nums"
            style={{ background: speedColor, color: speedTextColor, fontSize: '0.72rem', letterSpacing: '0.01em' }}
          >
            {speedLabel}
          </button>
        )}

      </div>
    </div>
  )

  if (overlayMode) {
    return (
      <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-4 pointer-events-none"
        style={{ zIndex: 40, opacity: isVisible ? 1 : 0, visibility: isVisible ? 'visible' : 'hidden', transition: 'opacity 300ms ease, visibility 300ms ease' }}>
        <div className="pointer-events-auto rounded-2xl px-4 py-3"
          style={{ background: isDark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}>
          {content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3 w-full relative" style={{ minHeight: 80 }}
      onMouseEnter={handleReveal} onTouchStart={handleReveal}>
      {content}
    </div>
  )
}
