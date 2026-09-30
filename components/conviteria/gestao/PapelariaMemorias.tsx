'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { HandCoins, Image as ImageIcon, Loader2, Sparkles } from 'lucide-react';
import * as QRCode from 'qrcode';
import type { ConviteConfig } from '@/lib/conviteria/tipos';
import type { MemoriasDesafiosConfig } from '@/lib/conviteria/memorias-desafios';
import MateriaisMemorias from '@/components/conviteria/memorias/MateriaisMemorias';

type DadosMemorias = {
  ativo: boolean;
  gravataAtiva?: boolean;
  experienciaAtiva?: boolean;
  nomeAcao?: string;
  ornamentoId?: string | null;
  desafios: MemoriasDesafiosConfig;
  urlMemorias: string;
};

export default function PapelariaMemorias({
  eventoId,
  token,
  cfg,
}: {
  eventoId: string;
  token: string;
  cfg: ConviteConfig;
}) {
  const [dados, setDados] = useState<DadosMemorias | null>(null);
  const [qr, setQr] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const r = await fetch(`/api/conviteria/memorias/painel?eventoId=${encodeURIComponent(eventoId)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.erro || 'Não foi possível carregar os materiais da experiência.');
      setDados(d as DadosMemorias);
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível carregar os materiais da experiência.');
    } finally {
      setCarregando(false);
    }
  }, [eventoId, token]);

  useEffect(() => { void carregar(); }, [carregar]);

  useEffect(() => {
    if (!dados?.experienciaAtiva || !dados.urlMemorias) { setQr(''); return; }
    void QRCode.toDataURL(dados.urlMemorias, { width: 1600, margin: 4, errorCorrectionLevel: 'H' })
      .then(setQr)
      .catch(() => setQr(''));
  }, [dados?.experienciaAtiva, dados?.urlMemorias]);

  async function salvarDesafios(config: MemoriasDesafiosConfig) {
    if (!dados?.ativo) return;
    const r = await fetch(`/api/conviteria/memorias/painel?eventoId=${encodeURIComponent(eventoId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ desafios: config }),
    });
    const d = await r.json().catch(() => null);
    if (!r.ok) throw new Error(d?.erro || 'Não foi possível salvar os desafios das Memórias.');
    setDados((atual) => atual ? { ...atual, desafios: config } : atual);
  }

  if (carregando) {
    return <div className="grid min-h-52 place-items-center rounded-2xl border border-[#c0607830] bg-white"><Loader2 className="h-6 w-6 animate-spin text-[#a04a63]" /></div>;
  }

  if (erro) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{erro}</div>;
  }

  if (!dados?.experienciaAtiva) {
    return (
      <div className="overflow-hidden rounded-3xl border border-[#c0607830] bg-white">
        <div className="bg-[linear-gradient(135deg,#fff9fb,#fff1f5)] p-6">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-[#a04a63] shadow-sm"><ImageIcon className="h-5 w-5" /></span>
            <div>
              <h3 className="font-semibold text-[#40232c]">QR da experiência da festa</h3>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-[#7c5560]">Ative Memórias ou Hora da Gravata para liberar o QR único da festa e os materiais para impressão.</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={`/convite/pagar?evento=${eventoId}&memorias=1`} className="inline-flex items-center gap-2 rounded-full bg-[#c06078] px-4 py-2.5 text-sm font-semibold text-white"><Sparkles className="h-4 w-4" />Ativar Memórias</Link>
            <Link href={`/convite/pagar?evento=${eventoId}&gravata=1`} className="inline-flex items-center gap-2 rounded-full border border-[#c0607840] bg-white px-4 py-2.5 text-sm font-semibold text-[#a04a63]"><HandCoins className="h-4 w-4" />Ativar Hora da Gravata</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!qr) {
    return <div className="grid min-h-52 place-items-center rounded-2xl border border-[#c0607830] bg-white"><Loader2 className="h-6 w-6 animate-spin text-[#a04a63]" /></div>;
  }

  const somenteGravata = Boolean(dados.gravataAtiva && !dados.ativo);
  const ambos = Boolean(dados.gravataAtiva && dados.ativo);
  const chamada = somenteGravata
    ? `O mesmo QR abre diretamente a ${dados.nomeAcao || 'Hora da Gravata'}. Personalize o título da plaquinha abaixo antes de baixar.`
    : ambos
      ? `Um único QR abre fotos, vídeos e ${dados.nomeAcao || 'Hora da Gravata'} na mesma experiência.`
      : 'O QR abre o envio de fotos e vídeos das Memórias do Evento.';

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-[#c0607830] bg-[#fff9fb] p-4">
        <p className="font-semibold text-[#40232c]">QR da festa</p>
        <p className="mt-1 text-sm leading-6 text-[#7c5560]">{chamada}</p>
        <p className="mt-2 break-all text-xs font-medium text-[#a04a63]">{dados.urlMemorias}</p>
      </div>
      <MateriaisMemorias
        titulo={cfg.anfitrioes.exibicao}
        urlMemorias={dados.urlMemorias}
        qrDataUrl={qr}
        ornamentoInicial={dados.ornamentoId ?? cfg.ornamentoId ?? undefined}
        desafiosInicial={dados.ativo ? dados.desafios : { ativo: false, titulo: '', ids: [] }}
        onSalvarDesafios={dados.ativo ? salvarDesafios : undefined}
      />
    </div>
  );
}
