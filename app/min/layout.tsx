// app/min/layout.tsx
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { LANDING_URL, buildBrandMetadata, resolveSeo } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const { brand } = resolveSeo(host);

  // ── app.min.ia.br ─────────────────────────────────────────────────────────
  // Este host é a FERRAMENTA. A landing pública da min.IA é min.ia.br, que
  // roda em OUTRO projeto Vercel (repositório BigCorps/min.ia.br) — é ela que
  // deve ranquear.
  //
  // Mesmo padrão do ArteFinal: noindex + canonical para a landing. Sem isso,
  // as duas URLs disputam a busca por "min.IA", e a ferramenta — que é uma
  // tela de chat, quase sem texto — costuma vencer e ranquear pior do que a
  // landing venceria.
  //
  // O metadata continua completo: o link circula no WhatsApp, e noindex tira
  // da busca sem tirar o preview.
  if (brand === 'minia') {
    return {
      ...buildBrandMetadata({ host, path: '/', noindex: true }),
      alternates: { canonical: LANDING_URL.minia! },
    };
  }

  // ── /min acessado por outro host (minhai.app/min) ─────────────────────────
  return {
    ...buildBrandMetadata({ host, path: '/', noindex: true }),
    alternates: { canonical: LANDING_URL.minia! },
  };
}

export default function MinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Sem JSON-LD: o SoftwareApplication da min.IA pertence à landing.
  return children;
}
