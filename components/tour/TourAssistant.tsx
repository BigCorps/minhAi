'use client'
// components/tour/TourAssistant.tsx
import Image from 'next/image'
import { AvatarFace } from '@/components/AvatarFace'

interface TourAssistantProps {
  isSpeaking: boolean
  caption: string
  /** Quando true o avatar some — usado nas cenas que já têm avatar no mock */
  hideAvatar?: boolean
}

export default function TourAssistant({
  isSpeaking,
  caption,
  hideAvatar = false,
}: TourAssistantProps) {
  return (
    <div className="flex flex-col items-center gap-2 md:gap-4 w-full">

      {/* ── Avatar ou Logo ── */}
      {hideAvatar ? (
        // Logo minhAi — proporcional em qualquer viewport
        <div
          style={{
            width: 'clamp(160px, 30vw, 280px)',
            position: 'relative',
            aspectRatio: '3/1',
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
        // Avatar — usa dvh em vez de vw para não encolher em portrait mobile
        <div
          style={{
            width: 'clamp(100px, 18dvh, 160px)',
            aspectRatio: '1/1',
            flexShrink: 0,
          }}
        >
          <AvatarFace
            isSpeaking={isSpeaking}
            isListening={false}
            isProcessing={false}
            theme="dark"
            avatarType={isSpeaking ? 'orb' : 'face'}
            hasActivePlan={true}
          />
        </div>
      )}

      {/* ── Legenda ── */}
      <div className="w-full max-w-2xl px-4 md:px-6 text-center">
        <p
          className="text-white/90 leading-relaxed transition-opacity duration-300"
          style={{
            fontSize: 'clamp(0.8rem, 2vw, 1.05rem)',
            opacity: caption ? 1 : 0,
            // Limita a altura da legenda em mobile para não empurrar controls
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
