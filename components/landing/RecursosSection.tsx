'use client';

interface RecursosSectionProps {
  theme?: 'dark' | 'light';
}

const recursos = [
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Custo Baixo',
    description: 'A partir de R$ 0,12 por interação. Economia de até 90% comparado a atendimento humano tradicional.',
    highlight: 'R$ 0,12',
    highlightLabel: 'por interação',
    color: 'green',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    ),
    title: 'Totalmente Customizável',
    description: 'Configure palavras de ativação, saudações, prompts e funções personalizadas para cada empresa.',
    highlight: '100%',
    highlightLabel: 'personalizado',
    color: 'blue',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: 'Rápido e Fácil',
    description: 'Configure em minutos. Sem necessidade de código ou conhecimento técnico para começar.',
    highlight: '< 5 min',
    highlightLabel: 'para configurar',
    color: 'purple',
  },
];

const colorMap: Record<string, { iconBg: [string, string]; iconText: [string, string]; accent: [string, string]; highlightText: [string, string] }> = {
  green: {
    iconBg: ['bg-green-500/15', 'bg-green-100'],
    iconText: ['text-green-400', 'text-green-600'],
    accent: ['border-green-500/20', 'border-green-200'],
    highlightText: ['text-green-400', 'text-green-600'],
  },
  blue: {
    iconBg: ['bg-blue-500/15', 'bg-blue-100'],
    iconText: ['text-blue-400', 'text-blue-600'],
    accent: ['border-blue-500/20', 'border-blue-200'],
    highlightText: ['text-blue-400', 'text-blue-600'],
  },
  purple: {
    iconBg: ['bg-purple-500/15', 'bg-purple-100'],
    iconText: ['text-purple-400', 'text-purple-600'],
    accent: ['border-purple-500/20', 'border-purple-200'],
    highlightText: ['text-purple-400', 'text-purple-600'],
  },
};

export default function RecursosSection({ theme = 'dark' }: RecursosSectionProps) {
  const isDark = theme === 'dark';
  const t = isDark ? 0 : 1; // theme index para colorMap

  return (
    <div
      className={`relative flex flex-col items-center justify-center h-full w-full px-6 sm:px-8 lg:px-12 overflow-hidden transition-colors duration-500 ${
        isDark
          ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
          : 'bg-gradient-to-br from-white via-blue-50/50 to-white'
      }`}
    >
      {/* Fundo decorativo */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className={`absolute top-1/4 left-1/2 -translate-x-1/2 w-[40%] h-[40%] rounded-full blur-[100px] ${
            isDark ? 'bg-blue-500/5' : 'bg-blue-200/20'
          }`}
        />
      </div>

      {/* Título da seção */}
      <div className="relative z-10 text-center mb-10 md:mb-14">
        <p
          className={`text-xs sm:text-sm font-semibold uppercase tracking-widest mb-3 transition-colors ${
            isDark ? 'text-blue-400/70' : 'text-blue-600/70'
          }`}
        >
          Por que escolher o eAi
        </p>
        <h2
          style={{ fontFamily: "'Nunito', sans-serif" }}
          className={`text-2xl sm:text-3xl md:text-4xl font-semibold transition-colors ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}
        >
          Recursos que fazem a diferença
        </h2>
      </div>

      {/* Cards de recursos */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 lg:gap-8 max-w-5xl w-full">
        {recursos.map((recurso, index) => {
          const c = colorMap[recurso.color];
          return (
            <div
              key={recurso.title}
              className={`group relative rounded-2xl p-6 md:p-7 lg:p-8 border transition-all duration-500 hover:scale-[1.02] ${
                isDark
                  ? 'bg-slate-800/40 backdrop-blur-sm border-white/5 hover:border-white/10 hover:bg-slate-800/60'
                  : 'bg-white/70 backdrop-blur-sm border-gray-100 hover:border-gray-200 hover:bg-white shadow-sm hover:shadow-md'
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Ícone */}
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-colors ${c.iconBg[t]}`}
              >
                <div className={`${c.iconText[t]} transition-colors`}>
                  {recurso.icon}
                </div>
              </div>

              {/* Destaque numérico */}
              <div className="mb-4">
                <span
                  className={`text-2xl md:text-3xl font-bold transition-colors ${c.highlightText[t]}`}
                >
                  {recurso.highlight}
                </span>
                <span
                  className={`block text-xs mt-0.5 transition-colors ${
                    isDark ? 'text-white/35' : 'text-gray-400'
                  }`}
                >
                  {recurso.highlightLabel}
                </span>
              </div>

              {/* Título */}
              <h3
                style={{ fontFamily: "'Nunito', sans-serif" }}
                className={`text-lg md:text-xl font-semibold mb-2 transition-colors ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}
              >
                {recurso.title}
              </h3>

              {/* Descrição */}
              <p
                className={`text-sm leading-relaxed transition-colors ${
                  isDark ? 'text-white/45' : 'text-gray-500'
                }`}
              >
                {recurso.description}
              </p>

              {/* Linha de acento sutil na borda inferior */}
              <div
                className={`absolute bottom-0 left-6 right-6 h-px transition-opacity duration-500 opacity-0 group-hover:opacity-100 ${
                  isDark ? c.accent[0].replace('border-', 'bg-').replace('/20', '/40') : c.accent[1].replace('border-', 'bg-')
                }`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}