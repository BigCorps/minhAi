// app/arte/layout.tsx
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { LANDING_URL, buildBrandMetadata, resolveSeo } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const { brand } = resolveSeo(host);

  // ── ia.artefinal.app ──────────────────────────────────────────────────────
  // Mesma lógica da min.IA: este host é a FERRAMENTA, atrás de login (sem
  // sessão o middleware manda tudo para /arte/login). A landing pública é
  // artefinal.app, em outro projeto Vercel (repositório BigCorps/artefinal).
  //
  // noindex + canonical para a landing. O robots.txt deste host também é
  // Disallow: / (ver SEO.artefinal em lib/seo.ts).
  //
  // O metadata segue completo porque o link é mandado para clientes.
  if (brand === 'artefinal') {
    return {
      ...buildBrandMetadata({ host, path: '/', noindex: true }),
      alternates: { canonical: LANDING_URL.artefinal! },
    };
  }

  // ── /arte acessado por outro host (minhai.app/arte) ───────────────────────
  return {
    ...buildBrandMetadata({ host, path: '/', noindex: true }),
    alternates: { canonical: LANDING_URL.artefinal! },
  };
}

export default function ArteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Sem JSON-LD: o SoftwareApplication do ArteFinal pertence à landing.
  return children;
}
