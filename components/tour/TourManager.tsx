'use client'
// components/tour/TourManager.tsx

import React from 'react'

interface Stage {
  id: number
  label: string
  description: string
  icon: React.ReactNode
  available: boolean
}

const iconClass = "w-6 h-6 flex-shrink-0"

const STAGES: Stage[] = [
  {
    id: 1,
    label: 'Apresentação',
    description: 'Multifuncional e Multicanal',
    available: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    id: 2,
    label: 'Página do Assistente',
    description: 'Modos do avatar e funções de voz',
    available: true,
    icon: (
      <svg
        className={iconClass}
        viewBox="96 96 320 320"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="256" cy="256" r="145" stroke="currentColor" strokeWidth="18" />
        <circle cx="256" cy="256" r="122" stroke="currentColor" strokeWidth="18" />
        <ellipse cx="218" cy="230" rx="18" ry="24" fill="currentColor" />
        <ellipse cx="294" cy="230" rx="18" ry="24" fill="currentColor" />
        <path d="M216 296C237 314 275 314 296 296" stroke="currentColor" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 3,
    label: 'Modos de Cobrança',
    description: 'PIX, links e pagamentos',
    available: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
        <line x1="6" y1="15" x2="10" y2="15" />
        <line x1="14" y1="15" x2="18" y2="15" />
      </svg>
    ),
  },
  {
    id: 4,
    label: 'Meu Dashboard',
    description: 'Configurações, integrações e mais',
    available: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    id: 5,
    label: 'Auxiliares',
    description: 'NF-e, compras e agendamento',
    available: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
  {
    id: 6,
    label: 'Negócio Digital',
    description: 'App próprio e indicação',
    available: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    id: 7,
    label: 'Funções e Habilidades',
    description: 'Conheça as categorias e funções',
    available: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    id: 8,
    label: 'Planos e Valores',
    description: 'Smart, Vendas, full e créditos',
    available: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
        <circle cx="12" cy="12" r="10" />
        <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
        <line x1="12" y1="6" x2="12" y2="8" />
        <line x1="12" y1="16" x2="12" y2="18" />
      </svg>
    ),
  },
]

interface TourManagerProps {
  activeStage: number
  initialTheme?: 'dark' | 'light'
  onSelectStage: (stage: number) => void
  onClose?: () => void
}

export default function TourManager({
  activeStage,
  initialTheme = 'dark',
  onSelectStage,
  onClose,
}: TourManagerProps) {
  const isDark = initialTheme === 'dark'

  return (
    <div
      className="w-full flex flex-col overflow-hidden"
      style={{
        height: '100dvh',
        background: isDark
          ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
          : '#ffffff',
      }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-6 py-4 flex-shrink-0 border-b"
        style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
      >
        <div>
          <h2
            className="font-bold text-lg"
            style={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(15,23,42,0.9)' }}
          >
            Tour Interativo
          </h2>
          <p
            className="text-xs mt-0.5"
            style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}
          >
            Escolha uma seção para explorar
          </p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            aria-label="Fechar tour"
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200"
            style={{
              background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-4 h-4">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Grid de stages ── */}
      <div className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center px-4 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-2xl mx-auto">
          {STAGES.map((stage) => {
            const isCurrent = stage.id === activeStage
            const isAvailable = stage.available

            return (
              <button
                key={stage.id}
                onClick={() => isAvailable && onSelectStage(stage.id)}
                disabled={!isAvailable}
                className="relative flex flex-col items-center justify-center gap-2.5 rounded-2xl p-4 text-center transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                style={{
                  background: isCurrent
                    ? isDark ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)'
                    : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                  border: `1.5px solid ${
                    isCurrent
                      ? '#3b82f6'
                      : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
                  }`,
                  opacity: isAvailable ? 1 : 0.45,
                  cursor: isAvailable ? 'pointer' : 'default',
                  color: isCurrent
                    ? '#3b82f6'
                    : isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
                  minHeight: '110px',
                }}
              >
                {stage.icon}

                <div className="flex flex-col items-center gap-0.5">
                  <p
                    className="font-semibold text-sm leading-tight"
                    style={{ color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(15,23,42,0.85)' }}
                  >
                    {stage.label}
                  </p>
                  <p
                    className="text-xs leading-snug"
                    style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)' }}
                  >
                    {stage.description}
                  </p>
                </div>

                {isCurrent && (
                  <span
                    className="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: '#3b82f6', color: 'white' }}
                  >
                    atual
                  </span>
                )}

                {!isAvailable && (
                  <span
                    className="absolute top-2 right-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                      color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                    }}
                  >
                    em breve
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Footer ── */}
      <div
        className="flex-shrink-0 flex items-center justify-center gap-3 px-6 py-4 border-t"
        style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
      >
        <button
          onClick={() => onSelectStage(activeStage)}
          className="px-6 py-2.5 rounded-full font-semibold text-sm transition-all duration-200 hover:brightness-110"
          style={{ background: '#3b82f6', color: 'white' }}
        >
          Continuar de onde parei
        </button>
        <button
          onClick={() => onSelectStage(1)}
          className="px-6 py-2.5 rounded-full font-semibold text-sm transition-all duration-200"
          style={{
            background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
          }}
        >
          Recomeçar
        </button>
      </div>
    </div>
  )
}