import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getUser } from '@/lib/supabase-server';
import MidiaLogoutButton from '@/components/midia/MidiaLogoutButton';

export const metadata: Metadata = {
  title: 'Dashboard',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function MidiaDashboardLayout({ children }: { children: React.ReactNode }) {
  const headerList = await headers();
  const host = (headerList.get('host') || '').split(':')[0].toLowerCase();
  const productHost = host === 'midia.pro' || host === 'www.midia.pro';
  const dashboardHref = productHost ? '/dashboard' : '/midia/dashboard';
  const loginHref = productHost ? '/login' : '/midia/login';

  const user = await getUser();
  if (!user) redirect(loginHref);

  return (
    <main className="min-h-screen bg-[#F7F9FF] text-slate-950">
      <header className="border-b border-blue-100 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href={dashboardHref} className="flex items-center gap-3">
            <Image src="/brands/midia/logo.png" alt="Midia.Pro" width={150} height={150} priority className="h-12 w-auto object-contain" />
          </Link>
          <div className="flex min-w-0 items-center gap-3">
            <div className="hidden min-w-0 text-right sm:block">
              <div className="truncate text-xs font-black text-slate-700">{user.email}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Painel do proprietário</div>
            </div>
            <MidiaLogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10">{children}</div>
    </main>
  );
}
