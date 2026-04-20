// app/components/landing/ProvasSociaisSection.tsx — Server Component
// Inserir APÓS InicioSection e ANTES dos Recursos no page.tsx

interface ProvasSociaisSectionProps {
  theme?: 'dark' | 'light';
}

const NUMEROS = [
  { valor: '3.000+',   label: 'empresas ativas',         color: 'blue' as const },
  { valor: '100+',     label: 'funções nativas',          color: 'green' as const },
  { valor: 'R$ 0,09', label: 'por interação (a partir)', color: 'blue' as const },
  { valor: '24/7',     label: 'sempre disponível',        color: 'green' as const },
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
    <div className={`relative flex flex-col items-center justify-center h-full w-full px-6 sm:px-8 lg:px-12 overflow-hidden transition-colors duration-500 ${
      isDark
        ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'
        : 'bg-gradient-to-br from-white via-blue-50/30 to-white'
    }`}>

      {/* Glow decorativo */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className={`absolute top-1/3 left-1/2 -translate-x-1/2 w-[60%] h-[50%] rounded-full blur-[120px] ${isDark ? 'bg-blue-500/5' : 'bg-blue-200/20'}`} />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center gap-8 sm:gap-10">

        {/* Label + H2 */}
        <div className="text-center">
          <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${isDark ? 'text-blue-400/70' : 'text-blue-600/70'}`}>
            Quem usa o minhAi
          </p>
          <h2
            style={{ fontFamily: "'Nunito', sans-serif" }}
            className={`text-2xl sm:text-3xl md:text-4xl font-bold leading-tight mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}
          >
            Empresas de todos os tamanhos já{' '}
            <span className={isDark ? 'text-green-400' : 'text-green-600'}>automatizaram</span>
            {' '}seu atendimento
          </h2>
          <p className={`text-sm sm:text-base max-w-xl mx-auto ${isDark ? 'text-white/45' : 'text-gray-500'}`}>
            Do MEI ao grupo empresarial — qualquer negócio que atende cliente pode ter um Funcionário de IA.
          </p>
        </div>

        {/* Números âncora */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 w-full">
          {NUMEROS.map(({ valor, label, color }) => {
            const isBlue = color === 'blue';
            return (
              <div
                key={label}
                className={`flex flex-col items-center justify-center px-4 py-5 rounded-2xl border text-center transition-all ${
                  isDark
                    ? isBlue
                      ? 'bg-blue-500/5 border-blue-500/15'
                      : 'bg-green-500/5 border-green-500/15'
                    : isBlue
                      ? 'bg-blue-50 border-blue-100'
                      : 'bg-green-50 border-green-100'
                }`}
              >
                <span className={`text-2xl sm:text-3xl font-bold mb-1 ${
                  isDark
                    ? isBlue ? 'text-blue-400' : 'text-green-400'
                    : isBlue ? 'text-blue-600' : 'text-green-600'
                }`}>
                  {valor}
                </span>
                <span className={`text-[11px] sm:text-xs font-medium ${isDark ? 'text-white/45' : 'text-gray-500'}`}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Separador */}
        <div className={`w-full h-px ${isDark ? 'bg-white/5' : 'bg-gray-100'}`} />

        {/* Segmentos atendidos */}
        <div className="w-full">
          <p className={`text-center text-xs font-semibold uppercase tracking-widest mb-5 ${isDark ? 'text-white/25' : 'text-gray-400'}`}>
            Segmentos atendidos
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {SEGMENTOS.map(({ emoji, label }) => (
              <span
                key={label}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  isDark
                    ? 'bg-white/5 border-white/8 text-white/55'
                    : 'bg-gray-50 border-gray-200 text-gray-600'
                }`}
              >
                <span aria-hidden="true">{emoji}</span>
                {label}
              </span>
            ))}
            <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border ${
              isDark ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600'
            }`}>
              + muito mais
            </span>
          </div>
        </div>

        {/* Mini CTA inline */}
        <p className={`text-xs text-center ${isDark ? 'text-white/20' : 'text-gray-300'}`}>
          Role para conhecer todos os recursos →
        </p>
      </div>
    </div>
  );
}
