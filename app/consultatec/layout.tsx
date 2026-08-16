// app/consultatec/layout.tsx
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import JsonLd from '@/components/JsonLd';
import { buildBrandMetadata, consultatecGraph, resolveSeo } from '@/lib/seo';

export const dynamic = 'force-dynamic';

// consulta.tec.br/ e consulta.tec.br/consultatec servem a MESMA página
// (o middleware reescreve a raiz). Colapsar as duas em "/" evita duplicata.
function normalizeConsultaPath(raw: string | null): string {
  const path = raw && raw.startsWith('/') ? raw : '/';
  if (path === '/consultatec' || path === '/consultatec/') return '/';
  return path;
}

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const { brand } = resolveSeo(host);

  // ── consulta.tec.br ───────────────────────────────────────────────────────
  if (brand === 'consultatec') {
    return buildBrandMetadata({
      host,
      path: normalizeConsultaPath(headersList.get('x-pathname')),
    });
  }

  // ── /consultatec acessado por outro host ──────────────────────────────────
  return {
    ...buildBrandMetadata({ host, path: '/', noindex: true }),
    alternates: { canonical: 'https://consulta.tec.br' },
  };
}

export default async function ConsultaTecLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const { brand } = resolveSeo(host);

  return (
    <>
      {brand === 'consultatec' && <JsonLd data={consultatecGraph()} />}
      {children}
    </>
  );
}
