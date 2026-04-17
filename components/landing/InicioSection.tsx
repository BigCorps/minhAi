// app/InicioSection.tsx  ← SEM 'use client' — Server Component puro
import Link from 'next/link';
import { LandingAvatarFace } from './LandingAvatarFace';
import { WordCarousel } from '@/components/landing/WordCarousel';

interface InicioSectionProps {
  theme?: 'dark' | 'light';
}

const MINI_DESTAQUES = [
  'Rápido e Fácil de Começar',
  'Pague por Interação',
  '100% Customizável',
];

export default function InicioSection({ theme = 'dark' }: InicioSectionProps) {
  const isDark = theme === 'dark';

  return (
    <div
      className={`relative flex items-center justify-center h-full w-full overflow-hidden transition-colors duration-500 ${
        isDark
          ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'
          : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
      }`}
    >
      {/* Fundo decorativo */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div
          className={`absolute -top-1/4 -right-1/4 w-[60%] h-[60%] rounded-full blur-[120px] ${
            isDark ? 'bg-blue-500/10' : 'bg-blue-200/30'
          }`}
        />
        <div
          className={`absolute -bottom-1/4 -left-1/4 w-[50%] h-[50%] rounded-full blur-[100px] ${
            isDark ? 'bg-green-500/8' : 'bg-green-200/20'
          }`}
        />
      </div>

      {/* Conteúdo principal */}
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 gap-3 sm:gap-6 md:gap-16 pt-14 md:pt-0">

        {/* AVATAR */}
        <div className="flex-shrink-0 order-1 md:order-2 flex items-center justify-center">
          <div className="
            relative transition-all duration-500
            w-[42vw] h-[42vw]
            sm:w-[38vw] sm:h-[38vw]
            md:w-80 md:h-80
            lg:w-[22rem] lg:h-[22rem]
            xl:w-[26rem] xl:h-[26rem]
          ">
            <LandingAvatarFace theme={theme} />
          </div>
        </div>

        {/* TEXTO + CTAs */}
        <div className="flex-1 text-center order-2 md:order-1 max-w-xl">
          <h1
            className={`font-bold leading-[1.15] mb-3 sm:mb-6 transition-colors
              text-xl sm:text-4xl md:text-4xl lg:text-[2.75rem]
              ${isDark ? 'text-white' : 'text-gray-900'}
            `}
          >
            <span className="block whitespace-nowrap">
              <span
                className={`font-bold text-2xl sm:text-4xl md:text-5xl lg:text-5xl
                  ${isDark ? 'text-blue-400' : 'text-blue-600'}
                `}
              >
                Uma IA pra chamar de sua!
              </span>
            </span>

            {/* Linha com o carrossel — client component isolado */}
            <span className="block whitespace-nowrap">
              Sou o{' '}
              <WordCarousel isDark={isDark} />
              {' '}IA que
            </span>

            <span className="block whitespace-nowrap">
              faz + de 100 funções{' '}
              <span className={isDark ? 'text-blue-400' : 'text-blue-600'}>
                pra você
              </span>
              !
            </span>
          </h1>

          <p
            className={`text-sm sm:text-base md:text-lg max-w-lg mb-4 sm:mb-8 leading-relaxed transition-colors mx-auto
              ${isDark ? 'text-white/55' : 'text-gray-600'}
            `}
          >
            Personalize seu assistente e transforme a experiência dos seus clientes com um
            funcionário de voz e texto que trabalha 24/7. Tenha seu próprio WebApp personalizado
            e configure do seu jeito para responder perguntas, executar funções, gerar cobranças,
            agendar consultas, recomendar vídeos, vender, cadastrar, fila de atendimento e muito mais.
          </p>

          {/* Botões CTA */}
          <div className="flex flex-row items-center justify-center gap-2 sm:gap-4">
            <Link
              href="/login"
              className="flex-1 sm:flex-none px-4 sm:px-8 py-2.5 sm:py-3.5 bg-[#A4C61E] text-white rounded-full hover:brightness-110 transition-all duration-300 font-bold text-xs sm:text-base text-center shadow-lg hover:shadow-xl hover:scale-105"
            >
              Comece Gratuitamente
            </Link>
            <Link
              href="/ia/suporte"
              className={`flex-1 sm:flex-none px-4 sm:px-8 py-2.5 sm:py-3.5 border-2 rounded-full transition-all duration-300 font-bold text-xs sm:text-base text-center hover:scale-105 ${
                isDark
                  ? 'border-blue-400/50 text-blue-400 hover:bg-blue-400/10 hover:border-blue-400'
                  : 'border-blue-600/50 text-blue-600 hover:bg-blue-50 hover:border-blue-600'
              }`}
            >
              Ver Demonstração
            </Link>
          </div>

          {/* Mini destaques */}
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-4 sm:mt-8">
            {MINI_DESTAQUES.map((text) => (
              <span
                key={text}
                className={`flex items-center gap-1.5 text-xs transition-colors font-medium ${
                  isDark ? 'text-white/35' : 'text-gray-400'
                }`}
              >
                {text}
              </span>
            ))}
          </div>

          {/* Traço + Slogan */}
          <div className="flex justify-center my-4 sm:my-5">
            <div className={`h-px w-32 ${isDark ? 'bg-white/35' : 'bg-gray-400'}`} />
          </div>
          <span className={`text-xs font-medium ${isDark ? 'text-white/35' : 'text-gray-400'}`}>
            minhAi - Uma IA pra chamar de sua!
          </span>
        </div>
      </div>
    </div>
  );
}
