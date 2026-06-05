'use client'
// components/tour/TourAssistant.tsx

import Image from 'next/image'
import { AvatarFace } from '@/components/AvatarFace'

interface TourAssistantProps {
  isSpeaking: boolean
  caption: string
  hideAvatar?: boolean
  theme?: 'dark' | 'light'
  inModal?: boolean
}

export default function TourAssistant({
  isSpeaking,
  caption,
  hideAvatar = false,
  theme = 'dark',
  inModal = false,
}: TourAssistantProps) {
  const isDark = theme === 'dark'

  const captionLength = caption?.length || 0

  const captionFontSize = (() => {
    if (inModal) {
      if (captionLength > 420) return 'clamp(0.50rem, 1vw, 0.66rem)'
      if (captionLength > 300) return 'clamp(0.54rem, 1.1vw, 0.70rem)'
      if (captionLength > 200) return 'clamp(0.58rem, 1.2vw, 0.76rem)'
      if (captionLength > 120) return 'clamp(0.62rem, 1.35vw, 0.82rem)'
      return 'clamp(0.68rem, 1.55vw, 0.9rem)'
    }

    if (captionLength > 420) return 'clamp(0.56rem, 1vw, 0.72rem)'
    if (captionLength > 300) return 'clamp(0.60rem, 1.15vw, 0.78rem)'
    if (captionLength > 200) return 'clamp(0.66rem, 1.35vw, 0.84rem)'
    if (captionLength > 120) return 'clamp(0.72rem, 1.55vw, 0.92rem)'
    return 'clamp(0.78rem, 1.7vw, 1rem)'
  })()

  const captionLineHeight = (() => {
    if (captionLength > 420) return 1.35
    if (captionLength > 300) return 1.42
    if (captionLength > 200) return 1.5
    return 1.65
  })()

  return (
    <div className="flex flex-col items-center gap-1.5 md:gap-3 w-full min-w-0">

      {hideAvatar ? (
        <div
          style={{
            width: inModal
              ? 'clamp(120px, 22vw, 220px)'
              : 'clamp(180px, 35vw, 300px)',
            position: 'relative',
            aspectRatio: '3/1',
            flexShrink: 0,
          }}
        >
          <Image
            src="/logo.png"
            alt="minhAi"
            fill
            className="object-contain"
            priority
          />
        </div>
      ) : (
        <div
          style={{
            width: inModal
              ? 'clamp(80px, 14dvh, 130px)'
              : 'clamp(140px, 26dvh, 200px)',
            aspectRatio: '1/1',
            flexShrink: 0,
            overflow: 'visible',
          }}
        >
          <AvatarFace
            isSpeaking={isSpeaking}
            isListening={false}
            isProcessing={false}
            theme={isDark ? 'dark' : 'light'}
            avatarType={isSpeaking ? 'orb' : 'face'}
            hasActivePlan={true}
          />
        </div>
      )}

      {/* Legenda — nunca corta, nunca cria barra, diminui conforme o texto */}
      <div
        className="w-full text-center min-w-0"
        style={{
          maxWidth: inModal ? 'min(92vw, 380px)' : 'min(92vw, 680px)',
          paddingInline: inModal ? '0.5rem' : '1rem',
          overflow: 'visible',
        }}
      >
        <p
          className="transition-all duration-300"
          style={{
            fontSize: captionFontSize,
            lineHeight: captionLineHeight,
            opacity: caption ? 1 : 0,
            color: isDark
              ? 'rgba(255,255,255,0.9)'
              : 'rgba(15,23,42,0.85)',
            overflow: 'visible',
            whiteSpace: 'normal',
            wordBreak: 'normal',
            overflowWrap: 'break-word',
            textWrap: 'pretty',
            margin: 0,
          }}
        >
          {caption}
        </p>
      </div>

    </div>
  )
}