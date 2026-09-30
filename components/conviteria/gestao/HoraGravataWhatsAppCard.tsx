'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, CheckCircle2, Eye, Loader2, MessageCircle, Save, X } from 'lucide-react';

type Dados = {
  gravataAtiva: boolean;
  whatsappAtivo: boolean;
  template: string;
  programadoEm: string | null;
  disparadoEm: string | null;
  erro: string | null;
  nomeAcao: string;
  evento: { dataEvento: string | null; anfitrioes: string; tipo: string };
  resumo: { elegiveis: number; enviados: number; falhas: number; reservados: number };
};

function horaDeIso(iso?: string | null) {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Sao_Paulo',
    }).format(new Date(iso));
  } catch { return ''; }
}

function dataHora(iso?: string | null) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo',
    }).format(new Date(iso));
  } catch { return '—'; }
}

export default function HoraGravataWhatsAppCard({ eventoId, token }: { eventoId: string; token: string }) {
  const [dados, setDados] = useState<Dados | null>(null);
  const [hora, setHora] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [preview, setPreview] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await fetch(`/api/conviteria/gravata/whatsapp?eventoId=${encodeURIComponent(eventoId)}`, {
        headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.erro || 'Não foi possível carregar o aviso da Hora da Gravata.');
      setDados(d);
      setHora(horaDeIso(d.programadoEm));
      setErro('');
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível carregar.');
    } finally { setCarregando(false); }
  }, [eventoId, token]);

  useEffect(() => { void carregar(); }, [carregar]);

  async function salvar() {
    if (!hora || salvando) return;
    setSalvando(true); setErro(''); setAviso('');
    try {
      const r = await fetch('/api/conviteria/gravata/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ eventoId, hora }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.erro || 'Não foi possível agendar.');
      setAviso('Aviso da Hora da Gravata programado.');
      await carregar();
    } catch (e: any) { setErro(e?.message || 'Não foi possível agendar.'); }
    finally { setSalvando(false); }
  }

  async function cancelar() {
    if (!confirm('Cancelar o aviso programado da Hora da Gravata?')) return;
    setSalvando(true); setErro(''); setAviso('');
    try {
      const r = await fetch(`/api/conviteria/gravata/whatsapp?eventoId=${encodeURIComponent(eventoId)}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.erro || 'Não foi possível cancelar.');
      setAviso('Agendamento cancelado.');
      setHora('');
      await carregar();
    } catch (e: any) { setErro(e?.message || 'Não foi possível cancelar.'); }
    finally { setSalvando(false); }
  }

  if (carregando) return <div className="grid min-h-36 place-items-center rounded-2xl border border-[#c0607830] bg-white"><Loader2 className="h-5 w-5 animate-spin text-[#a04a63]" /></div>;
  if (!dados) return <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{erro || 'Não foi possível carregar.'}</div>;

  return <section className="rounded-2xl border border-[#c0607833] bg-white p-4 sm:p-5">
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#fff5f8] text-[#a04a63]"><MessageCircle className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-[#40232c]">Aviso pelo WhatsApp</h3>
        <p className="mt-1 text-sm leading-6 text-[#7c5560]">Com o WhatsApp do Evento ativo, envie uma atualização Utility aos convidados confirmados no horário escolhido no dia da festa. Este envio é separado das duas comunicações de RSVP.</p>
      </div>
    </div>

    {!dados.whatsappAtivo ? <div className="mt-4 rounded-xl bg-[#fff9fb] p-4 text-sm text-[#7c5560]">Ative o <strong className="text-[#40232c]">WhatsApp do Evento</strong> para liberar este disparo. A Hora da Gravata continua funcionando normalmente sem ele.</div> : dados.disparadoEm ? <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"><p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4" />Aviso concluído</p><p className="mt-1 text-xs">Enviado em {dataHora(dados.disparadoEm)} · {dados.resumo.enviados} aceito(s) pela Meta{dados.resumo.falhas ? ` · ${dados.resumo.falhas} falha(s)` : ''}.</p></div> : <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
      <label className="text-xs font-semibold text-[#69434f]">Horário no dia do evento
        <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="mt-1.5 block w-full rounded-xl border border-[#c0607835] bg-white px-3 py-2.5 text-sm font-normal text-[#40232c]" />
      </label>
      <button type="button" disabled={!hora || salvando} onClick={() => void salvar()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#c06078] px-4 text-sm font-semibold text-white disabled:opacity-45">{salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Salvar horário</button>
    </div>}

    {dados.whatsappAtivo && !dados.disparadoEm && <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
      <button type="button" onClick={() => setPreview(true)} className="inline-flex items-center gap-1.5 rounded-full border border-[#c0607840] bg-white px-3 py-2 font-semibold text-[#a04a63]"><Eye className="h-3.5 w-3.5" />Ver prévia</button>
      {dados.programadoEm && <><span className="inline-flex items-center gap-1 text-[#7c5560]"><CalendarClock className="h-3.5 w-3.5" />Programado: {dataHora(dados.programadoEm)}</span><button type="button" disabled={salvando} onClick={() => void cancelar()} className="font-semibold text-red-600">Cancelar</button></>}
    </div>}

    <p className="mt-3 text-xs text-[#7c5560]">Elegíveis agora: <strong className="text-[#40232c]">{dados.resumo.elegiveis}</strong> contato(s) confirmado(s). Pendentes e “não vai” não recebem.</p>
    {dados.erro && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">{dados.erro}</p>}
    {erro && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{erro}</p>}
    {aviso && <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{aviso}</p>}

    {preview && <div className="fixed inset-0 z-[120] grid place-items-center bg-black/45 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setPreview(false); }}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-4 py-3"><strong className="text-[#202c33]">Prévia do WhatsApp</strong><button onClick={() => setPreview(false)} className="rounded-full p-2 text-[#667781]"><X className="h-5 w-5" /></button></div>
        <div className="bg-[#efeae2] p-4">
          <div className="rounded-xl bg-white px-4 py-4 text-[15px] leading-6 text-[#111b21] shadow-sm">
            <p>Olá, <strong>Mariana</strong>!</p>
            <p className="mt-3">Uma atividade do {dados.evento.tipo} de <strong>{dados.evento.anfitrioes}</strong> está disponível agora:</p>
            <p className="mt-3"><strong>{dados.nomeAcao}</strong></p>
            <p className="mt-3">As informações e instruções para participar estão disponíveis no botão abaixo.</p>
            <p className="mt-3">Esta é uma atualização referente ao evento para o qual sua presença está confirmada.</p>
            <div className="mt-4 border-t pt-3 text-center font-medium text-[#00a884]">Ver atividade do evento</div>
          </div>
        </div>
      </div>
    </div>}
  </section>;
}
