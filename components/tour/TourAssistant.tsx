'use client'
// components/tour/TourAssistant.tsx
import Image from 'next/image'
import { AvatarFace } from '@/components/AvatarFace'

interface TourAssistantProps {
  isSpeaking: boolean
  caption: string
  hideAvatar?: boolean
}

export default function TourAssistant({
  isSpeaking,
  caption,
  hideAvatar = false,
}: TourAssistantProps) {
  return (
    <div className="flex flex-col items-center gap-2 md:gap-3 w-full">

      {/* ── Avatar ou Logo ── */}
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
        /*
         * Avatar com tamanho baseado em dvh para não encolher em portrait mobile.
         * O AvatarFace usa w-full h-full internamente — só precisamos do wrapper correto.
         * overflow-visible garante que os halos/anéis não sejam cortados.
         */
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
            fontSize: 'clamp(0.78rem, 1.9vw, 1rem)',
            opacity: caption ? 1 : 0,
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
