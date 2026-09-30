'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Check,
  CheckCircle2,
  CircleDollarSign,
  ExternalLink,
  Gift,
  HandCoins,
  Loader2,
  Plus,
  QrCode,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react';
import HoraGravataWhatsAppCard from './HoraGravataWhatsAppCard';
import HoraGravataFinanceiro from './HoraGravataFinanceiro';

type Estado = {
  config: {
    eventoId: string;
    status: 'nao_contratado' | 'aguardando_pagamento' | 'ativo';
    precoCentavos: number;
    nomeAcao: string;
    textoPublico: string;
    valoresSugeridosCentavos: number[];
    metaCentavos: number | null;
    mostrarTotal: boolean;
    mostrarValorIndividual: boolean;
    permitirAnonimo: boolean;
    arrecadacaoAberta: boolean;
    abertaEm: string | null;
    encerradaEm: string | null;
    compradoEm: string | null;
  };
  evento: { dataEvento: string | null };
  whatsapp: { ativo: boolean };
  nomesSugeridos: string[];
};

function brl(centavos: number) {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function paraReais(centavos: number) {
  return (centavos / 100).toFixed(2).replace('.', ',');
}

function paraCentavos(valor: string) {
  const limpo = valor.replace(/\s/g, '').replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '');
  const n = Number(limpo);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
}

export default function HoraGravataPainel({
  eventoId,
  token,
  slug,
  onAbrirPapelaria,
}: {
  eventoId: string;
  token: string;
  slug: string;
  onAbrirPapelaria?: () => void;
}) {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  const [nomeAcao, setNomeAcao] = useState('Hora da Gravata');
  const [textoPublico, setTextoPublico] = useState('');
  const [valores, setValores] = useState<string[]>(['10,00', '20,00', '50,00', '100,00']);
  const [meta, setMeta] = useState('');
  const [mostrarTotal, setMostrarTotal] = useState(true);
  const [mostrarValorIndividual, setMostrarValorIndividual] = useState(false);
  const [permitirAnonimo, setPermitirAnonimo] = useState(false);
  const [arrecadacaoAberta, setArrecadacaoAberta] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await fetch(`/api/conviteria/gestao/gravata?eventoId=${encodeURIComponent(eventoId)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.erro || 'Não foi possível carregar a Hora da Gravata.');
      setEstado(d);
      setNomeAcao(d.config.nomeAcao || 'Hora da Gravata');
      setTextoPublico(d.config.textoPublico || '');
      setValores((d.config.valoresSugeridosCentavos || []).map((v: number) => paraReais(v)));
      setMeta(d.config.metaCentavos ? paraReais(d.config.metaCentavos) : '');
      setMostrarTotal(d.config.mostrarTotal !== false);
      setMostrarValorIndividual(d.config.mostrarValorIndividual === true);
      setPermitirAnonimo(d.config.permitirAnonimo === true);
      setArrecadacaoAberta(d.config.arrecadacaoAberta === true);
      setErro('');
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível carregar.');
    } finally {
      setCarregando(false);
    }
  }, [eventoId, token]);

  useEffect(() => { void carregar(); }, [carregar]);

  const valoresCentavos = useMemo(
    () => valores.map(paraCentavos).filter((v) => v >= 100),
    [valores],
  );

  function mudarValor(indice: number, valor: string) {
    setValores((atuais) => atuais.map((v, i) => i === indice ? valor : v));
  }

  function removerValor(indice: number) {
    setValores((atuais) => atuais.filter((_, i) => i !== indice));
  }

  async function baixarQrFesta() {
    try {
      const QRCode = (await import('qrcode')).default;
      const src = await QRCode.toDataURL(`https://${slug}.conviteia.com/memorias`, {
        width: 1400,
        margin: 3,
        errorCorrectionLevel: 'H',
      });
      const a = document.createElement('a');
      a.href = src;
      a.download = `QR-Festa-${slug}.png`;
      a.click();
    } catch {
      setErro('Não foi possível gerar o QR Code agora.');
    }
  }

  async function salvar() {
    if (!estado || estado.config.status !== 'ativo') return;
    setSalvando(true); setErro(''); setAviso('');
    try {
      if (!nomeAcao.trim()) throw new Error('Informe o nome da atividade.');
      if (!valoresCentavos.length) throw new Error('Informe ao menos um valor sugerido.');

      const r = await fetch('/api/conviteria/gestao/gravata', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          eventoId,
          nomeAcao,
          textoPublico,
          valoresSugeridosCentavos: valoresCentavos,
          metaCentavos: meta.trim() ? paraCentavos(meta) : null,
          mostrarTotal,
          mostrarValorIndividual,
          permitirAnonimo,
          arrecadacaoAberta,
        }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.erro || 'Não foi possível salvar.');
      setAviso('Configurações da Hora da Gravata salvas.');
      await carregar();
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) return <div className="grid min-h-64 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-[#c06078]" /></div>;
  if (!estado) return <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{erro || 'Não foi possível carregar.'}</p>;

  const status = estado.config.status;
  const ativo = status === 'ativo';
  const pendente = status === 'aguardando_pagamento';

  if (!ativo) {
    return <section className="space-y-4">
      <div className="overflow-hidden rounded-3xl border border-[#c0607833] bg-white">
        <div className="bg-[linear-gradient(135deg,#fff7fa,#fff)] p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff0f4] text-[#a04a63]"><HandCoins className="h-5 w-5" /></span>
              <h2 className="mt-4 text-xl font-semibold text-[#40232c]">Hora da Gravata</h2>
              <p className="mt-2 text-sm leading-6 text-[#7c5560]">Receba contribuições por PIX durante a festa, personalize o nome da atividade e transforme cada pagamento confirmado em uma experiência ao vivo no evento.</p>
            </div>
            <div className="shrink-0 text-left sm:text-right">
              <p className="text-xs uppercase tracking-wide text-[#9b7b84]">Adicional por evento</p>
              <strong className="mt-1 block text-2xl text-[#a04a63]">{brl(estado.config.precoCentavos)}</strong>
            </div>
          </div>
          <div className="mt-5 grid gap-2 text-sm text-[#7c5560] sm:grid-cols-2">
            <span className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" />Valores sugeridos e valor livre</span>
            <span className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" />Meta e total opcionais</span>
            <span className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" />Integração com Memórias/telão</span>
            <span className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" />Aviso no WhatsApp quando contratado</span>
          </div>
          <Link href={`/convite/pagar?evento=${encodeURIComponent(eventoId)}&gravata=1`} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#c06078] px-5 py-3 text-sm font-semibold text-white">
            <CircleDollarSign className="h-4 w-4" />{pendente ? 'Continuar pagamento' : 'Ativar Hora da Gravata'}
          </Link>
          {pendente && <p className="mt-3 text-xs font-medium text-amber-700">Já existe um PIX pendente para este adicional. O checkout tentará reutilizá-lo.</p>}
        </div>
      </div>
      {erro && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{erro}</p>}
    </section>;
  }

  return <section className="space-y-5">
    <div className="rounded-2xl border border-[#c0607833] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><HandCoins className="h-5 w-5 text-[#a04a63]" /><h2 className="font-semibold">Hora da Gravata</h2></div>
          <p className="mt-1 text-sm text-[#7c5560]">Personalize como a atividade será chamada e controle a experiência que os convidados verão.</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />ATIVO</span>
      </div>
    </div>

    {erro && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{erro}</p>}
    {aviso && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{aviso}</p>}

    <div className="rounded-2xl border border-[#c0607833] bg-white p-5">
      <h3 className="font-semibold">Acesso da festa</h3>
      <p className="mt-1 text-sm text-[#7c5560]">A página pública, o telão e a Papelaria usam o mesmo QR da experiência do evento.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <a href={`https://${slug}.conviteia.com/memorias`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-[#c0607840] bg-white px-4 py-2.5 text-sm font-semibold text-[#a04a63]">Abrir página do convidado <ExternalLink className="h-3.5 w-3.5" /></a>
        <a href={`https://${slug}.conviteia.com/album`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-[#40232c] px-4 py-2.5 text-sm font-semibold text-white">Abrir telão <ExternalLink className="h-3.5 w-3.5" /></a>
        <button type="button" onClick={() => void baixarQrFesta()} className="inline-flex items-center gap-1.5 rounded-full border border-[#c0607840] bg-white px-4 py-2.5 text-sm font-semibold text-[#a04a63]"><QrCode className="h-4 w-4" />Baixar QR</button>
        {onAbrirPapelaria && <button type="button" onClick={onAbrirPapelaria} className="inline-flex items-center gap-1.5 rounded-full border border-[#c0607840] bg-white px-4 py-2.5 text-sm font-semibold text-[#a04a63]"><Sparkles className="h-4 w-4" />Ir para Papelaria</button>}
      </div>
    </div>

    <div className="rounded-2xl border border-[#c0607833] bg-white p-5">
      <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-[#a04a63]" /><h3 className="font-semibold">Nome e apresentação</h3></div>
      <p className="mt-1 text-sm text-[#7c5560]">“Hora da Gravata” é o padrão, mas você pode adaptar para o tipo de festa.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {estado.nomesSugeridos.map((nome) => <button key={nome} type="button" onClick={() => setNomeAcao(nome)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${nomeAcao === nome ? 'border-[#c06078] bg-[#fff0f4] text-[#a04a63]' : 'border-[#c0607833] bg-white text-[#7c5560]'}`}>{nome}</button>)}
      </div>

      <label className="mt-4 block text-sm font-medium text-[#40232c]">Nome da atividade
        <input value={nomeAcao} onChange={(e) => setNomeAcao(e.target.value)} maxLength={80} className="mt-1.5 w-full rounded-xl border border-[#c0607833] px-3 py-2.5 outline-none focus:border-[#c06078]" />
      </label>

      <label className="mt-4 block text-sm font-medium text-[#40232c]">Texto para os convidados
        <textarea value={textoPublico} onChange={(e) => setTextoPublico(e.target.value)} maxLength={500} rows={3} placeholder="Ex.: Participe deste momento com a gente. Escolha um valor e faça sua contribuição por PIX." className="mt-1.5 w-full resize-y rounded-xl border border-[#c0607833] px-3 py-2.5 outline-none focus:border-[#c06078]" />
      </label>
    </div>

    <div className="rounded-2xl border border-[#c0607833] bg-white p-5">
      <div className="flex items-center gap-2"><Gift className="h-5 w-5 text-[#a04a63]" /><h3 className="font-semibold">Valores e meta</h3></div>
      <p className="mt-1 text-sm text-[#7c5560]">Defina os atalhos que aparecem para o convidado. O valor livre continuará disponível.</p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {valores.map((valor, i) => <div key={`${i}`} className="flex items-center gap-2 rounded-xl border border-[#c0607828] bg-[#fff9fb] p-2">
          <span className="pl-2 text-xs font-semibold text-[#7c5560]">R$</span>
          <input inputMode="decimal" value={valor} onChange={(e) => mudarValor(i, e.target.value)} className="min-w-0 flex-1 bg-transparent py-1 text-sm font-semibold outline-none" />
          {valores.length > 1 && <button type="button" onClick={() => removerValor(i)} className="grid h-8 w-8 place-items-center rounded-lg text-[#9b7b84] hover:bg-white" aria-label="Remover valor"><Trash2 className="h-4 w-4" /></button>}
        </div>)}
      </div>
      {valores.length < 6 && <button type="button" onClick={() => setValores((v) => [...v, ''])} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#c0607833] px-3 py-2 text-xs font-semibold text-[#a04a63]"><Plus className="h-3.5 w-3.5" />Adicionar valor</button>}

      <label className="mt-5 block text-sm font-medium text-[#40232c]">Meta opcional
        <div className="mt-1.5 flex items-center rounded-xl border border-[#c0607833] px-3"><span className="text-sm text-[#7c5560]">R$</span><input inputMode="decimal" value={meta} onChange={(e) => setMeta(e.target.value)} placeholder="Sem meta" className="w-full px-2 py-2.5 outline-none" /></div>
      </label>
    </div>

    <div className="rounded-2xl border border-[#c0607833] bg-white p-5">
      <h3 className="font-semibold">O que aparece durante a festa</h3>
      <div className="mt-4 space-y-3">
        <label className="flex items-start justify-between gap-4 rounded-xl bg-[#fff9fb] p-3"><span><strong className="block text-sm">Mostrar total arrecadado</strong><span className="text-xs text-[#7c5560]">Exibe o total geral quando a experiência permitir.</span></span><input type="checkbox" checked={mostrarTotal} onChange={(e) => setMostrarTotal(e.target.checked)} className="mt-1 h-4 w-4 accent-[#c06078]" /></label>
        <label className="flex items-start justify-between gap-4 rounded-xl bg-[#fff9fb] p-3"><span><strong className="block text-sm">Mostrar valor individual</strong><span className="text-xs text-[#7c5560]">Quando desligado, o telão mostra somente que a pessoa participou.</span></span><input type="checkbox" checked={mostrarValorIndividual} onChange={(e) => setMostrarValorIndividual(e.target.checked)} className="mt-1 h-4 w-4 accent-[#c06078]" /></label>
        <label className="flex items-start justify-between gap-4 rounded-xl bg-[#fff9fb] p-3"><span><strong className="block text-sm">Permitir contribuição anônima</strong><span className="text-xs text-[#7c5560]">O convidado poderá ocultar seu nome da exibição pública.</span></span><input type="checkbox" checked={permitirAnonimo} onChange={(e) => setPermitirAnonimo(e.target.checked)} className="mt-1 h-4 w-4 accent-[#c06078]" /></label>
      </div>
    </div>

    <div className="rounded-2xl border border-[#c0607833] bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Recebimento de contribuições</h3>
          <p className="mt-1 text-sm text-[#7c5560]">Abra quando quiser começar a receber. Encerrar não cancela o adicional e poderá ser revertido.</p>
        </div>
        <button type="button" onClick={() => setArrecadacaoAberta((v) => !v)} className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${arrecadacaoAberta ? 'border border-rose-200 bg-rose-50 text-rose-700' : 'bg-[#c06078] text-white'}`}>{arrecadacaoAberta ? 'Encerrar recebimento' : 'Abrir recebimento'}</button>
      </div>
      <p className={`mt-3 text-xs font-semibold ${arrecadacaoAberta ? 'text-emerald-700' : 'text-[#9b7b84]'}`}>{arrecadacaoAberta ? '● Contribuições liberadas' : '○ Contribuições fechadas'}</p>
    </div>

    <HoraGravataFinanceiro eventoId={eventoId} token={token} />

    <HoraGravataWhatsAppCard eventoId={eventoId} token={token} />

    <div className="sticky bottom-3 z-10 flex justify-end">
      <button disabled={salvando} onClick={() => void salvar()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#c06078] px-5 py-3 text-sm font-semibold text-white shadow-lg disabled:opacity-60">{salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Salvar Hora da Gravata</button>
    </div>
  </section>;
}
