'use client'
// components/tour/TourAssistant.tsx
import Image from 'next/image'
import { AvatarFace } from '@/components/AvatarFace'

interface TourAssistantProps {
  isSpeaking: boolean
  caption: string
  hideAvatar?: boolean
  theme?: 'dark' | 'light'
  /**
   * Quando true (dentro do modal), avatar menor para sobrar
   * mais espaço à legenda em telas pequenas.
   */
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

  return (
    <div className="flex flex-col items-center gap-1.5 md:gap-3 w-full">

      {hideAvatar ? (
        <div
          style={{
            width: inModal ? 'clamp(120px, 22vw, 220px)' : 'clamp(180px, 35vw, 300px)',
            position: 'relative',
            aspectRatio: '3/1',
            flexShrink: 0,
          }}
        >
          <Image src="/logo.png" alt="minhAi" fill className="object-contain" priority />
        </div>
      ) : (
        <div
          style={{
            width: inModal
              ? 'clamp(60px, 11dvh, 110px)'
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

      {/* Legenda — ocupa o espaço restante, rola invisível se necessário */}
      <div
        className="w-full max-w-2xl px-3 md:px-6 text-center"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <p
          className="leading-relaxed transition-all duration-300"
          style={{
            fontSize: inModal
              ? 'clamp(0.62rem, 1.4vw, 0.82rem)'
              : 'clamp(0.7rem, 1.8vw, 1rem)',
            opacity: caption ? 1 : 0,
            color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(15,23,42,0.85)',
          }}
        >
          {caption}
        </p>
      </div>

    </div>
  )
}