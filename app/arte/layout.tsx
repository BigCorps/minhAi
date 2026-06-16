// app/arte/layout.tsx

import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { BRANDS, getBrandByHost } from '@/lib/brand';

export async function generateMetadata(): Promise<Metadata> {
  const headersList = headers();
  const host = headersList.get('host') || '';
  const brandKey = getBrandByHost(host);
  const brand = BRANDS[brandKey];

  return {
    title: brand.title,
    description: brand.description,
    icons: {
      icon: brandKey === 'artefinal'
        ? '/brands/artefinal/favicon.png'
        : '/favicon.ico',
    },
  };
}

export default function ArteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}