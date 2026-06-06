'use client'
// components/tour/TourStage2.tsx

import { useState, useEffect, useRef, useCallback } from 'react'
import { STAGE2_SCRIPT, Stage2SceneId } from '@/lib/tour/stage2-script'
import { usePlayText } from '@/hooks/usePlayText'
import { useWakeLock } from '@/hooks/useWakeLock'
import TourAssistant from './TourAssistant'
import TourControls2 from './TourControls2'
import SceneAssistente from './scenes/SceneAssistente'
import SceneCarrossel from './scenes/SceneCarrossel'
import SceneQRCode from './scenes/SceneQRCode'
import SceneVendas from './scenes/SceneVendas'
import SceneFila from './scenes/SceneFila'
import SceneTotem from './scenes/SceneTotem'

// Cenas que têm avatar próprio (TourAssistant mostra logo em vez de avatar)
const SCENES_WITH_OWN_AVATAR: Stage2SceneId[] = ['assistente-intro', 'assistente-outro']

const FADE_DURATION = 300
const AUTO_PLAY_DELAY = 2000

function unlockAudioContext(): void {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const buffer = ctx.createBuffer(1, 1024, 22050)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    source.start(0)
    if (ctx.state === 'suspended') ctx.resume()
  } catch { /* SSR */ }
}

interface TourStage2Props {
  initialTheme?: 'dark' | 'light'
  onClose?: () => void
  onComplete?: () => void
  managerDelay?: number
  autoPlay?: boolean
  onThemeChange?: (theme: 'dark' | 'light') => void
  inModal?: boolean
}

export default function TourStage2({
  initialTheme = 'dark',
  onClose,
  onComplete,
  managerDelay = 2000,
  autoPlay = false,
  onThemeChange,
  inModal = false,
}: TourStage2Props) {
  const [sceneIndex, setSceneIndex]   = useState(0)
  const [isPlaying, setIsPlaying]     = useState(false)
  const [isSpeaking, setIsSpeaking]   = useState(false)
  const [sceneVisible, setSceneVisible] = useState(true)
  const [theme, setTheme]             = useState<'dark' | 'light'>(initialTheme)
  const [controlsVisible, setControlsVisible] = useState(!inModal)

  const { playText: _playText, stopAudio } = usePlayText()
  const playText = useCallback((text: string) => _playText(text, 1.15), [_playText])

  const {
    isSupported: isWakeLockSupported,
    isActive: isWakeLockActive,
    requestWakeLock,
    releaseWakeLock,
  } = useWakeLock()

  const isPlayingRef          = useRef(false)
  const autoAdvanceTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoPlayTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null)
  const controlsHideTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentScene = STAGE2_SCRIPT[sceneIndex]
  const hideAvatar   = SCENES_WITH_OWN_AVATAR.includes(currentScene.id)
  const isDark       = theme === 'dark'

  const handleToggleTheme = useCallback(() => {
    setTheme(t => {
      const next = t === 'dark' ? 'light' : 'dark'
      onThemeChange?.(next)
      return next
    })
  }, [onThemeChange])

  const handleToggleWakeLock = useCallback(() => {
    if (isWakeLockActive) releaseWakeLock()
    else requestWakeLock()
  }, [isWakeLockActive, requestWakeLock, releaseWakeLock])

  const handleModalInteraction = useCallback(() => {
    if (!inModal) return
    setControlsVisible(true)
    if (controlsHideTimerRef.current) clearTimeout(controlsHideTimerRef.current)
    controlsHideTimerRef.current = setTimeout(() => setControlsVisible(false), 3000)
  }, [inModal])

  const runScene = useCallback(async (index: number) => {
    if (!isPlayingRef.current) return
    const scene = STAGE2_SCRIPT[index]
    setSceneVisible(false)
    await delay(FADE_DURATION)
    setSceneIndex(index)
    setSceneVisible(true)
    setIsSpeaking(true)
    try {
      await playText(scene.audioText)
    } catch {
      await delay(scene.fallbackDuration)
    }
    setIsSpeaking(false)
    await delay(1200)
    if (!isPlayingRef.current) return
    const next = index + 1
    if (next < STAGE2_SCRIPT.length) {
      runScene(next)
    } else {
      isPlayingRef.current = false
      setIsPlaying(false)
      if (onComplete) {
        autoAdvanceTimerRef.current = setTimeout(onComplete, managerDelay)
      }
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
    if (isPlaying) {
      handlePause()
      if (onComplete) {
        autoAdvanceTimerRef.current = setTimeout(onComplete, managerDelay)
      }
    } else {
      handlePlay()
    }
  }, [isPlaying, handlePlay, handlePause, onComplete, managerDelay])

  const goToScene = useCallback((index: number) => {
    handlePause()
    setSceneVisible(false)
    setTimeout(() => { setSceneIndex(index); setSceneVisible(true) }, FADE_DURATION)
  }, [handlePause])

  const handlePrev = useCallback(() => {
    if (sceneIndex > 0) goToScene(sceneIndex - 1)
  }, [sceneIndex, goToScene])

  const handleNext = useCallback(() => {
    const isLast = sceneIndex === STAGE2_SCRIPT.length - 1
    if (isLast) { handlePause(); if (onComplete) onComplete() }
    else goToScene(sceneIndex + 1)
  }, [sceneIndex, goToScene, handlePause, onComplete])

  // Auto-play ao montar
  useEffect(() => {
    if (!autoPlay) return
    autoPlayTimerRef.current = setTimeout(() => {
      isPlayingRef.current = true
      setIsPlaying(true)
      runScene(0)
    }, AUTO_PLAY_DELAY)
    return () => { if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
          ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
          : '#ffffff',
        transition: 'background 400ms ease',
      }}
      onMouseMove={inModal ? handleModalInteraction : undefined}
      onClick={inModal ? handleModalInteraction : undefined}
      onTouchStart={inModal ? handleModalInteraction : undefined}
    >
      {/* Botão fechar */}
      {onClose && (
        <button
          onClick={(e) => { e.stopPropagation(); onClose() }}
          aria-label="Fechar tour"
          className="absolute top-4 right-4 z-50 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 focus:outline-none"
          style={{
            background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)',
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-4 h-4">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Área principal */}
      <div
        className="flex-1 min-h-0 flex flex-col md:flex-row md:items-center gap-0 md:gap-12 px-4 md:px-12 w-full max-w-5xl mx-auto"
        style={{
          paddingTop: 'clamp(16px, 4dvh, 48px)',
          paddingBottom: inModal ? '8px' : 'clamp(8px, 2dvh, 24px)',
        }}
      >
        {/* Cena */}
        {/* Cena */}
        <div
          className="flex-1 min-h-0 md:flex-shrink-0 w-full"
          style={{
            height: inModal
              ? 'clamp(180px, 42dvh, 420px)'
              : 'clamp(220px, 52dvh, 520px)',
          }}
        >
          <div
            className="w-full h-full transition-opacity ease-in-out"
            style={{ opacity: sceneVisible ? 1 : 0, transitionDuration: `${FADE_DURATION}ms` }}
          >
            <SceneRenderer2 id={currentScene.id} isSpeaking={isSpeaking} theme={theme} />
          </div>
        </div>

        {/* Assistente */}
        <div
          className="flex-shrink-0 flex flex-col items-center w-full md:w-72 lg:w-80"
          style={{ gap: 'clamp(6px, 1.5dvh, 16px)' }}
        >
          <TourAssistant
            isSpeaking={isSpeaking}
            caption={currentScene.displayText ?? currentScene.audioText}
            hideAvatar={hideAvatar}
            theme={theme}
            inModal={inModal}
          />
        </div>
      </div>

      {/* Controls */}
      {inModal ? (
        <TourControls2
          currentIndex={sceneIndex}
          total={STAGE2_SCRIPT.length}
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
          script={STAGE2_SCRIPT}
        />
      ) : (
        <div className="flex-shrink-0 flex justify-center items-center py-3 md:py-4">
          <TourControls2
            currentIndex={sceneIndex}
            total={STAGE2_SCRIPT.length}
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
            script={STAGE2_SCRIPT}
          />
        </div>
      )}
    </div>
  )
}

function SceneRenderer2({ id, isSpeaking, theme }: { id: Stage2SceneId; isSpeaking: boolean; theme: 'dark' | 'light' }) {
  switch (id) {
    case 'assistente-intro':    return <SceneAssistente isSpeaking={isSpeaking} theme={theme} />
    case 'assistente-carrossel':return <SceneCarrossel />
    case 'assistente-qrcode':   return <SceneQRCode />
    case 'assistente-vendas':   return <SceneVendas />
    case 'assistente-fila':     return <SceneFila />
    case 'assistente-totem':    return <SceneTotem isSpeaking={isSpeaking} />
    case 'assistente-outro':    return <SceneAssistente isSpeaking={isSpeaking} theme={theme} />
    default:                    return null
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}