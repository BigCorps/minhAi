'use client';

import Link from 'next/link';
import { ChevronRight, LayoutGrid, QrCode, Sparkles, Users } from 'lucide-react';

export default function GestaoEventoPainel({ eventoId }: { eventoId: string }) {
  return <div className="mt-3 rounded-xl border border-[#c0607833] bg-[#fff9fb] p-4"><div className="flex items-center justify-between gap-3"><div><p className="font-semibold text-[#40232c]">Gestão do Evento</p><p className="mt-1 text-xs leading-5 text-[#7c5560]">Convidados, padrinhos, mesas, check-in, programação e papelaria em um só lugar.</p></div><Link href={`/convite/gestao/${eventoId}`} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#c06078] px-3 py-2 text-xs font-semibold text-white">Abrir<ChevronRight className="h-4 w-4"/></Link></div><div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[#7c5560]"><span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1"><Users className="h-3 w-3"/>Convidados</span><span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1"><LayoutGrid className="h-3 w-3"/>Mesas</span><span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1"><QrCode className="h-3 w-3"/>Check-in</span><span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1"><Sparkles className="h-3 w-3"/>Papelaria</span></div></div>;
}
