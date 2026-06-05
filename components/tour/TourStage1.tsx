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
const AUTO_PLAY_DELAY = 2000  // ms após mount para auto-play no modal

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

interface TourStage1Props {
  /**
   * Tema visual inicial. Padrão: 'dark'.
   * O usuário pode trocar via botão interno, mas o pai pode forçar o inicial.
   */
  initialTheme?: 'dark' | 'light'

  /**
   * Quando presente, exibe botão X no canto superior direito.
   * Chamado quando o usuário fecha o tour (modal).
   */
  onClose?: () => void

  /**
   * Chamado quando o último script do stage termina, o usuário pausa,
   * ou clica em > na última cena.
   * O pai usa para exibir o TourManager/seletor de stages.
   */
  onComplete?: () => void

  /**
   * Delay em ms antes de chamar onComplete após pausa ou fim automático.
   * Padrão: 2000. Use 0 para abrir o manager imediatamente.
   * Ao clicar em > na última cena o manager abre sempre sem delay.
   */
  managerDelay?: number

  /**
   * Se true, inicia a reprodução automaticamente após AUTO_PLAY_DELAY ms.
   * Requer que o AudioContext já tenha sido desbloqueado pelo gesto
   * que abriu o modal (o clique no TourTrigger faz isso).
   */
  autoPlay?: boolean

  /**
   * Chamado sempre que o usuário troca o tema via botão interno.
   * O pai usa para passar o tema correto ao TourManager quando ele abrir.
   */
  onThemeChange?: (theme: 'dark' | 'light') => void

  /**
   * Quando true, adapta o layout para dentro do modal:
   * - usa height: 100% em vez de 100dvh
   * - controles ficam em overlayMode (sobre a cena, revelados por hover/click)
   */
  inModal?: boolean
}

export default function TourStage1({
  initialTheme = 'dark',
  onClose,
  onComplete,
  managerDelay = 2000,
  autoPlay = false,
  onThemeChange,
  inModal = false,
}: TourStage1Props) {
  const [sceneIndex, setSceneIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [sceneVisible, setSceneVisible] = useState(true)
  const [theme, setTheme] = useState<'dark' | 'light'>(initialTheme)

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
  const autoPlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const controlsHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Estado de visibilidade dos controles no overlayMode (modal)
  const [controlsVisible, setControlsVisible] = useState(!inModal)

  const currentScene = STAGE1_SCRIPT[sceneIndex]
  const hideAvatar = SCENES_WITH_OWN_AVATAR.includes(currentScene.id)
  const isDark = theme === 'dark'

  // Handler de interação no modal — revela controles por 3s
  const handleModalInteraction = useCallback(() => {
    if (!inModal) return
    setControlsVisible(true)
    if (controlsHideTimerRef.current) clearTimeout(controlsHideTimerRef.current)
    controlsHideTimerRef.current = setTimeout(() => setControlsVisible(false), 3000)
  }, [inModal])

  const handleToggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark'
      onThemeChange?.(next)
      return next
    })
  }, [onThemeChange])

  const handleToggleWakeLock = useCallback(() => {
    if (isWakeLockActive) releaseWakeLock()
    else requestWakeLock()
  }, [isWakeLockActive, requestWakeLock, releaseWakeLock])

  // ── runScene: núcleo da reprodução ──────────────────────────
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
        // Stage completo
        isPlayingRef.current = false
        setIsPlaying(false)
        // Notifica o pai após managerDelay (padrão 2s para o usuário ver a última cena)
        if (onComplete) {
          autoAdvanceTimerRef.current = setTimeout(onComplete, managerDelay)
        }
      }
    },
    [playText, onComplete]
  )

  // ── handlePlay: desbloqueia áudio e inicia ──────────────────
  const handlePlay = useCallback(() => {
    unlockAudioContext()
    isPlayingRef.current = true
    setIsPlaying(true)
    runScene(sceneIndex)
  }, [sceneIndex, runScene])

  // ── handlePause ─────────────────────────────────────────────
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
      // Pausa → notifica onComplete para mostrar o seletor após managerDelay
      if (onComplete) {
        autoAdvanceTimerRef.current = setTimeout(onComplete, managerDelay)
      }
    } else {
      handlePlay()
    }
  }, [isPlaying, handlePlay, handlePause, onComplete, managerDelay])

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

  // Na última cena, > abre o manager imediatamente (gesto do usuário — sem delay)
  const handleNext = useCallback(() => {
    const isLastScene = sceneIndex === STAGE1_SCRIPT.length - 1
    if (isLastScene) {
      handlePause()
      if (onComplete) onComplete()
    } else {
      goToScene(sceneIndex + 1)
    }
  }, [sceneIndex, goToScene, handlePause, onComplete])

  // ── Auto-play: dispara após mount se prop estiver ativa ─────
  useEffect(() => {
    if (!autoPlay) return
    autoPlayTimerRef.current = setTimeout(() => {
      // AudioContext já foi desbloqueado pelo clique que abriu o modal
      isPlayingRef.current = true
      setIsPlaying(true)
      runScene(0)
    }, AUTO_PLAY_DELAY)
    return () => {
      if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current)
    }
    // Só roda uma vez no mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Cleanup ao desmontar ────────────────────────────────────
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
        // inModal: respeita o maxHeight do container pai (640px desktop)
        // standalone: ocupa a viewport inteira
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
      {/* ── Botão fechar ── */}
      {onClose && (
        <button
          onClick={(e) => { e.stopPropagation(); onClose() }}
          aria-label="Fechar tour"
          className="absolute top-4 right-4 z-50 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
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

      {/* ── Área principal ── */}
      <div
        className="flex-1 min-h-0 flex flex-col md:flex-row md:items-center gap-0 md:gap-12 px-4 md:px-12 w-full max-w-5xl mx-auto"
        style={{
          paddingTop: 'clamp(16px, 4dvh, 48px)',
          paddingBottom: inModal ? '8px' : 'clamp(8px, 2dvh, 24px)',
        }}
      >
        <div
          className="flex-1 min-h-0 w-full"
          style={{
            // inModal: 52% da altura do container (90dvh × 52% ≈ 47dvh)
            // standalone: clamp baseado em dvh do viewport
            height: inModal ? '52%' : 'clamp(220px, 52dvh, 520px)',
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
            height: inModal ? '38%' : 'clamp(170px, 42dvh, 340px)',
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

      {/*
       * Controls:
       * - inModal: overlay absoluto centralizado, revelado por hover/click
       * - standalone: rodapé fixo normal
       */}
      {inModal ? (
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
          overlayMode={true}
          forceVisible={controlsVisible}
        />
      ) : (
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
      )}
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
