'use client'
// components/tour/scenes/SceneIntro.tsx
import Image from 'next/image'

export default function SceneIntro({ isOutro = false }: { isOutro?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 w-full h-full select-none">
      {/* Logo real */}
      <div style={{ width: 'clamp(140px, 28vw, 260px)', position: 'relative', aspectRatio: '3/1' }}>
        <Image
          src="/logo.png"
          alt="minhAi"
          fill
          className="object-contain"
          priority
        />
      </div>

      {/* Tagline */}
      <p
        className="text-white/50 text-center max-w-sm"
        style={{ fontSize: 'clamp(0.8rem, 2vw, 1rem)' }}
      >
        {isOutro
          ? 'Em qualquer canal. Com a mesma inteligência.'
          : 'Uma IA pra chamar de sua!'}
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
