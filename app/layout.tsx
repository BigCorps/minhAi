// app/layout.tsx
import type { Metadata } from 'next';
import { Nunito } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { AssistantProvider } from '@/contexts/AssistantContext';
import RegisterSW from '@/components/RegisterSW';
import './globals.css';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import 'react-image-crop/dist/ReactCrop.css';
import ClarityInit from '@/components/analytics/ClarityInit';
import CookieConsentBanner from '@/components/CookieConsentBanner';

// ─── Fonte Nunito ─────────────────────────────────────────────────────────────
const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-nunito',
  display: 'swap',
});

// ─── Constantes de marca ─────────────────────────────────────────────────────
const APP_URL   = 'https://www.minhai.app';
const APP_NAME  = 'minhAi';

// Title com keyword principal front-loaded — padrão SEO 2026
const TITLE = 'minhAi — Seu Funcionário de IA que vende, atende e cobra 24h por dia';

// Description com dor → solução → CTA — 155 caracteres (ideal para snippet)
const DESCRIPTION =
  'Nunca mais perca venda por falta de resposta. Escolha entre o minhAi Smart (créditos por uso) ou minhAi Vendas (gratuito + 10% por venda). +100 funções, WhatsApp, PIX, totem e mais. Comece grátis.';

const OG_IMAGE = `${APP_URL}/icons/og-image.png`;



// ─── Metadata Next.js ────────────────────────────────────────────────────────
export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: TITLE,
    template: `%s | ${APP_NAME}`,
  },
  description: DESCRIPTION,
  manifest: '/manifest.json',
  applicationName: APP_NAME,
  authors: [{ name: 'BigCorps', url: 'https://bigcorps.com.br' }],
  creator: 'BigCorps',
  publisher: 'BigCorps',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  alternates: {
    canonical: APP_URL,
    languages: {
      'pt-BR': APP_URL,
    },
  },

  // ── Open Graph ──────────────────────────────────────────────────────────────
  openGraph: {
    type: 'website',
    url: APP_URL,
    siteName: APP_NAME,
    title: TITLE,
    description: DESCRIPTION,
    locale: 'pt_BR',
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'minhAi — Funcionário de IA que vende, atende e cobra 24h por dia para empresas brasileiras',
        type: 'image/png',
      },
    ],
  },

  // ── Twitter / X Card ────────────────────────────────────────────────────────
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
    creator: '@bigcorpsbr',
    site: '@bigcorpsbr',
  },

  // ── Verificação Google Search Console ───────────────────────────────────────
  // Já verificado via google90ae1b639a70083d.html — linha abaixo é opcional
  // verification: { google: 'SEU_CODIGO_AQUI' },

  // ── Ícones ──────────────────────────────────────────────────────────────────
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
    shortcut: '/icons/icon-192x192.png',
  },
};

// ─── Schema.org JSON-LD global ───────────────────────────────────────────────
// FAQPage NÃO está aqui — fica apenas no FAQSection.tsx (evita duplicação)
// e nas páginas /para/[slug] individuais.
// Aqui ficam apenas os 3 schemas globais: SoftwareApplication, Organization, WebSite
const jsonLd = {
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
          telephone: '+55-11-98731-1425',
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

// ─── Layout ──────────────────────────────────────────────────────────────────
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${nunito.variable} font-nunito antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <AssistantProvider>
            {children}
          </AssistantProvider>
        </ThemeProvider>
        <RegisterSW />
        <Analytics />
        <SpeedInsights />
        <ClarityInit />
        <CookieConsentBanner />
      </body>
    </html>
  );
}
