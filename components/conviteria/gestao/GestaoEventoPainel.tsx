'use client';

import Link from 'next/link';
import { ChevronRight, LayoutGrid, Lock, QrCode, Sparkles, Users } from 'lucide-react';

export default function GestaoEventoPainel({
  eventoId,
  liberado,
}: {
  eventoId: string;
  liberado: boolean;
}) {
  return (
    <div
      className={`mt-3 rounded-xl border p-4 ${
        liberado
          ? 'border-[#c0607833] bg-[#fff9fb]'
          : 'border-[#c0607826] bg-[#fffafb]'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-semibold text-[#40232c]">
            {!liberado && <Lock className="h-4 w-4 text-[#a04a63]" />}
            Gestão do Evento
          </p>
          <p className="mt-1 text-xs leading-5 text-[#7c5560]">
            {liberado
              ? 'Convidados, padrinhos, mesas, check-in, programação e papelaria em um só lugar.'
              : 'Organize convidados, padrinhos, mesas, check-in, programação e papelaria depois de publicar seu convite.'}
          </p>
        </div>

        {liberado ? (
          <Link
            href={`/convite/gestao/${eventoId}`}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#c06078] px-3 py-2 text-xs font-semibold text-white"
          >
            Abrir
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <Link
            href={`/convite/pagar?evento=${eventoId}`}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#c0607840] bg-white px-3 py-2 text-xs font-semibold text-[#a04a63]"
          >
            Publicar
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      <div
        className={`mt-3 flex flex-wrap gap-2 text-[11px] text-[#7c5560] ${
          liberado ? '' : 'opacity-65'
        }`}
      >
        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1">
          <Users className="h-3 w-3" />
          Convidados
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1">
          <LayoutGrid className="h-3 w-3" />
          Mesas
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1">
          <QrCode className="h-3 w-3" />
          Check-in
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1">
          <Sparkles className="h-3 w-3" />
          Papelaria
        </span>
      </div>

      {!liberado && (
        <p className="mt-3 text-[11px] font-medium text-[#a04a63]">
          Disponível após a publicação definitiva.
        </p>
      )}
    </div>
  );
}
