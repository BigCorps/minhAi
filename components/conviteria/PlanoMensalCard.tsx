'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarClock, Check, Copy, Loader2, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { brl } from '@/lib/conviteria/precos';

export default function PlanoMensalCard() {
  const [d, setD] = useState<any>(null);
  const [pix, setPix] = useState<any>(null);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const baseExpiraRef = useRef<string | null>(null);

  const token = useCallback(async () =>
    (await createClient().auth.getSession()).data.session?.access_token ?? '', []);

  const carregar = useCallback(async () => {
    setErro('');
    try {
      const r = await fetch('/api/conviteria/plano', {
        headers: { Authorization: `Bearer ${await token()}` },
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.erro);

      if (pix && j.expiraEm && j.expiraEm !== baseExpiraRef.current) {
        setPix(null);
        setSucesso(`Pagamento confirmado. Seu plano está válido por ${j.diasRestantes} dias.`);
      }
      setD(j);
    } catch (e: any) {
      setErro(e.message || 'Falha ao carregar o plano.');
    } finally {
      setCarregando(false);
    }
  }, [token, pix]);

  useEffect(() => { void carregar(); }, [carregar]);

  useEffect(() => {
    if (!pix) return;
    const id = setInterval(() => void carregar(), 5000);
    return () => clearInterval(id);
  }, [pix, carregar]);

  async function gerar() {
    setGerando(true); setErro(''); setSucesso('');
    baseExpiraRef.current = d?.expiraEm ?? null;
    try {
      const r = await fetch('/api/conviteria/plano', {
        method: 'POST',
        headers: { Authorization: `Bearer ${await token()}` },
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.erro);
      setPix(j);
    } catch (e: any) {
      setErro(e.message || 'Falha ao gerar PIX.');
    } finally {
      setGerando(false);
    }
  }

  async function copiar() {
    if (!pix?.copiaECola) return;
    await navigator.clipboard.writeText(pix.copiaECola);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1800);
  }

  if (carregando && !d) {
    return <section className="mb-6 rounded-2xl border bg-white p-5">
      <Loader2 className="h-5 w-5 animate-spin" style={{ color:'#c06078' }} />
    </section>;
  }

  const ativo = !!d?.ativo;

  return (
    <section className="mb-6 rounded-2xl border bg-white p-5"
      style={{ borderColor:'#c0607833' }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-semibold" style={{ color:'#40232c' }}>
            <CalendarClock className="h-5 w-5" style={{ color:'#c06078' }} /> Plano mensal
          </div>
          <p className="mt-1 text-sm" style={{ color:'#7c5560' }}>
            {ativo
              ? `Ativo — ${d.diasRestantes} dia${d.diasRestantes === 1 ? '' : 's'} restante${d.diasRestantes === 1 ? '' : 's'}.`
              : 'Inativo. Assine para publicar convites ilimitados.'}
          </p>
          {d?.expiraEm && (
            <p className="mt-1 text-xs" style={{ color:'#7c5560' }}>
              Validade: {new Date(d.expiraEm).toLocaleDateString('pt-BR')}
            </p>
          )}
        </div>
        <strong className="whitespace-nowrap" style={{ color:'#a04a63' }}>
          {brl(d?.mensalidadeCentavos ?? 14990)}/mês
        </strong>
      </div>

      {ativo && d.diasRestantes <= 5 && (
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Seu plano vence em breve. Você já pode pagar a próxima mensalidade.
        </p>
      )}

      {sucesso && (
        <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
          {sucesso}
        </p>
      )}

      {!pix ? (
        <button type="button" onClick={gerar} disabled={gerando}
          className="mt-4 rounded-full px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor:'#c06078' }}>
          {gerando ? 'Gerando PIX…'
            : ativo ? 'Pagar próxima mensalidade por PIX' : 'Assinar plano mensal por PIX'}
        </button>
      ) : (
        <div className="mt-4 rounded-2xl border p-4" style={{ backgroundColor:'#fff9fb', borderColor:'#c0607830' }}>
          <p className="mb-3 text-center text-lg font-semibold" style={{ color:'#40232c' }}>
            {brl(pix.valorCentavos)}
          </p>

          {pix.qrcode && (
            <img src={pix.qrcode} alt="QR Code PIX"
              className="mx-auto h-48 w-48 rounded-xl border bg-white p-2"
              style={{ borderColor:'#c0607830' }} />
          )}

          {pix.copiaECola && (
            <button type="button" onClick={copiar}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-medium"
              style={{ borderColor:'#c0607840', color:'#40232c' }}>
              {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copiado ? 'Código copiado!' : 'Copiar PIX'}
            </button>
          )}

          <p className="mt-3 text-center text-xs" style={{ color:'#7c5560' }}>
            A confirmação é automática. Esta área atualiza a cada poucos segundos.
          </p>

          <button type="button" onClick={() => void carregar()}
            className="mt-2 inline-flex w-full items-center justify-center gap-1 text-xs"
            style={{ color:'#a04a63' }}>
            <RefreshCw className="h-3.5 w-3.5" /> Já paguei — verificar agora
          </button>
        </div>
      )}

      {erro && <p className="mt-3 text-xs text-red-700">{erro}</p>}
    </section>
  );
}
