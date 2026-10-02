'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  ['','Painel','▦'],
  ['/pagamentos','Cobrar','◆'],
  ['/relatorios','Relatórios','▥'],
  ['/api','Integrações','</>'],
  ['/uso','Uso','◴'],
  ['/planos','Plano','◈'],
  ['/equipe','Equipe','♟'],
] as const;

export default function PixWikiDashboardNav({ dark = true }: { dark?: boolean }) {
  const pathname = usePathname();
  const internalBase = pathname.startsWith('/pix/dashboard') ? '/pix/dashboard' : '/dashboard';
  const shell = dark ? 'border-white/10 bg-slate-950/90 shadow-black/40' : 'border-black/10 bg-white/95 shadow-slate-300/60';
  const inactive = dark ? 'text-white/60 hover:bg-white/10 hover:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900';
  return (
    <nav aria-label="Navegação do PixWiki" className={`fixed bottom-4 left-1/2 z-[80] max-w-[calc(100vw-16px)] -translate-x-1/2 overflow-x-auto rounded-2xl border p-1.5 shadow-2xl backdrop-blur-xl ${shell}`}>
      <div className="flex w-max items-center gap-1">
        {items.map(([suffix,label,icon]) => {
          const href = `${internalBase}${suffix}`;
          const active = suffix === '' ? (pathname.endsWith('/dashboard') || pathname === '/dashboard') : pathname.includes(`/dashboard${suffix}`);
          return <Link key={suffix || 'home'} href={href} className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${active ? 'bg-emerald-500 text-slate-950' : inactive}`}><span className="text-[11px] font-black">{icon}</span>{label}</Link>;
        })}
      </div>
    </nav>
  );
}
