'use client';

import { useState } from 'react';

interface FuncoesSectionProps {
  theme?: 'dark' | 'light';
}

// ============================================================
// REGISTRY DE FUNÇÕES DA LANDING PAGE
// Para adicionar uma nova função, basta adicionar um objeto
// neste array seguindo o mesmo formato.
// ============================================================
const funcoes = [
  {
    id: 'perguntas-gerais',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
      </svg>
    ),
    title: 'Perguntas Gerais',
    subtitle: 'IA Avançada',
    description: 'Seu assistente responde a qualquer pergunta utilizando inteligência artificial avançada, fornecendo informações precisas e contextuais sobre seus produtos e serviços.',
    color: 'blue' as const,
  },
  {
    id: 'faq',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
      </svg>
    ),
    title: 'Perguntas Frequentes',
    subtitle: 'FAQ Inteligente',
    description: 'Treine seu assistente com as perguntas mais comuns da sua empresa. Respostas consistentes, rápidas e sem custo de IA para as dúvidas mais frequentes.',
    color: 'green' as const,
  },
  {
    id: 'pix',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
    title: 'Geração de PIX',
    subtitle: 'Pagamentos Instantâneos',
    description: 'Facilite cobranças com geração automática de códigos PIX. Seu assistente cria QR Codes na hora para seus clientes pagarem de forma rápida e segura.',
    color: 'blue' as const,
  },
  {
    id: 'redes-sociais',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.5 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" />
      </svg>
    ),
    title: 'QR Codes para Redes Sociais',
    subtitle: 'WhatsApp & Instagram',
    description: 'Conecte seus clientes às suas redes sociais instantaneamente. O assistente gera QR Codes para WhatsApp e Instagram na hora.',
    color: 'green' as const,
  },
];

const colorMap = {
  green: {
    iconBg: ['bg-green-500/15', 'bg-green-100'],
    iconText: ['text-green-400', 'text-green-600'],
    tag: ['bg-green-500/10 text-green-400 border-green-500/20', 'bg-green-50 text-green-600 border-green-200'],
    activeBorder: ['border-green-500/40', 'border-green-300'],
    activeShadow: ['shadow-green-500/5', 'shadow-green-200/20'],
  },
  blue: {
    iconBg: ['bg-blue-500/15', 'bg-blue-100'],
    iconText: ['text-blue-400', 'text-blue-600'],
    tag: ['bg-blue-500/10 text-blue-400 border-blue-500/20', 'bg-blue-50 text-blue-600 border-blue-200'],
    activeBorder: ['border-blue-500/40', 'border-blue-300'],
    activeShadow: ['shadow-blue-500/5', 'shadow-blue-200/20'],
  },
};

export default function FuncoesSection({ theme = 'dark' }: FuncoesSectionProps) {
  const isDark = theme === 'dark';
  const t = isDark ? 0 : 1;
  const [activeIndex, setActiveIndex] = useState(0);
  const activeFuncao = funcoes[activeIndex];
  const activeColor = colorMap[activeFuncao.color];

  return (
    <div
      className={`relative flex flex-col items-center justify-center h-full w-full px-6 sm:px-8 lg:px-12 overflow-hidden transition-colors duration-500 ${
        isDark
          ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'
          : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
      }`}
    >
      {/* Fundo decorativo */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className={`absolute bottom-0 right-0 w-[50%] h-[50%] rounded-full blur-[120px] ${
            isDark ? 'bg-green-500/5' : 'bg-green-200/15'
          }`}
        />
      </div>

      {/* Título da seção */}
      <div className="relative z-10 text-center mb-8 md:mb-12">
        <p
          className={`text-xs sm:text-sm font-semibold uppercase tracking-widest mb-3 transition-colors ${
            isDark ? 'text-green-400/70' : 'text-green-600/70'
          }`}
        >
          O que seu assistente pode fazer
        </p>
        <h2
          style={{ fontFamily: "'Nunito', sans-serif" }}
          className={`text-2xl sm:text-3xl md:text-4xl font-semibold transition-colors ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}
        >
          Funções do eAi
        </h2>
      </div>

      {/* Layout: Tabs + Conteúdo */}
      <div className="relative z-10 flex flex-col md:flex-row items-stretch gap-6 md:gap-10 max-w-5xl w-full">

        {/* LADO ESQUERDO: Lista de funções (tabs) */}
        <div className="flex md:flex-col gap-2 md:gap-3 md:w-64 flex-shrink-0 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
          {funcoes.map((funcao, index) => {
            const c = colorMap[funcao.color];
            const isActive = index === activeIndex;
            return (
              <button
                key={funcao.id}
                onClick={() => setActiveIndex(index)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left whitespace-nowrap md:whitespace-normal transition-all duration-300 min-w-fit md:min-w-0 border ${
                  isActive
                    ? `${isDark ? 'bg-white/5' : 'bg-white'} ${c.activeBorder[t]} shadow-lg ${c.activeShadow[t]}`
                    : `border-transparent ${isDark ? 'hover:bg-white/3' : 'hover:bg-gray-50'}`
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                    isActive ? c.iconBg[t] : isDark ? 'bg-white/5' : 'bg-gray-100'
                  }`}
                >
                  <div
                    className={`transition-colors ${
                      isActive ? c.iconText[t] : isDark ? 'text-white/40' : 'text-gray-400'
                    }`}
                  >
                    {funcao.icon}
                  </div>
                </div>
                <span
                  className={`text-sm font-medium transition-colors ${
                    isActive
                      ? isDark ? 'text-white' : 'text-gray-900'
                      : isDark ? 'text-white/50' : 'text-gray-500'
                  }`}
                >
                  {funcao.title}
                </span>
              </button>
            );
          })}
        </div>

        {/* LADO DIREITO: Detalhes da função selecionada */}
        <div
          className={`flex-1 rounded-2xl p-6 md:p-8 lg:p-10 border transition-all duration-500 ${
            isDark
              ? 'bg-slate-800/30 backdrop-blur-sm border-white/5'
              : 'bg-white/70 backdrop-blur-sm border-gray-100 shadow-sm'
          }`}
        >
          {/* Tag de subtítulo */}
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-medium border mb-5 transition-colors ${activeColor.tag[t]}`}
          >
            {activeFuncao.subtitle}
          </span>

          {/* Ícone grande */}
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-colors ${activeColor.iconBg[t]}`}
          >
            <div className={`${activeColor.iconText[t]} transition-colors [&>svg]:w-8 [&>svg]:h-8`}>
              {activeFuncao.icon}
            </div>
          </div>

          {/* Título */}
          <h3
            style={{ fontFamily: "'Nunito', sans-serif" }}
            className={`text-xl md:text-2xl font-semibold mb-3 transition-colors ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}
          >
            {activeFuncao.title}
          </h3>

          {/* Descrição */}
          <p
            className={`text-sm md:text-base leading-relaxed max-w-lg transition-colors ${
              isDark ? 'text-white/50' : 'text-gray-500'
            }`}
          >
            {activeFuncao.description}
          </p>

          {/* Indicador visual: linha decorativa */}
          <div className="flex items-center gap-2 mt-8">
            {funcoes.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === activeIndex
                    ? `w-8 ${activeFuncao.color === 'green'
                        ? isDark ? 'bg-green-400' : 'bg-green-500'
                        : isDark ? 'bg-blue-400' : 'bg-blue-500'
                      }`
                    : `w-2 ${isDark ? 'bg-white/15' : 'bg-gray-200'}`
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
