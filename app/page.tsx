'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Header from '@/components/landing/Header';
import InicioSection from '@/components/landing/InicioSection';
import RecursoImageSlide from '@/components/landing/RecursoImageSlide';
import RecursoCardsSlide from '@/components/landing/RecursoCardsSlide';
import FuncaoCardsSlide from '@/components/landing/FuncaoCardsSlide';
import PrecosSection from '@/components/landing/PrecosSection';
import ContatoSection from '@/components/landing/ContatoSection';

// ============================================================
// RECURSOS - 4 páginas:
// 1) Dispositivos (imagem + texto)
// 2) API/Conexões (imagem + texto)
// 3) Vantagens (imagem + texto)
// 4) Cards de recursos (4 cards)
// ============================================================
const RECURSO_CARDS = [
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Custo Baixo',
    highlight: 'R$ 0,09',
    highlightLabel: 'por interação (a partir)',
    description: 'Planos com custo baixo por interação. Uma economia de até 90% comparado a atendimento humano tradicional.',
    color: 'green' as const,
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    ),
    title: 'Totalmente Customizável',
    highlight: '100%',
    highlightLabel: 'personalizado',
    description: 'Configure palavras de ativação, saudações, prompts e funções personalizadas para cada assistente.',
    color: 'blue' as const,
  },
  {
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
];

// Slides de recursos com imagem (páginas 1, 2, 3)
const RECURSO_IMAGE_SLIDES = [
  {
    id: 'recurso-dispositivos',
    label: 'Compatibilidade',
    title: 'Roda em Qualquer Dispositivo',
    description:
      'Celulares, computadores, notebooks, TVs, totens, PDVs — qualquer aparelho com um navegador web e uma tela já é suficiente para rodar o seu funcionário IA. Sem instalações, sem hardware especial, sem limites de plataforma.',
    imageSrc: '/dispositivos.png',
    imageAlt: 'Dispositivos compatíveis com o eAi',
    color: 'blue' as const,
  },
  {
    id: 'recurso-api',
    label: 'Integrações',
    title: 'Conexões e Serviços Profissionais',
    description:
      'Utilizamos as melhores plataformas do mercado — Google, Meta, AWS, OpenAI, Pix, InfinitePay e muito mais — além de uma vasta rede de APIs para garantir que o seu funcionário IA entregue as funções mais completas e confiáveis do segmento.',
    imageSrc: '/api.png',
    imageAlt: 'Integrações e APIs do eAi',
    color: 'green' as const,
  },
  {
    id: 'recurso-vantagens',
    label: 'Vantagens',
    title: 'Maior Eficiência Operacional',
    description:
      'O assistente automatiza tarefas repetitivas e responde imediatamente às solicitações, liberando a equipe para atividades estratégicas. Com tecnologia de ponta em constante evolução, não há interrupções nem gargalos no atendimento — acelerando processos internos, aumentando a produtividade e auxiliando funcionários ou clientes com a maior efetividade.',
    imageSrc: '/vantagens.png',
    imageAlt: 'Vantagens do eAi',
    color: 'blue' as const,
  },
  {
    id: 'recurso-cards',
    label: null, // cards slide, no label needed here
    title: null,
    description: null,
    imageSrc: null,
    imageAlt: null,
    color: 'blue' as const,
  },
];

const TOTAL_RECURSO_SLIDES = RECURSO_IMAGE_SLIDES.length; // 4

// ============================================================
// FUNÇÕES - 4 páginas de cards (4 + 3 + 4 + 3 = 14 categorias)
// ============================================================
const FUNCAO_PAGES = [
  // Página 1 — 4 cards
  {
    id: 'funcao-page-1',
    cards: [
      {
        title: 'Contatos',
        icon: '📲',
        color: 'blue' as const,
        description:
          'Conecte seus clientes aos seus canais em segundos. Gere QR Codes personalizados para Redes Sociais, Telefones e Site. Facilite o acesso ao WhatsApp, Instagram, ligações diretas e páginas institucionais, aumentando conversão e engajamento.',
      },
      {
        title: 'Financeiro',
        icon: '💳',
        color: 'green' as const,
        description:
          'Cobranças rápidas, seguras e automatizadas. Gere Pix dinâmico, Link de Pagamento e aceite Débito NFC e Crédito NFC diretamente pelo assistente. Simplifique o processo de cobrança e aumente a taxa de pagamento imediato.',
      },
      {
        title: 'Multimídia',
        icon: '🎬',
        color: 'blue' as const,
        description:
          'Experiência interativa e envolvente. Toque Vídeos, Tutoriais, Publicidades, Playlists, Modo Sequência e Música sob comando. Ideal para totens, recepções, lojas, academias e ambientes corporativos.',
      },
      {
        title: 'Informação',
        icon: '📡',
        color: 'green' as const,
        description:
          'Informações atualizadas em tempo real. Apresente dados sobre seu Sistema, sua Marca, Notícias, Feriados Nacionais e Câmbio. Mantenha clientes e colaboradores sempre informados com respostas instantâneas.',
      },
    ],
  },
  // Página 2 — 3 cards
  {
    id: 'funcao-page-2',
    cards: [
      {
        title: 'Consultas',
        icon: '🔍',
        color: 'blue' as const,
        description:
          'Verificações rápidas e confiáveis. Consulte Dados de CNPJ, CPF, Placa de Veículo, Leilões, Restrições de CPF e CNPJ. Ferramenta ideal para empresas que precisam validar informações antes de fechar negócios.',
      },
      {
        title: 'Localização',
        icon: '🗺️',
        color: 'green' as const,
        description:
          'Geolocalização inteligente e precisa. Ver Endereço, Buscar CEP, Traçar Rota, verificar Trânsito em tempo real e Consultar DDD. Facilite deslocamentos e atendimento logístico.',
      },
      {
        title: 'Agendamento',
        icon: '📅',
        color: 'blue' as const,
        description:
          'Organização automatizada e eficiente. Marcar Evento, Ver Agenda, Confirmar Presença, Reagendar compromissos e até Enviar ou Ler E-mails. Reduza faltas e melhore a gestão do tempo.',
      },
    ],
  },
  // Página 3 — 4 cards
  {
    id: 'funcao-page-3',
    cards: [
      {
        title: 'Conhecimento',
        icon: '🧠',
        color: 'green' as const,
        description:
          'Inteligência avançada ao seu alcance. Utilize ChatGPT, gere Orçamentos, Perguntas e Respostas inteligentes, Traduza Texto, Transcreva Áudio e consulte a Previsão do Tempo. Um verdadeiro centro de inteligência operacional.',
      },
      {
        title: 'Utilitários',
        icon: '⚙️',
        color: 'blue' as const,
        description:
          'Ferramentas práticas para o dia a dia. Controle Aparelhos Smart, Crie Lembretes, use Cronômetro, Temporizador e Relógio Mundial. Recursos simples que aumentam produtividade e organização.',
      },
      {
        title: 'Identificação',
        icon: '🪪',
        color: 'green' as const,
        description:
          'Controle e segurança automatizados. Reconhecimento Facial, Registro de Ponto, Fila de Atendimento, Geração de Senha e Cadastro de Cliente. Ideal para empresas que precisam organizar fluxo e validar acessos.',
      },
      {
        title: 'Arquivos',
        icon: '🗂️',
        color: 'blue' as const,
        description:
          'Edição e conversão de documentos com IA. Remover Fundo, Duplicar Imagem, Editar Imagem e Converter Arquivos automaticamente. Agilidade para marketing, administrativo e operacional.',
      },
    ],
  },
  // Página 4 — 3 cards
  {
    id: 'funcao-page-4',
    cards: [
      {
        title: 'Serviços',
        icon: '🛎️',
        color: 'green' as const,
        description:
          'Soluções operacionais completas. Imprimir documentos, exibir Tabela de Preços, Cardápio (Menu), Emitir Recibo e Chamar Suporte via WhatsApp. Facilite o atendimento presencial e digital.',
      },
      {
        title: 'Comercial',
        icon: '🛒',
        color: 'blue' as const,
        description:
          'Aumente suas vendas com inteligência. Recomendar Produto, Cadastrar Produto, exibir Avaliações, operar Totem de Vendas, Responder Pesquisa e Consultar Estoque. Transforme o assistente em um vendedor digital ativo 24h.',
      },
      {
        title: 'Câmera',
        icon: '📷',
        color: 'green' as const,
        description:
          'Leitura e validação instantânea. Ler QR Code, Ler Código de Barras, Enviar Arquivo, Gerar QR Code, Validar Cupom e Verificar Acesso. Ideal para controle de entradas, promoções e operações rápidas.',
      },
    ],
  },
];

const TOTAL_FUNCAO_PAGES = FUNCAO_PAGES.length;

// ============================================================
// IDs DE TODAS AS SEÇÕES
// ============================================================
const ALL_SECTION_IDS = [
  'inicio',
  ...RECURSO_IMAGE_SLIDES.map((r) => r.id),
  ...FUNCAO_PAGES.map((f) => f.id),
  'precos',
  'contato',
];

const NAV_SECTIONS = ['inicio', 'recursos', 'funcoes', 'precos', 'contato'];

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

  // Compute which recurso slide index we're on
  const activeRecursoIndex = RECURSO_IMAGE_SLIDES.findIndex((r) => r.id === activeSectionId);

  return (
    <div className={`relative h-screen w-screen overflow-hidden transition-colors duration-500 ${
      isDark ? 'bg-slate-950 text-white' : 'bg-white text-gray-900'
    }`}>

      <Header
        activeSection={activeNavItem}
        onNavigate={scrollToSection}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

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

        {/* RECURSOS - Páginas 1, 2, 3: imagem + texto */}
        {RECURSO_IMAGE_SLIDES.slice(0, 3).map((slide, index) => (
          <section
            key={slide.id}
            id={slide.id}
            className="w-screen h-screen flex-shrink-0 snap-start snap-always"
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
              nextHint={index < TOTAL_RECURSO_SLIDES - 2 ? 'Role para ver mais →' : 'Role para ver nossos recursos →'}
            />
          </section>
        ))}

        {/* RECURSOS - Página 4: 4 cards */}
        <section
          id="recurso-cards"
          className="w-screen h-screen flex-shrink-0 snap-start snap-always"
        >
          <RecursoCardsSlide
            theme={theme}
            recursos={RECURSO_CARDS}
            currentIndex={3}
            totalCount={TOTAL_RECURSO_SLIDES}
          />
        </section>

        {/* FUNÇÕES — 4 páginas de cards */}
        {FUNCAO_PAGES.map((page, index) => (
          <section
            key={page.id}
            id={page.id}
            className="w-screen h-screen flex-shrink-0 snap-start snap-always"
          >
            <FuncaoCardsSlide
              theme={theme}
              cards={page.cards}
              currentIndex={index}
              totalCount={TOTAL_FUNCAO_PAGES}
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

      {/* INDICADOR DE PROGRESSO */}
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
