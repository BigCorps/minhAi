'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Header from '@/components/landing/Header';
import InicioSection from '@/components/landing/InicioSection';
import ProvasSociaisSection from '@/components/landing/ProvasSociaisSection';
import ComoFuncionaSection from '@/components/landing/ComoFuncionaSection';
import RecursoImageSlide from '@/components/landing/RecursoImageSlide';
import RecursoCardsSlide from '@/components/landing/RecursoCardsSlide';
import VantagensSlide from '@/components/landing/VantagensSlide';
import FuncaoCardsSlide from '@/components/landing/FuncaoCardsSlide';
import DepoimentosSection from '@/components/landing/DepoimentosSection';
import FAQSection from '@/components/landing/FAQSection';
import TecnologiaSection from '@/components/landing/TecnologiaSection';
import { LandingDemoFooter } from '@/components/landing/LandingDemoFooter';
import {
  QrCode,
  CreditCard,
  Play,
  Radio,
  Search,
  MapPin,
  CalendarDays,
  Brain,
  Wrench,
  BadgeCheck,
  FolderOpen,
  ConciergeBell,
  ShoppingCart,
  Camera,
} from 'lucide-react';
import PrecosSection from '@/components/landing/PrecosSection';
import ContatoSection from '@/components/landing/ContatoSection';

// ============================================================
// RECURSOS — 5 slides
// ============================================================
const RECURSO_CARDS = [
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Economia real',
    highlight: 'até 90% mais barato',
    highlightLabel: 'que atendimento humano',
    description: 'Escolha entre comissao por venda ou créditos por interação. Compare com salário + encargos de um atendente, ou contratar um serviço de autoatendimento, e a diferença é enorme — sem perder qualidade.',
    color: 'green' as const,
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    ),
    title: 'Sua cara, seu jeito',
    highlight: '100% Personalizado',
    highlightLabel: 'configuração total',
    description: 'Configure palavras de ativação, saudações, tipo de voz, saudação automática, prompts e funções para cada assistente. A IA fala como você quer.',
    color: 'blue' as const,
  },
  {
  icon: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5V4H2v16h5m10 0v-6H7v6m10 0H7" />
    </svg>
  ),
  title: 'Assistentes Inteligentes',
  highlight: 'Multifuncional',
  highlightLabel: 'funções e equipes',
  description: 'Crie vários assistentes especializados para cada setor ou um único assistente completo capaz de atender, vender, cobrar e organizar seu negócio.',
  color: 'green' as const,
},
{
  icon: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0m6 0H9" />
    </svg>
  ),
  title: 'Notificações em Tempo Real',
  highlight: 'Alertas e Avisos',
  highlightLabel: 'instantâneos',
  description: 'Receba notificações automáticas por e-mail, WhatsApp e push sempre que uma venda, cobrança ou pagamento for realizado.',
  color: 'blue' as const,
},
];

const RECURSO_IMAGE_SLIDES = [
  {
    id: 'recurso-dispositivos',
    label: 'Compatibilidade total',
    title: 'Funciona onde seu cliente está',
    description:
      'Celular, computador, tablet, totem, TV ou PDV — se tem tela e navegador, roda o minhAi. Conecte também WhatsApp, Instagram e Facebook: um assistente único que responde em todos os canais ao mesmo tempo, sem você monitorar nada.',
    imageSrc: '/dispositivos.png',
    imageAlt: 'Dispositivos compatíveis com minhAi — celular, tablet, totem e computador',
    color: 'blue' as const,
  },
  {
    id: 'recurso-api',
    label: 'Integrações nativas',
    title: 'Conectado ao que você já usa',
    description:
      'Google Agenda, Meu Negocio, Drive, Gmail, YouTube, Maps, Reuniões no Meet e Video Chamadas, WhatsApp Business, Instagram, Facebook, Mercado Pago, InfinitePay — tudo nativo, sem zapier, sem desenvolvimento adicional. O minhAi já vem integrado com as ferramentas que fazem seu negócio funcionar.',
    imageSrc: '/api.png',
    imageAlt: 'Integrações nativas do minhAi — Google, Meta, Mercado Pago e mais',
    color: 'green' as const,
  },
  {
    id: 'recurso-vantagens',
    label: 'Escale sem contratar',
    title: 'Atenda 10x mais sem aumentar sua equipe',
    description:
      'Um Funcionário IA não tira férias, não falta, não pede aumento e atende centenas de clientes ao mesmo tempo. É o melhor, você escolhe como pagar, se por interação ou por comissão. Libere sua equipe para o que realmente importa — enquanto o assistente resolve o repetitivo, 24 horas por dia.',
    imageSrc: '/vantagens.png',
    imageAlt: 'Eficiência operacional com minhAi — automatize atendimento e escale seu negócio',
    color: 'blue' as const,
  },
  {
    id: 'recurso-extras',
    label: 'Extras',
    title: 'Mais vantagens que fazem diferença',
    description: null,
    imageSrc: null,
    imageAlt: null,
    color: 'green' as const,
  },
  {
    id: 'recurso-cards',
    label: null,
    title: null,
    description: null,
    imageSrc: null,
    imageAlt: null,
    color: 'blue' as const,
  },
];

const TOTAL_RECURSO_SLIDES = RECURSO_IMAGE_SLIDES.length;

// ============================================================
// FUNÇÕES — 4 páginas com copy orientado a benefício
// ============================================================
const FUNCAO_PAGES = [
  {
    id: 'funcao-page-1',
    cards: [
      {
        title: 'Clientes chegam até você',
        icon: <QrCode />,
        color: 'blue' as const,
        description:
          'WhatsApp, Instagram, Facebook (com respostas de comentários e DMs automáticos) — Também QR Codes que conectam seu cliente ao canal certo, aumentando conversão e engajamento.',
      },
      {
        title: 'Cobra e recebe sozinho',
        icon: <CreditCard />,
        color: 'green' as const,
        description:
          'PIX, crédito, débito e link de pagamento direto pelo assistente — com confirmação automática. Sem você precisar verificar nada.',
      },
      {
        title: 'Entretenha enquanto vende',
        icon: <Play />,
        color: 'blue' as const,
        description:
          'Vídeos, playlists, tutoriais e publicidade no totem enquanto o cliente espera. Venda mais com experiência — ideal para totens e recepções.',
      },
    ],
  },
  {
    id: 'funcao-page-2',
    cards: [
      {
        title: 'Responde por você, sempre',
        icon: <Radio />,
        color: 'green' as const,
        description:
          'Notícias, câmbio, feriados, informações da sua marca — o assistente responde antes de você precisar digitar uma palavra.',
      },
      {
        title: 'Valide antes de fechar negócio',
        icon: <Search />,
        color: 'blue' as const,
        description:
          'CNPJ, CPF, placa de veículo, restrições de crédito — consulta em segundos direto pelo assistente, sem sair do atendimento.',
      },
      {
        title: 'Leva o cliente até você',
        icon: <MapPin />,
        color: 'green' as const,
        description:
          'Endereço no mapa, CEP, rota e trânsito em tempo real — o assistente guia seu cliente até a sua porta.',
      },
      {
        title: 'Agenda lota sozinha',
        icon: <CalendarDays />,
        color: 'blue' as const,
        description:
          'Marcação, confirmação e reagendamento automático no Google Agenda. Envia lembrete para reduzir faltas — e libera sua recepção.',
      },
    ],
  },
  {
    id: 'funcao-page-3',
    cards: [
      {
        title: 'IA que sabe tudo do seu negócio',
        icon: <Brain />,
        color: 'green' as const,
        description:
          'Responde perguntas gerais, gera orçamentos, traduz, transcreve áudio e consulta o tempo. Um consultor digital disponível 24 horas.',
      },
      {
        title: 'Produtividade no dia a dia',
        icon: <Wrench />,
        color: 'blue' as const,
        description:
          'Aparelhos smart, lembretes, cronômetro, relógio mundial — ferramentas simples que economizam minutos todos os dias.',
      },
      {
        title: 'Controle de acesso e filas',
        icon: <BadgeCheck />,
        color: 'green' as const,
        description:
          'Cadastro de clientes, fila de atendimento com senha digital, videochamada entre colaboradores e reuniões com Google Meet.',
      },
    ],
  },
  {
    id: 'funcao-page-4',
    cards: [
      {
        title: 'Edite e converta com IA',
        icon: <FolderOpen />,
        color: 'blue' as const,
        description:
          'Remover fundo, duplicar imagem, editar foto, converter arquivos e juntar PDFs — tudo pelo assistente, sem precisar de outro software.',
      },
      {
        title: 'Impressão, cardápio e suporte',
        icon: <ConciergeBell />,
        color: 'green' as const,
        description:
          'Imprime recibos na térmica, exibe cardápio digital, emite segunda via de boleto e aciona o gerente com um toque.',
      },
      {
        title: 'Vendedor digital ativo 24h',
        icon: <ShoppingCart />,
        color: 'blue' as const,
        description:
          'Recomenda produtos, registra vendas, consulta estoque, processa pedidos e coleta avaliações — sem vendedor físico presente.',
      },
      {
        title: 'Leia e valide com a câmera',
        icon: <Camera />,
        color: 'green' as const,
        description:
          'QR Codes, código de barras, envio de arquivo por foto, validação de cupom e controle de acesso — tudo pela câmera do dispositivo.',
      },
    ],
  },
];

const TOTAL_FUNCAO_PAGES = FUNCAO_PAGES.length;

// ============================================================
// IDs
// ============================================================
const ALL_SECTION_IDS = [
  'inicio',
  'provas-sociais',
  'como-funciona',
  ...RECURSO_IMAGE_SLIDES.map((r) => r.id),
  ...FUNCAO_PAGES.map((f) => f.id),
  'depoimentos',
  'faq',
  'tecnologia',
  'precos',
  'contato',
];

const NAV_SECTIONS = ['inicio', 'recursos', 'funcoes', 'precos', 'contato'];

function getSectionNavGroup(sectionId: string): string {
  if (sectionId.startsWith('funcao-')) return 'funcoes';
  if (sectionId.startsWith('recurso-')) return 'recursos';
  if (sectionId === 'provas-sociais') return 'inicio';
  if (sectionId === 'como-funciona') return 'recursos';
  if (sectionId === 'depoimentos') return 'precos';
  if (sectionId === 'faq') return 'precos';
  if (sectionId === 'tecnologia') return 'precos';
  return sectionId;
}

// ============================================================
// HOOK — altura real da viewport
// Resolve o problema central: dvh/svh não exclui UI do browser
// no Android. Calculamos window.innerHeight que já desconta tudo.
// ============================================================
function useRealVh() {
  useEffect(() => {
    function update() {
      // 1px = 1% da altura real disponível
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--real-vh', `${vh}px`);
    }
    update();
    window.addEventListener('resize', update);
    // orientationchange necessário para iOS
    window.addEventListener('orientationchange', () => setTimeout(update, 200));
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function LandingPage() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeSectionId, setActiveSectionId] = useState('inicio');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const isScrollingRef = useRef(false);

  // Aplica --real-vh globalmente
  useRealVh();

  const activeNavItem = getSectionNavGroup(activeSectionId);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    if (mq.matches) setTheme('light');
  }, []);

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

  const scrollToSection = useCallback((id: string) => {
    const targetId =
      id === 'funcoes'
        ? FUNCAO_PAGES[0].id
        : id === 'recursos'
        ? RECURSO_IMAGE_SLIDES[0].id
        : id;
    const section = document.getElementById(targetId);
    if (section && scrollContainerRef.current) {
      isScrollingRef.current = true;
      section.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
      setTimeout(() => { isScrollingRef.current = false; }, 800);
    }
  }, []);

  const navigateNext = useCallback(() => {
    const i = ALL_SECTION_IDS.indexOf(activeSectionId);
    if (i < ALL_SECTION_IDS.length - 1) scrollToSection(ALL_SECTION_IDS[i + 1]);
  }, [activeSectionId, scrollToSection]);

  const navigatePrev = useCallback(() => {
    const i = ALL_SECTION_IDS.indexOf(activeSectionId);
    if (i > 0) scrollToSection(ALL_SECTION_IDS[i - 1]);
  }, [activeSectionId, scrollToSection]);

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
    /*
      ALTURA DO WRAPPER:
      Usa calc(var(--real-vh, 1vh) * 100) como fallback progressivo:
      1. --real-vh é setado pelo useRealVh() via JS no primeiro render
      2. Enquanto JS não rodou: 100dvh (melhor fallback moderno)
      3. Fallback final para browsers antigos: 100vh
    */
    <div
      className={`relative w-screen overflow-hidden transition-colors duration-500 ${
        isDark ? 'bg-slate-950 text-white' : 'bg-white text-gray-900'
      }`}
      style={{ height: 'calc(var(--real-vh, 1svh) * 100)' }}
    >

      <Header
        activeSection={activeNavItem}
        onNavigate={scrollToSection}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main
        ref={scrollContainerRef}
        className="flex w-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth"
        /*
          Altura do main = altura real disponível.
          Não usamos h-full aqui pois o wrapper pai
          pode ter height via style (não via classe),
          e h-full em alguns browsers não propaga style height.
          Usamos o mesmo calc diretamente.
        */
        style={{
          height: 'calc(var(--real-vh, 1svh) * 100)',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
        aria-label="Seções da landing page minhAi"
      >
        <style>{`main::-webkit-scrollbar { display: none; }`}</style>

        {/* SEÇÕES — cada uma ocupa exatamente a viewport real */}
        {/* A classe section-full é definida no globals.css abaixo */}

        {/* INÍCIO */}
        <section
          id="inicio"
          className="flex-shrink-0 snap-start snap-always"
          style={{ width: '100vw', height: 'calc(var(--real-vh, 1svh) * 100)' }}
          aria-label="Início"
        >
          <InicioSection theme={theme} />
        </section>

        {/* PROVAS SOCIAIS */}
        <section
          id="provas-sociais"
          className="flex-shrink-0 snap-start snap-always"
          style={{ width: '100vw', height: 'calc(var(--real-vh, 1svh) * 100)' }}
          aria-label="Quem usa o minhAi"
        >
          <ProvasSociaisSection theme={theme} />
        </section>

        {/* COMO FUNCIONA */}
        <section
          id="como-funciona"
          className="flex-shrink-0 snap-start snap-always"
          style={{ width: '100vw', height: 'calc(var(--real-vh, 1svh) * 100)' }}
          aria-label="Como funciona o minhAi"
        >
          <ComoFuncionaSection theme={theme} />
        </section>

        {/* RECURSOS — slides 1, 2, 3 com imagem */}
        {RECURSO_IMAGE_SLIDES.slice(0, 3).map((slide, index) => (
          <section
            key={slide.id}
            id={slide.id}
            className="flex-shrink-0 snap-start snap-always"
            style={{ width: '100vw', height: 'calc(var(--real-vh, 1svh) * 100)' }}
            aria-label={slide.title || slide.label || 'Recurso'}
          >
            <RecursoImageSlide
              theme={theme}
              label={slide.label!}
              title={slide.title!}
              description={slide.description!}
              imageSrc={slide.imageSrc!}
              imageAlt={slide.imageAlt!}
              color={slide.color}
              currentIndex={index}
              totalCount={TOTAL_RECURSO_SLIDES}
              nextHint={index < 2 ? 'Role para ver mais →' : 'Role para ver mais vantagens →'}
            />
          </section>
        ))}

        {/* RECURSOS — slide 4: extras */}
        <section
          id="recurso-extras"
          className="flex-shrink-0 snap-start snap-always"
          style={{ width: '100vw', height: 'calc(var(--real-vh, 1svh) * 100)' }}
          aria-label="Vantagens extras"
        >
          <VantagensSlide theme={theme} currentIndex={3} totalCount={TOTAL_RECURSO_SLIDES} />
        </section>

        {/* RECURSOS — slide 5: 4 cards */}
        <section
          id="recurso-cards"
          className="flex-shrink-0 snap-start snap-always"
          style={{ width: '100vw', height: 'calc(var(--real-vh, 1svh) * 100)' }}
          aria-label="Diferenciais"
        >
          <RecursoCardsSlide theme={theme} recursos={RECURSO_CARDS} currentIndex={4} totalCount={TOTAL_RECURSO_SLIDES} />
        </section>

        {/* FUNÇÕES — 4 páginas */}
        {FUNCAO_PAGES.map((page, index) => (
          <section
            key={page.id}
            id={page.id}
            className="flex-shrink-0 snap-start snap-always"
            style={{ width: '100vw', height: 'calc(var(--real-vh, 1svh) * 100)' }}
            aria-label={`Funções — página ${index + 1}`}
          >
            <FuncaoCardsSlide
              theme={theme}
              cards={page.cards}
              currentIndex={index}
              totalCount={TOTAL_FUNCAO_PAGES}
            />
          </section>
        ))}

        {/* DEPOIMENTOS */}
        <section
          id="depoimentos"
          className="flex-shrink-0 snap-start snap-always"
          style={{ width: '100vw', height: 'calc(var(--real-vh, 1svh) * 100)' }}
          aria-label="Depoimentos de clientes"
        >
          <DepoimentosSection theme={theme} />
        </section>

        {/* FAQ */}
        <section
          id="faq"
          className="flex-shrink-0 snap-start snap-always"
          style={{ width: '100vw', height: 'calc(var(--real-vh, 1svh) * 100)' }}
          aria-label="Perguntas frequentes"
        >
          <FAQSection theme={theme} />
        </section>

        {/* TECNOLOGIA */}
        <section
          id="tecnologia"
          className="flex-shrink-0 snap-start snap-always"
          style={{ width: '100vw', height: 'calc(var(--real-vh, 1svh) * 100)' }}
          aria-label="Tecnologia e stack técnico"
        >
          <TecnologiaSection theme={theme} />
        </section>

        {/* PREÇOS */}
        <section
          id="precos"
          className="flex-shrink-0 snap-start snap-always"
          style={{ width: '100vw', height: 'calc(var(--real-vh, 1svh) * 100)' }}
          aria-label="Planos e preços"
        >
          <PrecosSection theme={theme} />
        </section>

        {/* CONTATO */}
        <section
          id="contato"
          className="flex-shrink-0 snap-start snap-always"
          style={{ width: '100vw', height: 'calc(var(--real-vh, 1svh) * 100)' }}
          aria-label="Contato e CTA final"
        >
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
        <svg className={`w-4 h-4 md:w-5 md:h-5 transition-transform duration-300 group-hover:-translate-x-0.5 ${isDark ? 'text-white/30 group-hover:text-white/60' : 'text-gray-300 group-hover:text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <LandingDemoFooter theme={theme} />

      {/* SETA DIREITA */}
      <button
        onClick={navigateNext}
        className={`fixed right-4 md:right-6 top-1/2 -translate-y-1/2 z-40 p-2 md:p-3 rounded-full backdrop-blur-sm border transition-all duration-500 group ${
          canGoRight ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'
        } ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-black/5 border-black/5 hover:bg-black/10'}`}
        aria-label="Próxima seção"
      >
        <svg className={`w-4 h-4 md:w-5 md:h-5 transition-transform duration-300 group-hover:translate-x-0.5 ${isDark ? 'text-white/30 group-hover:text-white/60' : 'text-gray-300 group-hover:text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* INDICADOR DE PROGRESSO */}
      <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2">
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
