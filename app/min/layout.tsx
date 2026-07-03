import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { BRANDS, getBrandByHost } from '@/lib/brand';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const brandKey = getBrandByHost(host);
  const brand = BRANDS[brandKey];
  const isMinia = brandKey === 'minia';

  return {
    title: {
      absolute: isMinia
        ? 'min.IA — Painel Pessoal da minhAi'
        : brand.title,
    },
    description: isMinia
      ? 'Execute PIX, consultas, agendamentos, traduções e +100 funções de IA pelo chat. Powered by minhAi. Comece grátis.'
      : brand.description,
    applicationName: isMinia ? 'min.IA' : brand.name,
    icons: {
      icon:     isMinia ? '/minia/favicon.png' : '/favicon.ico',
      shortcut: isMinia ? '/minia/favicon.png' : '/favicon.ico',
      apple:    isMinia ? '/minia/logo.png'    : '/apple-touch-icon.png',
    },
    openGraph: {
      title: isMinia ? 'min.IA — Painel Pessoal da minhAi' : brand.title,
      description: isMinia
        ? 'Execute PIX, consultas, agendamentos, traduções e +100 funções de IA pelo chat. Powered by minhAi.'
        : brand.description,
      siteName: isMinia ? 'min.IA' : brand.name,
      type: 'website',
      images: [
        {
          url:    isMinia ? '/minia/logo.png' : '/logo.png',
          width:  512,
          height: 512,
          alt:    isMinia ? 'min.IA' : brand.name,
        },
      ],
    },
    twitter: {
      card:  'summary',
      title: isMinia ? 'min.IA — A versão mini e pessoal da minhAi' : brand.title,
      description: isMinia
        ? 'Execute PIX, consultas, agendamentos, traduções e +100 funções de IA pelo chat.'
        : brand.description,
      images: [isMinia ? '/minia/logo.png' : '/logo.png'],
    },
  };
}

export default function MinLayout({ children }: { children: React.ReactNode }) {
  return children;
}
