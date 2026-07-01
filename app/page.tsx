'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Header from '@/components/landing/Header';
import InicioSection from '@/components/landing/InicioSection';
import ProvasSociaisSection from '@/components/landing/ProvasSociaisSection';
import RecursoImageSlide from '@/components/landing/RecursoImageSlide';
import VantagensInfoSlide from '@/components/landing/VantagensInfoSlide';
import FuncaoCardsCarousel from '@/components/landing/FuncaoCardsCarousel';
import DepoimentosFaqSection from '@/components/landing/DepoimentosFaqSection';
import AssistentesSection from '@/components/landing/AssistentesSection';
import { LandingDemoFooter } from '@/components/landing/LandingDemoFooter';
import { DomainPreviewPicker } from '@/components/landing/DomainPreviewPicker';
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
// PÁGINA 2 — "Escale sem contratar" + DomainPicker
// Extraída do bloco de Recursos: agora fica logo após o Início,
// antes dos Auxiliares. Fora da sequência de dots de "Recursos".
// ============================================================
const RECURSO_VANTAGENS_SLIDE = {
  id: 'recurso-vantagens',
  label: 'Escale sem contratar',
  title: 'Atenda 10x mais, sem\naumentar sua equipe', // \n logo após o "sem"
  description:
    'Sua empresa ganha um funcionário digital completo, trabalhando 24 horas por dia, com o nome, a palavra de ativação, a marca, as funções e o jeito que a sua empresa precisa. Semelhante a uma Alexa personalizada, mas com recursos voltados para cuidar dos trabalhos repetitivos.',
  imageSrc: '/vantagens.png',
  imageAlt: 'Eficiência operacional com minhAi — automatize atendimento e escale seu negócio',
  color: 'blue' as const,
};


// ============================================================
// PÁGINA 5 — primeira de "Informações": fusão de
// Compatibilidade total + Integrações nativas, imagem alternando
// automaticamente (sem setas) entre dispositivos.png e api.png
// ============================================================
const INFO_COMPATIBILIDADE_SLIDE = {
  id: 'info-compatibilidade',
  label: 'Compatibilidade total',
  title: 'Funciona onde seu cliente está',
  description:
    'A minhAi funciona onde seu cliente está: Celular, computador, tablet, totem, TV ou PDV. E também pode se conectar aos principais serviços e plataformas do mercado, como os serviços Meta, com WhatsApp, Instagram e Facebook; serviços Google, com Gmail, Agenda, Drive, Meet, Maps e Google Meu Negócio; integrações MCP diretamente com seu próprio ChatGPT, Claude, Manus, Cursor; além de Marketplaces e Bancos, como Mercado Livre, Inter, InfinitePay e muito mais.',
  images: ['/dispositivos.png', '/api.png'],
  imageAlt: 'minhAi funcionando em diferentes dispositivos e integrado a WhatsApp, Instagram, Google e Mercado Livre',
  color: 'blue' as const,
};

// ============================================================
// INFORMAÇÕES — página 2: "Mais vantagens" reformulada.
// Texto (frase) abaixo do título; à direita, alterna automaticamente
// entre a imagem /webapp.png e os 3 cards de vantagens (sem setas).
// ============================================================
const VANTAGENS_INFO_SLIDE = {
  id: 'info-vantagens',
  label: 'Vantagens',
  title: 'Mais vantagens que fazem diferença',
  description:
    'Você ainda pode configurar para seu gerente ou sua equipe sejam chamados a qualquer momento, sempre que o cliente precisar de atendimento humano ou quando surgir algum problema que exija atenção imediata. Tudo isso sem saber programar. Em poucos minutos, você configura e já pode divulgar o link e QR code do seu assistente. Além de mais vantagens:',
  imageSrc: '/webapp.png',
  imageAlt: 'WebApp personalizado, programa de indicação e Link PIX do minhAi',
};

const VANTAGENS_INFO_CARDS = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      </svg>
    ),
    title: 'Seu site e assistente com App próprio',
    highlight: 'PWA instalável',
    description: 'WebApp com sua marca direto na tela do cliente — sem publicar na Play Store ou App Store. Funciona como app nativo, com seu logo, nome e dominio a sua escolha.',
    color: 'blue' as const,
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
    title: 'Ganhe renda indicando',
    highlight: '50% de comissão',
    description: 'Indique outros negócios e receba 50% das mensalidades deles, todos os meses, para sempre. A melhor renda passiva que o seu negócio pode ter.',
    color: 'green' as const,
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <rect x="3" y="3" width="6" height="6" rx="1.5" strokeWidth="1.5" />
        <rect x="15" y="3" width="6" height="6" rx="1.5" strokeWidth="1.5" />
        <rect x="3" y="15" width="6" height="6" rx="1.5" strokeWidth="1.5" />
        <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M15 15h2v2h-2zM19 15h2v4h-4v-2h2zM15 19h2v2h-2z" />
      </svg>
    ),
    title: 'Cobre pelo WhatsApp com 1 mensagem',
    highlight: 'PIX instantâneo',
    description: 'Gere cobrança PIX por voz ou chat, envie o link Pix com confirmação automática. Sem maquininha, sem complicação e sem comprovantes falsos.',
    color: 'blue' as const,
  },
];

// ============================================================
// FUNÇÕES — 14 cards em 4 grupos (3, 4, 3, 4), consolidados
// em uma única página com carrossel automático (página 3)
// ============================================================
const FUNCAO_ID = 'funcao-cards';

const FUNCAO_TITULO = 'O que a minhAi pode fazer?';
const FUNCAO_DESCRICAO =
  'Automatizando atendimentos e processos com mais de 100 funções, que podem ser configuradas de acordo com a sua necessidade e preparada para atuar tanto no atendimento virtual quanto no presencial, ajudando clientes, apoiando funcionários, agilizando processos e evitando que oportunidades de venda fiquem sem resposta.';

const FUNCAO_GRUPOS = [
  {
    id: 'funcao-grupo-1',
    cards: [
      {
        title: 'Clientes chegam até você',
        icon: <QrCode />,
        color: 'blue' as const,
        description:
          'WhatsApp, Instagram, ligação direta — QR Codes que conectam seu cliente ao canal certo na hora. Aumente conversão e engajamento sem effort.',
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
    id: 'funcao-grupo-2',
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
    id: 'funcao-grupo-3',
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
    id: 'funcao-grupo-4',
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

// ============================================================
// IDs — ordem física real do scroll horizontal
// ============================================================
const ALL_SECTION_IDS = [
  'inicio',
  RECURSO_VANTAGENS_SLIDE.id,
  FUNCAO_ID,
  'assistentes',
  INFO_COMPATIBILIDADE_SLIDE.id,
  VANTAGENS_INFO_SLIDE.id,
  'provas-sociais',
  'depoimentos-faq',
  'precos',
  'contato',
];

const NAV_SECTIONS = ['inicio', 'recursos', 'funcoes', 'informacoes', 'precos', 'contato'];

function getSectionNavGroup(sectionId: string): string {
  if (sectionId.startsWith('funcao-')) return 'funcoes';
  if (sectionId.startsWith('recurso-')) return 'recursos';
  if (sectionId === 'assistentes') return 'funcoes';
  if (sectionId === 'info-compatibilidade') return 'informacoes';
  if (sectionId === 'info-vantagens') return 'informacoes';
  if (sectionId === 'provas-sociais') return 'informacoes';
  if (sectionId === 'depoimentos-faq') return 'informacoes';
  return sectionId;
}

// ============================================================
// HOOK — altura real da viewport
// ============================================================
function useRealVh() {
  useEffect(() => {
    function update() {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--real-vh', `${vh}px`);
    }
    update();
    window.addEventListener('resize', update);
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
        ? FUNCAO_ID
        : id === 'recursos'
        ? RECURSO_VANTAGENS_SLIDE.id
        : id === 'informacoes'
        ? INFO_COMPATIBILIDADE_SLIDE.id
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
  const isPrecosActive = activeSectionId === 'precos';

  return (
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
        style={{
          height: 'calc(var(--real-vh, 1svh) * 100)',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
        aria-label="Seções da landing page minhAi"
      >
        <style>{`main::-webkit-scrollbar { display: none; }`}</style>

        {/* PÁGINA 1 — INÍCIO */}
        <section
          id="inicio"
          className="flex-shrink-0 snap-start snap-always"
          style={{ width: '100vw', height: 'calc(var(--real-vh, 1svh) * 100)' }}
          aria-label="Início"
        >
          <InicioSection theme={theme} />
        </section>

        {/* PÁGINA 2 — ESCALE SEM CONTRATAR + DOMAIN PICKER */}
        <section
          id={RECURSO_VANTAGENS_SLIDE.id}
          className="flex-shrink-0 snap-start snap-always"
          style={{ width: '100vw', height: 'calc(var(--real-vh, 1svh) * 100)' }}
          aria-label={RECURSO_VANTAGENS_SLIDE.title}
        >
          <RecursoImageSlide
            theme={theme}
            label={RECURSO_VANTAGENS_SLIDE.label}
            title={RECURSO_VANTAGENS_SLIDE.title}
            description={RECURSO_VANTAGENS_SLIDE.description}
            imageSrc={RECURSO_VANTAGENS_SLIDE.imageSrc}
            imageAlt={RECURSO_VANTAGENS_SLIDE.imageAlt}
            color={RECURSO_VANTAGENS_SLIDE.color}
            currentIndex={0}
            totalCount={1}
            hideDots
            extraContent={<DomainPreviewPicker isDark={isDark} />}
          />
        </section>

        {/* PÁGINA 3 — O QUE O SEU FUNCIONÁRIO IA PODE FAZER */}
        <section
          id={FUNCAO_ID}
          className="flex-shrink-0 snap-start snap-always"
          style={{ width: '100vw', height: 'calc(var(--real-vh, 1svh) * 100)' }}
          aria-label={FUNCAO_TITULO}
        >
          <FuncaoCardsCarousel
            theme={theme}
            title={FUNCAO_TITULO}
            description={FUNCAO_DESCRICAO}
            groups={FUNCAO_GRUPOS}
            rotateMs={5000}
          />
        </section>

        {/* PÁGINA 4 — ASSISTENTES ESPECIALIZADOS */}
        <section
          id="assistentes"
          className="flex-shrink-0 snap-start snap-always"
          style={{ width: '100vw', height: 'calc(var(--real-vh, 1svh) * 100)' }}
          aria-label="Especialistas de IA — Vendas, Orçamentos, Produção e Fiscal"
        >
          <AssistentesSection theme={theme} />
        </section>

        {/* PÁGINA 5 — COMPATIBILIDADE TOTAL */}
        <section
          id={INFO_COMPATIBILIDADE_SLIDE.id}
          className="flex-shrink-0 snap-start snap-always"
          style={{ width: '100vw', height: 'calc(var(--real-vh, 1svh) * 100)' }}
          aria-label={INFO_COMPATIBILIDADE_SLIDE.title}
        >
          <RecursoImageSlide
            theme={theme}
            label={INFO_COMPATIBILIDADE_SLIDE.label}
            title={INFO_COMPATIBILIDADE_SLIDE.title}
            description={INFO_COMPATIBILIDADE_SLIDE.description}
            imageSrc={INFO_COMPATIBILIDADE_SLIDE.images}
            imageAlt={INFO_COMPATIBILIDADE_SLIDE.imageAlt}
            color={INFO_COMPATIBILIDADE_SLIDE.color}
            currentIndex={0}
            totalCount={1}
            hideDots
          />
        </section>

        {/* INFORMAÇÕES — página 2: Vantagens */}
        <section
          id={VANTAGENS_INFO_SLIDE.id}
          className="flex-shrink-0 snap-start snap-always"
          style={{ width: '100vw', height: 'calc(var(--real-vh, 1svh) * 100)' }}
          aria-label={VANTAGENS_INFO_SLIDE.title}
        >
          <VantagensInfoSlide
            theme={theme}
            label={VANTAGENS_INFO_SLIDE.label}
            title={VANTAGENS_INFO_SLIDE.title}
            description={VANTAGENS_INFO_SLIDE.description}
            imageSrc={VANTAGENS_INFO_SLIDE.imageSrc}
            imageAlt={VANTAGENS_INFO_SLIDE.imageAlt}
            cards={VANTAGENS_INFO_CARDS}
            rotateMs={5000}
          />
        </section>

        {/* INFORMAÇÕES — página 3 */}
        <section
          id="provas-sociais"
          className="flex-shrink-0 snap-start snap-always"
          style={{ width: '100vw', height: 'calc(var(--real-vh, 1svh) * 100)' }}
          aria-label="Quem usa a minhAi"
        >
          <ProvasSociaisSection theme={theme} />
        </section>

        {/* INFORMAÇÕES — página 4 */}
        <section
          id="depoimentos-faq"
          className="flex-shrink-0 snap-start snap-always"
          style={{ width: '100vw', height: 'calc(var(--real-vh, 1svh) * 100)' }}
          aria-label="Depoimentos de clientes e perguntas frequentes"
        >
          <DepoimentosFaqSection theme={theme} />
        </section>

        {/* PREÇOS */}
        <section
          id="precos"
          className="flex-shrink-0 snap-start snap-always"
          style={{ width: '100vw', height: 'calc(var(--real-vh, 1svh) * 100)' }}
          aria-label="Planos e preços"
        >
          <PrecosSection theme={theme} isActive={isPrecosActive} />
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
