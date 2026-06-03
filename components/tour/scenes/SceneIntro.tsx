'use client'
// components/tour/scenes/SceneIntro.tsx
// Usada tanto na cena 'intro' quanto na 'outro'.
// Exibe o logotipo minhAi + tagline, com o avatar já sendo
// renderizado pelo TourAssistant (não duplicamos aqui).

export default function SceneIntro({ isOutro = false }: { isOutro?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 w-full h-full select-none">
      {/* Logo / wordmark */}
      <div className="flex items-center gap-3">
        {/* Ícone orbe pequeno decorativo */}
        <div
          className="rounded-full flex-shrink-0"
          style={{
            width: 'clamp(32px, 6vw, 56px)',
            height: 'clamp(32px, 6vw, 56px)',
            background: 'radial-gradient(circle at 40% 40%, #3b82f6, #1d4ed8)',
            boxShadow: '0 0 32px rgba(59,130,246,0.5)',
          }}
        />
        <span
          className="font-bold tracking-tight text-white"
          style={{ fontSize: 'clamp(1.8rem, 5vw, 3.5rem)' }}
        >
          minhAi
        </span>
      </div>

      {/* Tagline */}
      <p
        className="text-white/50 text-center max-w-sm"
        style={{ fontSize: 'clamp(0.8rem, 2vw, 1rem)' }}
      >
        {isOutro
          ? 'Em qualquer canal. Com a mesma inteligência.'
          : 'Seu assistente inteligente, em qualquer lugar.'}
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
