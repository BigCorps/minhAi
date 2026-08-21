// app/melhoria/layout.tsx
import { headers } from 'next/headers';
import type { Metadata, Viewport } from 'next';
import JsonLd from '@/components/JsonLd';
import { buildBrandMetadata, melhoriaGraph, resolveSeo } from '@/lib/seo';

export const dynamic = 'force-dynamic';

// melhoria.org/ e melhoria.org/melhoria servem a MESMA página (o middleware
// reescreve a raiz). Colapsar as duas em "/" evita duplicata no canonical —
// mesma correção que o ConsultaTec precisou fazer.
function normalizarCaminho(bruto: string | null): string {
  const caminho = bruto && bruto.startsWith('/') ? bruto : '/';
  if (caminho === '/melhoria' || caminho === '/melhoria/') return '/';
  return caminho;
}

export const viewport: Viewport = {
  themeColor: '#0F766E',
  // maximumScale/userScalable NÃO são travados de propósito: o público precisa
  // conseguir dar zoom. Travar zoom é falha de acessibilidade (WCAG 1.4.4).
  width: 'device-width',
  initialScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const { brand } = resolveSeo(host);

  if (brand === 'melhoria') {
    return buildBrandMetadata({
      host,
      path: normalizarCaminho(headersList.get('x-pathname')),
    });
  }

  // /melhoria acessado por outro host: não indexa, aponta para o canônico.
  return {
    ...buildBrandMetadata({ host, path: '/', noindex: true }),
    alternates: { canonical: 'https://melhoria.org' },
  };
}

export default async function MelhoriaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const { brand } = resolveSeo(host);

  return (
    <>
      {brand === 'melhoria' && <JsonLd data={melhoriaGraph()} />}
      {children}
    </>
  );
}
