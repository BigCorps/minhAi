'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { HandCoins, MessageCircle, Sparkles } from 'lucide-react';

type Contexto = 'memorias' | 'comunicacoes';

type Estado = {
  config?: {
    status?: string;
    nomeAcao?: string;
    whatsappProgramadoEm?: string | null;
    whatsappDisparoEm?: string | null;
  };
  whatsapp?: { ativo?: boolean };
};

export default function HoraGravataCrossSell({
  eventoId,
  token,
  contexto,
  onAbrirGravata,
}: {
  eventoId: string;
  token: string;
  contexto: Contexto;
  onAbrirGravata?: () => void;
}) {
  const [estado, setEstado] = useState<Estado | null>(null);

  useEffect(() => {
    let cancelado = false;
    void fetch(`/api/conviteria/gestao/gravata?eventoId=${encodeURIComponent(eventoId)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
      .then(async (r) => {
        const d = await r.json().catch(() => null);
        if (!cancelado && r.ok) setEstado(d);
      })
      .catch(() => undefined);
    return () => { cancelado = true; };
  }, [eventoId, token]);

  if (!estado) return null;
  const gravataAtiva = estado.config?.status === 'ativo';
  const whatsappAtivo = estado.whatsapp?.ativo === true;
  const nomeAcao = estado.config?.nomeAcao || 'Hora da Gravata';

  if (contexto === 'memorias') {
    if (gravataAtiva) {
      return <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="flex items-center gap-2 font-semibold text-emerald-900"><HandCoins className="h-4 w-4" />{nomeAcao} conectada ao telão</p>
        <p className="mt-1 text-sm leading-6 text-emerald-800">Cada contribuição confirmada pode aparecer automaticamente durante o slideshow usando o mesmo QR da festa.</p>
        {onAbrirGravata && <button type="button" onClick={onAbrirGravata} className="mt-3 text-sm font-semibold text-emerald-900 underline underline-offset-4">Gerenciar {nomeAcao}</button>}
      </div>;
    }
    return <div className="rounded-2xl border border-[#c0607830] bg-[linear-gradient(135deg,#fff,#fff4f7)] p-4">
      <p className="flex items-center gap-2 font-semibold text-[#40232c]"><Sparkles className="h-4 w-4 text-[#a04a63]" />Leve o telão além das fotos</p>
      <p className="mt-1 text-sm leading-6 text-[#7c5560]">Com Hora da Gravata, cada contribuição confirmada aparece automaticamente durante o slideshow.</p>
      <Link href={`/convite/pagar?evento=${encodeURIComponent(eventoId)}&gravata=1`} className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#c06078] px-4 py-2.5 text-sm font-semibold text-white"><HandCoins className="h-4 w-4" />Ativar Hora da Gravata — R$ 19,90</Link>
    </div>;
  }

  if (!gravataAtiva) {
    return <div className="rounded-2xl border border-[#c0607830] bg-[linear-gradient(135deg,#fff,#fff4f7)] p-4">
      <p className="flex items-center gap-2 font-semibold text-[#40232c]"><HandCoins className="h-4 w-4 text-[#a04a63]" />Use seu WhatsApp também durante a festa</p>
      <p className="mt-1 text-sm leading-6 text-[#7c5560]">Ative a Hora da Gravata para poder agendar uma chamada aos convidados confirmados no horário escolhido durante o evento.</p>
      <Link href={`/convite/pagar?evento=${encodeURIComponent(eventoId)}&gravata=1`} className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#c0607840] bg-white px-4 py-2.5 text-sm font-semibold text-[#a04a63]">Conhecer Hora da Gravata</Link>
    </div>;
  }

  if (!whatsappAtivo) {
    return <div className="rounded-2xl border border-[#c0607830] bg-white p-4">
      <p className="flex items-center gap-2 font-semibold text-[#40232c]"><MessageCircle className="h-4 w-4 text-[#a04a63]" />Envie a chamada da {nomeAcao} pelo WhatsApp</p>
      <p className="mt-1 text-sm leading-6 text-[#7c5560]">Ative o WhatsApp do Evento para agendar o template Utility aprovado somente para os convidados confirmados.</p>
      <Link href={`/convite/pagar?evento=${encodeURIComponent(eventoId)}&whatsapp=1`} className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#c06078] px-4 py-2.5 text-sm font-semibold text-white"><MessageCircle className="h-4 w-4" />Ativar WhatsApp do Evento — R$ 19,90</Link>
    </div>;
  }

  return <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
    <p className="flex items-center gap-2 font-semibold text-emerald-900"><MessageCircle className="h-4 w-4" />{nomeAcao} conectada ao WhatsApp</p>
    <p className="mt-1 text-sm leading-6 text-emerald-800">O aviso Utility da atividade pode ser programado no dia do evento. O horário e o disparo ficam em Hora da Gravata.</p>
    {onAbrirGravata && <button type="button" onClick={onAbrirGravata} className="mt-3 text-sm font-semibold text-emerald-900 underline underline-offset-4">Gerenciar horário do disparo</button>}
  </div>;
}
