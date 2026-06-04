'use client'
// components/tour/TourAssistant.tsx

import Image from 'next/image'
import AvatarFace from '@/components/AvatarFace'

interface TourAssistantProps {
  isSpeaking: boolean
  caption: string
  /** Quando true, exibe logo em vez do avatar (cenas com avatar próprio) */
  hideAvatar?: boolean
}

export default function TourAssistant({
  isSpeaking,
  caption,
  hideAvatar = false,
}: TourAssistantProps) {
  return (
    <div className="flex flex-col items-center gap-4 w-full">

      {/* Avatar ou Logo — tamanho fixo, não muda com conteúdo */}
      {hideAvatar ? (
        <div
          style={{
            width: 'clamp(120px, 22vw, 200px)',
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
            width: 'clamp(90px, 16vw, 140px)',
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

      {/* Legenda — altura mínima fixa para não deslocar o layout */}
      <div
        className="w-full px-4 text-center"
        style={{ minHeight: '5rem', maxWidth: 380 }}
      >
        <p
          className="text-white/90 leading-relaxed"
          style={{
            fontSize: 'clamp(0.82rem, 2vw, 1rem)',
            opacity: caption ? 1 : 0,
            transition: 'opacity 300ms',
          }}
        >
          {caption}
        </p>
      </div>

    </div>
  )
}
