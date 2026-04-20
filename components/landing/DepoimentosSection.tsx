// app/components/landing/DepoimentosSection.tsx — Server Component
// Inserir APÓS as Funções e ANTES de Preços

interface DepoimentosSectionProps {
  theme?: 'dark' | 'light';
}

const DEPOIMENTOS = [
  {
    nome: 'Dra. Ana Oliveira',
    cargo: 'Proprietária',
    empresa: 'Clínica VidaSaúde',
    segmento: 'Saúde',
    estrelas: 5,
    resultado: '70% menos tempo em atendimento repetitivo',
    foto: '/perfil1.jpg',
    texto:
      'Antes, minha recepcionista passava metade do dia confirmando consultas. Hoje o minhAi faz tudo automaticamente — agenda, confirma, manda lembrete e cobra via link PIX. Libertou minha equipe para o que realmente importa.',
    color: 'blue' as const,
  },
  {
    nome: 'Carlos Mendes',
    cargo: 'Proprietário',
    empresa: 'Hamburgueria do Carlos',
    segmento: 'Alimentação',
    estrelas: 5,
    resultado: 'Atende 3x mais pedidos no horário de pico',
    foto: '/perfil2.jpg',
    texto:
      'Colocamos o minhAi no totem da loja e no WhatsApp do delivery. O assistente recebe o pedido, manda para a cozinha e já cobra o PIX. Nas sextas à noite, que eram um caos, agora flui tranquilo — sem aumentar minha equipe.',
    color: 'green' as const,
  },
  {
    nome: 'Dr. Roberto Faria',
    cargo: 'Advogado',
    empresa: 'Faria & Associados',
    segmento: 'Jurídico',
    estrelas: 5,
    resultado: 'Atendimento profissional sem contratar ninguém',
    foto: '/perfil3.jpg',
    texto:
      'Sou advogado autônomo e não tinha como contratar recepcionista. O minhAi agenda reuniões, responde dúvidas básicas dos clientes e digitaliza contratos com a câmera. Parece que tenho uma secretária, mas pago centavos por interação.',
    color: 'blue' as const,
  },
];

const STARS = Array.from({ length: 5 });

const colorMap = {
  blue: {
    dark: {
      border: 'border-blue-500/15',
      cardBg: 'bg-blue-500/5',
      badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      quote: 'text-blue-400/30',
    },
    light: {
      border: 'border-blue-200',
      cardBg: 'bg-blue-50/60',
      badge: 'bg-blue-100 text-blue-700 border-blue-200',
      quote: 'text-blue-200',
    },
  },
  green: {
    dark: {
      border: 'border-green-500/15',
      cardBg: 'bg-green-500/5',
      badge: 'bg-green-500/10 text-green-400 border-green-500/20',
      quote: 'text-green-400/30',
    },
    light: {
      border: 'border-green-200',
      cardBg: 'bg-green-50/60',
      badge: 'bg-green-100 text-green-700 border-green-200',
      quote: 'text-green-200',
    },
  },
};

export default function DepoimentosSection({ theme = 'dark' }: DepoimentosSectionProps) {
  const isDark = theme === 'dark';

  return (
    <div className={`relative flex flex-col items-center justify-center h-full w-full overflow-hidden transition-colors duration-500 ${
      isDark
        ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'
        : 'bg-gradient-to-br from-blue-50/30 via-white to-blue-50/30'
    }`}>

      {/* Decorativo */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 w-[50%] h-[50%] rounded-full blur-[130px] ${isDark ? 'bg-blue-500/4' : 'bg-blue-100/50'}`} />
      </div>

      {/*
        Container principal:
        - px responsivo
        - py pequeno para respirar sem estourar
        - overflow-y-auto só no mobile (scroll interno), no desktop tudo cabe
        - max-h garante que nunca estoure a viewport (descontando ~56px do header)
      */}
      <div
        className="relative z-10 w-full max-w-5xl mx-auto flex flex-col px-4 sm:px-6 lg:px-8
                   py-3 sm:py-4
                   overflow-y-auto sm:overflow-y-visible
                   gap-3 sm:gap-4"
        style={{ maxHeight: 'calc(100dvh - 56px)' }}
      >

        {/* Header */}
        <div className="text-center flex-shrink-0">
          <p className={`text-[10px] sm:text-xs font-semibold uppercase tracking-widest mb-1.5 sm:mb-2 ${isDark ? 'text-green-400/70' : 'text-green-600/70'}`}>
            O que dizem os clientes
          </p>
          <h2
            style={{ fontFamily: "'Nunito', sans-serif" }}
            className={`text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold leading-tight mb-0.5 sm:mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}
          >
            Negócios reais,{' '}
            <span className={isDark ? 'text-green-400' : 'text-green-600'}>resultados reais</span>
          </h2>
          <p className={`text-xs sm:text-sm max-w-xl mx-auto ${isDark ? 'text-white/45' : 'text-gray-500'}`}>
            Veja como empresas de diferentes segmentos usam o minhAi para vender mais, atender melhor e economizar.
          </p>
        </div>

        {/* Cards de depoimentos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4 w-full flex-shrink-0">
          {DEPOIMENTOS.map((d) => {
            const c = colorMap[d.color][isDark ? 'dark' : 'light'];
            return (
              <article
                key={d.nome}
                className={`relative flex flex-col gap-2.5 sm:gap-4 p-4 sm:p-5 rounded-2xl border ${c.border} ${c.cardBg}`}
                itemScope
                itemType="https://schema.org/Review"
              >
                {/* Aspas decorativas */}
                <svg
                  className={`absolute top-4 right-4 w-6 h-6 sm:w-8 sm:h-8 ${c.quote}`}
                  aria-hidden="true"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>

                {/* Estrelas */}
                <div className="flex gap-0.5" aria-label={`${d.estrelas} estrelas`}>
                  {STARS.map((_, i) => (
                    <svg key={i} className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>

                {/* Texto do depoimento */}
                <p
                  className={`text-[11px] sm:text-xs leading-relaxed flex-1 ${isDark ? 'text-white/65' : 'text-gray-600'}`}
                  itemProp="reviewBody"
                >
                  "{d.texto}"
                </p>

                {/* Badge de resultado */}
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-[10px] sm:text-[11px] font-semibold border self-start ${c.badge}`}>
                  <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  {d.resultado}
                </div>

                {/* Divisor */}
                <div className={`h-px w-full ${isDark ? 'bg-white/5' : 'bg-gray-100'}`} />

                {/* Autor */}
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <img
                    src={d.foto}
                    alt={d.nome}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover flex-shrink-0"
                  />
                  <div itemProp="author" itemScope itemType="https://schema.org/Person">
                    <p className={`text-[11px] sm:text-xs font-bold ${isDark ? 'text-white' : 'text-gray-900'}`} itemProp="name">
                      {d.nome}
                    </p>
                    <p className={`text-[10px] sm:text-[11px] ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                      {d.cargo} · {d.empresa}
                    </p>
                  </div>
                  <span className={`ml-auto text-[10px] sm:text-xs ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                    {d.segmento}
                  </span>
                </div>
              </article>
            );
          })}
        </div>

        {/* Trust signal */}
        <div className={`flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-[10px] sm:text-xs flex-shrink-0 ${isDark ? 'text-white/25' : 'text-gray-400'}`}>
          <span className="flex items-center gap-1.5">
            <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Dados protegidos pela LGPD
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            API Oficial WhatsApp Business
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            100% em português brasileiro
          </span>
        </div>
      </div>
    </div>
  );
}
