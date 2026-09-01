// app/components/landing/DepoimentosSection.tsx — Server Component

interface DepoimentosSectionProps {
  theme?: 'dark' | 'light';
}

const DEPOIMENTOS = [
  {
    nome: 'Dra. Ana Oliveira',
    cargo: 'Clínica VidaSaúde',
    resultado: '70% menos tempo em atendimento repetitivo',
    foto: '/perfil1.jpg',
    texto: 'Antes, minha recepcionista passava metade do dia confirmando consultas. Hoje a minhAi faz tudo automaticamente — agenda, confirma, manda lembrete e cobra via PIX.',
    textoCurto: 'Agenda, confirma e cobra PIX automaticamente. Libertou minha equipe.',
    color: 'blue' as const,
  },
{
  nome: 'Carlos Mendes',
  cargo: 'Hamburgueria do Carlos',
  resultado: 'Atende 3x mais pedidos no horário de pico',
  foto: '/perfil2.jpg',
  // ✅ texto agora é sobre delivery/cozinha, condizente com o cargo
  texto: 'Colocamos a minhAi no totem e no WhatsApp do delivery. O assistente recebe o pedido, manda para a cozinha e já cobra o PIX. Nas sextas à noite, que eram um caos, agora flui tranquilo.',
  textoCurto: 'Totem + WhatsApp: pedido, cozinha e PIX automático. Zero caos nas sextas.',
  color: 'green',
},
{
  nome: 'Dr. Roberto Faria',
  cargo: 'Faria & Associados',
  resultado: 'Atendimento profissional sem contratar ninguém',
  foto: '/perfil3.jpg',
  // ✅ texto de advogado agora está no card correto
  texto: 'Sou advogado autônomo e não tinha como contratar recepcionista. A minhAi agenda reuniões, responde dúvidas e digitaliza contratos com a câmera.',
  textoCurto: 'Agenda reuniões e digitaliza contratos. Como ter uma secretária por centavos.',
  color: 'blue',
},
];

const STARS = Array.from({ length: 5 });

const colorMap = {
  blue:  {
    dark:  { border: 'border-blue-500/15',  cardBg: 'bg-blue-500/5',  badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',  quote: 'text-blue-400/30' },
    light: { border: 'border-blue-200',     cardBg: 'bg-blue-50/60',  badge: 'bg-blue-100 text-blue-700 border-blue-200',        quote: 'text-blue-200' },
  },
  green: {
    dark:  { border: 'border-green-500/15', cardBg: 'bg-green-500/5', badge: 'bg-green-500/10 text-green-400 border-green-500/20', quote: 'text-green-400/30' },
    light: { border: 'border-green-200',    cardBg: 'bg-green-50/60', badge: 'bg-green-100 text-green-700 border-green-200',       quote: 'text-green-200' },
  },
};

export default function DepoimentosSection({ theme = 'dark' }: DepoimentosSectionProps) {
  const isDark = theme === 'dark';

  return (
    <div
      className={`
        relative flex flex-col items-center justify-center
        h-full w-full overflow-hidden
        transition-colors duration-500
        ${isDark
          ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'
          : 'bg-gradient-to-br from-blue-50/30 via-white to-blue-50/30'
        }
      `}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 w-[50%] h-[50%] rounded-full blur-[130px] ${isDark ? 'bg-blue-500/4' : 'bg-blue-100/50'}`} />
      </div>

      <div
        className={`
          relative z-10 w-full max-w-5xl mx-auto
          flex flex-col items-center
          px-5 sm:px-6 lg:px-8
          pt-[68px] pb-[52px]
          [@media(max-height:700px)_and_(max-width:767px)]:pt-[64px]
          [@media(max-height:700px)_and_(max-width:767px)]:pb-[44px]
          md:pt-4 md:pb-4
          gap-2
          [@media(min-height:700px)_and_(max-width:767px)]:gap-3
          sm:gap-4 md:gap-6
        `}
      >

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="text-center">
          <p className={`text-[10px] sm:text-xs font-semibold uppercase tracking-widest mb-1 ${isDark ? 'text-green-400/70' : 'text-green-600/70'}`}>
            O que dizem os clientes
          </p>
          <h2
            className={`
              font-bold leading-tight
              text-lg sm:text-2xl md:text-3xl lg:text-4xl
              ${isDark ? 'text-white' : 'text-gray-900'}
            `}
          >
            Negócios reais,{' '}
            <span className={isDark ? 'text-green-400' : 'text-green-600'}>resultados reais</span>
          </h2>
          <p className={`text-xs sm:text-sm max-w-xl mx-auto mt-1 hidden sm:block ${isDark ? 'text-white/45' : 'text-gray-500'}`}>
            Veja como empresas de diferentes segmentos usam a minhAi para vender mais e economizar.
          </p>
        </div>

        {/* ── MOBILE: lista compacta ──────────────────────────── */}
        {/*
          Substitui os 3 cards grandes por cards compactos de 2 linhas.
          Texto longo → textoCurto. Sem aspas decorativas, sem badge grande.
        */}
        <div className="flex flex-col gap-1.5 w-full sm:hidden">
          {DEPOIMENTOS.map((d) => {
            const c = colorMap[d.color][isDark ? 'dark' : 'light'];
            return (
              <div
                key={d.nome}
                className={`flex items-start gap-3 p-2.5 rounded-xl border ${c.border} ${c.cardBg}`}
              >
                {/* Avatar */}
                <img
                  src={d.foto}
                  alt={d.nome}
                  className="w-9 h-9 rounded-full object-cover flex-shrink-0 mt-0.5"
                />
                {/* Texto */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <div>
                      <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{d.nome}</span>
                      <span className={`text-[10px] ml-1.5 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>{d.cargo}</span>
                    </div>
                    {/* Estrelas mini */}
                    <div className="flex gap-0.5 flex-shrink-0">
                      {STARS.map((_, i) => (
                        <svg key={i} className="w-2.5 h-2.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                  <p className={`text-[11px] leading-relaxed ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                    "{d.textoCurto}"
                  </p>
                  <p className={`text-[10px] mt-1 font-medium ${isDark ? 'text-green-400/80' : 'text-green-600'}`}>
                    ↑ {d.resultado}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── DESKTOP: 3 cards completos ─────────────────────── */}
        <div className="hidden sm:grid sm:grid-cols-3 gap-4 w-full">
          {DEPOIMENTOS.map((d) => {
            const c = colorMap[d.color][isDark ? 'dark' : 'light'];
            return (
              <article
                key={d.nome}
                className={`relative flex flex-col gap-3 p-5 rounded-2xl border ${c.border} ${c.cardBg}`}
                itemScope
                itemType="https://schema.org/Review"
              >
                <svg className={`absolute top-4 right-4 w-8 h-8 ${c.quote}`} aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
                <div className="flex gap-0.5">
                  {STARS.map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className={`text-xs leading-relaxed flex-1 ${isDark ? 'text-white/65' : 'text-gray-600'}`} itemProp="reviewBody">
                  "{d.texto}"
                </p>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border self-start ${c.badge}`}>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  {d.resultado}
                </div>
                <div className={`h-px w-full ${isDark ? 'bg-white/5' : 'bg-gray-100'}`} />
                <div className="flex items-center gap-3">
                  <img src={d.foto} alt={d.nome} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                  <div itemProp="author" itemScope itemType="https://schema.org/Person">
                    <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-gray-900'}`} itemProp="name">{d.nome}</p>
                    <p className={`text-[11px] ${isDark ? 'text-white/40' : 'text-gray-400'}`}>{d.cargo}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Trust signals — só desktop */}
        <div className={`hidden sm:flex flex-wrap items-center justify-center gap-4 text-xs ${isDark ? 'text-white/25' : 'text-gray-400'}`}>
          {['Dados protegidos pela LGPD', 'API Oficial WhatsApp Business', '100% em português brasileiro'].map(t => (
            <span key={t} className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {t}
            </span>
          ))}
        </div>

      </div>
    </div>
  );
}