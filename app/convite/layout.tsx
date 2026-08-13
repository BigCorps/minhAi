import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { BRANDS, getBrandByHost } from '@/lib/brand'; // Ajuste o caminho conforme seu repo

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get('host') || '';

  const brandKey = getBrandByHost(host);
  const brand = BRANDS[brandKey];

  const isConviteia = brandKey === 'conviteia';

  return {
    title: {
      absolute: isConviteia ? 'Convite IA - Crie seu convite com IA!' : brand.title,
    },
    description: brand.description,
    applicationName: brand.name,
    manifest: isConviteia ? '/brands/convite/manifest.webmanifest' : undefined,

    icons: {
      // Caminho literal para /brands/convite/favicon.png, e nao `brand.logo`:
      // e exatamente o que ConsultaTec, Pix Wiki e ArteFinal fazem, e nelas o
      // icone da aba aparece certo. `brand.logo` serve para OpenGraph, onde a
      // imagem grande e desejada.
      icon: isConviteia
        ? '/brands/convite/favicon.png'
        : '/favicon.ico',
      shortcut: isConviteia
        ? '/brands/convite/favicon.png'
        : '/favicon.ico',
      apple: isConviteia
        ? '/brands/convite/favicon.png'
        : '/apple-touch-icon.png',
    },

    openGraph: {
      title: isConviteia ? 'Convite IA - Crie seu convite com IA!' : brand.title,
      description: brand.description,
      siteName: brand.name,
      type: 'website',
      images: [
        {
          url: isConviteia
            ? brand.logo
            : '/logo.png',
          width: 512,
          height: 512,
          alt: brand.name,
        },
      ],
    },

    twitter: {
      card: 'summary',
      title: isConviteia ? 'Convite IA - Crie seu convite com IA!' : brand.title,
      description: brand.description,
      images: [
        isConviteia
          ? brand.logo
          : '/logo.png',
      ],
    },
  };
}

export default function ConviteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}