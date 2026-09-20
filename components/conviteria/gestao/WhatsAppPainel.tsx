'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  Copy,
  CreditCard,
  Loader2,
  MessageCircle,
  RefreshCw,
  Send,
  Smartphone,
} from 'lucide-react';

type Modo = '2_meses' | '1_mes' | '15_dias';
type Estado = {
  config: null | {
    status: 'nao_contratado' | 'aguardando_pagamento' | 'ativo';
    lembrete_modo?: Modo | null;
    segundo_programado_em?: string | null;
    primeiro_disparo_em?: string | null;
    segundo_disparo_em?: string | null;
    consentimento_declarado_em?: string | null;
  };
  precoCentavos: number;
  limiteMensagens: number;
  contatosComWhatsApp: number;
  pendentesRsvp: number;
  novosPrimeiroEnvio: number;
  faltamSegundoEnvio: number;
  mensagensUsadas: number;
  mensagensRestantes: number;
  rsvpPrazo?: string | null;
  rsvpPrazoTexto?: string | null;
  rsvpEncerrado?: boolean;
  telefonesTransmissao: string[];
  evento?: { dataEvento?: string | null; anfitrioes: string; tipo: string } | null;
  pixPendente?: { transactionId: string; copiaECola?: string | null; qrcode?: string | null; expiresAt?: string | null } | null;
};

type Pix = { transactionId?: string; copiaECola?: string | null; qrcode?: string | null; expiresAt?: string | null } | null;

const ROTULOS: Record<Modo, string> = {
  '2_meses': '2 meses antes',
  '1_mes': '1 mês antes',
  '15_dias': '15 dias antes',
};

function brl(centavos: number) {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function dataBr(data?: string | null) {
  if (!data) return '—';
  const d = new Date(data);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeZone: 'America/Sao_Paulo' }).format(d);
}

export default function WhatsAppPainel({ eventoId, token, slug }: { eventoId: string; token: string; slug: string }) {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [consentimento, setConsentimento] = useState(false);
  const [modo, setModo] = useState<Modo>('15_dias');
  const [pix, setPix] = useState<Pix>(null);

  const carregar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCarregando(true);
    try {
      const r = await fetch(`/api/conviteria/gestao/whatsapp?eventoId=${encodeURIComponent(eventoId)}`, {
        headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.erro || 'Não foi possível carregar o WhatsApp do Evento.');
      setEstado(d);
      if (d?.config?.lembrete_modo) setModo(d.config.lembrete_modo);
      if (d?.config?.consentimento_declarado_em) setConsentimento(true);
      if (d?.pixPendente) setPix(d.pixPendente);
      setErro('');
    } catch (e: any) {
      setErro(e.message || 'Falha ao carregar.');
    } finally {
      if (!silencioso) setCarregando(false);
    }
  }, [eventoId, token]);

  useEffect(() => { void carregar(); }, [carregar]);
  useEffect(() => {
    if (estado?.config?.status !== 'aguardando_pagamento') return;
    const id = window.setInterval(() => void carregar(true), 6000);
    return () => window.clearInterval(id);
  }, [estado?.config?.status, carregar]);

  async function post(body: any) {
    const r = await fetch('/api/conviteria/gestao/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ eventoId, ...body }),
    });
    const d = await r.json().catch(() => null);
    if (!r.ok) throw new Error(d?.erro || 'Não foi possível concluir a operação.');
    return d;
  }

  async function contratar() {
    setOcupado(true); setErro(''); setAviso('');
    try {
      const d = await post({ acao: 'criar_pix', consentimento, lembreteModo: modo });
      if (d.ativo || d.semCobranca) {
        setAviso('WhatsApp do Evento já está ativo.');
        await carregar(true);
        return;
      }
      setPix({ transactionId: d.transactionId, copiaECola: d.copiaECola, qrcode: d.qrcode, expiresAt: d.expiresAt });
      setAviso('PIX gerado. Assim que o pagamento for confirmado, o pacote será ativado automaticamente.');
      await carregar(true);
    } catch (e: any) { setErro(e.message); }
    finally { setOcupado(false); }
  }

  async function salvarAgendamento() {
    setOcupado(true); setErro(''); setAviso('');
    try {
      const d = await post({ acao: 'agendar', lembreteModo: modo });
      setAviso(`Lembrete programado para ${dataBr(d.segundoProgramadoEm)}.`);
      await carregar(true);
    } catch (e: any) { setErro(e.message); }
    finally { setOcupado(false); }
  }

  async function enviarPrimeiro() {
    if (!confirm('Enviar agora a primeira comunicação somente para os contatos pendentes que ainda não receberam?')) return;
    setOcupado(true); setErro(''); setAviso('Enviando…');
    let total = 0; let falhas = 0;
    try {
      for (let i = 0; i < 15; i += 1) {
        const d = await post({ acao: 'enviar_primeiro' });
        total += Number(d.enviados ?? 0);
        falhas += Number(d.falhas ?? 0);
        setAviso(`Enviando… ${total} mensagem(ns) aceita(s) pela Meta.`);
        if (Number(d.restantes ?? 0) === 0 || Number(d.processados ?? 0) === 0) break;
      }
      setAviso(`${total} mensagem(ns) enviada(s) nesta operação${falhas ? ` · ${falhas} falha(s)` : ''}.`);
      await carregar(true);
    } catch (e: any) { setErro(e.message); }
    finally { setOcupado(false); }
  }

  async function copiar(valor: string, textoOk: string) {
    await navigator.clipboard.writeText(valor);
    setAviso(textoOk);
    window.setTimeout(() => setAviso(''), 2500);
  }

  const mensagemGratis = useMemo(() => {
    const ev = estado?.evento;
    if (!ev) return '';
    const prazo = estado?.rsvpPrazoTexto;
    return `Olá!
Precisamos da sua confirmação de presença para o ${ev.tipo} de ${ev.anfitrioes}.
Data: ${dataBr(ev.dataEvento)}${prazo ? `
Confirme sua presença até: ${prazo}` : ''}

Para finalizarmos a lista de convidados e os preparativos do evento, pedimos que a confirmação seja realizada dentro desse prazo. Após a data limite, a confirmação online será encerrada e não será possível incluir novos participantes pelo convite.

A entrada no evento será conferida com base na lista de convidados confirmados.

Acesse o convite e confirme sua presença:
https://${slug}.conviteia.com`;
  }, [estado?.evento, estado?.rsvpPrazoTexto, slug]);

  if (carregando) return <div className="grid place-items-center py-16"><Loader2 className="h-7 w-7 animate-spin text-[#c06078]" /></div>;
  if (!estado) return <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{erro || 'Não foi possível carregar.'}</p>;

  const status = estado.config?.status ?? 'nao_contratado';
  const ativo = status === 'ativo';
  const aguardando = status === 'aguardando_pagamento';
  const prazoConfigurado = Boolean(estado.rsvpPrazo);
  const bloqueadoPrazo = !prazoConfigurado || Boolean(estado.rsvpEncerrado);

  return <section className="space-y-5">
    <div className="rounded-2xl border border-[#c0607833] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-[#a04a63]"/><h2 className="text-lg font-semibold">WhatsApp do Evento</h2></div>
          <p className="mt-2 text-sm leading-6 text-[#7c5560]">Até <strong>600 mensagens</strong>, com no máximo 2 comunicações por família/contato. O botão de confirmação usa a mesma lista do convite, CSV, mesas e check-in.</p>
        </div>
        <div className={`rounded-full px-3 py-1.5 text-xs font-bold ${ativo?'bg-emerald-50 text-emerald-700':aguardando?'bg-amber-50 text-amber-700':'bg-[#fff0f4] text-[#a04a63]'}`}>
          {ativo ? 'ATIVO' : aguardando ? 'AGUARDANDO PIX' : brl(estado.precoCentavos)}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-[#fff9fb] p-3"><p className="text-xs text-[#7c5560]">Contatos com WhatsApp</p><p className="mt-1 text-xl font-semibold">{estado.contatosComWhatsApp}</p></div>
        <div className="rounded-xl bg-[#fff9fb] p-3"><p className="text-xs text-[#7c5560]">Aguardando RSVP</p><p className="mt-1 text-xl font-semibold">{estado.pendentesRsvp}</p></div>
        <div className="rounded-xl bg-[#fff9fb] p-3"><p className="text-xs text-[#7c5560]">Mensagens usadas</p><p className="mt-1 text-xl font-semibold">{estado.mensagensUsadas}</p></div>
        <div className="rounded-xl bg-[#fff9fb] p-3"><p className="text-xs text-[#7c5560]">Restantes</p><p className="mt-1 text-xl font-semibold">{estado.mensagensRestantes}</p></div>
      </div>
    </div>

    <div className={`rounded-2xl border p-4 ${bloqueadoPrazo ? 'border-amber-300 bg-amber-50/70' : 'border-emerald-200 bg-emerald-50/50'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-[#40232c]">Prazo de confirmação</p>
          {prazoConfigurado ? (
            <p className="mt-1 text-sm text-[#7c5560]">Os templates usam automaticamente <strong>{estado.rsvpPrazoTexto}</strong> como a variável <strong>{'{{5}}'}</strong>.</p>
          ) : (
            <p className="mt-1 text-sm text-amber-800">Defina a data em <strong>Gestão → Convidados → Prazo para confirmação</strong> antes de contratar ou enviar mensagens.</p>
          )}
          {estado.rsvpEncerrado && <p className="mt-1 text-sm font-medium text-amber-800">Este prazo já terminou. Altere a data em Convidados para reabrir o RSVP e os envios.</p>}
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${bloqueadoPrazo ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>{bloqueadoPrazo ? 'AÇÃO NECESSÁRIA' : 'CONFIGURADO'}</span>
      </div>
    </div>

    {!ativo && <div className="rounded-2xl border border-[#c0607833] bg-white p-5">
      <h3 className="font-semibold">Contratar por {brl(estado.precoCentavos)}</h3>
      <p className="mt-1 text-sm text-[#7c5560]">O primeiro comunicado é enviado quando você mandar. O segundo fica programado para uma única data.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="text-sm font-medium">Segundo comunicado
          <select value={modo} onChange={(e)=>setModo(e.target.value as Modo)} className="mt-1 block w-full rounded-xl border px-3 py-2.5">
            <option value="2_meses">2 meses antes</option><option value="1_mes">1 mês antes</option><option value="15_dias">15 dias antes</option>
          </select>
        </label>
        <div className="flex items-end"><button type="button" disabled={ocupado || !consentimento || bloqueadoPrazo} onClick={contratar} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#c06078] px-5 py-2.5 font-semibold text-white disabled:opacity-50">{ocupado?<Loader2 className="h-4 w-4 animate-spin"/>:<CreditCard className="h-4 w-4"/>}{aguardando?'Ver / renovar PIX':'Gerar PIX'}</button></div>
      </div>
      <label className="mt-4 flex items-start gap-2 text-xs leading-5 text-[#7c5560]"><input type="checkbox" checked={consentimento} onChange={(e)=>setConsentimento(e.target.checked)} className="mt-1"/><span>Declaro que os contatos informados podem receber comunicações deste evento pelo WhatsApp e sou responsável pela lista enviada.</span></label>

      {(pix?.copiaECola || aguardando) && <div className="mt-5 rounded-xl bg-[#fff9fb] p-4 text-center">
        {pix?.qrcode && <img src={pix.qrcode} alt="QR Code PIX" className="mx-auto h-48 w-48 rounded-xl bg-white p-2"/>}
        <p className="mt-2 text-sm font-semibold">PIX do WhatsApp do Evento</p>
        {pix?.copiaECola && <button type="button" onClick={()=>void copiar(pix.copiaECola!,'PIX copiado.')} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#c0607833] bg-white px-4 py-2 text-sm font-semibold text-[#a04a63]"><Copy className="h-4 w-4"/>Copiar PIX</button>}
        <p className="mt-2 text-xs text-[#7c5560]">A tela confere o pagamento automaticamente.</p>
      </div>}
    </div>}

    {ativo && <>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#c0607833] bg-white p-5">
          <div className="flex items-center gap-2"><Send className="h-5 w-5 text-[#a04a63]"/><h3 className="font-semibold">1ª comunicação</h3></div>
          <p className="mt-2 text-sm text-[#7c5560]">Só recebe quem ainda está pendente e nunca recebeu a primeira mensagem. Quem já confirmou pelo convite, CSV sincronizado ou painel não recebe cobrança de confirmação novamente.</p>
          <p className="mt-3 text-sm"><strong>{estado.novosPrimeiroEnvio}</strong> contato(s) apto(s) agora.</p>
          <button type="button" disabled={ocupado || bloqueadoPrazo || estado.novosPrimeiroEnvio===0} onClick={enviarPrimeiro} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#c06078] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{ocupado?<Loader2 className="h-4 w-4 animate-spin"/>:<Send className="h-4 w-4"/>}{estado.config?.primeiro_disparo_em?'Enviar para novos convidados':'Enviar primeira comunicação'}</button>
          {estado.config?.primeiro_disparo_em && <p className="mt-2 text-xs text-[#7c5560]">Primeiro envio iniciado em {dataBr(estado.config.primeiro_disparo_em)}.</p>}
        </div>

        <div className="rounded-2xl border border-[#c0607833] bg-white p-5">
          <div className="flex items-center gap-2"><CalendarClock className="h-5 w-5 text-[#a04a63]"/><h3 className="font-semibold">2ª comunicação · lembrete</h3></div>
          <p className="mt-2 text-sm text-[#7c5560]">Uma única rodada para a lista vigente na data programada, inclusive quem já confirmou, para revisar presença e informações atualizadas.</p>
          <label className="mt-3 block text-sm font-medium">Enviar
            <select value={modo} onChange={(e)=>setModo(e.target.value as Modo)} disabled={Boolean(estado.config?.segundo_disparo_em)} className="mt-1 block w-full rounded-xl border px-3 py-2.5">
              <option value="2_meses">2 meses antes</option><option value="1_mes">1 mês antes</option><option value="15_dias">15 dias antes</option>
            </select>
          </label>
          {!estado.config?.segundo_disparo_em && <button type="button" disabled={ocupado || bloqueadoPrazo} onClick={salvarAgendamento} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#c0607833] bg-white px-4 py-2.5 text-sm font-semibold text-[#a04a63]"><CalendarClock className="h-4 w-4"/>Salvar agendamento</button>}
          <p className="mt-2 text-xs text-[#7c5560]">Programado: {dataBr(estado.config?.segundo_programado_em)}</p>
          {estado.config?.segundo_disparo_em && <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4"/>Lembrete enviado.</p>}
        </div>
      </div>
    </>}

    <div className="rounded-2xl border border-[#c0607833] bg-white p-5">
      <div className="flex items-center gap-2"><Smartphone className="h-5 w-5 text-[#a04a63]"/><h3 className="font-semibold">Opção gratuita · seu próprio WhatsApp</h3></div>
      <p className="mt-2 text-sm text-[#7c5560]">Para quem prefere não usar o número do ConviteIA: copie a mensagem e os números pendentes para organizar uma lista de transmissão no seu WhatsApp. O mesmo prazo do RSVP é respeitado aqui.</p>
      <div className="mt-3 rounded-xl bg-[#fff9fb] p-3 text-sm whitespace-pre-line">{bloqueadoPrazo ? 'Defina ou reabra o prazo de confirmação em Convidados antes de preparar este envio.' : mensagemGratis}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={bloqueadoPrazo} onClick={()=>void copiar(mensagemGratis,'Mensagem copiada.')} className="inline-flex items-center gap-2 rounded-xl border border-[#c0607833] bg-white px-3 py-2 text-sm font-semibold text-[#a04a63] disabled:opacity-50"><Copy className="h-4 w-4"/>Copiar mensagem</button>
        <button type="button" disabled={bloqueadoPrazo || !estado.telefonesTransmissao?.length} onClick={()=>void copiar((estado.telefonesTransmissao??[]).join('\n'),'Telefones pendentes copiados.')} className="inline-flex items-center gap-2 rounded-xl border border-[#c0607833] bg-white px-3 py-2 text-sm font-semibold text-[#a04a63] disabled:opacity-50"><Copy className="h-4 w-4"/>Copiar números ({estado.telefonesTransmissao?.length??0})</button>
        {!bloqueadoPrazo ? <a href={`https://wa.me/?text=${encodeURIComponent(mensagemGratis)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"><MessageCircle className="h-4 w-4"/>Abrir WhatsApp</a> : <span className="inline-flex items-center gap-2 rounded-xl bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-500"><MessageCircle className="h-4 w-4"/>Abrir WhatsApp</span>}
      </div>
    </div>

    {erro && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{erro}</p>}
    {aviso && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{aviso}</p>}
    <button type="button" onClick={()=>void carregar()} className="inline-flex items-center gap-2 text-xs font-semibold text-[#7c5560]"><RefreshCw className="h-3.5 w-3.5"/>Atualizar dados</button>
  </section>;
}
