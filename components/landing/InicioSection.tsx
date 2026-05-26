// app/InicioSection.tsx — Server Component puro (sem 'use client')
import Link from 'next/link';
import { LandingAvatarFace } from './LandingAvatarFace';
import { WordCarousel } from '@/components/landing/WordCarousel';
import { DomainPreviewPicker } from '@/components/landing/DomainPreviewPicker';

interface InicioSectionProps {
  theme?: 'dark' | 'light';
}

const MINI_DESTAQUES = [
  'Sem cartão de crédito',
  'Funciona em 5 minutos',
  '100% em português',
];

export default function InicioSection({ theme = 'dark' }: InicioSectionProps) {
  const isDark = theme === 'dark';

  return (
    <div
      className={`
        relative flex flex-col items-center justify-center
        h-full w-full overflow-hidden
        transition-colors duration-500
        ${isDark
          ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'
          : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
        }
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
          pt-[68px] pb-[52px] md:pt-0 md:pb-0
          gap-1
          [@media(min-height:700px)_and_(max-width:767px)]:gap-3
          md:gap-16
        `}
      >

        {/* ── AVATAR ─────────────────────────────────────────── */}
        <div
          className={`
            flex-shrink-0 order-1 md:order-2
            flex items-center justify-center
            [@media(max-height:580px)_and_(max-width:767px)]:hidden
          `}
        >
          <div
            className={`
              relative transition-all duration-500
              w-[30vw] h-[30vw]
              [@media(min-height:680px)_and_(max-width:767px)]:w-[36vw]
              [@media(min-height:680px)_and_(max-width:767px)]:h-[36vw]
              [@media(max-height:620px)_and_(max-width:767px)]:w-[22vw]
              [@media(max-height:620px)_and_(max-width:767px)]:h-[22vw]
              sm:w-[32vw] sm:h-[32vw]
              md:w-80 md:h-80
              lg:w-[22rem] lg:h-[22rem]
              xl:w-[26rem] xl:h-[26rem]
            `}
          >
            <LandingAvatarFace theme={theme} />
          </div>
        </div>

        {/* ── TEXTO + CTAs ────────────────────────────────────── */}
        <div className="flex-1 text-center order-2 md:order-1 max-w-xl w-full min-w-0">

          {/* Badge */}
          <div
            className={`
              inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold
              mb-1.5
              [@media(max-height:640px)_and_(max-width:767px)]:hidden
              ${isDark
                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                : 'bg-green-100 text-green-700 border border-green-200'
              }
            `}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" aria-hidden="true" />
            Mais de 100 funções para o seu negócio
          </div>

          {/* Título */}
          <h1
            className={`
              font-bold leading-[1.15] transition-colors mb-1.5
              text-[1.35rem]
              [@media(min-height:680px)_and_(max-width:767px)]:text-[1.6rem]
              sm:text-4xl md:text-4xl lg:text-[2.75rem]
              ${isDark ? 'text-white' : 'text-gray-900'}
            `}
          >
            <span className="block whitespace-nowrap">
              <span
                className={`
                  font-bold
                  text-[1.35rem]
                  [@media(min-height:680px)_and_(max-width:767px)]:text-[1.6rem]
                  sm:text-4xl md:text-5xl lg:text-5xl
                  ${isDark ? 'text-blue-400' : 'text-blue-600'}
                `}
              >
                Uma IA pra chamar de sua!
              </span>
            </span>
            <span className="block whitespace-nowrap">
              O{' '}<WordCarousel isDark={isDark} />{' '}IA que
            </span>
            <span className="block whitespace-nowrap">
              vende e atende{' '}
              <span className={isDark ? 'text-green-400' : 'text-green-600'}>24 horas.</span>
            </span>
          </h1>

          {/* Parágrafo */}
<p
  className={`
    text-xs sm:text-base md:text-lg max-w-lg leading-relaxed transition-colors mx-auto
    mb-1.5
    [@media(max-height:660px)_and_(max-width:767px)]:hidden
    ${isDark ? 'text-white/55' : 'text-gray-600'}
  `}
>
  A única IA que atende seus clientes no virtual e no presencial, cobra, agenda, confirma pagamentos via Pix e nunca deixa uma venda sem resposta.
  Configure tudo em minutos, sem programar e automatize atendimentos, cobranças, agendamentos e operações enquanto sua empresa lucra mais.
</p>

          {/* DomainPreviewPicker */}
          <DomainPreviewPicker isDark={isDark} />

          {/* CTAs */}
          <div className="flex flex-row items-center justify-center gap-2 sm:gap-4">
            <Link
              href="/login"
              className="flex-1 sm:flex-none px-4 sm:px-8 py-2 sm:py-3.5 bg-[#A4C61E] text-white rounded-full hover:brightness-110 transition-all duration-300 font-bold text-xs sm:text-base text-center shadow-lg hover:shadow-xl hover:scale-105"
            >
              Criar Minha IA Grátis
            </Link>
            <Link
              href="/ia/suporte"
              className={`
                flex-1 sm:flex-none px-4 sm:px-8 py-2 sm:py-3.5
                border-2 rounded-full transition-all duration-300 font-bold text-xs sm:text-base text-center hover:scale-105
                ${isDark
                  ? 'border-blue-400/50 text-blue-400 hover:bg-blue-400/10 hover:border-blue-400'
                  : 'border-blue-600/50 text-blue-600 hover:bg-blue-50 hover:border-blue-600'
                }
              `}
            >
              Ver demonstração ao vivo
            </Link>
          </div>

          {/* Mini destaques */}
          <div
            className={`
              flex flex-wrap items-center justify-center gap-x-4 gap-y-1
              mt-2 sm:mt-5
              [@media(max-height:700px)_and_(max-width:767px)]:hidden
            `}
          >
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

          {/* Versões Smart vs Vendas */}
          <div
            className={`
              flex items-center justify-center gap-2 mt-2 sm:mt-3
              [@media(max-height:700px)_and_(max-width:767px)]:hidden
            `}
          >
            <span className={`text-[10px] sm:text-xs ${isDark ? 'text-white/20' : 'text-gray-300'}`}>
              Como pagar:
            </span>
            <span className={`inline-flex items-center gap-1 text-[10px] sm:text-xs font-semibold ${isDark ? 'text-blue-400/70' : 'text-blue-500'}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
              Smart — créditos por uso
            </span>
            <span className={`${isDark ? 'text-white/15' : 'text-gray-200'} text-xs`}>·</span>
            <span className={`inline-flex items-center gap-1 text-[10px] sm:text-xs font-semibold ${isDark ? 'text-lime-400/70' : 'text-lime-600'}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-lime-400 flex-shrink-0" />
              Vendas — grátis, só pague quando vender
            </span>
          </div>

          {/* Cards de integração — Meta / Google / Google Play */}
          <div
            className={`
              flex items-center justify-center gap-2 sm:gap-3 mt-2 sm:mt-3
              [@media(max-height:700px)_and_(max-width:767px)]:hidden
            `}
          >
{['meta', 'google', 'webapp'].map((name) => (
  <img
    key={name}
    src={`/cards/${name}.png`}
    alt={`${name} integration card`}
    className="h-8 sm:h-[2.4rem] w-auto object-contain transition-transform duration-200 hover:scale-110"
  />
))}
          </div>
        </div>
      </div>
    </div>
  );
}
