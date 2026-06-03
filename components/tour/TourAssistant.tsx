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
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Avatar ou Logo */}
      {hideAvatar ? (
        <div style={{ width: 'clamp(140px, 28vw, 260px)', position: 'relative', aspectRatio: '3/1' }}>
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
          className="transition-all duration-500 ease-in-out"
          style={{
            width: 'clamp(100px, 20vw, 160px)',
            aspectRatio: '1/1',
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

      {/* Legenda */}
      <div
        className="w-full max-w-2xl px-6 text-center"
        style={{ minHeight: '4rem' }}
      >
        <p
          className="text-white/90 leading-relaxed transition-opacity duration-300"
          style={{
            fontSize: 'clamp(0.85rem, 2.2vw, 1.1rem)',
            opacity: caption ? 1 : 0,
          }}
        >
          {caption}
        </p>
      </div>
    </div>
  )
}
