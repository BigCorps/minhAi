// app/components/landing/ComoFuncionaSection.tsx — Server Component

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
    dark:  { numBg: 'bg-blue-500/10',  numText: 'text-blue-400',  border: 'border-blue-500/15',  cardBg: 'bg-blue-500/5',  badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    light: { numBg: 'bg-blue-100',      numText: 'text-blue-600',  border: 'border-blue-200',     cardBg: 'bg-blue-50',     badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  },
  green: {
    dark:  { numBg: 'bg-green-500/10', numText: 'text-green-400', border: 'border-green-500/15', cardBg: 'bg-green-500/5', badge: 'bg-green-500/10 text-green-400 border-green-500/20' },
    light: { numBg: 'bg-green-100',     numText: 'text-green-600', border: 'border-green-200',    cardBg: 'bg-green-50',    badge: 'bg-green-100 text-green-700 border-green-200' },
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
      {/* Decorativo */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className={`absolute bottom-1/4 right-1/4 w-[40%] h-[40%] rounded-full blur-[100px] ${isDark ? 'bg-green-500/5' : 'bg-green-100/40'}`} />
      </div>

      <div
        className={`
          relative z-10 w-full max-w-5xl mx-auto
          flex flex-col items-center
          px-5 sm:px-8 lg:px-12
          pt-[68px] pb-[52px] md:pt-4 md:pb-4
          gap-3
          [@media(min-height:750px)_and_(max-width:767px)]:gap-5
          sm:gap-6 md:gap-8
        `}
      >

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="text-center">
          <p className={`text-xs font-semibold uppercase tracking-widest mb-1.5 ${isDark ? 'text-green-400/70' : 'text-green-600/70'}`}>
            Como funciona
          </p>
          <h2
            className={`
              font-bold leading-tight mb-1.5
              text-xl
              [@media(min-height:700px)_and_(max-width:767px)]:text-2xl
              sm:text-3xl md:text-4xl
              ${isDark ? 'text-white' : 'text-gray-900'}
            `}
          >
            Do cadastro ao primeiro cliente atendido{' '}
            <span className={isDark ? 'text-blue-400' : 'text-blue-600'}>em menos de 10 minutos</span>
          </h2>
          {/* Subtítulo some em telas baixas */}
          <p
            className={`
              text-xs sm:text-base max-w-xl mx-auto
              [@media(max-height:640px)_and_(max-width:767px)]:hidden
              ${isDark ? 'text-white/45' : 'text-gray-500'}
            `}
          >
            Simples assim. Sem contratar desenvolvedor, sem mensalidade antes de testar.
          </p>
        </div>

        {/* ── 3 passos ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4 w-full">
          {PASSOS.map((passo) => {
            const c = colorMap[passo.color][isDark ? 'dark' : 'light'];
            return (
              <article
                key={passo.numero}
                className={`relative flex flex-col gap-2.5 sm:gap-4 p-4 sm:p-6 rounded-2xl border ${c.border} ${c.cardBg}`}
              >
                {/* Número */}
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${c.numBg}`}>
                    <span className={`text-base sm:text-lg font-black ${c.numText}`}>{passo.numero}</span>
                  </div>
                </div>

                {/* Conteúdo */}
                <div>
                  <h3 className={`text-sm sm:text-base font-bold mb-1.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {passo.titulo}
                  </h3>
                  {/* Descrição some em telas muito baixas */}
                  <p
                    className={`
                      text-xs sm:text-sm leading-relaxed
                      [@media(max-height:620px)_and_(max-width:767px)]:hidden
                      ${isDark ? 'text-white/50' : 'text-gray-500'}
                    `}
                  >
                    {passo.descricao}
                  </p>
                </div>

                {/* Badge */}
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-[10px] sm:text-[11px] font-semibold border self-start ${c.badge}`}>
                  <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  {passo.destaque}
                </div>
              </article>
            );
          })}
        </div>

        {/* Mini CTA — some em telas baixas */}
        <p
          className={`
            text-xs text-center
            [@media(max-height:660px)_and_(max-width:767px)]:hidden
            ${isDark ? 'text-white/20' : 'text-gray-300'}
          `}
        >
          Comece grátis hoje e escale conforme o seu negócio crescer →
        </p>
      </div>
    </div>
  );
}
