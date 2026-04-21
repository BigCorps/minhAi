// app/layout.tsx
import type { Metadata } from 'next';
import { Nunito } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { AssistantProvider } from '@/contexts/AssistantContext';
import RegisterSW from '@/components/RegisterSW';
import './globals.css';
import 'react-image-crop/dist/ReactCrop.css';

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
  'Nunca mais perca venda por falta de resposta. Crie seu Funcionário de IA em minutos, sem programar. +100 funções, WhatsApp, PIX, totem e muito mais. Comece grátis.';

const OG_IMAGE = `${APP_URL}/icons/og-image.png`;

// ─── Keywords — cauda longa brasileira + intenção de compra ──────────────────
const KEYWORDS = [
  // Intenção de compra — alta conversão
  'funcionário de ia para empresa',
  'assistente de ia para whatsapp',
  'chatbot para whatsapp sem programar',
  'ia para atendimento automatico',
  'criar assistente de ia gratis',
  // Funcionalidades específicas — cauda longa
  'ia que cobra pix automaticamente',
  'totem de autoatendimento com ia',
  'fila de atendimento digital ia',
  'agendamento automatico com ia',
  'ia para restaurante whatsapp',
  'ia para clinica agendamento',
  // Marca + diferenciais
  'minhAi',
  'minhai app',
  'funcionario ia brasil',
  'assistente virtual brasileiro',
  // Genéricos de alto volume
  'assistente de ia',
  'chatbot brasil',
  'automação de atendimento',
  'ia para empresas',
  'atendente virtual ia',
  'SaaS ia brasil',
];

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
  keywords: KEYWORDS,
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

      // Preço — destaque para gratuidade + pay-per-use
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'BRL',
        lowPrice: '0',
        highPrice: '0.15',
        offerCount: '3',
        offers: [
          {
            '@type': 'Offer',
            name: 'Plano Gratuito',
            price: '0',
            priceCurrency: 'BRL',
            description: '20 créditos gratuitos para começar. Sem cartão de crédito.',
            availability: 'https://schema.org/InStock',
          },
          {
            '@type': 'Offer',
            name: 'Plano Pay-per-use',
            price: '0.09',
            priceCurrency: 'BRL',
            description: 'A partir de R$ 0,09 por interação. Sem mensalidade fixa.',
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
      </body>
    </html>
  );
}
