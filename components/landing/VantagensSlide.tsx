'use client';

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
    title: 'WebApp Próprio',
    highlight: 'PWA',
    description: 'App web instalável direto na tela do celular, sem baixar nada na loja.',
    color: 'blue' as const,
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
    title: 'Programa de Indicação',
    highlight: '50%',
    description: 'Ganhe 50% de comissão sobre as mensalidades dos indicados, todos os meses.',
    color: 'green' as const,
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-3.061a4.5 4.5 0 00-1.242-7.244l4.5-4.5a4.5 4.5 0 016.364 6.364l-1.757 1.757" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 9l-6 6" />
      </svg>
    ),
    title: 'Link de Pagamento PIX',
    highlight: '1 clique',
    description: 'Links de pagamento PIX instantâneos para enviar por WhatsApp, SMS ou qualquer canal.',
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
    <div
      className={`relative flex flex-col items-center justify-center h-full w-full px-4 sm:px-6 lg:px-12 overflow-hidden transition-colors duration-500 ${
        isDark
          ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
          : 'bg-gradient-to-br from-white via-blue-50/50 to-white'
      }`}
    >
      {/* Fundo decorativo */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute top-1/4 left-1/4 w-[30%] h-[30%] rounded-full blur-[120px] ${
          isDark ? 'bg-blue-500/5' : 'bg-blue-200/15'
        }`} />
        <div className={`absolute bottom-1/4 right-1/4 w-[25%] h-[25%] rounded-full blur-[100px] ${
          isDark ? 'bg-green-500/5' : 'bg-green-200/15'
        }`} />
      </div>

      {/* Layout lado a lado */}
      <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-10 lg:gap-16 w-full max-w-6xl">

        {/* ESQUERDA: Título + 3 cards empilhados */}
        <div className="flex-1 order-2 md:order-1 w-full">
          <p className={`text-xs font-medium uppercase tracking-widest mb-3 text-center md:text-left transition-colors ${
            isDark ? 'text-blue-400/70' : 'text-blue-600/70'
          }`}>
            Recurso {currentIndex + 1} de {totalCount}
          </p>

          <h2
            style={{ fontFamily: "'Nunito', sans-serif" }}
            className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold mb-5 sm:mb-6 text-center md:text-left transition-colors ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}
          >
            Mais vantagens para você
          </h2>

          {/* 3 Cards horizontais empilhados */}
          <div className="flex flex-col gap-3">
            {VANTAGENS.map((v, i) => {
              const c = colorMap[v.color][theme];
              return (
                <div
                  key={i}
                  className={`rounded-xl border p-3 sm:p-4 flex items-center gap-3 sm:gap-4 transition-all duration-300 ${c.border} ${
                    isDark ? 'bg-slate-800/30 backdrop-blur-sm' : 'bg-white/80 backdrop-blur-sm shadow-sm'
                  }`}
                >
                  <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${c.iconBg}`}>
                    <div className={c.iconText}>{v.icon}</div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3
                        style={{ fontFamily: "'Nunito', sans-serif" }}
                        className={`text-sm sm:text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}
                      >
                        {v.title}
                      </h3>
                      <span className={`text-sm sm:text-base font-bold ${c.highlight}`}>
                        {v.highlight}
                      </span>
                    </div>
                    <p className={`text-[11px] sm:text-xs leading-relaxed ${
                      isDark ? 'text-white/45' : 'text-gray-500'
                    }`}>
                      {v.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Progresso */}
          <div className="flex items-center gap-2 mt-6 justify-center md:justify-start">
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
          <p className={`mt-3 text-xs text-center md:text-left transition-colors ${isDark ? 'text-white/20' : 'text-gray-300'}`}>
            {currentIndex < totalCount - 1 ? 'Role para ver o próximo recurso →' : 'Próximo: Funções do eAi →'}
          </p>
        </div>

        {/* DIREITA: Imagem grande */}
        <div className="flex-shrink-0 order-1 md:order-2 flex items-center justify-center">
          <div className={`
            relative overflow-hidden rounded-3xl border-2 transition-all
            w-48 h-48 sm:w-56 sm:h-56 md:w-72 md:h-72 lg:w-80 lg:h-80 xl:w-96 xl:h-96
            ${isDark ? 'border-blue-500/15 shadow-2xl shadow-blue-500/5' : 'border-blue-100 shadow-2xl shadow-blue-200/20'}
          `}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/webapp.png"
              alt="Vantagens do eAi"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
