'use client'
// components/tour/TourAssistant.tsx
import Image from 'next/image'
import { AvatarFace } from '@/components/AvatarFace'

interface TourAssistantProps {
  isSpeaking: boolean
  caption: string
  hideAvatar?: boolean
  theme?: 'dark' | 'light'
}

export default function TourAssistant({
  isSpeaking,
  caption,
  hideAvatar = false,
  theme = 'dark',
}: TourAssistantProps) {
  const isDark = theme === 'dark'

  return (
    <div className="flex flex-col items-center gap-2 md:gap-3 w-full">

      {hideAvatar ? (
        <div
          style={{
            width: 'clamp(180px, 35vw, 300px)',
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
            width: 'clamp(140px, 26dvh, 200px)',
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

      {/* Legenda */}
      <div className="w-full max-w-2xl px-4 md:px-6 text-center">
        <p
          className="leading-relaxed transition-all duration-300"
          style={{
            fontSize: 'clamp(0.78rem, 1.9vw, 1rem)',
            opacity: caption ? 1 : 0,
            color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(15,23,42,0.85)',
            display: '-webkit-box',
            WebkitLineClamp: 5,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {caption}
        </p>
      </div>

    </div>
  )
}
