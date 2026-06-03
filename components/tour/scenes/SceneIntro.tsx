'use client'
// components/tour/scenes/SceneIntro.tsx
import Image from 'next/image'
import { AvatarFace } from '@/components/AvatarFace'

export default function SceneIntro({
  isOutro = false,
  isSpeaking = false,
}: {
  isOutro?: boolean
  isSpeaking?: boolean
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 w-full h-full select-none">
      {/* Avatar no lugar do logo */}
      <div style={{ width: 'clamp(120px, 20vw, 200px)', aspectRatio: '1/1' }}>
        <AvatarFace
          isSpeaking={isSpeaking}
          isListening={false}
          isProcessing={false}
          theme="dark"
          avatarType={isSpeaking ? 'orb' : 'face'}
          hasActivePlan={true}
        />
      </div>
      {/* Tagline */}
      <p
        className="text-white/50 text-center max-w-sm"
        style={{ fontSize: 'clamp(0.8rem, 2vw, 1rem)' }}
      >
        {isOutro
          ? 'Uma IA pra chamar de sua!'
          : 'Uma IA pra chamar de sua! O Assistente IA que vende e atende 24 horas.'}
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
