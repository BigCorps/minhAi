import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import FuncionarIAPublicSales from '@/components/funcionaria/public/FuncionarIAPublicSales';

export default async function VendasSlugLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const [{ slug }, headerStore] = await Promise.all([params, headers()]);
  const host = String(headerStore.get('host') || '').split(':')[0].toLowerCase();
  const isFuncionarIA = host.endsWith('.funcionaria.net') || host.endsWith('.funcionaria.localhost');

  if (isFuncionarIA) return <FuncionarIAPublicSales slug={slug} />;
  return children;
}
