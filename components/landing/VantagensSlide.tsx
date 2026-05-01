'use client';

// components/landing/VantagensSlide.tsx — copy reformulado

interface VantagensSlideProps {
  theme?: 'dark' | 'light';
  currentIndex: number;
  totalCount: number;
}

const VANTAGENS = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      </svg>
    ),
    title: 'Seu próprio App, sem App Store',
    highlight: 'PWA instalável',
    description:
      'WebApp com sua marca direto na tela do cliente — sem publicar na Play Store ou App Store. Funciona como app nativo, com seu logo, nome e dominio a sua escolha.',
    color: 'blue' as const,
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
    title: 'Ganhe renda indicando',
    highlight: '50% de comissão',
    description:
      'Indique outros negócios e receba 50% das mensalidades deles, todos os meses, para sempre. A melhor renda passiva que o seu negócio pode ter.',
    color: 'green' as const,
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <rect x="3" y="3" width="6" height="6" rx="1.5" strokeWidth="1.5" />
        <rect x="15" y="3" width="6" height="6" rx="1.5" strokeWidth="1.5" />
        <rect x="3" y="15" width="6" height="6" rx="1.5" strokeWidth="1.5" />
        <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M15 15h2v2h-2zM19 15h2v4h-4v-2h2zM15 19h2v2h-2z" />
      </svg>
    ),
    title: 'Cobre pelo WhatsApp com 1 mensagem',
    highlight: 'PIX instantâneo',
    description:
      'Gere cobrança PIX por voz ou chat, envie o link Pix com confirmação automática. Sem maquininha, sem complicação e sem comprovantes falsos.',
    color: 'blue' as const,
  },
];

const colorMap = {
  blue: {
    dark: { iconBg: 'bg-blue-500/15', iconText: 'text-blue-400', highlight: 'text-blue-400', border: 'border-blue-500/10' },
    light: { iconBg: 'bg-blue-100', iconText: 'text-blue-600', highlight: 'text-blue-600', border: 'border-blue-100' },
  },
  green: {
    dark: { iconBg: 'bg-green-500/15', iconText: 'text-green-400', highlight: 'text-green-400', border: 'border-green-500/10' },
    light: { iconBg: 'bg-green-100', iconText: 'text-green-600', highlight: 'text-green-600', border: 'border-green-100' },
  },
};

export default function VantagensSlide({ theme = 'dark', currentIndex, totalCount }: VantagensSlideProps) {
  const isDark = theme === 'dark';

  return (
    <div className={`relative flex flex-col h-full w-full overflow-hidden transition-colors duration-500 ${
      isDark
        ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
        : 'bg-gradient-to-br from-white via-blue-50/50 to-white'
    }`}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className={`absolute top-1/4 right-1/4 w-[50%] h-[50%] rounded-full blur-[140px] ${isDark ? 'bg-green-500/5' : 'bg-green-200/15'}`} />
      </div>

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-center h-full px-6 sm:px-10 lg:px-16 gap-8 md:gap-12 pt-20 pb-10 md:py-0">

        {/* LEFT */}
        <div className="flex flex-col items-start justify-center w-full md:w-1/2 max-w-xl order-2 md:order-1">
          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest mb-5 ${
            isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-100 text-green-600'
          }`}>
            Vantagens
          </span>

          <h2
            style={{ fontFamily: "'Nunito', sans-serif" }}
            className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-6 transition-colors ${isDark ? 'text-white' : 'text-gray-900'}`}
          >
            Mais vantagens<br />
            <span className={isDark ? 'text-green-400' : 'text-green-600'}>que fazem diferença</span>
          </h2>

          <div className="flex flex-col gap-3 w-full">
            {VANTAGENS.map((v, i) => {
              const c = colorMap[v.color][theme];
              return (
                <div
                  key={i}
                  className={`rounded-xl border p-3 sm:p-4 flex items-center gap-3 sm:gap-4 transition-all duration-300 ${c.border} ${
                    isDark ? 'bg-white/[0.02]' : 'bg-white/80 shadow-sm'
                  }`}
                >
                  <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${c.iconBg}`}>
                    <div className={c.iconText}>{v.icon}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <h3
                        style={{ fontFamily: "'Nunito', sans-serif" }}
                        className={`text-sm sm:text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}
                      >
                        {v.title}
                      </h3>
                      <span className={`text-xs sm:text-sm font-bold ${c.highlight}`}>
                        {v.highlight}
                      </span>
                    </div>
                    <p className={`text-[11px] sm:text-xs leading-relaxed ${isDark ? 'text-white/45' : 'text-gray-500'}`}>
                      {v.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Progress dots */}
          <div className="flex items-center gap-2 mt-8">
            {Array.from({ length: totalCount }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentIndex
                    ? `w-8 ${isDark ? 'bg-green-400' : 'bg-green-500'}`
                    : `w-2 ${isDark ? 'bg-white/15' : 'bg-gray-200'}`
                }`}
              />
            ))}
          </div>
          <p className={`mt-4 text-xs transition-colors ${isDark ? 'text-white/20' : 'text-gray-300'}`}>
            Role para ver nossos recursos →
          </p>
        </div>

        {/* RIGHT: Image */}
        <div className="flex items-center justify-center w-full md:w-1/2 max-w-lg order-1 md:order-2">
          <img
            src="/webapp.png"
            alt="WebApp personalizado, programa de indicação e Link PIX do minhAi"
            className="w-full max-w-[320px] sm:max-w-[400px] md:max-w-full object-contain drop-shadow-2xl transition-transform duration-300 ease-out hover:scale-105 cursor-pointer"
            style={{ maxHeight: '55vh' }}
          />
        </div>
      </div>
    </div>
  );
}
