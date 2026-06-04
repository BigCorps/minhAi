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
  const isDark = theme === 'dark'

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

  return (
    <div
      className="w-full flex flex-col overflow-hidden"
      style={{
        height: '100dvh',
        background: isDark
          ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
          : '#ffffff',
        transition: 'background 400ms ease',
      }}
    >
      {/*
       * Área principal — flex-col no mobile, flex-row no desktop.
       *
       * CRÍTICO: flex-1 + min-h-0 no container garante que os filhos
       * com h-full tenham referência de altura. Sem min-h-0, flex-col
       * não propaga altura para filhos e os cards crescem com conteúdo.
       *
       * NÃO usar justifyContent: center — quebra o min-h-0.
       * Centralização vertical é feita pelo padding calculado.
       */}
      <div
        className="flex-1 min-h-0 flex flex-col md:flex-row md:items-center gap-0 md:gap-12 px-4 md:px-12 w-full max-w-5xl mx-auto"
        style={{
          paddingTop: 'clamp(16px, 4dvh, 48px)',
          paddingBottom: 'clamp(8px, 2dvh, 24px)',
        }}
      >
        {/*
         * Wrapper da cena.
         * flex-1 min-h-0: ocupa espaço disponível sem ultrapassar.
         * maxHeight: limita em mobile para sobrar espaço ao assistente.
         * h-full no filho interno garante que SceneRenderer preencha tudo.
         */}
        <div
  className="flex-1 min-h-0 w-full"
  style={{
    maxHeight: 'clamp(220px, 52dvh, 520px)',
    height: 'clamp(220px, 52dvh, 520px)',   // ← ADICIONAR: altura explícita
  }}                                          //   propaga h-full para os filhos
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

        {/*
         * Assistente — flex-shrink-0 para não ser comprimido pela cena.
         * overflow-visible para os halos do AvatarFace não serem cortados.
         */}
        <div
          className="flex-shrink-0 flex flex-col items-center justify-center w-full md:w-72 lg:w-80 overflow-visible"
          style={{ maxHeight: 'clamp(170px, 42dvh, 340px)' }}
        >
          <TourAssistant
            isSpeaking={isSpeaking}
            caption={currentScene.displayText ?? currentScene.audioText}
            hideAvatar={hideAvatar}
            theme={theme}
          />
        </div>
      </div>

      {/* Controls */}
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
    case 'intro':        return <SceneIntro isSpeaking={isSpeaking} theme={theme} />
    case 'assistente':   return <SceneAssistente isSpeaking={isSpeaking} theme={theme} />
    case 'widget':       return <SceneWidget />
    case 'whatsapp':     return <SceneWhatsApp />
    case 'instagram':    return <SceneInstagram />
    case 'mercadolivre': return <SceneMercadoLivre />
    case 'mcp':          return <SceneMCP />
    case 'whatsapp-mcp': return <SceneWhatsAppMCP />
    case 'outro':        return <SceneIntro isOutro isSpeaking={isSpeaking} theme={theme} />
    default:             return null
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
