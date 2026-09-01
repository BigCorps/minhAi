// app/InicioSection.tsx — Server Component puro (sem 'use client')
import TrackedLink from '@/components/analytics/TrackedLink';
import { LandingAvatarFace } from './LandingAvatarFace';
import { WordCarousel } from '@/components/landing/WordCarousel';
import TourTrigger from '@/components/tour/TourTrigger';

interface InicioSectionProps {
  theme?: 'dark' | 'light';
  /** Usado só na exportação em PDF — trava o carrossel de palavras numa única palavra estática. */
  staticCarouselWord?: string;
  /** Usado só na exportação em PDF — substitui o avatar animado (SVG com filtros complexos, não captura bem no html2canvas) por uma versão estática. */
  avatarOverride?: React.ReactNode;
}

const MINI_DESTAQUES = [
  'Sem cartão de crédito',
  'Funciona em 5 minutos',
  '100% em português',
];

export default function InicioSection({ theme = 'dark', staticCarouselWord, avatarOverride }: InicioSectionProps) {
  const isDark = theme === 'dark';

  return (
    <div
      className={`
        relative flex flex-col items-center justify-center
        w-full min-h-[100dvh] overflow-hidden bg-transparent
        transition-colors duration-500
      `}
    >
      {/* Fundo decorativo */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className={`absolute -top-1/4 -right-1/4 w-[60%] h-[60%] rounded-full blur-[120px] ${isDark ? 'bg-blue-500/10' : 'bg-blue-200/30'}`} />
        <div className={`absolute -bottom-1/4 -left-1/4 w-[50%] h-[50%] rounded-full blur-[100px] ${isDark ? 'bg-green-500/8' : 'bg-green-200/20'}`} />
      </div>

      <div
        className={`
          relative z-10
          flex flex-col md:flex-row
          items-center justify-center md:justify-between
          w-full max-w-7xl mx-auto
          px-5 sm:px-8 lg:px-12
          pt-24 pb-16 sm:pt-28 sm:pb-20 md:py-16
          gap-8 md:gap-16
        `}
      >

        {/* ── AVATAR + TourTrigger desktop ───────────────────── */}
        <div className="flex-shrink-0 order-1 md:order-2 flex flex-col items-center justify-center relative">
          <div className="relative w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 lg:w-[22rem] lg:h-[22rem] xl:w-[26rem] xl:h-[26rem]">
            {avatarOverride ?? <LandingAvatarFace theme={theme} />}
          </div>

          {/*
           * TourTrigger desktop — absolute abaixo do avatar.
           * position:absolute garante que não desloca o avatar quando aparece.
           * top: 100% + mt-3 posiciona logo abaixo do wrapper do avatar.
           */}
          <div
            className="hidden md:flex justify-center w-full absolute"
            style={{ top: 'calc(100% + 12px)' }}
          >
            <TourTrigger theme={theme} delay={0} />
          </div>
        </div>

        {/* ── TEXTO + CTAs ────────────────────────────────────── */}
        <div className="flex-1 text-center order-2 md:order-1 max-w-xl w-full min-w-0">

          {/* Badge */}
          <div
            className={`
              inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold leading-none
              mb-3
              ${isDark
                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                : 'bg-green-100 text-green-700 border border-green-200'
              }
            `}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" aria-hidden="true" />
            Mais de 100 funções e aplicativos utilizam nossa tecnologia
          </div>

          {/* Título */}
          <h1
            className={`
              font-bold leading-[1.15] transition-colors mb-3
              text-2xl sm:text-4xl md:text-4xl lg:text-[2.75rem]
              ${isDark ? 'text-white' : 'text-gray-900'}
            `}
          >
            <span className="block whitespace-nowrap">
              <span
                className={`
                  font-bold
                  text-2xl sm:text-4xl md:text-5xl lg:text-5xl
                  ${isDark ? 'text-blue-400' : 'text-blue-600'}
                `}
              >
                Uma IA pra chamar de sua!
              </span>
            </span>
            <span className="block whitespace-nowrap">
              O{' '}<WordCarousel isDark={isDark} staticWord={staticCarouselWord} />{' '}IA que
            </span>
            <span className="block whitespace-nowrap">
              vende e atende{' '}
              <span className={isDark ? 'text-green-400' : 'text-green-600'}>24 horas.</span>
            </span>
          </h1>

          {/* Parágrafo */}
          <p
            className={`
              text-sm sm:text-base md:text-lg max-w-lg leading-relaxed transition-colors mx-auto
              mb-4
              ${isDark ? 'text-white/55' : 'text-gray-600'}
            `}
          >
            A única IA que atende seus clientes no virtual e no presencial, cobra, agenda, confirma pagamentos e nunca deixa um atendimento sem resposta.
            Configure em minutos, sem programar. Por trás de tudo isso há uma plataforma com mais de 100 funções — tão sólida que diversos outros aplicativos usam nossa tecnologia.
          </p>

          {/* CTAs */}
          <div className="flex flex-row items-center justify-center gap-2 sm:gap-4">
            <TrackedLink
              href="/lead"
              event="clique_demonstracao_ao_vivo_inicio"
              className="flex-1 sm:flex-none px-4 sm:px-8 py-2 sm:py-3.5 bg-[#A4C61E] text-white rounded-full hover:brightness-110 transition-all duration-300 font-bold text-xs sm:text-base text-center leading-none shadow-lg hover:shadow-xl hover:scale-105"
            >
              Demonstração Ao Vivo
            </TrackedLink>
            <TrackedLink
              href="/ia/suporte"
              event="clique_teste_suporte_inicio"
              className={`
                flex-1 sm:flex-none px-4 sm:px-8 py-2 sm:py-3.5
                border-2 rounded-full transition-all duration-300 font-bold text-xs sm:text-base text-center leading-none hover:scale-105
                ${isDark
                  ? 'border-blue-400/50 text-blue-400 hover:bg-blue-400/10 hover:border-blue-400'
                  : 'border-blue-600/50 text-blue-600 hover:bg-blue-50 hover:border-blue-600'
                }
              `}
            >
              Teste nosso Suporte
            </TrackedLink>
          </div>

          {/* Mini destaques */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-5">
            {MINI_DESTAQUES.map((text, i) => (
              <span
                key={text}
                className={`flex items-center gap-1.5 text-xs transition-colors font-medium ${isDark ? 'text-white/40' : 'text-gray-400'}`}
              >
                {i > 0 && <span className={isDark ? 'text-white/15 mr-1' : 'text-gray-200 mr-1'}>·</span>}
                <svg className={`w-3 h-3 flex-shrink-0 ${isDark ? 'text-green-400/70' : 'text-green-600/70'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                {text}
              </span>
            ))}
          </div>

          <div className="flex items-center justify-center gap-2 mt-3">
            {/* ════════════════════════════════════════════════════════
                VERSÃO COM VENDAS — comentada, foco comercial atual é
                Smart + Full. Pra reativar Vendas: descomentar este bloco
                e apagar o bloco "SMART + FULL" logo abaixo.
            <span className={`sm:hidden text-[10px] font-medium ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
              Escolha entre a versão{' '}
              <span className={`font-semibold ${isDark ? 'text-blue-400/70' : 'text-blue-500'}`}>Smart</span>
              {', '}
              <span className={`font-semibold ${isDark ? 'text-lime-400/70' : 'text-lime-600'}`}>Vendas</span>
              {' '}ou{' '}
              <span className={`font-semibold ${isDark ? 'text-purple-400/70' : 'text-purple-600'}`}>Full</span>
            </span>
            <span className={`hidden sm:flex items-center gap-2 text-xs ${isDark ? 'text-white/20' : 'text-gray-300'}`}>
              Como pagar:
            </span>
            <span className={`hidden sm:inline-flex items-center gap-1 text-xs font-semibold ${isDark ? 'text-blue-400/70' : 'text-blue-500'}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
              Smart — créditos por uso
            </span>
            <span className={`hidden sm:inline ${isDark ? 'text-white/15' : 'text-gray-200'} text-xs`}>·</span>
            <span className={`hidden sm:inline-flex items-center gap-1 text-xs font-semibold ${isDark ? 'text-lime-400/70' : 'text-lime-600'}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-lime-400 flex-shrink-0" />
              Vendas — grátis, só pague quando vender
            </span>
            <span className={`hidden sm:inline ${isDark ? 'text-white/15' : 'text-gray-200'} text-xs`}>·</span>
            ════════════════════════════════════════════════════════ */}
            <span className={`sm:hidden text-[10px] font-medium ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
              Escolha entre a versão{' '}
              <span className={`font-semibold ${isDark ? 'text-blue-400/70' : 'text-blue-500'}`}>Smart</span>
              {' '}ou{' '}
              <span className={`font-semibold ${isDark ? 'text-purple-400/70' : 'text-purple-600'}`}>Full</span>
            </span>
            <span className={`hidden sm:flex items-center gap-2 text-xs ${isDark ? 'text-white/20' : 'text-gray-300'}`}>
              Como pagar:
            </span>
            <span className={`hidden sm:inline-flex items-center gap-1 text-xs font-semibold ${isDark ? 'text-blue-400/70' : 'text-blue-500'}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
              Smart — créditos por uso
            </span>
            <span className={`hidden sm:inline ${isDark ? 'text-white/15' : 'text-gray-200'} text-xs`}>·</span>
            <span className={`hidden sm:inline-flex items-center gap-1 text-xs font-semibold ${isDark ? 'text-purple-400/70' : 'text-purple-600'}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
              Full — solução sob consulta
            </span>
          </div>

          {/* Cards de integração */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 mt-3">
            <div className="w-[90px] sm:w-[120px] h-10 sm:h-12 flex items-center justify-center">
              <img src="/cards/meta.png" alt="Integração oficial Meta" style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto' }} />
            </div>
            <div className="w-[90px] sm:w-[120px] h-10 sm:h-12 flex items-center justify-center">
              <img src="/cards/google.png" alt="Integração verificada pelo Google" style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto' }} />
            </div>
            <a
              href="https://play.google.com/store/apps/details?id=app.minhai.www.twa"
              target="_blank"
              rel="noopener noreferrer"
              className="w-[90px] sm:w-[120px] h-10 sm:h-12 flex items-center justify-center hover:opacity-80 transition-opacity"
            >
              <img src="/cards/play.png" alt="Disponível no Google Play" style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto' }} />
            </a>
          </div>

          {/* TourTrigger — só mobile */}
          <div className="sm:hidden flex justify-center mt-4">
            <TourTrigger theme={theme} delay={0} dismissible />
          </div>

        </div>
      </div>
    </div>
  );
}