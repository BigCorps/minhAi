// app/consultatec/layout.tsx

import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { BRANDS, getBrandByHost } from '@/lib/brand';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get('host') || '';

  const brandKey = getBrandByHost(host);
  const brand = BRANDS[brandKey];

  const isConsultaTec = brandKey === 'consultatec';

  return {
    title: {
      absolute: isConsultaTec ? 'ConsultaTec - Consulta de CPF e CNPJ, sem burocracia' : brand.title,
    },
    description: brand.description,
    applicationName: brand.name,

    icons: {
      icon: isConsultaTec
        ? '/brands/consultatec/favicon.png'
        : '/favicon.ico',
      shortcut: isConsultaTec
        ? '/brands/consultatec/favicon.png'
        : '/favicon.ico',
      apple: isConsultaTec
        ? '/brands/consultatec/favicon.png'
        : '/apple-touch-icon.png',
    },

    openGraph: {
      title: isConsultaTec ? 'ConsultaTec - Consulta de CPF e CNPJ, sem burocracia' : brand.title,
      description: brand.description,
      siteName: brand.name,
      type: 'website',
      images: [
        {
          url: isConsultaTec
            ? '/brands/consultatec/og.png'
            : '/brands/consultatec/og.png',
          width: 1200,
          height: 630,
          alt: brand.name,
        },
      ],
    },

    twitter: {
      card: 'summary',
      title: isConsultaTec ? 'ConsultaTec - Consulta de CPF e CNPJ, sem burocracia' : brand.title,
      description: brand.description,
      images: [
        isConsultaTec
          ? '/brands/consultatec/og.png'
          : '/brands/consultatec/og.png',
      ],
    },
  };
}

export default function ConsultaTecLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
