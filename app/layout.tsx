// app/layout.tsx
import type { Metadata } from 'next';
import { Nunito } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { AssistantProvider } from '@/contexts/AssistantContext';
import RegisterSW from '@/components/RegisterSW';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';
import 'react-image-crop/dist/ReactCrop.css';

// ─── Fonte Nunito via next/font (auto-hospedada, zero layout shift) ──────────
const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-nunito',
  display: 'swap',
});

// ─── Constantes de marca ─────────────────────────────────────────────────────
const APP_URL  = 'https://www.minhai.app';
const APP_NAME = 'minhAi';
const TITLE    = 'minhAi — Uma IA pra chamar de sua!';
const DESCRIPTION =
  'Crie seu assistente de IA personalizado em minutos. Voz e texto 24/7, mais de 100 funções, WebApp próprio, cobranças automáticas, fila de atendimento e muito mais. Pague só por interação.';
const OG_IMAGE = `${APP_URL}/icons/og-image.png`;

// ─── Metadata ────────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: TITLE,
    template: `%s | ${APP_NAME}`,
  },
  description: DESCRIPTION,
  manifest: '/manifest.json',
  applicationName: APP_NAME,
  keywords: [
    'assistente de IA', 'inteligência artificial', 'chatbot', 'atendente virtual',
    'assistente virtual', 'automação de atendimento', 'WhatsApp bot',
    'IA para empresas', 'assistente de voz', 'totem interativo',
    'SaaS Brasil', 'funcionário de IA', 'minhAi',
  ],
  authors: [{ name: 'BigCorps', url: 'https://bigcorps.com.br' }],
  creator: 'BigCorps',
  publisher: 'BigCorps',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: APP_URL,
  },
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
        alt: 'minhAi — Assistente de IA para empresas brasileiras',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
    creator: '@bigcorpsbr',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
};

// ─── Schema.org JSON-LD ──────────────────────────────────────────────────────
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      '@id': `${APP_URL}/#software`,
      name: APP_NAME,
      url: APP_URL,
      description: DESCRIPTION,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web, Android, iOS',
      inLanguage: 'pt-BR',
      offers: {
        '@type': 'Offer',
        priceCurrency: 'BRL',
        price: '0',
        description: 'Comece gratuitamente. Pague por interação conforme o uso.',
        availability: 'https://schema.org/InStock',
      },
      featureList: [
        'Assistente de voz e texto 24/7',
        'Mais de 100 funções configuráveis',
        'WebApp personalizado com domínio próprio',
        'Integração com WhatsApp e Instagram',
        'Fila de atendimento inteligente',
        'Cobranças e PIX automáticos',
        'Agendamento de consultas',
        'Totem interativo para estabelecimentos',
      ],
      creator: {
        '@type': 'Organization',
        name: 'BigCorps',
        url: 'https://bigcorps.com.br',
        contactPoint: {
          '@type': 'ContactPoint',
          telephone: '+55-11-98731-1425',
          contactType: 'customer service',
          availableLanguage: 'Portuguese',
        },
      },
    },
    {
      '@type': 'Organization',
      '@id': `${APP_URL}/#organization`,
      name: 'BigCorps',
      url: 'https://bigcorps.com.br',
      logo: {
        '@type': 'ImageObject',
        url: `${APP_URL}/icons/icon-192x192.png`,
      },
    },
    {
      '@type': 'WebSite',
      '@id': `${APP_URL}/#website`,
      url: APP_URL,
      name: APP_NAME,
      description: DESCRIPTION,
      inLanguage: 'pt-BR',
      publisher: { '@id': `${APP_URL}/#organization` },
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
        <SpeedInsights />
      </body>
    </html>
  );
}
