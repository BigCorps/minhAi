// app/arte/layout.tsx

import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { BRANDS, getBrandByHost } from '@/lib/brand';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get('host') || '';

  const brandKey = getBrandByHost(host);
  const brand = BRANDS[brandKey];

  const isArteFinal = brandKey === 'artefinal';

  return {
    title: {
      absolute: isArteFinal ? 'ArteFinal.app' : brand.title,
    },
    description: brand.description,
    applicationName: brand.name,

    icons: {
      icon: isArteFinal
        ? '/brands/artefinal/favicon.png'
        : '/favicon.ico',
      shortcut: isArteFinal
        ? '/brands/artefinal/favicon.png'
        : '/favicon.ico',
      apple: isArteFinal
        ? '/brands/artefinal/favicon.png'
        : '/apple-touch-icon.png',
    },

    openGraph: {
      title: isArteFinal ? 'ArteFinal.app' : brand.title,
      description: brand.description,
      siteName: brand.name,
      type: 'website',
      images: [
        {
          url: isArteFinal
            ? '/brands/artefinal/logo.png'
            : '/logo.png',
          width: 512,
          height: 512,
          alt: brand.name,
        },
      ],
    },

    twitter: {
      card: 'summary',
      title: isArteFinal ? 'ArteFinal.app' : brand.title,
      description: brand.description,
      images: [
        isArteFinal
          ? '/brands/artefinal/logo.png'
          : '/logo.png',
      ],
    },
  };
}

export default function ArteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}