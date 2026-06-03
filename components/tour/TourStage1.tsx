'use client'
// components/tour/TourStage1.tsx

import { useState, useEffect, useRef, useCallback } from 'react'
import { STAGE1_SCRIPT, SceneId } from '@/lib/tour/stage1-script'
import { usePlayText } from '@/hooks/usePlayText'
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

const SCENES_WITH_OWN_AVATAR: SceneId[] = ['assistente']
const FADE_DURATION = 300

export default function TourStage1() {
  const [sceneIndex, setSceneIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [sceneVisible, setSceneVisible] = useState(true)
  const { playText: _playText, stopAudio } = usePlayText()
  const playText = useCallback(
    (text: string) => _playText(text, 1.15),
    [_playText]
  )

  const isPlayingRef = useRef(false)
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentScene = STAGE1_SCRIPT[sceneIndex]
  const hideAvatar = SCENES_WITH_OWN_AVATAR.includes(currentScene.id)

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
    className="w-full min-h-screen flex flex-col items-center justify-center px-6 py-6 md:px-12"
    style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}
  >
    {/* Conteúdo principal */}
    <div className="w-full max-w-5xl mx-auto flex flex-col md:flex-row md:items-center gap-8 md:gap-12 flex-1">

      {/* ── Cena (esquerda no desktop) ── */}
      <div
        className="flex-1 transition-opacity ease-in-out"
        style={{
          opacity: sceneVisible ? 1 : 0,
          transitionDuration: `${FADE_DURATION}ms`,
          height: 'clamp(300px, 55vh, 600px)',
        }}
      >
        <SceneRenderer id={currentScene.id} isSpeaking={isSpeaking} />
      </div>

      {/* ── Avatar + legenda (direita no desktop) ── */}
      <div className="flex flex-col items-center gap-6 w-full md:w-72 lg:w-80 flex-shrink-0">
        <TourAssistant
          isSpeaking={isSpeaking}
          caption={currentScene.audioText}
          hideAvatar={hideAvatar}
        />
      </div>

    </div>

    {/* ── Controls fixo no rodapé centralizado ── */}
    <div className="w-full flex justify-center py-4">
      <TourControls
        currentId={currentScene.id}
        isPlaying={isPlaying}
        onPrev={handlePrev}
        onNext={handleNext}
        onTogglePlay={handleTogglePlay}
        onGoTo={goToScene}
      />
    </div>

  </div>
)
}

function SceneRenderer({ id, isSpeaking }: { id: SceneId; isSpeaking: boolean }) {
  switch (id) {
    case 'intro':       return <SceneIntro isSpeaking={isSpeaking} />
    case 'assistente':  return <SceneAssistente isSpeaking={isSpeaking} />
    case 'widget':      return <SceneWidget />
    case 'whatsapp':    return <SceneWhatsApp />
    case 'instagram':   return <SceneInstagram />
    case 'mercadolivre':return <SceneMercadoLivre />
    case 'mcp':         return <SceneMCP />
    case 'whatsapp-mcp':return <SceneWhatsAppMCP />
    case 'outro':       return <SceneIntro isOutro isSpeaking={isSpeaking} />
    default:            return null
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
