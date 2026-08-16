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
import { SEO } from '@/lib/seo';

// ─── Fonte Nunito ─────────────────────────────────────────────────────────────
const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-nunito',
  display: 'swap',
});

// ─── Constantes de marca ─────────────────────────────────────────────────────
// Vêm de lib/seo.ts: é o mesmo lugar de onde robots.ts, sitemap.ts e os
// layouts das outras marcas leem. Duplicar a URL aqui foi o que fez o
// robots.txt do Convite IA apontar para o sitemap da minhAi.
const APP_URL     = SEO.minhai.baseUrl;
const APP_NAME    = SEO.minhai.siteName;
const TITLE       = SEO.minhai.title;
const DESCRIPTION = SEO.minhai.description;
const OG_IMAGE    = `${APP_URL}${SEO.minhai.ogImage}`;

// ATENÇÃO — este metadata é o PADRÃO do build inteiro, e o build responde por
// seis domínios. Cada marca sobrescreve o que precisa no próprio layout
// (app/convite/layout.tsx, app/min/layout.tsx) via buildBrandMetadata.
// Não acrescente aqui nada específico da minhAi que não possa vazar para
// conviteia.com ou app.min.ia.br — foi por isso que o JSON-LD saiu daqui e
// foi para app/page.tsx.



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

// ─── Layout ──────────────────────────────────────────────────────────────────
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
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
