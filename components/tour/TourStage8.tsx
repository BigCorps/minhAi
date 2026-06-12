'use client'
// components/tour/TourStage8.tsx

import { useState, useEffect, useRef, useCallback } from 'react'
import { STAGE8_SCRIPT, Stage8SceneId } from '@/lib/tour/stage8-script'
import { usePlayText } from '@/hooks/usePlayText'
import { useWakeLock } from '@/hooks/useWakeLock'
import TourAssistant from './TourAssistant'
import TourControls2 from './TourControls2'
import ScenePlanosIntro from './scenes/ScenePlanosIntro'
import ScenePlanosSmartMensal from './scenes/ScenePlanosSmartMensal'
import ScenePlanosSmartCreditos from './scenes/ScenePlanosSmartCreditos'
import ScenePlanosFullPlan from './scenes/ScenePlanosFullPlan'
import ScenePlanosVendas from './scenes/ScenePlanosVendas'
import ScenePlanosConclusao from './scenes/ScenePlanosConclusao'

const FADE_DURATION = 300
const AUTO_PLAY_DELAY = 2000

function unlockAudioContext(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const buffer = ctx.createBuffer(1, 1024, 22050)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    source.start(0)
    if (ctx.state === 'suspended') ctx.resume()
  } catch {}
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

interface TourStage8Props {
  initialTheme?: 'dark' | 'light'
  onClose?: () => void
  onComplete?: () => void
  managerDelay?: number
  autoPlay?: boolean
  onThemeChange?: (theme: 'dark' | 'light') => void
  inModal?: boolean
  onGoToMenu?: () => void
  initialSpeed?: 1 | 1.5 | 2
}

export default function TourStage8({
  initialTheme = 'dark',
  onClose,
  onComplete,
  managerDelay = 2000,
  autoPlay = false,
  onThemeChange,
  inModal = false,
  onGoToMenu,
  initialSpeed,
}: TourStage8Props) {
  const [sceneIndex, setSceneIndex]     = useState(0)
  const [isPlaying, setIsPlaying]       = useState(false)
  const [isSpeaking, setIsSpeaking]     = useState(false)
  const [sceneVisible, setSceneVisible] = useState(true)
  const [theme, setTheme]               = useState<'dark' | 'light'>(initialTheme)
  const [controlsVisible, setControlsVisible] = useState(!inModal)
  const [speed, setSpeed] = useState<1 | 1.5 | 2>(initialSpeed ?? 1)

  const { playText: _playText, stopAudio } = usePlayText()
  const SPEED_RATE: Record<1 | 1.5 | 2, number> = { 1: 1.15, 1.5: 1.3, 2: 1.5 }
  const playText = useCallback((text: string) => _playText(text, SPEED_RATE[speed]), [_playText, speed])
  const { isSupported: isWakeLockSupported, isActive: isWakeLockActive, requestWakeLock, releaseWakeLock } = useWakeLock()

  const isPlayingRef         = useRef(false)
  const autoAdvanceTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoPlayTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const controlsHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentScene = STAGE8_SCRIPT[sceneIndex]
  const isDark = theme === 'dark'

  const handleToggleTheme = useCallback(() => {
    setTheme(t => { const next = t === 'dark' ? 'light' : 'dark'; onThemeChange?.(next); return next })
  }, [onThemeChange])

  const handleToggleWakeLock = useCallback(() => {
    if (isWakeLockActive) releaseWakeLock(); else requestWakeLock()
  }, [isWakeLockActive, requestWakeLock, releaseWakeLock])

  const handleCycleSpeed = useCallback((next: 1 | 1.5 | 2) => {
    setSpeed(next)
  }, [])

  const handleModalInteraction = useCallback(() => {
    if (!inModal) return
    setControlsVisible(true)
    if (controlsHideTimerRef.current) clearTimeout(controlsHideTimerRef.current)
    controlsHideTimerRef.current = setTimeout(() => setControlsVisible(false), 3000)
  }, [inModal])

  const runScene = useCallback(async (index: number) => {
    if (!isPlayingRef.current) return
    const scene = STAGE8_SCRIPT[index]
setSceneIndex(index)        // ← dot atualiza imediatamente
setSceneVisible(false)
await delay(FADE_DURATION)
setSceneVisible(true)
    setIsSpeaking(true)
    try { await playText(scene.audioText) } catch { await delay(scene.fallbackDuration) }
    setIsSpeaking(false)
    await delay(1200)
    if (!isPlayingRef.current) return
    const next = index + 1
    if (next < STAGE8_SCRIPT.length) {
      runScene(next)
    } else {
      isPlayingRef.current = false
      setIsPlaying(false)
      if (onComplete) autoAdvanceTimerRef.current = setTimeout(onComplete, managerDelay)
    }
  }, [playText, onComplete, managerDelay])

  const handlePlay = useCallback(() => {
    unlockAudioContext()
    isPlayingRef.current = true
    setIsPlaying(true)
    runScene(sceneIndex)
  }, [sceneIndex, runScene])

  const handlePause = useCallback(() => {
    isPlayingRef.current = false
    setIsPlaying(false)
    setIsSpeaking(false)
    stopAudio()
    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current)
    if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current)
  }, [stopAudio])

  const handleTogglePlay = useCallback(() => {
    if (isPlaying) { handlePause(); if (onComplete) autoAdvanceTimerRef.current = setTimeout(onComplete, managerDelay) }
    else handlePlay()
  }, [isPlaying, handlePlay, handlePause, onComplete, managerDelay])

const goToScene = useCallback((index: number) => {
  handlePause()
  setSceneIndex(index)      // ← atualiza dot imediatamente
  setSceneVisible(false)
  setTimeout(() => { setSceneVisible(true) }, FADE_DURATION)
}, [handlePause])

  const handlePrev = useCallback(() => { if (sceneIndex > 0) goToScene(sceneIndex - 1) }, [sceneIndex, goToScene])
  const handleNext = useCallback(() => {
    const isLast = sceneIndex === STAGE8_SCRIPT.length - 1
    if (isLast) { handlePause(); if (onComplete) onComplete() }
    else goToScene(sceneIndex + 1)
  }, [sceneIndex, goToScene, handlePause, onComplete])

  useEffect(() => {
    if (!autoPlay) return
    autoPlayTimerRef.current = setTimeout(() => {
      isPlayingRef.current = true
      setIsPlaying(true)
      runScene(0)
    }, AUTO_PLAY_DELAY)
    return () => { if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      isPlayingRef.current = false
      stopAudio()
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current)
      if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current)
      if (controlsHideTimerRef.current) clearTimeout(controlsHideTimerRef.current)
    }
  }, [stopAudio])

  return (
    <div
      className="w-full flex flex-col overflow-hidden relative"
      style={{
        height: inModal ? '100%' : '100dvh',
        background: isDark
          ? 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)'
          : '#f8fafc',
        transition: 'background 400ms ease',
      }}
      onMouseMove={inModal ? handleModalInteraction : undefined}
      onClick={inModal ? handleModalInteraction : undefined}
      onTouchStart={inModal ? handleModalInteraction : undefined}
    >
      {onClose && (
        <button
          onClick={(e) => { e.stopPropagation(); onClose() }}
          className="absolute top-4 right-4 z-50 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 focus:outline-none"
          style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-4 h-4">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      )}

      <div
        className="flex-1 min-h-0 flex flex-col md:flex-row md:items-center gap-0 md:gap-12 px-4 md:px-12 w-full max-w-5xl mx-auto"
        style={{ paddingTop: 'clamp(16px, 4dvh, 48px)', paddingBottom: inModal ? 'clamp(56px, 11dvh, 88px)' : 'clamp(8px, 2dvh, 24px)' }}
      >
        <div
          className="flex-1 min-h-0 md:flex-shrink-0 w-full"
          style={{ height: inModal ? 'clamp(160px, 38dvh, 400px)' : 'clamp(220px, 52dvh, 520px)' }}
        >
          <div className="w-full h-full transition-opacity ease-in-out" style={{ opacity: sceneVisible ? 1 : 0, transitionDuration: `${FADE_DURATION}ms` }}>
            <SceneRenderer8 id={currentScene.id} isSpeaking={isSpeaking} theme={theme} />
          </div>
        </div>

        <div
          className="flex-shrink-0 flex flex-col items-center w-full md:w-72 lg:w-80"
          style={{ gap: 'clamp(6px, 1.5dvh, 16px)' }}
        >
          <TourAssistant
            isSpeaking={isSpeaking}
            caption={currentScene.displayText ?? currentScene.audioText}
            hideAvatar={false}
            theme={theme}
            inModal={inModal}
          />
        </div>
      </div>

      {inModal ? (
        <TourControls2
          currentIndex={sceneIndex}
          total={STAGE8_SCRIPT.length}
          currentId={currentScene.id}
          isPlaying={isPlaying}
          theme={theme}
          isWakeLockActive={isWakeLockActive}
          isWakeLockSupported={isWakeLockSupported}
          onPrev={handlePrev}
          onNext={handleNext}
          onTogglePlay={handleTogglePlay}
          onGoTo={goToScene}
          onToggleTheme={handleToggleTheme}
          onToggleWakeLock={handleToggleWakeLock}
          overlayMode={true}
          forceVisible={controlsVisible}
          script={STAGE8_SCRIPT}
          onGoToMenu={onGoToMenu}
          speed={speed}
          onCycleSpeed={handleCycleSpeed}
        />
      ) : (
        <div className="flex-shrink-0 flex justify-center items-center py-3 md:py-4">
          <TourControls2
            currentIndex={sceneIndex}
            total={STAGE8_SCRIPT.length}
            currentId={currentScene.id}
            isPlaying={isPlaying}
            theme={theme}
            isWakeLockActive={isWakeLockActive}
            isWakeLockSupported={isWakeLockSupported}
            onPrev={handlePrev}
            onNext={handleNext}
            onTogglePlay={handleTogglePlay}
            onGoTo={goToScene}
            onToggleTheme={handleToggleTheme}
            onToggleWakeLock={handleToggleWakeLock}
            script={STAGE8_SCRIPT}
            onGoToMenu={onGoToMenu}
            speed={speed}
            onCycleSpeed={handleCycleSpeed}
          />
        </div>
      )}
    </div>
  )
}

function SceneRenderer8({ id, isSpeaking, theme }: { id: Stage8SceneId; isSpeaking: boolean; theme: 'dark' | 'light' }) {
  switch (id) {
    case 'planos-intro':          return <ScenePlanosIntro />
    case 'planos-smart-mensal':   return <ScenePlanosSmartMensal />
    case 'planos-smart-creditos': return <ScenePlanosSmartCreditos />
    case 'planos-full':           return <ScenePlanosFullPlan />
    case 'planos-vendas':         return <ScenePlanosVendas />
    case 'planos-conclusao':      return <ScenePlanosConclusao />
    default:                      return null
  }
}
