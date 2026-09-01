// app/convite/layout.tsx
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import JsonLd from '@/components/JsonLd';
import { buildBrandMetadata, conviteiaGraph, resolveSeo } from '@/lib/seo';

export const dynamic = 'force-dynamic';

// conviteia.com/ e conviteia.com/convite servem a MESMA landing (o middleware
// reescreve a raiz para /convite). Colapsar as duas em "/" evita duplicata.
function normalizeConvitePath(raw: string | null): string {
  const path = raw && raw.startsWith('/') ? raw : '/';
  if (path === '/convite' || path === '/convite/') return '/';
  return path;
}

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const { brand, clientPage } = resolveSeo(host);

  // ── Convite publicado de um cliente (noivos.conviteia.com) ────────────────
  // Canonical aponta para o próprio subdomínio (nunca para a landing: o
  // Google descartaria o canonical e o convite ficaria sem nenhum) e o
  // noindex vem do buildBrandMetadata por ser página de cliente.
  if (clientPage) {
    return buildBrandMetadata({ host, path: '/' });
  }

  // ── Landing e assistente em conviteia.com ─────────────────────────────────
  // O caminho vem do x-pathname injetado pelo middleware: é o que o visitante
  // vê. Sem ele, /convite/criar canonicalizaria para a raiz e sairia do índice.
  if (brand === 'conviteia') {
    return buildBrandMetadata({ host, path: normalizeConvitePath(headersList.get('x-pathname')) });
  }

  // ── /convite acessado por outro host (minhai.app/convite) ─────────────────
  // A rota existe no build de todas as marcas. Sem noindex, minhai.app/convite
  // duplica a landing de conviteia.com e as duas brigam pela mesma consulta.
  return {
    ...buildBrandMetadata({ host, path: '/', noindex: true }),
    alternates: { canonical: 'https://conviteia.com' },
  };
}

export default async function ConviteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const { brand, clientPage } = resolveSeo(host);

  // O grafo descreve o PRODUTO Convite IA. Ele não deve aparecer no convite
  // publicado de um cliente (aquela página é um evento, não um software) nem
  // quando /convite é servido por outro domínio.
  const showGraph = brand === 'conviteia' && !clientPage;

  return (
    <>
      {showGraph && <JsonLd data={conviteiaGraph()} />}
      {children}
    </>
  );
}
