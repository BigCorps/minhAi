import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin minhAi',
  description: 'Painel administrativo privado da plataforma minhAi.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
  icons: {
    icon: [
      { url: 'https://www.minhai.app/admin-icons/icon-48.png', sizes: '48x48', type: 'image/png' },
      { url: 'https://www.minhai.app/admin-icons/icon-96.png', sizes: '96x96', type: 'image/png' },
      { url: 'https://www.minhai.app/admin-icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: 'https://www.minhai.app/admin-icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: 'https://www.minhai.app/admin-icons/favicon.ico',
    apple: 'https://www.minhai.app/admin-icons/apple-touch-icon.png',
  },
  manifest: null,
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
