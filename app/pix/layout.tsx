// app/pix/layout.tsx
// Metadata própria do Pix Wiki — sobrescreve o título/descrição herdados
// do layout raiz da minhAi para toda a árvore /pix/*.
// (Client Components como page.tsx não podem exportar metadata; por isso
// isso precisa estar num layout server-side separado.)

import type { Metadata } from 'next';
import { BRANDS } from '@/lib/brand';

export const metadata: Metadata = {
  title: `${BRANDS.pix.title} — ${BRANDS.pix.description}`,
  description: BRANDS.pix.description,
  icons: {
    icon: '/brands/pix/favicon.png',
  },
};

export default function PixLayout({ children }: { children: React.ReactNode }) {
  return children;
}