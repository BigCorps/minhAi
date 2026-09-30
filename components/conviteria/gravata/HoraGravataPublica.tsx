'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  HandCoins,
  Loader2,
  QrCode,
  Sparkles,
} from 'lucide-react';

export type OrigemHoraGravata = 'qr' | 'whatsapp' | 'memorias' | 'link';

type ConfigPublica = {
  ativo: boolean;
  aberto: boolean;
  nomeAcao?: string;
  textoPublico?: string;
  valoresSugeridosCentavos?: number[];
  metaCentavos?: number | null;
  mostrarTotal?: boolean;
  mostrarValorIndividual?: boolean;
  permitirAnonimo?: boolean;
  totalCentavos?: number | null;
  participantes?: number;
};

type Pix = {
  contribuicaoId: string;
  transactionId: string;
  valorCentavos: number;
  qrcode?: string | null;
  copiaECola: string;
  expiresAt?: string | null;
};

function brl(centavos: number) {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function reaisParaCentavos(valor: string) {
  const limpo = valor.trim().replace(/\./g, '').replace(',', '.');
  const n = Number(limpo);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export default function HoraGravataPublica({
  eventoId,
  origem = 'link',
  nomeInicial = '',
  compacto = false,
  ocultarNome = false,
  linkToken = '',
}: {
  eventoId: string;
  origem?: OrigemHoraGravata;
  nomeInicial?: string;
  compacto?: boolean;
  ocultarNome?: boolean;
  linkToken?: string;
}) {
  const [cfg, setCfg] = useState<ConfigPublica | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [nome, setNome] = useState(nomeInicial);
  const [anonimo, setAnonimo] = useState(false);
  const [valorSelecionado, setValorSelecionado] = useState<number | null>(null);
  const [outroValor, setOutroValor] = useState('');
  const [pix, setPix] = useState<Pix | null>(null);
  const [gerando, setGerando] = useState(false);
  const [pago, setPago] = useState(false);
  const [erro, setErro] = useState('');
  const [copiado, setCopiado] = useState(false);
  const pollingEmVoo = useRef(false);

  const carregar = useCallback(async () => {
    const r = await fetch(`/api/conviteria/gravata/publica?eventoId=${encodeURIComponent(eventoId)}`, { cache: 'no-store' });
    const d = await r.json().catch(() => null);
    if (!r.ok) throw new Error(d?.erro || 'Não foi possível carregar esta atividade.');
    setCfg(d);
  }, [eventoId]);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        await carregar();
      } catch (e: any) {
        if (ativo) setErro(e?.message || 'Não foi possível carregar.');
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => { ativo = false; };
  }, [carregar]);

  useEffect(() => {
    if (nomeInicial && !nome) setNome(nomeInicial);
  }, [nomeInicial, nome]);

  const valorCentavos = useMemo(() => {
    if (valorSelecionado != null) return valorSelecionado;
    return reaisParaCentavos(outroValor);
  }, [valorSelecionado, outroValor]);

  async function gerarPix() {
    if (!cfg?.ativo || !cfg.aberto || gerando) return;
    setErro('');
    if (!anonimo && nome.trim().length < 2) {
      setErro('Informe seu nome para continuar.');
      return;
    }
    if (!Number.isSafeInteger(valorCentavos) || valorCentavos < 100) {
      setErro('Escolha ou informe um valor válido.');
      return;
    }

    setGerando(true);
    try {
      const r = await fetch('/api/conviteria/gravata/publica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventoId,
          origem,
          nome,
          anonimo,
          valorCentavos,
          linkToken: linkToken || undefined,
        }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.erro || 'Não foi possível gerar o PIX.');
      setPix({
        contribuicaoId: String(d.contribuicaoId),
        transactionId: String(d.transactionId),
        valorCentavos: Number(d.valorCentavos),
        qrcode: d.qrcode ?? null,
        copiaECola: String(d.copiaECola),
        expiresAt: d.expiresAt ?? null,
      });
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível gerar o PIX.');
    } finally {
      setGerando(false);
    }
  }

  const conferir = useCallback(async () => {
    if (!pix || pollingEmVoo.current || pago) return false;
    pollingEmVoo.current = true;
    try {
      const qs = new URLSearchParams({
        contribuicaoId: pix.contribuicaoId,
        transactionId: pix.transactionId,
      });
      const r = await fetch(`/api/conviteria/gravata/status?${qs}`, { cache: 'no-store' });
      const d = await r.json().catch(() => null);
      if (!r.ok) return false;
      if (d?.pago) {
        setPago(true);
        setErro('');
        await carregar().catch(() => undefined);
        return true;
      }
      if (d?.status === 'expirado') setErro('Este PIX expirou. Gere um novo pagamento para participar.');
      return false;
    } finally {
      pollingEmVoo.current = false;
    }
  }, [pix, pago, carregar]);

  useEffect(() => {
    if (!pix || pago) return;
    const primeiro = window.setTimeout(() => void conferir(), 5000);
    const id = window.setInterval(() => void conferir(), 4500);
    return () => { clearTimeout(primeiro); clearInterval(id); };
  }, [pix, pago, conferir]);

  async function copiarPix() {
    if (!pix?.copiaECola) return;
    await navigator.clipboard.writeText(pix.copiaECola);
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 1800);
  }

  if (carregando) {
    return <div className="flex items-center justify-center gap-2 rounded-2xl border border-[#c0607833] bg-white p-6 text-sm text-[#7c5560]"><Loader2 className="h-5 w-5 animate-spin" />Carregando atividade…</div>;
  }

  if (!cfg?.ativo) return null;

  if (pago) {
    return <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
      <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
      <h3 className="mt-3 text-lg font-semibold text-emerald-900">Pagamento confirmado!</h3>
      <p className="mt-1 text-sm leading-6 text-emerald-800">Sua participação na {cfg.nomeAcao || 'Hora da Gravata'} já foi registrada. Obrigado por fazer parte deste momento.</p>
    </section>;
  }

  if (pix) {
    return <section className="rounded-2xl border border-[#c0607833] bg-white p-4 sm:p-5">
      <div className="text-center">
        <QrCode className="mx-auto h-6 w-6 text-[#a04a63]" />
        <h3 className="mt-2 font-semibold text-[#40232c]">PIX da {cfg.nomeAcao || 'Hora da Gravata'}</h3>
        <p className="mt-1 text-sm text-[#7c5560]">Valor: <strong>{brl(pix.valorCentavos)}</strong></p>
      </div>
      {pix.qrcode && <img src={pix.qrcode} alt="QR Code PIX" className="mx-auto mt-4 h-52 w-52 rounded-xl border border-[#c0607833] bg-white p-2" />}
      <button type="button" onClick={() => void copiarPix()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[#c0607844] bg-white px-4 py-3 text-sm font-semibold text-[#a04a63]">
        {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copiado ? 'PIX copiado' : 'Copiar PIX copia e cola'}
      </button>
      <button type="button" onClick={() => void conferir()} className="mt-2 w-full rounded-xl bg-[#c06078] px-4 py-3 text-sm font-semibold text-white">Já paguei</button>
      <p className="mt-3 text-center text-xs leading-5 text-[#7c5560]">A confirmação também acontece automaticamente. Não feche esta tela até o pagamento ser identificado.</p>
      {erro && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{erro}</p>}
    </section>;
  }

  const valores = (cfg.valoresSugeridosCentavos ?? []).filter((v) => Number.isSafeInteger(v) && v > 0);
  const metaPercentual = cfg.mostrarTotal && cfg.metaCentavos && cfg.totalCentavos != null
    ? Math.min(100, Math.round((cfg.totalCentavos / cfg.metaCentavos) * 100))
    : null;

  return <section className={`rounded-2xl border border-[#c0607833] bg-white ${compacto ? 'p-4' : 'p-5 sm:p-6'}`}>
    <div className="flex items-start gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#fff0f4] text-[#a04a63]"><HandCoins className="h-5 w-5" /></span>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-[#a04a63]">Atividade do evento</p>
        <h3 className="mt-1 text-lg font-semibold text-[#40232c]">{cfg.nomeAcao || 'Hora da Gravata'}</h3>
        <p className="mt-1 text-sm leading-6 text-[#7c5560]">{cfg.textoPublico || 'Escolha um valor e faça sua contribuição por PIX de forma rápida e segura.'}</p>
      </div>
    </div>

    {!cfg.aberto ? <div className="mt-5 rounded-xl bg-[#fff9fb] p-4 text-sm text-[#7c5560]">Esta atividade ainda não está aberta para contribuições.</div> : <>
      {cfg.mostrarTotal && cfg.totalCentavos != null && <div className="mt-5 rounded-xl bg-[#fff9fb] p-4">
        <div className="flex items-center justify-between gap-3 text-sm"><span className="text-[#7c5560]">Total até agora</span><strong className="text-[#40232c]">{brl(cfg.totalCentavos)}</strong></div>
        {metaPercentual != null && <><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#f3dce3]"><div className="h-full rounded-full bg-[#c06078]" style={{ width: `${metaPercentual}%` }} /></div><p className="mt-1 text-right text-[11px] text-[#7c5560]">{metaPercentual}% da meta</p></>}
      </div>}

      <div className="mt-5">
        {!ocultarNome && <label className="text-sm font-medium text-[#40232c]">Seu nome
          <input value={nome} onChange={(e) => setNome(e.target.value)} disabled={anonimo} maxLength={100} placeholder="Nome e sobrenome" className="mt-1.5 w-full rounded-xl border border-[#c0607833] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#c06078] disabled:bg-slate-50 disabled:text-slate-400" />
        </label>}
        {cfg.permitirAnonimo && <label className={`${ocultarNome ? '' : 'mt-3 '}flex cursor-pointer items-center gap-2 text-xs text-[#7c5560]`}><input type="checkbox" checked={anonimo} onChange={(e) => setAnonimo(e.target.checked)} className="accent-[#c06078]" />Participar de forma anônima</label>}
      </div>

      <div className="mt-5">
        <p className="text-sm font-medium text-[#40232c]">Escolha um valor</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {valores.map((v) => <button key={v} type="button" onClick={() => { setValorSelecionado(v); setOutroValor(''); }} className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${valorSelecionado === v ? 'border-[#c06078] bg-[#fff0f4] text-[#a04a63]' : 'border-[#c0607833] bg-white text-[#40232c]'}`}>{brl(v)}</button>)}
        </div>
        <label className="mt-3 block text-xs font-medium text-[#7c5560]">Outro valor
          <div className="mt-1 flex items-center rounded-xl border border-[#c0607833] bg-white px-3"><span className="text-sm text-[#7c5560]">R$</span><input inputMode="decimal" value={outroValor} onChange={(e) => { setOutroValor(e.target.value); setValorSelecionado(null); }} placeholder="0,00" className="w-full px-2 py-2.5 text-sm outline-none" /></div>
        </label>
      </div>

      <button type="button" disabled={gerando || valorCentavos < 100} onClick={() => void gerarPix()} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#c06078] px-4 py-3 font-semibold text-white disabled:opacity-50">
        {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{gerando ? 'Gerando PIX…' : valorCentavos > 0 ? `Contribuir com ${brl(valorCentavos)}` : 'Escolher valor'}
      </button>
      <p className="mt-2 text-center text-[11px] leading-5 text-[#9b7b84]">Pagamento por PIX. A ConviteIA desconta 1% antes de creditar o saldo do evento.</p>
    </>}

    {cfg.participantes != null && cfg.participantes > 0 && <p className="mt-4 text-center text-xs text-[#7c5560]">{cfg.participantes} participação{cfg.participantes === 1 ? '' : 'ões'} confirmada{cfg.participantes === 1 ? '' : 's'} até agora.</p>}
    {erro && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{erro}</p>}
  </section>;
}
