'use client'
// components/tour/TourStage1.tsx

import { useState, useEffect, useRef, useCallback } from 'react'
import { STAGE1_SCRIPT, SceneId } from '@/lib/tour/stage1-script'
import { usePlayText } from '@/hooks/usePlayText'
import { useWakeLock } from '@/hooks/useWakeLock'
import TourAssistant from './TourAssistant'
import TourControls from './TourControls'
import SceneIntro from './scenes/SceneIntro'
import SceneAssistente from './scenes/SceneAssistente'
import SceneWidget from './scenes/SceneWidget'
import SceneWhatsApp from './scenes/SceneWhatsApp'
import SceneInstagram from './scenes/SceneInstagram'
import SceneMercadoLivre from './scenes/SceneMercadoLivre'
import SceneMCP from './scenes/SceneMCP'
import SceneWhatsAppMCP from './scenes/SceneWhatsAppMCP'

const SCENES_WITH_OWN_AVATAR: SceneId[] = ['assistente', 'intro', 'outro']
const FADE_DURATION = 300

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
  } catch {
    // SSR ou sem Web Audio API
  }
}

export default function TourStage1() {
  const [sceneIndex, setSceneIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [sceneVisible, setSceneVisible] = useState(true)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  const { playText: _playText, stopAudio } = usePlayText()
  const playText = useCallback(
    (text: string) => _playText(text, 1.15),
    [_playText]
  )

  const {
    isSupported: isWakeLockSupported,
    isActive: isWakeLockActive,
    requestWakeLock,
    releaseWakeLock,
  } = useWakeLock()

  const isPlayingRef = useRef(false)
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentScene = STAGE1_SCRIPT[sceneIndex]
  const hideAvatar = SCENES_WITH_OWN_AVATAR.includes(currentScene.id)

  const handleToggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  const handleToggleWakeLock = useCallback(() => {
    if (isWakeLockActive) releaseWakeLock()
    else requestWakeLock()
  }, [isWakeLockActive, requestWakeLock, releaseWakeLock])

  const runScene = useCallback(
    async (index: number) => {
      if (!isPlayingRef.current) return
      const scene = STAGE1_SCRIPT[index]
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
      if (next < STAGE1_SCRIPT.length) {
        runScene(next)
      } else {
        isPlayingRef.current = false
        setIsPlaying(false)
      }
    },
    [playText]
  )

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
  }, [stopAudio])

  const handleTogglePlay = useCallback(() => {
    if (isPlaying) handlePause()
    else handlePlay()
  }, [isPlaying, handlePlay, handlePause])

  const goToScene = useCallback(
    (index: number) => {
      handlePause()
      setSceneVisible(false)
      setTimeout(() => {
        setSceneIndex(index)
        setSceneVisible(true)
      }, FADE_DURATION)
    },
    [handlePause]
  )

  const handlePrev = useCallback(() => {
    if (sceneIndex > 0) goToScene(sceneIndex - 1)
  }, [sceneIndex, goToScene])

  const handleNext = useCallback(() => {
    if (sceneIndex < STAGE1_SCRIPT.length - 1) goToScene(sceneIndex + 1)
  }, [sceneIndex, goToScene])

  useEffect(() => {
    return () => {
      isPlayingRef.current = false
      stopAudio()
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current)
    }
  }, [stopAudio])

  const isDark = theme === 'dark'

  return (
    <div
      className="w-full flex flex-col overflow-hidden"
      style={{
        height: '100dvh',
        background: isDark
          ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
          : 'linear-gradient(135deg, #f0f4ff 0%, #e8edf8 50%, #f0f4ff 100%)',
        transition: 'background 400ms ease',
      }}
    >
      {/* ── Área principal ── */}
      <div
        className="flex-1 min-h-0 flex flex-col md:flex-row items-center md:items-center gap-0 md:gap-12 px-4 md:px-12 w-full max-w-5xl mx-auto"
        style={{
          // Mobile: padding top menor para centralizar melhor verticalmente
          paddingTop: 'clamp(8px, 2dvh, 32px)',
          paddingBottom: 'clamp(4px, 1dvh, 16px)',
        }}
      >
        {/* Wrapper da cena */}
        <div
          className="min-h-0 w-full"
          style={{
            flex: '1 1 0',
            maxHeight: 'clamp(220px, 52dvh, 520px)',
          }}
        >
          <div
            className="w-full h-full transition-opacity ease-in-out"
            style={{
              opacity: sceneVisible ? 1 : 0,
              transitionDuration: `${FADE_DURATION}ms`,
            }}
          >
            <SceneRenderer id={currentScene.id} isSpeaking={isSpeaking} theme={theme} />
          </div>
        </div>

        {/* Assistente */}
        <div
          className="flex-shrink-0 flex flex-col items-center justify-center w-full md:w-72 lg:w-80 overflow-visible"
          style={{
            maxHeight: 'clamp(170px, 42dvh, 340px)',
          }}
        >
          <TourAssistant
            isSpeaking={isSpeaking}
            caption={currentScene.displayText ?? currentScene.audioText}
            hideAvatar={hideAvatar}
            theme={theme}
          />
        </div>
      </div>

      {/* ── Controls: rodapé fixo ── */}
      <div className="flex-shrink-0 flex justify-center items-center py-3 md:py-4">
        <TourControls
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
        />
      </div>
    </div>
  )
}

function SceneRenderer({
  id,
  isSpeaking,
  theme,
}: {
  id: SceneId
  isSpeaking: boolean
  theme: 'dark' | 'light'
}) {
  switch (id) {
    case 'intro':        return <SceneIntro isSpeaking={isSpeaking} />
    case 'assistente':   return <SceneAssistente isSpeaking={isSpeaking} />
    case 'widget':       return <SceneWidget />
    case 'whatsapp':     return <SceneWhatsApp />
    case 'instagram':    return <SceneInstagram />
    case 'mercadolivre': return <SceneMercadoLivre />
    case 'mcp':          return <SceneMCP />
    case 'whatsapp-mcp': return <SceneWhatsAppMCP />
    case 'outro':        return <SceneIntro isOutro isSpeaking={isSpeaking} />
    default:             return null
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
