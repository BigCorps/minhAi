// app/pix/layout.tsx
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import JsonLd from '@/components/JsonLd';
import { buildBrandMetadata, pixGraph, resolveSeo } from '@/lib/seo';

export const dynamic = 'force-dynamic';

function isLandingPath(raw: string | null): boolean {
  const path = raw && raw.startsWith('/') ? raw : '/';
  return path === '/' || path === '/pix' || path === '/pix/';
}

function isPixApex(host: string): boolean {
  const clean = host.split(':')[0].toLowerCase();
  return clean === 'pix.wiki' || clean === 'www.pix.wiki';
}

function pixMetadata(metadata: Metadata): Metadata {
  // O navegador sempre pede o manifesto na raiz. O middleware de pix.wiki já
  // reescreve /manifest.webmanifest para o arquivo específico da marca.
  return { ...metadata, manifest: '/manifest.webmanifest' };
}

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const { brand } = resolveSeo(host);
  const landing = isPixApex(host) && isLandingPath(headersList.get('x-pathname'));

  if (brand === 'pix') {
    return pixMetadata(buildBrandMetadata({ host, path: '/', noindex: !landing }));
  }

  return {
    ...buildBrandMetadata({ host, path: '/', noindex: true }),
    // Não oferecemos instalação a partir dos subdomínios públicos de cobrança;
    // o WebApp instalável é o painel em pix.wiki.
    manifest: undefined,
    alternates: { canonical: 'https://pix.wiki' },
  };
}

export default async function PixLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const { brand } = resolveSeo(host);
  const landing = isPixApex(host) && isLandingPath(headersList.get('x-pathname'));
  return <>{brand === 'pix' && landing && <JsonLd data={pixGraph()} />}{children}</>;
}
