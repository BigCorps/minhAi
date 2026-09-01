'use client'
// components/LeadDemo/LeadDemoCarrosselMock.tsx
// Barra de categorias animada — qualquer clique abre o tour do carrossel.

const CAROUSEL_ITEMS = [
  { name: 'Conhecimento',  color: '#3B82F6' },
  { name: 'Comercial',     color: '#10B981' },
  { name: 'Financeiro',    color: '#3B82F6' },
  { name: 'Informação',    color: '#10B981' },
  { name: 'Multimídia',    color: '#3B82F6' },
  { name: 'Agendamento',   color: '#10B981' },
  { name: 'Serviços',      color: '#3B82F6' },
  { name: 'Contato',       color: '#10B981' },
  { name: 'Localização',   color: '#3B82F6' },
  { name: 'Consultas',     color: '#10B981' },
  { name: 'Identificação', color: '#3B82F6' },
  { name: 'Arquivos',      color: '#10B981' },
  { name: 'Utilitários',   color: '#3B82F6' },
  { name: 'Câmera',        color: '#10B981' },
]

const DUPLICATED = Array.from({ length: 6 }, () => CAROUSEL_ITEMS).flat()
const SCROLL_PCT  = parseFloat(((1 / 6) * 100).toFixed(4))

interface Props {
  theme?: 'dark' | 'light'
  onCarrosselClick: () => void
}

export function LeadDemoCarrosselMock({ theme = 'dark', onCarrosselClick }: Props) {
  const isDark = theme !== 'light'

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Toque para saber mais sobre as categorias"
      onClick={onCarrosselClick}
      onKeyDown={(e) => e.key === 'Enter' && onCarrosselClick()}
      className="w-full flex-shrink-0 cursor-pointer group relative select-none"
      style={{ paddingTop: 6, paddingBottom: 6 }}
    >
      {/* Hover hint */}
      <div
        className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none
                   opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{ background: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.55)' }}
      >
        <span
          className="text-xs font-semibold px-3 py-1.5 rounded-full text-white"
          style={{ background: 'rgba(59,130,246,0.88)' }}
        >
          Toque para saber mais
        </span>
      </div>

      {/* Scrolling strip */}
      <div className="w-full overflow-hidden">
        <div
          className="flex gap-2 pl-2 w-max"
          style={{
            animation: 'lead-mock-carousel-scroll 18s linear infinite',
            willChange: 'transform',
          }}
        >
          {DUPLICATED.map((cat, i) => (
            <div
              key={i}
              className="flex-shrink-0 flex items-center rounded-xl"
style={{
  fontSize: '0.875rem',
  fontWeight: 600,
  color: isDark ? '#fff' : 'rgba(0,0,0,0.85)',
  background: isDark ? 'rgba(255,255,255,0.10)' : '#fff',
  borderLeft: `4px solid ${cat.color}`,
  borderRadius: '0.75rem',
  padding: '12px 20px',
  whiteSpace: 'nowrap',
  boxShadow: isDark ? '0 2px 4px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.05)',
}}
            >
              {cat.name}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes lead-mock-carousel-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-${SCROLL_PCT}%); }
        }
      `}</style>
    </div>
  )
}