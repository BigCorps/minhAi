// app/components/landing/ComoFuncionaSection.tsx — Server Component

interface ComoFuncionaSectionProps {
  theme?: 'dark' | 'light';
}

const PASSOS = [
  {
    numero: '01',
    titulo: 'Configure em minutos',
    descricao: 'Sem código, sem técnico. Tudo pelo dashboard — qualquer pessoa consegue em menos de 5 minutos.',
    destaque: 'Pronto em menos de 5 minutos',
    color: 'blue' as const,
  },
  {
    numero: '02',
    titulo: 'Conecte seus canais',
    descricao: 'WhatsApp, Instagram, Facebook, totem, link na bio ou WebApp com sua marca — tudo ao mesmo tempo.',
    destaque: 'Multi-canal com 1 configuração',
    color: 'green' as const,
  },
  {
    numero: '03',
    titulo: 'Venda e atenda 24/7',
    descricao: 'Responde clientes, qualifica leads, gera PIX, agenda — enquanto você dorme.',
    destaque: 'Você só paga por interação real',
    color: 'blue' as const,
  },
];

const colorMap = {
  blue:  {
    dark:  { numBg: 'bg-blue-500/10',  numText: 'text-blue-400',  border: 'border-blue-500/15',  cardBg: 'bg-blue-500/5',  badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',  dot: 'bg-blue-400' },
    light: { numBg: 'bg-blue-100',     numText: 'text-blue-600',  border: 'border-blue-200',     cardBg: 'bg-blue-50',     badge: 'bg-blue-100 text-blue-700 border-blue-200',         dot: 'bg-blue-500' },
  },
  green: {
    dark:  { numBg: 'bg-green-500/10', numText: 'text-green-400', border: 'border-green-500/15', cardBg: 'bg-green-500/5', badge: 'bg-green-500/10 text-green-400 border-green-500/20', dot: 'bg-green-400' },
    light: { numBg: 'bg-green-100',    numText: 'text-green-600', border: 'border-green-200',    cardBg: 'bg-green-50',    badge: 'bg-green-100 text-green-700 border-green-200',        dot: 'bg-green-500' },
  },
};

export default function ComoFuncionaSection({ theme = 'dark' }: ComoFuncionaSectionProps) {
  const isDark = theme === 'dark';

  return (
    <div
      className={`
        relative flex flex-col items-center justify-center
        h-full w-full overflow-hidden
        transition-colors duration-500
        ${isDark
          ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
          : 'bg-gradient-to-br from-white via-gray-50 to-white'
        }
      `}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className={`absolute bottom-1/4 right-1/4 w-[40%] h-[40%] rounded-full blur-[100px] ${isDark ? 'bg-green-500/5' : 'bg-green-100/40'}`} />
      </div>

      <div
        className={`
          relative z-10 w-full max-w-5xl mx-auto
          flex flex-col items-center
          px-5 sm:px-8 lg:px-12
          pt-[68px] pb-[52px]
          [@media(max-height:700px)_and_(max-width:767px)]:pt-[64px]
          [@media(max-height:700px)_and_(max-width:767px)]:pb-[44px]
          md:pt-4 md:pb-4
          gap-2
          [@media(min-height:700px)_and_(max-width:767px)]:gap-3
          sm:gap-6 md:gap-8
        `}
      >

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="text-center">
          <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${isDark ? 'text-green-400/70' : 'text-green-600/70'}`}>
            Como funciona
          </p>
          {/* Mobile: título curto numa linha. Desktop: completo */}
          <h2 className={`font-bold leading-tight text-lg sm:text-3xl md:text-4xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <span className="sm:hidden">
              Do cadastro ao{' '}
              <span className={isDark ? 'text-blue-400' : 'text-blue-600'}>primeiro atendimento</span>
              {' '}em 10 min
            </span>
            <span className="hidden sm:inline">
              Do cadastro ao primeiro cliente atendido{' '}
              <span className={isDark ? 'text-blue-400' : 'text-blue-600'}>em menos de 10 minutos</span>
            </span>
          </h2>
          <p className={`
            text-xs sm:text-base max-w-xl mx-auto mt-1
            hidden sm:block
            ${isDark ? 'text-white/45' : 'text-gray-500'}
          `}>
            Simples assim. Sem contratar desenvolvedor, sem mensalidade antes de testar.
          </p>
        </div>

        {/* ── MOBILE: lista compacta em linha ────────────────── */}
        {/*
          No mobile substituímos os 3 cards grandes por uma lista
          compacta numerada — ocupa ~40% menos altura.
        */}
        <div className="flex flex-col gap-1.5 w-full sm:hidden">
          {PASSOS.map((passo) => {
            const c = colorMap[passo.color][isDark ? 'dark' : 'light'];
            return (
              <div
                key={passo.numero}
                className={`flex items-start gap-3 p-2.5 rounded-xl border ${c.border} ${c.cardBg}`}
              >
                {/* Número */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${c.numBg}`}>
                  <span className={`text-xs font-black ${c.numText}`}>{passo.numero}</span>
                </div>
                {/* Texto */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <h3 className={`text-sm font-bold mb-0.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {passo.titulo}
                  </h3>
                  <p className={`text-[11px] leading-relaxed ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                    {passo.descricao}
                  </p>
                </div>
                {/* Dot de cor */}
                <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${c.dot}`} />
              </div>
            );
          })}
        </div>

        {/* ── DESKTOP: 3 cards grandes ───────────────────────── */}
        <div className="hidden sm:grid sm:grid-cols-3 gap-4 w-full">
          {PASSOS.map((passo) => {
            const c = colorMap[passo.color][isDark ? 'dark' : 'light'];
            return (
              <article
                key={passo.numero}
                className={`flex flex-col gap-4 p-6 rounded-2xl border ${c.border} ${c.cardBg}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.numBg}`}>
                  <span className={`text-lg font-black ${c.numText}`}>{passo.numero}</span>
                </div>
                <div>
                  <h3 className={`text-base font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {passo.titulo}
                  </h3>
                  <p className={`text-sm leading-relaxed ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                    {passo.descricao}
                  </p>
                </div>
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

        {/* Mini CTA */}
        <p className={`text-xs text-center hidden sm:block ${isDark ? 'text-white/20' : 'text-gray-300'}`}>
          Comece grátis hoje e escale conforme o seu negócio crescer →
        </p>

      </div>
    </div>
  );
}
