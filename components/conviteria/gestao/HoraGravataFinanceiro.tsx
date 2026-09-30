'use client';

import { useCallback, useEffect, useState } from 'react';
import { HandCoins, Loader2, ReceiptText } from 'lucide-react';

function brl(centavos: number) {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function dataHora(valor: string | null | undefined) {
  if (!valor) return '—';
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? '—' : new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo',
  }).format(d);
}

type Dados = {
  ativo: boolean;
  nomeAcao: string;
  totais: {
    quantidade: number;
    brutoCentavos: number;
    taxaCentavos: number;
    liquidoCentavos: number;
  };
  pagamentos: Array<{
    id: string;
    nome: string;
    anonimo: boolean;
    origem: string;
    valorCentavos: number;
    taxaCentavos: number;
    liquidoCentavos: number;
    pagoEm: string | null;
  }>;
};

export default function HoraGravataFinanceiro({ eventoId, token }: { eventoId: string; token: string }) {
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    try {
      const r = await fetch(`/api/conviteria/gestao/gravata/financeiro?eventoId=${encodeURIComponent(eventoId)}`, {
        headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.erro || 'Não foi possível carregar as contribuições.');
      setDados(d);
      setErro('');
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível carregar as contribuições.');
    }
  }, [eventoId, token]);

  useEffect(() => { void carregar(); }, [carregar]);

  if (!dados && !erro) return <div className="flex items-center justify-center gap-2 rounded-2xl border border-[#c0607833] bg-white p-6 text-sm text-[#7c5560]"><Loader2 className="h-5 w-5 animate-spin" />Carregando Hora da Gravata…</div>;
  if (erro) return <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{erro}</p>;
  if (!dados?.ativo && dados?.totais.quantidade === 0) return null;

  return <section className="rounded-2xl border border-[#c0607833] bg-white p-4 sm:p-5">
    <div className="flex items-center gap-2"><HandCoins className="h-5 w-5 text-[#a04a63]" /><h3 className="font-semibold text-[#40232c]">{dados?.nomeAcao || 'Hora da Gravata'}</h3></div>
    <p className="mt-1 text-sm text-[#7c5560]">Contribuições por PIX desta atividade. O líquido abaixo já compõe o mesmo saldo disponível para saque do evento.</p>

    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="rounded-xl bg-[#fff9fb] p-3"><p className="text-[11px] text-[#7c5560]">Participações</p><strong className="mt-1 block text-lg text-[#40232c]">{dados!.totais.quantidade}</strong></div>
      <div className="rounded-xl bg-[#fff9fb] p-3"><p className="text-[11px] text-[#7c5560]">Total recebido</p><strong className="mt-1 block text-lg text-[#40232c]">{brl(dados!.totais.brutoCentavos)}</strong></div>
      <div className="rounded-xl bg-[#fff9fb] p-3"><p className="text-[11px] text-[#7c5560]">Taxa ConviteIA · 1%</p><strong className="mt-1 block text-lg text-[#40232c]">{brl(dados!.totais.taxaCentavos)}</strong></div>
      <div className="rounded-xl bg-emerald-50 p-3"><p className="text-[11px] text-emerald-700">Líquido creditado</p><strong className="mt-1 block text-lg text-emerald-800">{brl(dados!.totais.liquidoCentavos)}</strong></div>
    </div>

    {dados!.pagamentos.length > 0 && <div className="mt-5">
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#40232c]"><ReceiptText className="h-4 w-4" />Últimas contribuições</p>
      <ul className="space-y-2">
        {dados!.pagamentos.map((p) => <li key={p.id} className="rounded-xl border border-[#c0607828] bg-[#fff9fb] px-3 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0"><p className="truncate text-xs font-semibold text-[#40232c]">{p.nome}</p><p className="mt-1 text-[10px] text-[#7c5560]">{dataHora(p.pagoEm)} · {p.origem === 'whatsapp' ? 'WhatsApp' : p.origem === 'memorias' ? 'Memórias' : p.origem === 'qr' ? 'QR Code' : 'Link'}</p></div>
            <strong className="shrink-0 text-sm text-[#40232c]">{brl(p.valorCentavos)}</strong>
          </div>
          <div className="mt-2 flex justify-between border-t border-[#c060781c] pt-2 text-[10px] text-[#7c5560]"><span>Líquido no saldo</span><strong className="text-[#40232c]">{brl(p.liquidoCentavos)}</strong></div>
        </li>)}
      </ul>
    </div>}
  </section>;
}
