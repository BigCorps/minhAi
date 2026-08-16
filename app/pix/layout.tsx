// app/pix/layout.tsx
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import JsonLd from '@/components/JsonLd';
import { buildBrandMetadata, pixGraph, resolveSeo } from '@/lib/seo';

export const dynamic = 'force-dynamic';

// pix.wiki/           → landing (rota interna /pix)
// pix.wiki/minha-loja → cobrança de um cliente (rota interna /pix/minha-loja)
// pix.wiki/loja/50    → cobrança com valor fixo
//
// Só a raiz é conteúdo. As páginas de cobrança são links transacionais: cada
// cliente gera uma, cada valor gera outra, e nenhuma responde a uma busca.
// Indexar isso enche o domínio de página fina e derruba a landing junto.
//
// Como elas moram na RAIZ do domínio, não dá para bloquear por prefixo no
// robots.txt — o noindex tem que sair daqui, com o caminho que o visitante
// pediu (x-pathname, injetado pelo middleware).
function isLandingPath(raw: string | null): boolean {
  const path = raw && raw.startsWith('/') ? raw : '/';
  return path === '/' || path === '/pix' || path === '/pix/';
}

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const { brand } = resolveSeo(host);
  const landing = isLandingPath(headersList.get('x-pathname'));

  // ── pix.wiki ──────────────────────────────────────────────────────────────
  if (brand === 'pix') {
    if (landing) {
      return buildBrandMetadata({ host, path: '/' });
    }
    // Página de cobrança: sai do índice, mas mantém título e cartão de
    // compartilhamento — ela é feita para ser mandada no WhatsApp.
    return buildBrandMetadata({ host, path: '/', noindex: true });
  }

  // ── /pix acessado por outro host (minhai.app/pix) ─────────────────────────
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
  const landing = isLandingPath(headersList.get('x-pathname'));

  // O grafo descreve o produto pix.wiki. Não deve aparecer na página de
  // cobrança de um cliente — aquilo é uma transação, não um software.
  const showGraph = brand === 'pix' && landing;

  return (
    <>
      {showGraph && <JsonLd data={pixGraph()} />}
      {children}
    </>
  );
}
