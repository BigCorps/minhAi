import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Entrar',
  robots: { index: false, follow: false },
};

export default function MidiaLoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
