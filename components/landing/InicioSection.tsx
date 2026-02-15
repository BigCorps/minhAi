'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LandingAvatarFace } from './LandingAvatarFace';

interface InicioSectionProps {
  theme?: 'dark' | 'light';
}

const OPCOES = [
  'Assistente',
  'Funcionário',
  'Atendente',
  'Gerente',
  'Auxiliar',
  'Secretário',
  'Operador',
  'Agente',
  'Analista',
  'Consultor',
  'Coordenador',
];

export default function InicioSection({ theme = 'dark' }: InicioSectionProps) {
  const isDark = theme === 'dark';
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % OPCOES.length);
        setIsAnimating(false);
      }, 300);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`relative flex items-center justify-center h-full w-full overflow-hidden transition-colors duration-500 ${
        isDark
          ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'
          : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
      }`}
    >
      {/* Fundo decorativo sutil */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
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
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 gap-8 md:gap-16 pt-20 md:pt-0">
        
        {/* LADO ESQUERDO - Texto + CTAs */}
        <div className="flex-1 text-center md:text-left order-2 md:order-1 max-w-xl">
          <h1
            style={{ fontFamily: "'Nunito', sans-serif" }}
            className={`text-2xl sm:text-4xl md:text-4xl lg:text-[2.75rem] font-bold leading-[1.1] mb-6 transition-colors ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}
          >
            {/* Linha 1 */}
            <span className="block whitespace-nowrap">
              <span className={isDark ? 'text-blue-400' : 'text-blue-600'}>eAi</span>, pronto para ter
            </span>

            {/* Linha 2 - com rolagem vertical */}
            <span className="block whitespace-nowrap">
              um{' '}
              <span 
                className="inline-block relative overflow-hidden align-baseline text-center"
                style={{ height: '1.2em' }}
              >
                {/* Palavras invisíveis para definir a largura máxima */}
                {OPCOES.map((palavra) => (
                  <span key={palavra} className="invisible block h-0 px-1" aria-hidden="true">
                    {palavra}
                  </span>
                ))}
                {/* Palavra visível animada */}
                <span
                  className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ease-in-out ${
                    isAnimating
                      ? '-translate-y-full opacity-0'
                      : 'translate-y-0 opacity-100'
                  } ${isDark ? 'text-green-400' : 'text-green-600'}`}
                >
                  {OPCOES[currentIndex]}
                </span>
              </span>
              {' '}IA
            </span>

            {/* Linha 3 */}
            <span className="block whitespace-nowrap">
              trabalhando{' '}
              <span className={isDark ? 'text-blue-400' : 'text-blue-600'}>
                por você
              </span>
              ?
            </span>
          </h1>

          <p
            className={`text-sm sm:text-base md:text-lg max-w-lg mb-8 leading-relaxed transition-colors ${
              isDark ? 'text-white/55' : 'text-gray-600'
            } mx-auto md:mx-0`}
          >
            Personalize seus assistentes e transforme a experiência dos seus clientes com um 
            funcionário de voz inteligente que trabalha 24 horas por dia. E o melhor, você paga 
            apenas quando ele trabalha. Configure do seu jeito para responder perguntas, executar 
            funções, gerar cobranças, agendar consultas, recomendar vídeos, produtos e muito mais.
          </p>

          {/* Botões CTA */}
          <div className="flex flex-col sm:flex-row items-center md:items-start gap-4">
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-3.5 bg-[#A4C61E] text-white rounded-full hover:brightness-110 transition-all duration-300 font-bold text-sm sm:text-base text-center shadow-lg hover:shadow-xl hover:scale-105"
            >
              Comece Gratuitamente
            </Link>
            <Link
              href="/ia/suporte"
              className={`w-full sm:w-auto px-8 py-3.5 border-2 rounded-full transition-all duration-300 font-bold text-sm sm:text-base text-center hover:scale-105 ${
                isDark
                  ? 'border-blue-400/50 text-blue-400 hover:bg-blue-400/10 hover:border-blue-400'
                  : 'border-blue-600/50 text-blue-600 hover:bg-blue-50 hover:border-blue-600'
              }`}
            >
              Ver Demonstração
            </Link>
          </div>

          {/* Mini destaques */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-5 gap-y-2 mt-8">
            {[
              { text: 'Rápido e Fácil de Começar' },
              { text: 'Pague por Interação' },
              { text: '100% Customizável' },
            ].map((item) => (
              <span
                key={item.text}
                className={`flex items-center gap-1.5 text-xs transition-colors font-medium ${
                  isDark ? 'text-white/35' : 'text-gray-400'
                }`}
              >
                {item.text}
              </span>
            ))}
          </div>
        </div>

        {/* LADO DIREITO - Avatar (Orbe) */}
        <div className="flex-shrink-0 order-1 md:order-2 flex items-center justify-center">
          <div className={`
            relative transition-all duration-500
            w-[21rem] h-[21rem] 
            sm:w-[23rem] sm:h-[23rem] 
            md:w-80 md:h-80 
            lg:w-[22rem] lg:h-[22rem] 
            xl:w-[26rem] xl:h-[26rem]
          `}>
            <LandingAvatarFace theme={theme} />
          </div>
        </div>
      </div>
    </div>
  );
}
