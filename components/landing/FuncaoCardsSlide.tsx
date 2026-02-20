'use client';

interface FuncaoCard {
  title: string;
  description: string;
  color: 'green' | 'blue';
  icon: string; // emoji icon for each category
}

interface FuncaoCardsSlideProps {
  theme?: 'dark' | 'light';
  cards: FuncaoCard[];
  currentIndex: number;
  totalCount: number;
}

const colorStyles = {
  green: {
    dark: {
      labelBg: 'bg-green-500/10',
      labelText: 'text-green-400',
      border: 'border-green-500/15',
      cardBg: 'bg-green-500/5',
      iconBg: 'bg-green-500/15',
      titleText: 'text-green-400',
      dotActive: 'bg-green-400',
      glow: 'bg-green-500/5',
    },
    light: {
      labelBg: 'bg-green-100',
      labelText: 'text-green-600',
      border: 'border-green-200',
      cardBg: 'bg-green-50',
      iconBg: 'bg-green-100',
      titleText: 'text-green-700',
      dotActive: 'bg-green-500',
      glow: 'bg-green-200/20',
    },
  },
  blue: {
    dark: {
      labelBg: 'bg-blue-500/10',
      labelText: 'text-blue-400',
      border: 'border-blue-500/15',
      cardBg: 'bg-blue-500/5',
      iconBg: 'bg-blue-500/15',
      titleText: 'text-blue-400',
      dotActive: 'bg-blue-400',
      glow: 'bg-blue-500/5',
    },
    light: {
      labelBg: 'bg-blue-100',
      labelText: 'text-blue-600',
      border: 'border-blue-200',
      cardBg: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      titleText: 'text-blue-700',
      dotActive: 'bg-blue-500',
      glow: 'bg-blue-200/20',
    },
  },
};

export default function FuncaoCardsSlide({
  theme = 'dark',
  cards,
  currentIndex,
  totalCount,
}: FuncaoCardsSlideProps) {
  const isDark = theme === 'dark';

  // Pick glow color from first card
  const glowColor = cards[0]?.color ?? 'blue';
  const glowClass = isDark
    ? glowColor === 'green' ? 'bg-green-500/5' : 'bg-blue-500/5'
    : glowColor === 'green' ? 'bg-green-200/20' : 'bg-blue-200/20';

  // Determine grid layout based on card count
  const count = cards.length;
  const gridClass =
    count === 3
      ? 'grid-cols-1 sm:grid-cols-3'
      : 'grid-cols-1 sm:grid-cols-2';

  return (
    <div
      className={`relative flex flex-col h-full w-full overflow-hidden transition-colors duration-500 ${
        isDark
          ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'
          : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
      }`}
    >
      {/* Decorative glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute top-1/3 right-1/4 w-[45%] h-[45%] rounded-full blur-[130px] ${glowClass}`} />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center h-full px-4 sm:px-8 lg:px-12 pt-20 pb-6 md:pt-24 md:pb-8 gap-4 md:gap-5">

        {/* Header */}
        <div className="text-center">
          <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
            Funções — Página {currentIndex + 1} de {totalCount}
          </p>
          <h2
            style={{ fontFamily: "'Nunito', sans-serif" }}
            className={`text-lg sm:text-xl md:text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}
          >
            O que o seu funcionário IA pode fazer
          </h2>
        </div>

        {/* Cards */}
        <div className={`w-full max-w-4xl grid ${gridClass} gap-3 md:gap-4 overflow-y-auto md:overflow-visible`}>
          {cards.map((card, i) => {
            const s = colorStyles[card.color][theme];
            return (
              <div
                key={i}
                className={`flex flex-col gap-3 p-4 md:p-5 rounded-2xl border transition-all duration-300 ease-out hover:scale-[1.03] cursor-default ${s.cardBg} ${s.border}`}
              >
                {/* Icon + Title row */}
                <div className="flex items-center gap-3">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl ${s.iconBg}`}>
                    {card.icon}
                  </div>
                  <h3 className={`text-sm md:text-base font-bold ${s.titleText}`}>
                    {card.title}
                  </h3>
                </div>
                {/* Description */}
                <p className={`text-xs md:text-sm leading-relaxed ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                  {card.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-2">
          {Array.from({ length: totalCount }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentIndex
                  ? `w-8 ${isDark ? 'bg-blue-400' : 'bg-blue-500'}`
                  : `w-2 ${isDark ? 'bg-white/15' : 'bg-gray-200'}`
              }`}
            />
          ))}
        </div>

        <p className={`text-xs ${isDark ? 'text-white/20' : 'text-gray-300'}`}>
          {currentIndex < totalCount - 1 ? 'Role para ver mais funções →' : 'Próximo: Nossos Planos →'}
        </p>
      </div>
    </div>
  );
}
