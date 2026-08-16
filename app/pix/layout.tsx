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

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const { brand } = resolveSeo(host);
  // Só o apex pode ser a landing. Em loja.pix.wiki a URL / é página
  // transacional, portanto deve continuar fora do índice.
  const landing = isPixApex(host) && isLandingPath(headersList.get('x-pathname'));

  if (brand === 'pix') {
    if (landing) {
      return buildBrandMetadata({ host, path: '/' });
    }
    return buildBrandMetadata({ host, path: '/', noindex: true });
  }

  return {
    ...buildBrandMetadata({ host, path: '/', noindex: true }),
    alternates: { canonical: 'https://pix.wiki' },
  };
}

export default async function PixLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const { brand } = resolveSeo(host);
  const landing = isPixApex(host) && isLandingPath(headersList.get('x-pathname'));

  const showGraph = brand === 'pix' && landing;

  return (
    <>
      {showGraph && <JsonLd data={pixGraph()} />}
      {children}
    </>
  );
}
