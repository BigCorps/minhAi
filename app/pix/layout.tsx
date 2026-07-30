// app/pix/layout.tsx

import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { BRANDS, getBrandByHost } from '@/lib/brand';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get('host') || '';

  const brandKey = getBrandByHost(host);
  const brand = BRANDS[brandKey];

  const isPix = brandKey === 'pix';

  return {
    title: {
      absolute: isPix ? 'Pix.Wiki - Link e QR Code Pix com confirmação automática' : brand.title,
    },
    description: brand.description,
    applicationName: brand.name,

    icons: {
      icon: isPix
        ? '/brands/pix/favicon.png'
        : '/favicon.ico',
      shortcut: isPix
        ? '/brands/pix/favicon.png'
        : '/favicon.ico',
      apple: isPix
        ? '/brands/pix/favicon.png'
        : '/apple-touch-icon.png',
    },

    openGraph: {
      title: isPix ? 'Pix.Wiki - Link e QR Code Pix com confirmação automática' : brand.title,
      description: brand.description,
      siteName: brand.name,
      type: 'website',
      images: [
        {
          url: isPix
            ? '/brands/pix/pixwiki.png'
            : '/brands/pix/pixwiki.png',
          width: 512,
          height: 512,
          alt: brand.name,
        },
      ],
    },

    twitter: {
      card: 'summary',
      title: isPix ? 'Pix.Wiki - Link e QR Code Pix com confirmação automática' : brand.title,
      description: brand.description,
      images: [
        isPix
          ? '/brands/pix/pixwiki.png'
          : '/brands/pix/pixwiki.png',
      ],
    },
  };
}

export default function PixLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}