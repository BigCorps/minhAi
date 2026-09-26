'use client';

import { usePathname } from 'next/navigation';
import { CircleDollarSign, FileImage, LayoutDashboard, Megaphone, MonitorSmartphone } from 'lucide-react';
import { MIDIA_BRAND } from '@/lib/midia/constants';

const items = [
  { suffix: '', label: 'Início', icon: LayoutDashboard },
  { suffix: '/telas', label: 'Telas e locais', icon: MonitorSmartphone },
  { suffix: '/anuncios', label: 'Anúncios', icon: Megaphone },
  { suffix: '/midias', label: 'Minhas mídias', icon: FileImage },
  { suffix: '/financeiro', label: 'Financeiro', icon: CircleDollarSign },
] as const;

export default function MidiaDashboardNav({ basePath }: { basePath: '/dashboard' | '/midia/dashboard' }) {
  const pathname = usePathname();
  const normalized = pathname.startsWith('/midia/dashboard')
    ? pathname.slice('/midia'.length)
    : pathname;

  return (
    <nav className="border-t border-blue-50 bg-white">
      <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const href = `${basePath}${item.suffix}`;
          const externalPath = `/dashboard${item.suffix}`;
          const active = item.suffix === ''
            ? normalized === '/dashboard' || normalized === '/dashboard/'
            : normalized === externalPath || normalized.startsWith(`${externalPath}/`);
          const Icon = item.icon;
          return (
            <a
              key={item.suffix || 'home'}
              href={href}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-black transition sm:text-sm ${active ? 'bg-blue-50 text-slate-950' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
              style={active ? { color: MIDIA_BRAND.blue } : undefined}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
