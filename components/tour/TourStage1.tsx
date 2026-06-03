'use client'
// components/tour/TourStage1.tsx
// Orquestrador do Stage 1: "Onde o minhAi atua"
//
// Responsabilidades:
//  - Gerencia a cena atual e o estado de reprodução
//  - Chama usePlayText para TTS de cada cena
//  - Avança automaticamente ao fim do áudio (+ 1.2s de pausa)
//  - Controla o fade entre cenas (opacity + pointer-events)
//  - Oculta o TourAssistant nas cenas que têm avatar próprio (SceneAssistente)

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

// Cenas que têm avatar embutido — TourAssistant fica oculto
const SCENES_WITH_OWN_AVATAR: SceneId[] = ['assistente']

// Duração do fade entre cenas (ms)
const FADE_DURATION = 300

export default function TourStage1() {
  const [sceneIndex, setSceneIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [sceneVisible, setSceneVisible] = useState(true)
  const { playText: _playText, stopAudio } = usePlayText()
  // Wrapper com velocidade aumentada para o tour (1.35x = fala mais ágil)
  const playText = useCallback(
    (text: string) => _playText(text, 1.35),
    [_playText]
  )

  const isPlayingRef = useRef(false)
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentScene = STAGE1_SCRIPT[sceneIndex]
  const hideAvatar = SCENES_WITH_OWN_AVATAR.includes(currentScene.id)

  // ── Função que executa uma cena completa ──────────────────────────────────
  const runScene = useCallback(
    async (index: number) => {
      if (!isPlayingRef.current) return

      const scene = STAGE1_SCRIPT[index]

      // Fade out
      setSceneVisible(false)
      await delay(FADE_DURATION)
      setSceneIndex(index)
      setSceneVisible(true)

      // TTS
      setIsSpeaking(true)
      try {
        await playText(scene.audioText)
      } catch {
        // Fallback: aguarda duração estimada
        await delay(scene.fallbackDuration)
      }
      setIsSpeaking(false)

      // Pausa entre cenas
      await delay(1200)

      // Avança automaticamente se ainda estiver tocando
      if (!isPlayingRef.current) return
      const next = index + 1
      if (next < STAGE1_SCRIPT.length) {
        runScene(next)
      } else {
        // Chegou ao fim
        isPlayingRef.current = false
        setIsPlaying(false)
      }
    },
    [playText]
  )

  // ── Play / Pause ──────────────────────────────────────────────────────────
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
    if (isPlaying) {
      handlePause()
    } else {
      handlePlay()
    }
  }, [isPlaying, handlePlay, handlePause])

  // ── Navegação manual ──────────────────────────────────────────────────────
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

  // ── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      isPlayingRef.current = false
      stopAudio()
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current)
    }
  }, [stopAudio])

  return (
    <div
      className="w-full min-h-screen flex items-center justify-center px-4 py-6"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}
    >
      {/*
        Mobile  → coluna (flex-col): avatar em cima, cena abaixo, controles no fim
        Desktop → linha (md:flex-row): coluna esquerda fixa + cena ocupando o resto
      */}
      <div className="w-full max-w-6xl flex flex-col md:flex-row md:items-center gap-8 md:gap-12">

        {/* ── COLUNA ESQUERDA: avatar + legenda + controles ── */}
        <div className="flex flex-col items-center gap-6 w-full md:w-72 lg:w-80 flex-shrink-0">
          <TourAssistant
            isSpeaking={isSpeaking}
            caption={currentScene.audioText}
            hideAvatar={hideAvatar}
          />
          <TourControls
            currentId={currentScene.id}
            isPlaying={isPlaying}
            onPrev={handlePrev}
            onNext={handleNext}
            onTogglePlay={handleTogglePlay}
            onGoTo={goToScene}
          />
        </div>

        {/* ── COLUNA DIREITA: visual da cena ── */}
        <div
          className="w-full flex-1 transition-opacity ease-in-out"
          style={{
            opacity: sceneVisible ? 1 : 0,
            transitionDuration: `${FADE_DURATION}ms`,
            // Mobile: altura compacta / Desktop: ocupa a altura disponível
            height: 'clamp(300px, 55vh, 600px)',
            maxWidth: 560,
            // Centraliza no mobile, alinha ao centro no desktop
            margin: '0 auto',
          }}
        >
          <SceneRenderer id={currentScene.id} isSpeaking={isSpeaking} />
        </div>

      </div>
    </div>
  )
}

// ── Renderer de cena isolado ──────────────────────────────────────────────────
function SceneRenderer({ id, isSpeaking }: { id: SceneId; isSpeaking: boolean }) {
  switch (id) {
    case 'intro':
      return <SceneIntro />
    case 'assistente':
      return <SceneAssistente isSpeaking={isSpeaking} />
    case 'widget':
      return <SceneWidget />
    case 'whatsapp':
      return <SceneWhatsApp />
    case 'instagram':
      return <SceneInstagram />
    case 'mercadolivre':
      return <SceneMercadoLivre />
    case 'mcp':
      return <SceneMCP />
    case 'whatsapp-mcp':
      return <SceneWhatsAppMCP />
    case 'outro':
      return <SceneIntro isOutro />
    default:
      return null
  }
}

// ── Util ──────────────────────────────────────────────────────────────────────
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
