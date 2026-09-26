import type { Metadata, Viewport } from 'next';
import MidiaSessionRouteGuard from '@/components/midia/MidiaSessionRouteGuard';

export const metadata: Metadata = {
  metadataBase: new URL('https://midia.pro'),
  title: {
    default: 'Midia.Pro — sua tela pode trabalhar por você',
    template: '%s | Midia.Pro',
  },
  description:
    'Gerencie TVs, tablets e painéis, exiba suas próprias mídias e monetize espaços ociosos com a rede Midia.Pro.',
  applicationName: 'Midia.Pro',
  manifest: '/manifest.webmanifest',
  alternates: { canonical: 'https://midia.pro' },
  robots: { index: true, follow: true },
  icons: {
    icon: '/brands/midia/icon-192.png',
    apple: '/brands/midia/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    url: 'https://midia.pro',
    siteName: 'Midia.Pro',
    title: 'Midia.Pro — sua tela pode trabalhar por você',
    description:
      'Use sua tela para suas próprias campanhas e ganhe dinheiro disponibilizando espaços para a rede Midia.Pro.',
    locale: 'pt_BR',
    images: [
      {
        url: '/brands/midia/og.png',
        width: 1200,
        height: 630,
        alt: 'Midia.Pro',
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#003295',
  colorScheme: 'light',
};

export default function MidiaLayout({ children }: { children: React.ReactNode }) {
  return <MidiaSessionRouteGuard>{children}</MidiaSessionRouteGuard>;
}
