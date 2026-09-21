'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  Copy,
  CreditCard,
  Loader2,
  MessageCircle,
  Pencil,
  RefreshCw,
  Save,
  Send,
  Smartphone,
} from 'lucide-react';

type Modo = '2_meses' | '1_mes' | '15_dias';
type EscolhaAgendamento = Modo | 'personalizado';
type Estado = {
  config: null | {
    status: 'nao_contratado' | 'aguardando_pagamento' | 'ativo';
    lembrete_modo?: Modo | null;
    segundo_programado_em?: string | null;
    primeiro_disparo_em?: string | null;
    segundo_disparo_em?: string | null;
    consentimento_declarado_em?: string | null;
    comprovante_telefone?: string | null;
    primeiro_comprovante_em?: string | null;
    primeiro_comprovante_wamid?: string | null;
    primeiro_comprovante_erro?: string | null;
    segundo_comprovante_em?: string | null;
    segundo_comprovante_wamid?: string | null;
    segundo_comprovante_erro?: string | null;
  };
  precoCentavos: number;
  limiteMensagens: number;
  contatosComWhatsApp: number;
  pendentesRsvp: number;
  novosPrimeiroEnvio: number;
  faltamSegundoEnvio: number;
  mensagensUsadas: number;
  mensagensRestantes: number;
  confirmacoesPendentesConciliacao?: number;
  rsvpPrazo?: string | null;
  rsvpPrazoTexto?: string | null;
  rsvpEncerrado?: boolean;
  telefonesTransmissao: string[];
  evento?: { dataEvento?: string | null; anfitrioes: string; tipo: string } | null;
  pixPendente?: { transactionId: string; copiaECola?: string | null; qrcode?: string | null; expiresAt?: string | null } | null;
};

type Pix = { transactionId?: string; copiaECola?: string | null; qrcode?: string | null; expiresAt?: string | null } | null;
type AcaoOcupada = 'contratar' | 'agendar' | 'enviar_primeiro' | 'salvar_comprovante' | 'comprovante_1' | 'comprovante_2' | null;

function brl(centavos: number) {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function dataBr(data?: string | null) {
  if (!data) return '—';
  const d = new Date(data);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeZone: 'America/Sao_Paulo' }).format(d);
}

function dataHoraBr(data?: string | null) {
  if (!data) return '—';
  const d = new Date(data);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(d);
}

function modoLabel(modo?: Modo | null) {
  if (modo === '2_meses') return '2 meses antes';
  if (modo === '1_mes') return '1 mês antes';
  if (modo === '15_dias') return '15 dias antes';
  return 'Data escolhida';
}

function diaAnterior(data?: string | null) {
  if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) return '';
  const [ano, mes, dia] = data.split('-').map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function dataInputLocal(data: Date) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export default function WhatsAppPainel({ eventoId, token, slug }: { eventoId: string; token: string; slug: string }) {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [acaoOcupada, setAcaoOcupada] = useState<AcaoOcupada>(null);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [consentimento, setConsentimento] = useState(false);
  const [modo, setModo] = useState<EscolhaAgendamento>('15_dias');
  const [dataSegundo, setDataSegundo] = useState('');
  const [pix, setPix] = useState<Pix>(null);
  const [editandoAgendamento, setEditandoAgendamento] = useState(false);
  const [telefoneComprovante, setTelefoneComprovante] = useState('');

  const ocupado = Boolean(acaoOcupada);

  const carregar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCarregando(true);
    try {
      const r = await fetch(`/api/conviteria/gestao/whatsapp?eventoId=${encodeURIComponent(eventoId)}`, {
        headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.erro || 'Não foi possível carregar o WhatsApp do Evento.');
      setEstado(d);
      if (d?.config?.segundo_programado_em && !d?.config?.lembrete_modo) {
        setModo('personalizado');
        setDataSegundo(String(d.config.segundo_programado_em).slice(0, 10));
      } else if (d?.config?.lembrete_modo) {
        setModo(d.config.lembrete_modo);
        setDataSegundo('');
      }
      if (d?.config?.consentimento_declarado_em) setConsentimento(true);
      if (d?.config?.comprovante_telefone) setTelefoneComprovante(d.config.comprovante_telefone);
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

  async function postComprovante(body: any) {
    const r = await fetch('/api/conviteria/gestao/whatsapp-comprovante', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ eventoId, ...body }),
    });
    const d = await r.json().catch(() => null);
    if (!r.ok) throw new Error(d?.erro || 'Não foi possível concluir a operação.');
    return d;
  }

  async function contratar() {
    setAcaoOcupada('contratar'); setErro(''); setAviso('');
    try {
      const d = await post({ acao: 'criar_pix', consentimento, lembreteModo: modo, segundoData: modo === 'personalizado' ? dataSegundo : undefined });
      if (d.ativo || d.semCobranca) {
        setAviso('WhatsApp do Evento já está ativo.');
        await carregar(true);
        return;
      }
      setPix({ transactionId: d.transactionId, copiaECola: d.copiaECola, qrcode: d.qrcode, expiresAt: d.expiresAt });
      setAviso('PIX gerado. Assim que o pagamento for confirmado, o pacote será ativado automaticamente.');
      await carregar(true);
    } catch (e: any) { setErro(e.message); }
    finally { setAcaoOcupada(null); }
  }

  async function salvarAgendamento() {
    setAcaoOcupada('agendar'); setErro(''); setAviso('');
    try {
      const d = await post({ acao: 'agendar', lembreteModo: modo, segundoData: modo === 'personalizado' ? dataSegundo : undefined });
      setAviso(`Lembrete programado para ${dataBr(d.segundoProgramadoEm)}.`);
      setEditandoAgendamento(false);
      await carregar(true);
    } catch (e: any) { setErro(e.message); }
    finally { setAcaoOcupada(null); }
  }

  async function salvarTelefoneComprovante() {
    setAcaoOcupada('salvar_comprovante'); setErro(''); setAviso('');
    try {
      const d = await postComprovante({ acao: 'salvar_telefone', telefone: telefoneComprovante });
      setTelefoneComprovante(d.telefone || '');
      setAviso(d.telefone
        ? 'WhatsApp para comprovantes salvo. Os próximos envios concluídos serão avisados neste número.'
        : 'WhatsApp para comprovantes removido.');
      await carregar(true);
    } catch (e: any) { setErro(e.message); }
    finally { setAcaoOcupada(null); }
  }

  async function enviarComprovante(rodada: 1 | 2) {
    setAcaoOcupada(rodada === 1 ? 'comprovante_1' : 'comprovante_2');
    setErro(''); setAviso('');
    try {
      const d = await postComprovante({ acao: 'enviar', rodada });
      setAviso(d.jaEnviado
        ? `O comprovante da ${rodada}ª comunicação já havia sido enviado.`
        : `Comprovante da ${rodada}ª comunicação enviado para o WhatsApp configurado.`);
      await carregar(true);
    } catch (e: any) { setErro(e.message); }
    finally { setAcaoOcupada(null); }
  }

  async function enviarPrimeiro() {
    if (!confirm('Enviar agora a primeira comunicação somente para os contatos pendentes que ainda não receberam?')) return;
    setAcaoOcupada('enviar_primeiro'); setErro(''); setAviso('Enviando…');
    let total = 0; let falhas = 0; let concluiu = false;
    try {
      for (let i = 0; i < 15; i += 1) {
        const d = await post({ acao: 'enviar_primeiro' });
        total += Number(d.enviados ?? 0);
        falhas += Number(d.falhas ?? 0);
        const restantes = Number(d.restantes ?? 0);
        setAviso(`Enviando… ${total} mensagem(ns) aceita(s) pela Meta.`);
        if (restantes === 0) concluiu = true;
        if (restantes === 0 || Number(d.processados ?? 0) === 0) break;
      }

      let textoFinal = `${total} mensagem(ns) enviada(s) nesta operação${falhas ? ` · ${falhas} falha(s)` : ''}.`;
      if (concluiu && estado?.config?.comprovante_telefone && !estado.config.primeiro_comprovante_em) {
        try {
          const comprovante = await postComprovante({ acao: 'enviar', rodada: 1 });
          if (comprovante.jaEnviado || comprovante.enviado) textoFinal += ' Comprovante enviado ao anfitrião.';
        } catch (e: any) {
          textoFinal += ` O envio aos convidados terminou, mas o comprovante ao anfitrião ficou pendente: ${e.message}`;
        }
      }
      setAviso(textoFinal);
      await carregar(true);
    } catch (e: any) { setErro(e.message); }
    finally { setAcaoOcupada(null); }
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
  const pendenciasConciliacao = Number(estado.confirmacoesPendentesConciliacao ?? 0);
  const bloqueadoPrimeiroEnvio = bloqueadoPrazo || pendenciasConciliacao > 0;
  const primeiraConcluida = Boolean(estado.config?.primeiro_disparo_em) && estado.novosPrimeiroEnvio === 0;
  const segundaConcluida = Boolean(estado.config?.segundo_disparo_em);
  const agendamentoSalvo = Boolean(estado.config?.segundo_programado_em) && !estado.config?.segundo_disparo_em;
  const dataEventoDia = estado.evento?.dataEvento?.slice(0, 10) || '';
  const maxPorEvento = diaAnterior(dataEventoDia);
  const maxDataSegundo = [estado.rsvpPrazo || '', maxPorEvento].filter(Boolean).sort()[0] || undefined;
  const amanha = dataInputLocal(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const programacaoIncompleta = modo === 'personalizado' && !dataSegundo;

  function restaurarAgendamentoSalvo() {
    if (estado.config?.lembrete_modo) {
      setModo(estado.config.lembrete_modo);
      setDataSegundo('');
    } else if (estado.config?.segundo_programado_em) {
      setModo('personalizado');
      setDataSegundo(String(estado.config.segundo_programado_em).slice(0, 10));
    } else {
      setModo('15_dias');
      setDataSegundo('');
    }
    setEditandoAgendamento(false);
  }

  const seletorSegundoComunicado = (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className={`text-sm font-medium ${modo === 'personalizado' ? '' : 'sm:col-span-2'}`}>Quando enviar
        <select value={modo} onChange={(e)=>setModo(e.target.value as EscolhaAgendamento)} className="mt-1 block w-full rounded-xl border px-3 py-2.5">
          <option value="2_meses">2 meses antes</option>
          <option value="1_mes">1 mês antes</option>
          <option value="15_dias">15 dias antes</option>
          <option value="personalizado">Escolher uma data</option>
        </select>
      </label>
      {modo === 'personalizado' && <label className="text-sm font-medium">Data do segundo comunicado
        <input type="date" value={dataSegundo} min={amanha} max={maxDataSegundo} onChange={(e)=>setDataSegundo(e.target.value)} className="mt-1 block w-full rounded-xl border px-3 py-2.5" />
        <span className="mt-1 block text-[11px] font-normal leading-4 text-[#9b7b84]">A data precisa ser futura e respeitar o prazo de confirmação e a data do evento.</span>
      </label>}
    </div>
  );

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
            <p className="mt-1 text-sm text-[#7c5560]">O WhatsApp do Evento usará automaticamente <strong>{estado.rsvpPrazoTexto}</strong> como data limite para confirmação de presença.</p>
          ) : (
            <p className="mt-1 text-sm text-amber-800">Defina a data em <strong>Gestão → Convidados → Prazo para confirmação</strong> antes de contratar ou enviar mensagens.</p>
          )}
          {estado.rsvpEncerrado && <p className="mt-1 text-sm font-medium text-amber-800">Este prazo já terminou. Altere a data em Convidados para reabrir o RSVP e os envios.</p>}
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${bloqueadoPrazo ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>{bloqueadoPrazo ? 'AÇÃO NECESSÁRIA' : 'CONFIGURADO'}</span>
      </div>
    </div>

    {pendenciasConciliacao > 0 && <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900">
      <strong>{pendenciasConciliacao} confirmação(ões) antiga(s) precisam ser sincronizadas.</strong>
      <p className="mt-1 leading-6">Vá em <strong>Gestão → Convidados</strong> e conclua a conciliação antes do primeiro envio. Isso evita mandar pedido de confirmação para quem já respondeu anteriormente.</p>
    </div>}

    {!ativo && <div className="rounded-2xl border border-[#c0607833] bg-white p-5">
      <h3 className="font-semibold">Contratar por {brl(estado.precoCentavos)}</h3>
      <p className="mt-1 text-sm text-[#7c5560]">O primeiro comunicado é enviado quando você mandar. O segundo fica programado para uma única data.</p>
      <div className="mt-4">{seletorSegundoComunicado}</div>
      <div className="mt-3 flex justify-stretch sm:justify-end"><button type="button" disabled={ocupado || !consentimento || bloqueadoPrazo || programacaoIncompleta} onClick={contratar} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#c06078] px-5 py-2.5 font-semibold text-white disabled:opacity-50 sm:w-auto">{acaoOcupada==='contratar'?<Loader2 className="h-4 w-4 animate-spin"/>:<CreditCard className="h-4 w-4"/>}{aguardando?'Ver / renovar PIX':'Gerar PIX'}</button></div>
      <label className="mt-4 flex items-start gap-2 text-xs leading-5 text-[#7c5560]"><input type="checkbox" checked={consentimento} onChange={(e)=>setConsentimento(e.target.checked)} className="mt-1"/><span>Declaro que os contatos informados podem receber comunicações deste evento pelo WhatsApp e sou responsável pela lista enviada.</span></label>

      {(pix?.copiaECola || aguardando) && <div className="mt-5 rounded-xl bg-[#fff9fb] p-4 text-center">
        {pix?.qrcode && <img src={pix.qrcode} alt="QR Code PIX" className="mx-auto h-48 w-48 rounded-xl bg-white p-2"/>}
        <p className="mt-2 text-sm font-semibold">PIX do WhatsApp do Evento</p>
        {pix?.copiaECola && <button type="button" onClick={()=>void copiar(pix.copiaECola!,'PIX copiado.')} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#c0607833] bg-white px-4 py-2 text-sm font-semibold text-[#a04a63]"><Copy className="h-4 w-4"/>Copiar PIX</button>}
        <p className="mt-2 text-xs text-[#7c5560]">A tela confere o pagamento automaticamente.</p>
      </div>}
    </div>}

    {ativo && <>
      <div className="rounded-2xl border border-[#c0607833] bg-white p-5">
        <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-[#a04a63]"/><h3 className="font-semibold">Comprovantes dos envios</h3></div>
        <p className="mt-2 text-sm leading-6 text-[#7c5560]">Informe o WhatsApp do criador do convite. Quando cada comunicação terminar, o ConviteIA envia um comprovante separado para este número. Esse número não entra na lista de convidados.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <label className="text-sm font-medium">WhatsApp para receber os comprovantes
            <input value={telefoneComprovante} onChange={(e)=>setTelefoneComprovante(e.target.value)} inputMode="tel" placeholder="(11) 99999-9999" className="mt-1 block w-full rounded-xl border px-3 py-2.5" />
          </label>
          <button type="button" disabled={ocupado} onClick={salvarTelefoneComprovante} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#c0607833] bg-white px-4 py-2.5 text-sm font-semibold text-[#a04a63] disabled:opacity-50">
            {acaoOcupada==='salvar_comprovante'?<Loader2 className="h-4 w-4 animate-spin"/>:<Save className="h-4 w-4"/>}Salvar número
          </button>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl bg-[#fff9fb] p-4">
            <p className="text-sm font-semibold">1ª comunicação</p>
            {estado.config?.primeiro_comprovante_em ? (
              <p className="mt-1 text-xs font-medium text-emerald-700">✓ Comprovante enviado em {dataHoraBr(estado.config.primeiro_comprovante_em)}.</p>
            ) : primeiraConcluida ? (
              <>
                <p className="mt-1 text-xs text-[#7c5560]">A rodada está concluída, mas ainda não há comprovante enviado.</p>
                {estado.config?.primeiro_comprovante_erro && <p className="mt-1 text-xs text-amber-700">Última tentativa: {estado.config.primeiro_comprovante_erro}</p>}
                <button type="button" disabled={ocupado || !estado.config?.comprovante_telefone} onClick={()=>void enviarComprovante(1)} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#c0607833] bg-white px-3 py-2 text-xs font-semibold text-[#a04a63] disabled:opacity-50">
                  {acaoOcupada==='comprovante_1'?<Loader2 className="h-3.5 w-3.5 animate-spin"/>:<Send className="h-3.5 w-3.5"/>}Enviar comprovante
                </button>
              </>
            ) : (
              <p className="mt-1 text-xs text-[#7c5560]">Será enviado quando a primeira comunicação terminar.</p>
            )}
          </div>

          <div className="rounded-xl bg-[#fff9fb] p-4">
            <p className="text-sm font-semibold">2ª comunicação</p>
            {estado.config?.segundo_comprovante_em ? (
              <p className="mt-1 text-xs font-medium text-emerald-700">✓ Comprovante enviado em {dataHoraBr(estado.config.segundo_comprovante_em)}.</p>
            ) : segundaConcluida ? (
              <>
                <p className="mt-1 text-xs text-[#7c5560]">O lembrete foi concluído, mas ainda não há comprovante enviado.</p>
                {estado.config?.segundo_comprovante_erro && <p className="mt-1 text-xs text-amber-700">Última tentativa: {estado.config.segundo_comprovante_erro}</p>}
                <button type="button" disabled={ocupado || !estado.config?.comprovante_telefone} onClick={()=>void enviarComprovante(2)} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#c0607833] bg-white px-3 py-2 text-xs font-semibold text-[#a04a63] disabled:opacity-50">
                  {acaoOcupada==='comprovante_2'?<Loader2 className="h-3.5 w-3.5 animate-spin"/>:<Send className="h-3.5 w-3.5"/>}Enviar comprovante
                </button>
              </>
            ) : (
              <p className="mt-1 text-xs text-[#7c5560]">Será enviado quando o lembrete programado terminar.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#c0607833] bg-white p-5">
          <div className="flex items-center gap-2"><Send className="h-5 w-5 text-[#a04a63]"/><h3 className="font-semibold">1ª comunicação</h3></div>
          <p className="mt-2 text-sm text-[#7c5560]">Só recebe quem ainda está pendente e nunca recebeu a primeira mensagem. Quem já confirmou pelo convite, CSV sincronizado ou painel não recebe cobrança de confirmação novamente.</p>
          <p className="mt-3 text-sm"><strong>{estado.novosPrimeiroEnvio}</strong> contato(s) apto(s) agora.</p>
          <button type="button" disabled={ocupado || bloqueadoPrimeiroEnvio || estado.novosPrimeiroEnvio===0} onClick={enviarPrimeiro} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#c06078] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{acaoOcupada==='enviar_primeiro'?<Loader2 className="h-4 w-4 animate-spin"/>:<Send className="h-4 w-4"/>}{estado.config?.primeiro_disparo_em?'Enviar para novos convidados':'Enviar primeira comunicação'}</button>
          {estado.config?.primeiro_disparo_em && <p className="mt-2 text-xs text-[#7c5560]">Primeiro envio iniciado em {dataBr(estado.config.primeiro_disparo_em)}.</p>}
        </div>

        <div className="rounded-2xl border border-[#c0607833] bg-white p-5">
          <div className="flex items-center gap-2"><CalendarClock className="h-5 w-5 text-[#a04a63]"/><h3 className="font-semibold">2ª comunicação · lembrete</h3></div>
          <p className="mt-2 text-sm text-[#7c5560]">Uma única rodada para a lista vigente na data programada, inclusive quem já confirmou, para revisar presença e informações atualizadas.</p>

          {estado.config?.segundo_disparo_em ? (
            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4"/>Lembrete enviado.</p>
              <p className="mt-1 text-xs text-[#7c5560]">{estado.config.lembrete_modo ? `Programação utilizada: ${modoLabel(estado.config.lembrete_modo)}.` : `Data escolhida: ${dataBr(estado.config.segundo_programado_em)}.`}</p>
            </div>
          ) : agendamentoSalvo && !editandoAgendamento ? (
            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
              <p className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-800"><CheckCircle2 className="h-4 w-4"/>Lembrete agendado para {dataBr(estado.config?.segundo_programado_em)}.</p>
              <p className="mt-1 text-xs text-[#7c5560]">{estado.config?.lembrete_modo ? `${modoLabel(estado.config.lembrete_modo)} da data do evento.` : 'Data escolhida manualmente.'}</p>
              <button type="button" disabled={ocupado} onClick={()=>setEditandoAgendamento(true)} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 disabled:opacity-50"><Pencil className="h-3.5 w-3.5"/>Alterar agendamento</button>
            </div>
          ) : (
            <>
              <div className="mt-3">{seletorSegundoComunicado}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" disabled={ocupado || bloqueadoPrazo || programacaoIncompleta} onClick={salvarAgendamento} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#c0607833] bg-white px-4 py-2.5 text-sm font-semibold text-[#a04a63] disabled:opacity-50 sm:flex-none">{acaoOcupada==='agendar'?<Loader2 className="h-4 w-4 animate-spin"/>:<CalendarClock className="h-4 w-4"/>}{agendamentoSalvo?'Salvar alteração':'Salvar agendamento'}</button>
                {agendamentoSalvo && <button type="button" disabled={ocupado} onClick={restaurarAgendamentoSalvo} className="min-h-11 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#7c5560] disabled:opacity-50">Cancelar</button>}
              </div>
            </>
          )}
        </div>
      </div>
    </>}

    <div className="rounded-2xl border border-[#c0607833] bg-white p-5">
      <div className="flex items-center gap-2"><Smartphone className="h-5 w-5 text-[#a04a63]"/><h3 className="font-semibold">Opção gratuita · seu próprio WhatsApp</h3></div>
      <p className="mt-2 text-sm text-[#7c5560]">Para quem prefere não usar o número do ConviteIA: copie a mensagem e os números pendentes para organizar uma lista de transmissão no seu WhatsApp. O mesmo prazo do RSVP é respeitado aqui.</p>
      <div className="mt-3 rounded-xl bg-[#fff9fb] p-3 text-sm whitespace-pre-line">{pendenciasConciliacao > 0 ? 'Sincronize primeiro as confirmações antigas em Gestão → Convidados para preparar uma lista correta de pendentes.' : bloqueadoPrazo ? 'Defina ou reabra o prazo de confirmação em Convidados antes de preparar este envio.' : mensagemGratis}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={bloqueadoPrimeiroEnvio} onClick={()=>void copiar(mensagemGratis,'Mensagem copiada.')} className="inline-flex items-center gap-2 rounded-xl border border-[#c0607833] bg-white px-3 py-2 text-sm font-semibold text-[#a04a63] disabled:opacity-50"><Copy className="h-4 w-4"/>Copiar mensagem</button>
        <button type="button" disabled={bloqueadoPrimeiroEnvio || !estado.telefonesTransmissao?.length} onClick={()=>void copiar((estado.telefonesTransmissao??[]).join('\n'),'Telefones pendentes copiados.')} className="inline-flex items-center gap-2 rounded-xl border border-[#c0607833] bg-white px-3 py-2 text-sm font-semibold text-[#a04a63] disabled:opacity-50"><Copy className="h-4 w-4"/>Copiar números ({estado.telefonesTransmissao?.length??0})</button>
        {!bloqueadoPrimeiroEnvio ? <a href={`https://wa.me/?text=${encodeURIComponent(mensagemGratis)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"><MessageCircle className="h-4 w-4"/>Abrir WhatsApp</a> : <span className="inline-flex items-center gap-2 rounded-xl bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-500"><MessageCircle className="h-4 w-4"/>Abrir WhatsApp</span>}
      </div>
    </div>

    {erro && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{erro}</p>}
    {aviso && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{aviso}</p>}
    <button type="button" onClick={()=>void carregar()} className="inline-flex items-center gap-2 text-xs font-semibold text-[#7c5560]"><RefreshCw className="h-3.5 w-3.5"/>Atualizar dados</button>
  </section>;
}
