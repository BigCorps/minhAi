'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

function DashboardIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" /></svg>;
}
function PaymentIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M6 4h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2zm2 8h4" /></svg>;
}
function ReportIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 19V9m5 10V5m5 14v-7m5 7V3" /></svg>;
}
function ApiIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M8 9l-3 3 3 3m8-6 3 3-3 3M14 5l-4 14" /></svg>;
}

interface Props { dark?: boolean; }

export default function PixWikiDashboardNav({ dark = true }: Props) {
  const pathname = usePathname();
  const internalBase = pathname.startsWith('/pix/dashboard') ? '/pix/dashboard' : '/dashboard';
  const paymentsActive = pathname.includes('/dashboard/pagamentos');
  const reportsActive = pathname.includes('/dashboard/relatorios');
  const apiActive = pathname.includes('/dashboard/api');
  const panelActive = !paymentsActive && !reportsActive && !apiActive;

  const shell = dark ? 'border-white/10 bg-slate-950/90 shadow-black/40' : 'border-black/10 bg-white/95 shadow-slate-300/60';
  const inactive = dark ? 'text-white/60 hover:bg-white/10 hover:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900';
  const active = 'bg-emerald-500 text-slate-950';
  const badgeInactive = dark ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-500/12 text-emerald-700';

  return (
    <nav aria-label="Navegação do PixWiki" className={`fixed bottom-4 left-1/2 z-[80] max-w-[calc(100vw-16px)] -translate-x-1/2 overflow-x-auto rounded-2xl border p-1.5 shadow-2xl backdrop-blur-xl ${shell}`}>
      <div className="flex w-max items-center gap-1">
        <Link href={internalBase} className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${panelActive ? active : inactive}`}><DashboardIcon />Painel</Link>
        <Link href={`${internalBase}/pagamentos`} className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${paymentsActive ? active : inactive}`}><PaymentIcon />Pagamentos</Link>
        <Link href={`${internalBase}/relatorios`} className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${reportsActive ? active : inactive}`}>
          <ReportIcon />Relatórios<span className={`hidden rounded-full px-1.5 py-0.5 text-[9px] font-black sm:inline ${reportsActive ? 'bg-slate-950/15' : badgeInactive}`}>PRO</span>
        </Link>
        <Link href={`${internalBase}/api`} className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${apiActive ? active : inactive}`}>
          <ApiIcon />Integrações<span className={`hidden rounded-full px-1.5 py-0.5 text-[9px] font-black sm:inline ${apiActive ? 'bg-slate-950/15' : badgeInactive}`}>PRO</span>
        </Link>
      </div>
    </nav>
  );
}
