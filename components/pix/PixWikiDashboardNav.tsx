'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V9m5 10V5m5 14v-7m5 7V3" />
    </svg>
  );
}

export default function PixWikiDashboardNav() {
  const pathname = usePathname();
  const internalBase = pathname.startsWith('/pix/dashboard') ? '/pix/dashboard' : '/dashboard';
  const reportsActive = pathname.includes('/dashboard/relatorios');

  return (
    <nav
      aria-label="Navegação do PixWiki"
      className="fixed bottom-4 left-1/2 z-[80] -translate-x-1/2 rounded-2xl border border-white/10 bg-slate-950/90 p-1.5 shadow-2xl shadow-black/40 backdrop-blur-xl"
    >
      <div className="flex items-center gap-1">
        <Link
          href={internalBase}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
            !reportsActive ? 'bg-emerald-500 text-slate-950' : 'text-white/60 hover:bg-white/10 hover:text-white'
          }`}
        >
          <DashboardIcon />
          Painel
        </Link>
        <Link
          href={`${internalBase}/relatorios`}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
            reportsActive ? 'bg-emerald-500 text-slate-950' : 'text-white/60 hover:bg-white/10 hover:text-white'
          }`}
        >
          <ReportIcon />
          Relatórios
          <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${reportsActive ? 'bg-slate-950/15' : 'bg-emerald-500/15 text-emerald-300'}`}>
            PRO
          </span>
        </Link>
      </div>
    </nav>
  );
}
