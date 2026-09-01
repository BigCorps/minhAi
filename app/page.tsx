'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Clarity from '@microsoft/clarity';
import Header from '@/components/landing/Header';
import InicioSection from '@/components/landing/InicioSection';
import EcossistemaSection from '@/components/landing/EcossistemaSection';
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
import JsonLd from '@/components/JsonLd';
import { SEO } from '@/lib/seo';

// ============================================================
// PÁGINA 2 — "Escale sem contratar" + DomainPicker
// ============================================================
export const RECURSO_VANTAGENS_SLIDE = {
  id: 'recurso-vantagens',
  label: 'Escale sem contratar',
  title: 'Atenda 10x sem aumentar sua equipe',
  description:
    'Sua empresa ganha um funcionário digital completo, trabalhando 24 horas por dia, com o nome, a palavra de ativação, a marca, as funções e o jeito que a sua empresa precisa. Semelhante a uma Alexa personalizada, mas com recursos voltados para cuidar dos trabalhos repetitivos.',
  imageSrc: '/vantagens.png',
  imageAlt: 'Eficiência operacional com minhAi — automatize atendimento e escale seu negócio',
  color: 'blue' as const,
};

// ============================================================
// PÁGINA 5 — primeira de "Informações": fusão de
// Compatibilidade total + Integrações nativas
// ============================================================
export const INFO_COMPATIBILIDADE_SLIDE = {
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
// ============================================================
export const VANTAGENS_INFO_SLIDE = {
  id: 'info-vantagens',
  label: 'Vantagens',
  title: 'Mais vantagens que fazem diferença',
  description:
    'Você ainda pode configurar para seu gerente ou sua equipe sejam chamados a qualquer momento, sempre que o cliente precisar de atendimento humano ou quando surgir algum problema que exija atenção imediata. Tudo isso sem saber programar. Em poucos minutos, você configura e já pode divulgar o link e QR code do seu assistente. Além de mais vantagens:',
  imageSrc: '/webapp.png',
  imageAlt: 'WebApp personalizado, programa de indicação e Link PIX do minhAi',
};

export const VANTAGENS_INFO_CARDS = [
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
// FUNÇÕES — 14 cards em 4 grupos (3, 4, 3, 4)
// ============================================================
export const FUNCAO_ID = 'funcao-cards';

export const FUNCAO_TITULO = 'O que a minhAi pode fazer?';
export const FUNCAO_DESCRICAO =
  'Automatizando atendimentos e processos com mais de 100 funções, que podem ser configuradas de acordo com a sua necessidade e preparada para atuar tanto no atendimento virtual quanto no presencial, ajudando clientes, apoiando funcionários, agilizando processos e evitando que oportunidades de venda fiquem sem resposta.';

export const FUNCAO_GRUPOS = [
  {
    id: 'funcao-grupo-1',
    cards: [
      {
        title: 'Clientes chegam até você',
        icon: <QrCode />,
        color: 'blue' as const,
        description:
          'WhatsApp, Instagram, ligação direta — QR Codes que conectam seu cliente ao canal certo na hora. Aumente conversão e engajamento sem esforço.',
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
// IDs — ordem física real das seções na página (de cima pra baixo)
// ============================================================
const ALL_SECTION_IDS = [
  'inicio',
  'ecossistema',
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

function getSectionNavGroup(sectionId: string): string {
  // A seção do ecossistema não tem item próprio no menu: ela é a continuação
  // do argumento do herói, então mantém "Início" destacado enquanto rola.
  if (sectionId === 'ecossistema') return 'inicio';
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
// COMPONENTE PRINCIPAL
// ============================================================
// Mesmas constantes de app/layout.tsx, lidas da mesma fonte (lib/seo.ts).
const APP_URL     = SEO.minhai.baseUrl;
const APP_NAME    = SEO.minhai.siteName;
const DESCRIPTION = SEO.minhai.description;

// ─── Schema.org JSON-LD da minhAi ────────────────────────────────────────────
// Este grafo estava em app/layout.tsx — que é o layout raiz do build INTEIRO.
// Como o mesmo build serve conviteia.com e app.min.ia.br, aquelas páginas
// declaravam para o Google e para os LLMs que eram o software minhAi.
// Aqui ele fica onde deve: na landing da minhAi, e só nela.
// FAQPage não é duplicado: existe também no FAQSection.tsx e nas /para/[slug].
const MINHAI_JSONLD = {
  '@context': 'https://schema.org',
  '@graph': [

    // ── Produto principal — atualizado com posicionamento "Funcionário de IA" ──
    {
      '@type': 'SoftwareApplication',
      '@id': `${APP_URL}/#software`,
      name: APP_NAME,
      alternateName: 'minhAi — Funcionário de IA',
      url: APP_URL,
      description: DESCRIPTION,
      applicationCategory: 'BusinessApplication',
      applicationSubCategory: 'Artificial Intelligence',
      operatingSystem: 'Web, Android, iOS, Windows, macOS',
      inLanguage: 'pt-BR',
      availableOnDevice: ['Desktop', 'Mobile', 'Tablet', 'Smart TV', 'Kiosk'],

      // Preço — duas versões: Smart (créditos) e Vendas (comissão)
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'BRL',
        lowPrice: '0',
        highPrice: '0.15',
        offerCount: '4',
        offers: [
          {
            '@type': 'Offer',
            name: 'minhAi Smart — Gratuito para testar',
            price: '0',
            priceCurrency: 'BRL',
            description: '20 créditos gratuitos para começar. Sem cartão de crédito. Ideal para atendimento geral por voz com IA.',
            availability: 'https://schema.org/InStock',
          },
          {
            '@type': 'Offer',
            name: 'minhAi Smart — Pay-per-use',
            price: '0.09',
            priceCurrency: 'BRL',
            description: 'A partir de R$ 0,09 por interação. Sem mensalidade fixa. Pague só pelo que usar.',
            availability: 'https://schema.org/InStock',
          },
          {
            '@type': 'Offer',
            name: 'minhAi Vendas — Gratuito para o lojista',
            price: '0',
            priceCurrency: 'BRL',
            description: 'Gratuito para o lojista. Sem créditos, sem mensalidade. A minhAi retém 10% de comissão sobre cada venda confirmada (PIX, NFC, TEF ou Link de Pagamento). Ideal para lojas, restaurantes e food trucks.',
            availability: 'https://schema.org/InStock',
          },
        ],
      },

      // Lista completa de funcionalidades — para GEO (citação por IAs)
      featureList: [
        'Atendimento automático 24/7 por voz e texto',
        'Mais de 100 funções configuráveis sem código',
        'Integração com WhatsApp Business API oficial',
        'Integração com Instagram e Facebook Messenger',
        'WebApp personalizado com domínio próprio (PWA)',
        'Geração de PIX e confirmação automática de pagamento',
        'NFC Tap to Pay via InfinitePay (crédito e débito)',
        'TEF Mercado Pago Point Smart (crédito, débito, parcelamento)',
        'Fila de atendimento digital com senhas e painel em tempo real',
        'Agendamento automático integrado ao Google Calendar',
        'Envio de email automático via Gmail API',
        'Envio de SMS automático',
        'Videochamada entre colaboradores',
        'Totem de autoatendimento para estabelecimentos',
        'Painel de ofertas digital com slideshow',
        'Cardápio digital interativo',
        'Catálogo de produtos com carrinho de compras',
        'Cadastro de clientes por voz com biometria facial',
        'Consulta de CPF, CNPJ e placa de veículo',
        'OCR: digitalização de documentos e contratos por foto',
        'Geração e leitura de QR Code e código de barras',
        'Impressão via impressoras térmicas e PrintNode',
        'Controle de dispositivos Google Smart Home',
        'Transcrição de áudio para texto',
        'Tradução automática entre idiomas',
        'Programa de indicação com 50% de comissão',
        'Versão minhAi Smart: assistente de IA por créditos de uso, sem mensalidade fixa',
        'Versão minhAi Vendas: gratuito para o lojista, 10% de comissão por venda confirmada',
        'PIX integrado via Banco Inter com confirmação automática',
        'NFC Tap to Pay via InfinitePay (débito e crédito)',
        'TEF Mercado Pago Point Smart (débito e crédito)',
        'Link de pagamento via InfinitePay',
        'Dashboard de gestão completo',
        'Conformidade com LGPD',
      ],

      // Segmentos — ajuda IAs a associar o produto ao contexto certo
      audience: {
        '@type': 'BusinessAudience',
        audienceType: [
          'MEI', 'Micro empresa', 'Pequena empresa', 'Média empresa',
          'Grande empresa', 'Franquia', 'Clínica', 'Restaurante',
          'Academia', 'Imobiliária', 'Advocacia', 'E-commerce',
        ],
      },

      // Criador
      creator: {
        '@type': 'Organization',
        '@id': `${APP_URL}/#organization`,
      },
      // aggregateRating removido — Google exige avaliações visíveis no HTML.
      // Adicionar quando tiver reviews reais em página estática.
    },

    {
      '@type': 'FAQPage',
      '@id': `${APP_URL}/#faq`,
      mainEntity: [
        {
          '@type': 'Question',
          name: 'O que é o minhAi?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'O minhAi é uma plataforma SaaS brasileira que permite criar assistentes de IA personalizados para empresas de qualquer tamanho. O assistente atende clientes, vende produtos, cobra via PIX, agenda serviços e executa mais de 100 funções — por voz ou chat, 24 horas por dia, sem programar. Desenvolvido pela BigCorps Tecnologia Ltda, com sede em São Paulo.',
          },
        },
        {
          '@type': 'Question',
          name: 'Qual a diferença entre minhAi Smart e minhAi Vendas?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'O minhAi Smart é cobrado por créditos de uso — a partir de R$ 0,09 por interação, sem mensalidade fixa, ideal para atendimento geral por voz com IA. O minhAi Vendas é gratuito para o lojista: sem créditos, sem mensalidade. A minhAi retém 10% de comissão sobre cada venda confirmada (PIX, NFC, TEF ou Link de Pagamento), ideal para lojas, restaurantes e food trucks que recebem pagamentos no balcão.',
          },
        },
        {
          '@type': 'Question',
          name: 'O minhAi Vendas é realmente gratuito?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Sim. O minhAi Vendas é gratuito para o lojista — sem mensalidade e sem cobrança de créditos. A minhAi retém 10% de comissão sobre cada venda confirmada e 1% adicional no saque PIX. As taxas das maquininhas (InfinitePay e Mercado Pago) são cobradas diretamente por cada operadora, separadas da comissão da minhAi.',
          },
        },
        {
          '@type': 'Question',
          name: 'O minhAi funciona com WhatsApp?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Sim. O minhAi integra com a API oficial do WhatsApp Business (Meta). O número da empresa permanece o mesmo e o assistente passa a responder automaticamente às mensagens — com a personalidade e o conhecimento configurados pelo proprietário do negócio.',
          },
        },
        {
          '@type': 'Question',
          name: 'Quanto custa o minhAi Smart por interação?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'O minhAi Smart custa a partir de R$ 0,09 por interação no pacote Professional (1.000 interações por R$ 99,90). Existem pacotes maiores como Business (3.600 interações por R$ 249,90, R$ 0,07 cada) e Enterprise (10.000 interações por R$ 499,90, R$ 0,05 cada). Novos usuários recebem 20 créditos gratuitos para testar, sem cartão de crédito.',
          },
        },
        {
          '@type': 'Question',
          name: 'Preciso saber programar para usar o minhAi?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Não. O minhAi foi feito para ser configurado por qualquer pessoa, sem nenhum código. Você acessa o dashboard, escolhe as funções que quer ativar, escreve a personalidade do assistente e publica. Todo o processo leva menos de 5 minutos.',
          },
        },
        {
          '@type': 'Question',
          name: 'O minhAi é compatível com a LGPD?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Sim. O minhAi é 100% compatível com a Lei Geral de Proteção de Dados (LGPD). Os dados ficam armazenados em servidores no Brasil com criptografia de ponta a ponta, isolados por empresa. Nenhum dado do negócio de um cliente é compartilhado com outros clientes.',
          },
        },
        {
          '@type': 'Question',
          name: 'Quais formas de pagamento o minhAi Vendas aceita?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'O minhAi Vendas aceita: PIX via Banco Inter (10% de comissão descontada no saque), NFC Tap to Pay no débito e crédito via InfinitePay, Link de Pagamento via InfinitePay, e TEF Mercado Pago Point Smart no débito e crédito. As taxas de InfinitePay e Mercado Pago são cobradas diretamente por cada operadora.',
          },
        },
        {
          '@type': 'Question',
          name: 'Para quais segmentos o minhAi é indicado?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'O minhAi atende clínicas médicas, consultórios odontológicos, restaurantes, hamburguerias, academias de ginástica, salões de beleza, pet shops, escritórios de advocacia, imobiliárias, e-commerce, lojas físicas, farmácias, escolas, supermercados, franquias, órgãos públicos e qualquer negócio que atenda clientes. Tem mais de 30 empresas ativas e mais de 100 funções nativas.',
          },
        },
      ],
    },

// ── HowTo — GEO: IAs citam processos numerados em respostas sobre "como funciona" ──
    {
      '@type': 'HowTo',
      '@id': `${APP_URL}/#howto`,
      name: 'Como criar um assistente de IA com o minhAi',
      description: 'Configure um assistente de IA para sua empresa em menos de 10 minutos, sem código, e comece a atender, vender e cobrar automaticamente.',
      totalTime: 'PT10M',
      estimatedCost: {
        '@type': 'MonetaryAmount',
        currency: 'BRL',
        value: '0',
      },
      tool: [
        { '@type': 'HowToTool', name: 'Conta no minhAi (gratuita)' },
        { '@type': 'HowToTool', name: 'Smartphone, tablet ou computador com navegador' },
      ],
      step: [
        {
          '@type': 'HowToStep',
          position: 1,
          name: 'Configure em minutos',
          text: 'Crie sua conta gratuita em minhai.app, acesse o dashboard, escolha as funções que quer ativar e escreva a personalidade do assistente. Sem código, sem técnico. Em menos de 5 minutos o assistente já está pronto.',
          url: `${APP_URL}/login`,
        },
        {
          '@type': 'HowToStep',
          position: 2,
          name: 'Conecte seus canais',
          text: 'Conecte o assistente ao WhatsApp Business, Instagram, Facebook, totem físico ou WebApp com sua marca — um único assistente responde em todos os canais ao mesmo tempo, com a mesma qualidade.',
          url: `${APP_URL}/login`,
        },
        {
          '@type': 'HowToStep',
          position: 3,
          name: 'Venda e atenda 24/7',
          text: 'Seu assistente começa a responder clientes, qualificar leads, gerar cobranças PIX, agendar serviços e consultar o estoque — automaticamente, 24 horas por dia, sem precisar de intervenção manual.',
          url: `${APP_URL}/ia/suporte`,
        },
      ],
    },


    // ── Organização ────────────────────────────────────────────────────────────
    {
      '@type': 'Organization',
      '@id': `${APP_URL}/#organization`,
      name: 'BigCorps',
      legalName: 'BigCorps Tecnologia Ltda',
      url: 'https://bigcorps.com.br',
      logo: {
        '@type': 'ImageObject',
        url: `${APP_URL}/icons/icon-192x192.png`,
        width: 192,
        height: 192,
      },
      foundingDate: '2023',
      foundingLocation: {
        '@type': 'Place',
        addressCountry: 'BR',
        addressLocality: 'São Paulo',
      },
      taxID: '14.282.244/0001-19',
      contactPoint: [
        {
          '@type': 'ContactPoint',
          telephone: '+55-11-92682-8418',
          contactType: 'customer service',
          availableLanguage: 'Portuguese',
          contactOption: 'TollFree',
          areaServed: 'BR',
        },
        {
          '@type': 'ContactPoint',
          email: 'contato@bigcorps.com.br',
          contactType: 'customer support',
        },
      ],
      sameAs: [
        'https://www.instagram.com/bigcorps',
        'https://bigcorps.com.br',
        'https://minhai.app',
        'https://minhai.com.br',
      ],
    },

    // ── WebSite ────────────────────────────────────────────────────────────────
    {
      '@type': 'WebSite',
      '@id': `${APP_URL}/#website`,
      url: APP_URL,
      name: APP_NAME,
      description: DESCRIPTION,
      inLanguage: 'pt-BR',
      publisher: { '@id': `${APP_URL}/#organization` },
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${APP_URL}/para/{search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },

  ],
};

export default function LandingPage() {
  const mainRef = useRef<HTMLElement>(null);
  const [activeSectionId, setActiveSectionId] = useState('inicio');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const activeNavItem = getSectionNavGroup(activeSectionId);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    if (mq.matches) setTheme('light');
  }, []);

  // Scrollspy — marca como "ativa" a seção que está cruzando uma faixa
  // fina no centro vertical da tela. Funciona bem independente da altura
  // de cada seção (diferente de um threshold fixo de "50% visível", que
  // não dispararia direito em seções mais altas que a tela).
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSectionId(entry.target.id);
            try {
              Clarity.setTag('secao_ativa', entry.target.id);
            } catch {
              // Clarity pode não estar inicializado ainda — falha silenciosa
            }
          }
        });
      },
      { root: null, rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    );
    const sections = main.querySelectorAll('section[id]');
    sections.forEach((s) => observer.observe(s));
    return () => sections.forEach((s) => observer.unobserve(s));
  }, []);

  // Navegação por clique (menu do Header e dots de progresso) — rolagem
  // vertical nativa, respeitando o scroll-margin-top de cada seção
  // (definido no elemento) para não ficar escondida atrás do Header fixo.
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
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const toggleTheme = () => setTheme((p) => (p === 'dark' ? 'light' : 'dark'));
  const isDark = theme === 'dark';
  // Passado para PrecosSection: quando deixa de ser true (usuário navega pra
  // outra seção), a seção reseta seu estado interno (seletor Smart/Vendas/Full).
  const isPrecosActive = activeSectionId === 'precos';

  return (
    <div
      className={`relative w-full min-h-screen transition-colors duration-500 ${
        isDark ? 'bg-slate-950 text-white' : 'bg-white text-gray-900'
      }`}
    >
      <JsonLd data={MINHAI_JSONLD} />

      <Header
        activeSection={activeNavItem}
        onNavigate={scrollToSection}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/*
        Rolamento vertical padrão — a página inteira rola nativamente pelo
        navegador. Cada seção tem min-height: 100dvh (altura real da tela,
        já descontando a UI do navegador no mobile — resolve nativamente o
        que antes precisava do hook --real-vh) e cresce além disso se o
        conteúdo precisar. scroll-margin-top evita que a seção fique
        escondida atrás do Header fixo ao navegar por clique.
      */}
      <main ref={mainRef} className="w-full" aria-label="Seções da landing page minhAi">

        {/* PÁGINA 1 — INÍCIO */}
        <section id="inicio" className="w-full" style={{ scrollMarginTop: '80px' }} aria-label="Início">
          <InicioSection theme={theme} />
        </section>

        {/* PÁGINA 1.5 — APLICATIVOS FEITOS COM MINHAI */}
        <section id="ecossistema" className="w-full" style={{ scrollMarginTop: '80px' }} aria-label="Aplicativos feitos com a tecnologia minhAi">
          <EcossistemaSection theme={theme} />
        </section>

        {/* PÁGINA 2 — ESCALE SEM CONTRATAR + DOMAIN PICKER */}
        <section id={RECURSO_VANTAGENS_SLIDE.id} className="w-full" style={{ scrollMarginTop: '80px' }} aria-label={RECURSO_VANTAGENS_SLIDE.title}>
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

        {/* PÁGINA 3 — O QUE A MINHAI PODE FAZER */}
        <section id={FUNCAO_ID} className="w-full" style={{ scrollMarginTop: '80px' }} aria-label={FUNCAO_TITULO}>
          <FuncaoCardsCarousel
            theme={theme}
            title={FUNCAO_TITULO}
            description={FUNCAO_DESCRICAO}
            groups={FUNCAO_GRUPOS}
            rotateMs={5000}
          />
        </section>

        {/* PÁGINA 4 — ASSISTENTES ESPECIALIZADOS (Auxiliares) */}
        <section id="assistentes" className="w-full" style={{ scrollMarginTop: '80px' }} aria-label="Especialistas de IA — Vendas, Orçamentos, Produção e Fiscal">
          <AssistentesSection theme={theme} />
        </section>

        {/* PÁGINA 5 — primeira de "Informações": Compatibilidade total */}
        <section id={INFO_COMPATIBILIDADE_SLIDE.id} className="w-full" style={{ scrollMarginTop: '80px' }} aria-label={INFO_COMPATIBILIDADE_SLIDE.title}>
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
        <section id={VANTAGENS_INFO_SLIDE.id} className="w-full" style={{ scrollMarginTop: '80px' }} aria-label={VANTAGENS_INFO_SLIDE.title}>
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

        {/* INFORMAÇÕES — página 3 (Quem usa a minhAi) */}
        <section id="provas-sociais" className="w-full" style={{ scrollMarginTop: '80px' }} aria-label="Quem usa a minhAi">
          <ProvasSociaisSection theme={theme} />
        </section>

        {/* INFORMAÇÕES — página 4: Depoimentos + FAQ lado a lado */}
        <section id="depoimentos-faq" className="w-full" style={{ scrollMarginTop: '80px' }} aria-label="Depoimentos de clientes e perguntas frequentes">
          <DepoimentosFaqSection theme={theme} />
        </section>

        {/* PREÇOS */}
        <section id="precos" className="w-full" style={{ scrollMarginTop: '80px' }} aria-label="Planos e preços">
          <PrecosSection theme={theme} isActive={isPrecosActive} />
        </section>

        {/* CONTATO */}
        <section id="contato" className="w-full" style={{ scrollMarginTop: '80px' }} aria-label="Contato e CTA final">
          <ContatoSection theme={theme} />
        </section>
      </main>

      <LandingDemoFooter theme={theme} />

    </div>
  );
}