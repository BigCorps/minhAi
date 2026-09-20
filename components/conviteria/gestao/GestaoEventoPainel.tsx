'use client';

import Link from 'next/link';
import { ChevronRight, Images, Lock, MessageCircle, QrCode, Users, WalletCards } from 'lucide-react';

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
              ? 'Convidados, comunicações, check-in, Memórias, recados e financeiro ficam organizados em um único lugar.'
              : 'Depois da publicação, toda a operação do evento fica concentrada aqui.'}
          </p>
        </div>

        {liberado ? (
          <Link
            href={`/convite/gestao/${eventoId}`}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#c06078] px-3 py-2 text-xs font-semibold text-white"
          >
            Abrir Gestão
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

      <div className={`mt-3 flex flex-wrap gap-2 text-[11px] text-[#7c5560] ${liberado ? '' : 'opacity-65'}`}>
        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1"><Users className="h-3 w-3" />Convidados</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1"><MessageCircle className="h-3 w-3" />Comunicações</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1"><QrCode className="h-3 w-3" />Check-in</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1"><Images className="h-3 w-3" />Memórias</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1"><WalletCards className="h-3 w-3" />Financeiro</span>
      </div>

      {!liberado && (
        <p className="mt-3 text-[11px] font-medium text-[#a04a63]">
          Disponível após a publicação definitiva.
        </p>
      )}
    </div>
  );
}
