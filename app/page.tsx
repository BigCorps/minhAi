'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Header from '@/components/landing/Header';
import InicioSection from '@/components/landing/InicioSection';
import RecursoSlide from '@/components/landing/RecursoCardsSlide';
import FuncaoSlide from '@/components/landing/FuncaoCardsSlide';
import PrecosSection from '@/components/landing/PrecosSection';
import ContatoSection from '@/components/landing/ContatoSection';

// ============================================================
// REGISTRY DE RECURSOS
// Cada recurso vira uma tela no scroll horizontal.
// ============================================================
const RECURSOS = [
  {
    id: 'recurso-custo-baixo',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Custo Baixo',
    highlight: 'R$ 0,12',
    highlightLabel: 'por interação',
    description: 'A partir de R$ 0,12 por interação. Economia de até 90% comparado a atendimento humano tradicional.',
    color: 'green' as const,
  },
  {
    id: 'recurso-customizavel',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    ),
    title: 'Totalmente Customizável',
    highlight: '100%',
    highlightLabel: 'personalizado',
    description: 'Configure palavras de ativação, saudações, prompts e funções personalizadas para cada empresa.',
    color: 'blue' as const,
  },
  {
    id: 'recurso-rapido',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: 'Rápido e Fácil',
    highlight: '< 5 min',
    highlightLabel: 'para configurar',
    description: 'Configure em minutos. Sem necessidade de código ou conhecimento técnico para começar.',
    color: 'green' as const,
  },
  {
    id: 'recurso-24h',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Atendimento 24 Horas',
    highlight: '24/7',
    highlightLabel: 'sempre disponível',
    description: 'Seu assistente nunca dorme. Atendimento automático a qualquer hora do dia ou da noite, sem custos extras.',
    color: 'blue' as const,
  },
  {
    id: 'recurso-webapp',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      </svg>
    ),
    title: 'WebApp Próprio',
    highlight: 'PWA',
    highlightLabel: 'instalável no celular',
    description: 'Cada empresa ganha seu próprio aplicativo web instalável. Seus clientes acessam o assistente direto da tela inicial do celular, sem precisar baixar nada na loja.',
    color: 'green' as const,
    imageSrc: '/images/webapp.png',
  },
  {
    id: 'recurso-indicacao',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
    title: 'Programa de Indicação',
    highlight: '+20',
    highlightLabel: 'créditos por indicação',
    description: 'Indique o eAi e ganhe créditos. Cada novo cadastro feito com seu link de indicação dá 20 créditos gratuitos para você e para quem você indicou.',
    color: 'blue' as const,
  },
  {
    id: 'recurso-link-pix',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-3.061a4.5 4.5 0 00-1.242-7.244l4.5-4.5a4.5 4.5 0 016.364 6.364l-1.757 1.757" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 9l-6 6" />
      </svg>
    ),
    title: 'Link de Pagamento PIX',
    highlight: '1 clique',
    highlightLabel: 'para cobrar',
    description: 'Gere links de pagamento PIX instantâneos para enviar por WhatsApp, SMS ou qualquer canal. Seus clientes pagam direto pelo celular sem precisar do assistente de voz.',
    color: 'green' as const,
  },
];

// ============================================================
// REGISTRY DE FUNÇÕES
// Para adicionar novas funções, basta adicionar um objeto aqui.
// Cada função vira automaticamente uma tela no scroll horizontal.
// ============================================================
const FUNCOES = [
  {
    id: 'funcao-perguntas-gerais',
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
    id: 'funcao-faq',
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
    id: 'funcao-pix',
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
    id: 'funcao-redes-sociais',
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
  // ============================================================
  // PARA ADICIONAR NOVAS FUNÇÕES: copie o bloco acima e preencha.
  // A nova função aparece automaticamente como tela no scroll.
  // Alterne color entre 'blue' e 'green'.
  // ============================================================
];

// ============================================================
// IDs DE TODAS AS SEÇÕES (gerado dinamicamente)
// ============================================================
const ALL_SECTION_IDS = [
  'inicio',
  ...RECURSOS.map((r) => r.id),
  ...FUNCOES.map((f) => f.id),
  'precos',
  'contato',
];

// Seções do header (5 itens fixos)
const NAV_SECTIONS = ['inicio', 'recursos', 'funcoes', 'precos', 'contato'];

// Mapeia ID da seção → qual nav item destacar no header
function getSectionNavGroup(sectionId: string): string {
  if (sectionId.startsWith('funcao-')) return 'funcoes';
  if (sectionId.startsWith('recurso-')) return 'recursos';
  return sectionId;
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function LandingPage() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeSectionId, setActiveSectionId] = useState('inicio');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const isScrollingRef = useRef(false);

  // Qual nav item está ativo (agrupa funções sob "funcoes")
  const activeNavItem = getSectionNavGroup(activeSectionId);

  // Detecta preferência de tema
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    if (mq.matches) setTheme('light');
  }, []);

  // IntersectionObserver
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            setActiveSectionId(entry.target.id);
          }
        });
      },
      { root: container, threshold: 0.5 }
    );

    const sections = container.querySelectorAll('section[id]');
    sections.forEach((s) => observer.observe(s));
    return () => sections.forEach((s) => observer.unobserve(s));
  }, []);

  // Scroll para seção por ID
  const scrollToSection = useCallback((id: string) => {
    // Se o header clica em "funcoes", vai para a primeira função
    const targetId = id === 'funcoes' ? FUNCOES[0].id : id === 'recursos' ? RECURSOS[0].id : id;
    const section = document.getElementById(targetId);
    if (section && scrollContainerRef.current) {
      isScrollingRef.current = true;
      section.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
      setTimeout(() => { isScrollingRef.current = false; }, 800);
    }
  }, []);

  // Navegar próxima/anterior (usa ALL_SECTION_IDS que inclui cada função)
  const navigateNext = useCallback(() => {
    const i = ALL_SECTION_IDS.indexOf(activeSectionId);
    if (i < ALL_SECTION_IDS.length - 1) scrollToSection(ALL_SECTION_IDS[i + 1]);
  }, [activeSectionId, scrollToSection]);

  const navigatePrev = useCallback(() => {
    const i = ALL_SECTION_IDS.indexOf(activeSectionId);
    if (i > 0) scrollToSection(ALL_SECTION_IDS[i - 1]);
  }, [activeSectionId, scrollToSection]);

  // Scroll vertical → horizontal
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    let wheelTimeout: NodeJS.Timeout;
    let canScroll = true;

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      e.preventDefault();
      if (!canScroll || isScrollingRef.current) return;
      if (Math.abs(e.deltaY) < 30) return;
      canScroll = false;
      if (e.deltaY > 0) navigateNext();
      else navigatePrev();
      wheelTimeout = setTimeout(() => { canScroll = true; }, 1000);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => { container.removeEventListener('wheel', handleWheel); clearTimeout(wheelTimeout); };
  }, [navigateNext, navigatePrev]);

  // Teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); navigateNext(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); navigatePrev(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateNext, navigatePrev]);

  const toggleTheme = () => setTheme((p) => (p === 'dark' ? 'light' : 'dark'));
  const isDark = theme === 'dark';
  const currentAllIndex = ALL_SECTION_IDS.indexOf(activeSectionId);
  const canGoLeft = currentAllIndex > 0;
  const canGoRight = currentAllIndex < ALL_SECTION_IDS.length - 1;

  return (
    <div className={`relative h-screen w-screen overflow-hidden transition-colors duration-500 ${
      isDark ? 'bg-slate-950 text-white' : 'bg-white text-gray-900'
    }`}>

      {/* Header (usa activeNavItem que agrupa funções) */}
      <Header
        activeSection={activeNavItem}
        onNavigate={scrollToSection}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Container Horizontal */}
      <main
        ref={scrollContainerRef}
        className="flex w-full h-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <style jsx>{`main::-webkit-scrollbar { display: none; }`}</style>

        {/* INÍCIO */}
        <section id="inicio" className="w-screen h-screen flex-shrink-0 snap-start snap-always">
          <InicioSection theme={theme} />
        </section>

        {/* RECURSOS (cada um é uma tela cheia) */}
        {RECURSOS.map((recurso, index) => (
          <section
            key={recurso.id}
            id={recurso.id}
            className="w-screen h-screen flex-shrink-0 snap-start snap-always"
          >
            <RecursoSlide
              theme={theme}
              icon={recurso.icon}
              title={recurso.title}
              highlight={recurso.highlight}
              highlightLabel={recurso.highlightLabel}
              description={recurso.description}
              color={recurso.color}
              currentIndex={index}
              totalCount={RECURSOS.length}
              imageSrc={'imageSrc' in recurso ? recurso.imageSrc : undefined}
            />
          </section>
        ))}

        {/* FUNÇÕES (cada uma é uma tela cheia) */}
        {FUNCOES.map((funcao, index) => (
          <section
            key={funcao.id}
            id={funcao.id}
            className="w-screen h-screen flex-shrink-0 snap-start snap-always"
          >
            <FuncaoSlide
              theme={theme}
              icon={funcao.icon}
              title={funcao.title}
              subtitle={funcao.subtitle}
              description={funcao.description}
              color={funcao.color}
              currentIndex={index}
              totalCount={FUNCOES.length}
            />
          </section>
        ))}

        {/* PREÇOS */}
        <section id="precos" className="w-screen h-screen flex-shrink-0 snap-start snap-always">
          <PrecosSection theme={theme} />
        </section>

        {/* CONTATO */}
        <section id="contato" className="w-screen h-screen flex-shrink-0 snap-start snap-always">
          <ContatoSection theme={theme} />
        </section>
      </main>

      {/* SETA ESQUERDA */}
      <button
        onClick={navigatePrev}
        className={`fixed left-4 md:left-6 top-1/2 -translate-y-1/2 z-40 p-2 md:p-3 rounded-full backdrop-blur-sm border transition-all duration-500 group ${
          canGoLeft ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'
        } ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-black/5 border-black/5 hover:bg-black/10'}`}
        aria-label="Seção anterior"
      >
        <svg className={`w-4 h-4 md:w-5 md:h-5 transition-transform duration-300 group-hover:-translate-x-0.5 ${
          isDark ? 'text-white/30 group-hover:text-white/60' : 'text-gray-300 group-hover:text-gray-500'
        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* SETA DIREITA */}
      <button
        onClick={navigateNext}
        className={`fixed right-4 md:right-6 top-1/2 -translate-y-1/2 z-40 p-2 md:p-3 rounded-full backdrop-blur-sm border transition-all duration-500 group ${
          canGoRight ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'
        } ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-black/5 border-black/5 hover:bg-black/10'}`}
        aria-label="Próxima seção"
      >
        <svg className={`w-4 h-4 md:w-5 md:h-5 transition-transform duration-300 group-hover:translate-x-0.5 ${
          isDark ? 'text-white/30 group-hover:text-white/60' : 'text-gray-300 group-hover:text-gray-500'
        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* INDICADOR DE PROGRESSO (5 pontos, funções agrupadas) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2">
        {NAV_SECTIONS.map((navId) => {
          const isActive = activeNavItem === navId;
          return (
            <button
              key={navId}
              onClick={() => scrollToSection(navId)}
              className={`rounded-full transition-all duration-300 ${
                isActive
                  ? `w-8 h-2 ${isDark ? 'bg-blue-400' : 'bg-blue-600'}`
                  : `w-2 h-2 ${isDark ? 'bg-white/30 hover:bg-white/50' : 'bg-gray-300 hover:bg-gray-400'}`
              }`}
              aria-label={`Ir para ${navId}`}
            />
          );
        })}
      </div>
    </div>
  );
}
