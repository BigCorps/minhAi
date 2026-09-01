// app/components/landing/ProvasSociaisSection.tsx — Server Component

interface ProvasSociaisSectionProps {
  theme?: 'dark' | 'light';
}

const NUMEROS = [
  { valor: '30+',     label: 'empresas ativas',          color: 'blue'  as const },
  { valor: '100+',    label: 'funções nativas',           color: 'green' as const },
  { valor: 'R$ 0,05', label: 'por interação (a partir)', color: 'blue'  as const },
  { valor: '24/7',    label: 'sempre disponível',         color: 'green' as const },
];

const SEGMENTOS = [
  { emoji: '🏥', label: 'Clínicas & Saúde' },
  { emoji: '🍕', label: 'Restaurantes' },
  { emoji: '⚖️', label: 'Advocacia' },
  { emoji: '💈', label: 'Beleza & Estética' },
  { emoji: '🏋️', label: 'Academias' },
  { emoji: '🏢', label: 'Franquias' },
  { emoji: '🛒', label: 'E-commerce' },
  { emoji: '🏗️', label: 'Construção' },
  { emoji: '🚗', label: 'Concessionárias' },
  { emoji: '🎓', label: 'Educação' },
  { emoji: '🏨', label: 'Hotelaria' },
  { emoji: '🏦', label: 'Financeiro' },
];

export default function ProvasSociaisSection({ theme = 'dark' }: ProvasSociaisSectionProps) {
  const isDark = theme === 'dark';

  return (
    <div
      className={`
        relative flex flex-col items-center justify-center
        w-full overflow-hidden bg-transparent
        px-5 sm:px-8 lg:px-12
        transition-colors duration-500
      `}
    >
      {/* Glow decorativo */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className={`absolute top-1/3 left-1/2 -translate-x-1/2 w-[60%] h-[50%] rounded-full blur-[120px] ${isDark ? 'bg-blue-500/5' : 'bg-blue-200/20'}`} />
      </div>

      <div
        className={`
          relative z-10 w-full max-w-5xl mx-auto
          flex flex-col items-center
          pt-24 pb-16 sm:pt-28 sm:pb-20 md:py-16
          gap-6 md:gap-8
        `}
      >

        {/* ── Label + H2 ─────────────────────────────────────── */}
        <div className="text-center">
          <p className={`text-xs font-semibold uppercase tracking-widest mb-1.5 ${isDark ? 'text-blue-400/70' : 'text-blue-600/70'}`}>
            Quem usa a minhAi
          </p>
          <h2 className={`font-bold leading-tight mb-1.5 text-2xl sm:text-3xl md:text-4xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Empresas de todos os tamanhos já{' '}
            <span className={isDark ? 'text-green-400' : 'text-green-600'}>automatizaram</span>
            {' '}seu atendimento
          </h2>
          <p className={`text-sm sm:text-base max-w-xl mx-auto ${isDark ? 'text-white/45' : 'text-gray-500'}`}>
            De MEIs a grandes empresas — qualquer negócio com clientes e funcionários pode ter um Assistente IA.
          </p>
        </div>

        {/* ── Números âncora ─────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 w-full">
          {NUMEROS.map(({ valor, label, color }) => {
            const isBlue = color === 'blue';
            return (
              <div
                key={label}
                className={`
                  flex flex-col items-center justify-center
                  px-3 py-3 sm:py-5 rounded-2xl border text-center transition-all
                  ${isDark
                    ? isBlue
                      ? 'bg-blue-500/5 border-blue-500/15'
                      : 'bg-green-500/5 border-green-500/15'
                    : isBlue
                      ? 'bg-blue-50 border-blue-100'
                      : 'bg-green-50 border-green-100'
                  }
                `}
              >
                <span
                  className={`
                    font-bold mb-0.5
                    text-xl sm:text-3xl
                    ${isDark
                      ? isBlue ? 'text-blue-400' : 'text-green-400'
                      : isBlue ? 'text-blue-600' : 'text-green-600'
                    }
                  `}
                >
                  {valor}
                </span>
                <span className={`text-[10px] sm:text-xs font-medium ${isDark ? 'text-white/45' : 'text-gray-500'}`}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Separador */}
        <div className={`w-full h-px ${isDark ? 'bg-white/5' : 'bg-gray-100'}`} />

        {/* ── Segmentos ──────────────────────────────────────── */}
        <div className="w-full">
          <p className={`text-center text-[10px] sm:text-xs font-semibold uppercase tracking-widest mb-2 sm:mb-4 ${isDark ? 'text-white/25' : 'text-gray-400'}`}>
            Segmentos atendidos
          </p>
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-3">
            {SEGMENTOS.map(({ emoji, label }) => (
              <span
                key={label}
                className={`
                  inline-flex items-center gap-1 sm:gap-1.5
                  px-2.5 py-1 sm:px-3 sm:py-1.5
                  rounded-full text-[10px] sm:text-xs font-medium border leading-none transition-colors
                  ${isDark
                    ? 'bg-white/5 border-white/8 text-white/55'
                    : 'bg-gray-50 border-gray-200 text-gray-600'
                  }
                `}
              >
                <span aria-hidden="true">{emoji}</span>
                {label}
              </span>
            ))}
            <span
              className={`
                inline-flex items-center gap-1
                px-2.5 py-1 sm:px-3 sm:py-1.5
                rounded-full text-[10px] sm:text-xs font-medium border leading-none
                ${isDark
                  ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                  : 'bg-blue-50 border-blue-200 text-blue-600'
                }
              `}
            >
              + muito mais
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}