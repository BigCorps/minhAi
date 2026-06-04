'use client'
// components/tour/scenes/SceneIntro.tsx
import Image from 'next/image'
import { AvatarFace } from '@/components/AvatarFace'

export default function SceneIntro({
  isOutro = false,
  isSpeaking = false,
  theme = 'dark',
}: {
  isOutro?: boolean
  isSpeaking?: boolean
  theme?: 'dark' | 'light'
}) {
  const isDark = theme === 'dark'

  return (
    <div className="flex flex-col items-center justify-center gap-4 w-full h-full select-none">
      {/* Avatar — maior pois tem espaço livre sem cards competindo */}
      <div
        style={{
          width: 'clamp(180px, 38dvh, 320px)',
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

      {/* Tagline */}
      <p
        className="text-center max-w-sm transition-colors duration-400"
        style={{
          fontSize: 'clamp(0.85rem, 2.2vw, 1.05rem)',
          color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(15,23,42,0.5)',
        }}
      >
        {isOutro
          ? 'Uma IA pra chamar de sua!'
          : 'Uma IA pra chamar de sua!
O Assistente IA que vende e atende 24 horas.'}
      </p>

      {/* Linha decorativa */}
      <div
        className="rounded-full"
        style={{
          width: 'clamp(48px, 8vw, 80px)',
          height: 2,
          background: 'linear-gradient(90deg, transparent, #3b82f6, transparent)',
        }}
      />
    </div>
  )
}
