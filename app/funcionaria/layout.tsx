// app/funcionaria/layout.tsx
import type { Metadata, Viewport } from 'next';
import { buildBrandMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  // O host público da marca é fixo. Enquanto a FuncionarIA ainda está sendo
  // construída, mantemos a ferramenta noindex; isso será liberado junto da
  // landing final.
  return buildBrandMetadata({
    host: 'funcionaria.net',
    path: '/',
    noindex: true,
  });
}

export const viewport: Viewport = {
  themeColor: '#6D28D9',
  colorScheme: 'light',
};

export default function FuncionarIALayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
