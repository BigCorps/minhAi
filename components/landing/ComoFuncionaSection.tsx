// app/components/landing/ComoFuncionaSection.tsx — Server Component
// Inserir APÓS ProvasSociaisSection e ANTES dos Recursos

interface ComoFuncionaSectionProps {
  theme?: 'dark' | 'light';
}

const PASSOS = [
  {
    numero: '01',
    titulo: 'Configure em minutos',
    descricao:
      'Crie seu assistente, escolha as funções que quer ativar e escreva a personalidade dele. Sem código, sem técnico, sem complicação. Tudo pelo dashboard — qualquer pessoa consegue.',
    destaque: 'Pronto em menos de 5 minutos',
    color: 'blue' as const,
  },
  {
    numero: '02',
    titulo: 'Conecte seus canais',
    descricao:
      'WhatsApp, Instagram, Facebook, totem físico, link na bio ou WebApp com sua marca — seu Funcionário IA responde em todos os canais ao mesmo tempo, com a mesma qualidade.',
    destaque: 'Multi-canal com 1 configuração',
    color: 'green' as const,
  },
  {
    numero: '03',
    titulo: 'Venda e atenda 24/7',
    descricao:
      'Seu assistente responde clientes, qualifica leads, gera cobranças PIX, agenda serviços e consulta o estoque — enquanto você faz outra coisa ou está dormindo.',
    destaque: 'Você só paga por interação real',
    color: 'blue' as const,
  },
];

const colorMap = {
  blue: {
    dark: {
      numBg: 'bg-blue-500/10',
      numText: 'text-blue-400',
      border: 'border-blue-500/15',
      cardBg: 'bg-blue-500/5',
      badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    },
    light: {
      numBg: 'bg-blue-100',
      numText: 'text-blue-600',
      border: 'border-blue-200',
      cardBg: 'bg-blue-50',
      badge: 'bg-blue-100 text-blue-700 border-blue-200',
    },
  },
  green: {
    dark: {
      numBg: 'bg-green-500/10',
      numText: 'text-green-400',
      border: 'border-green-500/15',
      cardBg: 'bg-green-500/5',
      badge: 'bg-green-500/10 text-green-400 border-green-500/20',
    },
    light: {
      numBg: 'bg-green-100',
      numText: 'text-green-600',
      border: 'border-green-200',
      cardBg: 'bg-green-50',
      badge: 'bg-green-100 text-green-700 border-green-200',
    },
  },
};

export default function ComoFuncionaSection({ theme = 'dark' }: ComoFuncionaSectionProps) {
  const isDark = theme === 'dark';

  return (
    <div className={`relative flex flex-col items-center justify-center h-full w-full px-6 sm:px-8 lg:px-12 overflow-hidden transition-colors duration-500 ${
      isDark
        ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
        : 'bg-gradient-to-br from-white via-gray-50 to-white'
    }`}>

      {/* Decorativo */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className={`absolute bottom-1/4 right-1/4 w-[40%] h-[40%] rounded-full blur-[100px] ${isDark ? 'bg-green-500/5' : 'bg-green-100/40'}`} />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center gap-6 sm:gap-8">

        {/* Header */}
        <div className="text-center">
          <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${isDark ? 'text-green-400/70' : 'text-green-600/70'}`}>
            Como funciona
          </p>
          <h2
            style={{ fontFamily: "'Nunito', sans-serif" }}
            className={`text-2xl sm:text-3xl md:text-4xl font-bold leading-tight mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}
          >
            Do cadastro ao primeiro cliente atendido{' '}
            <span className={isDark ? 'text-blue-400' : 'text-blue-600'}>em menos de 10 minutos</span>
          </h2>
          <p className={`text-sm sm:text-base max-w-xl mx-auto ${isDark ? 'text-white/45' : 'text-gray-500'}`}>
            Simples assim. Sem contratar desenvolvedor, sem mensalidade antes de testar.
          </p>
        </div>

        {/* 3 passos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
          {PASSOS.map((passo) => {
            const c = colorMap[passo.color][isDark ? 'dark' : 'light'];
            return (
              <article
                key={passo.numero}
                className={`relative flex flex-col gap-4 p-5 sm:p-6 rounded-2xl border ${c.border} ${c.cardBg}`}
              >
                {/* Número + emoji */}
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${c.numBg}`}>
                    <span className={`text-lg font-black ${c.numText}`}>{passo.numero}</span>
                  </div>
                 
                </div>

                {/* Conteúdo */}
                <div>
                  <h3
                    style={{ fontFamily: "'Nunito', sans-serif" }}
                    className={`text-base sm:text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}
                  >
                    {passo.titulo}
                  </h3>
                  <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                    {passo.descricao}
                  </p>
                </div>

                {/* Badge de destaque */}
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border self-start ${c.badge}`}>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  {passo.destaque}
                </div>
              </article>
            );
          })}
        </div>

        {/* Linha de conexão entre passos (decorativa) — só desktop */}
        <p className={`text-xs text-center ${isDark ? 'text-white/20' : 'text-gray-300'}`}>
          Comece grátis hoje e escale conforme o seu negócio crescer →
        </p>
      </div>
    </div>
  );
}
