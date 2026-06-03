'use client'
// components/tour/TourAssistant.tsx

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
      {/* Avatar — some com fade quando hideAvatar=true */}
      <div
        className="transition-all duration-500 ease-in-out"
        style={{
          opacity: hideAvatar ? 0 : 1,
          height: hideAvatar ? 0 : undefined,
          overflow: hideAvatar ? 'hidden' : undefined,
          // Tamanho responsivo: 120px mobile → 160px desktop
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
