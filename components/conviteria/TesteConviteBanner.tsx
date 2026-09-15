'use client';

import { useEffect, useMemo, useState } from 'react';
import { Clock3, ExternalLink } from 'lucide-react';

function restante(expiraEm: string, agora: number) {
  const ms = Math.max(0, new Date(expiraEm).getTime() - agora);
  const horas = Math.floor(ms / 3_600_000);
  const minutos = Math.floor((ms % 3_600_000) / 60_000);
  const segundos = Math.floor((ms % 60_000) / 1000);
  return { ms, horas, minutos, segundos };
}

export default function TesteConviteBanner({
  eventoId,
  expiraEm,
}: {
  eventoId: string;
  expiraEm: string;
}) {
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const tempo = useMemo(() => restante(expiraEm, agora), [expiraEm, agora]);
  const expirou = tempo.ms <= 0;

  useEffect(() => {
    if (!expirou) return;
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = antes; };
  }, [expirou]);

  if (expirou) {
    return (
      <div className="fixed inset-0 z-[99999] grid place-items-center bg-[#fff9fb] px-5 text-center text-[#40232c]">
        <div className="w-full max-w-md rounded-3xl border border-[#c0607833] bg-white p-7 shadow-2xl">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#fff0f4] text-[#a04a63]"><Clock3 className="h-6 w-6" /></div>
          <p className="mt-4 text-xs font-bold uppercase tracking-[.16em] text-[#a04a63]">ConviteIA · teste encerrado</p>
          <h1 className="mt-2 text-2xl font-semibold">Seu período de teste terminou</h1>
          <p className="mt-3 text-sm leading-6 text-[#7c5560]">Seu convite continua salvo. Publique para colocar este mesmo endereço novamente no ar.</p>
          <a
            href={`https://conviteia.com/convite/pagar?evento=${encodeURIComponent(eventoId)}`}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#c06078] px-5 py-3 font-semibold text-white"
          >
            Publicar meu convite <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[9999] flex min-h-9 items-center justify-center gap-2 bg-[#40232c] px-3 py-2 text-center text-[11px] font-semibold text-white shadow-md sm:text-xs">
      <Clock3 className="h-3.5 w-3.5 shrink-0" />
      <span>Modo teste · {String(tempo.horas).padStart(2, '0')}h {String(tempo.minutos).padStart(2, '0')}m {String(tempo.segundos).padStart(2, '0')}s restantes</span>
    </div>
  );
}
