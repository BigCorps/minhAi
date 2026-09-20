'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  KeyRound,
  Loader2,
  Mail,
  RotateCcw,
  Search,
  ShieldCheck,
  StopCircle,
  Trash2,
} from 'lucide-react';

type Pessoa = {
  id: string;
  nome: string;
  tipo: string;
  status: string;
  familia_id?: string | null;
  idade?: number | null;
};

type Familia = {
  id: string;
  nome: string;
};

type Checkin = {
  convidado_lista_id: string;
  checked_in_at: string;
};

type Acesso = {
  id: string;
  email: string;
  ativo: boolean;
  user_id?: string | null;
  convite_enviado_em?: string | null;
  ultimo_acesso_em?: string | null;
  created_at: string;
};

type AlvoResolvido = {
  token: string;
  nome: string;
  pessoas: Array<Pessoa & { rsvp_extra?: boolean }>;
};

function nomeArquivo(valor: string) {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'evento';
}

function textoCsv(valor: unknown) {
  const s = String(valor ?? '');
  return /[;"\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

function statusRsvp(status: string) {
  if (status === 'confirmado') return 'Confirmado';
  if (status === 'nao_vai') return 'Não vai';
  return 'Pendente';
}

function tipoPessoa(p: Pessoa) {
  if (p.tipo !== 'crianca') return 'Adulto';
  return p.idade ? `Criança · ${p.idade} ${p.idade === 1 ? 'ano' : 'anos'}` : 'Criança';
}

export default function CheckinPainel({
  eventoId,
  token,
  somenteOperacao = false,
}: {
  eventoId: string;
  token: string;
  somenteOperacao?: boolean;
}) {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [familias, setFamilias] = useState<Familia[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [resumo, setResumo] = useState({ cadastrados: 0, esperados: 0, presentes: 0, faltam: 0 });
  const [eventoTitulo, setEventoTitulo] = useState('Evento');
  const [perfilAcesso, setPerfilAcesso] = useState<'dono' | 'responsavel_checkin' | ''>('');
  const [busca, setBusca] = useState('');
  const [codigo, setCodigo] = useState('');
  const [alvo, setAlvo] = useState<AlvoResolvido | null>(null);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [camera, setCamera] = useState(false);
  const [carregando, setCarregando] = useState(true);

  const [acessos, setAcessos] = useState<Acesso[]>([]);
  const [emailAcesso, setEmailAcesso] = useState('');
  const [carregandoAcessos, setCarregandoAcessos] = useState(false);
  const [enviandoAcesso, setEnviandoAcesso] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<any>(null);
  const travado = useRef(false);

  const carregar = useCallback(async () => {
    setErro('');
    try {
      const r = await fetch(`/api/conviteria/gestao/checkin?eventoId=${encodeURIComponent(eventoId)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.erro || 'Falha ao carregar o check-in.');

      setPessoas(d.convidados ?? []);
      setFamilias(d.familias ?? []);
      setCheckins(d.checkins ?? []);
      setResumo(d.resumo ?? { cadastrados: 0, esperados: 0, presentes: 0, faltam: 0 });
      setEventoTitulo(d?.evento?.titulo || 'Evento');
      setPerfilAcesso(d?.acesso?.perfil || '');
    } catch (e: any) {
      setErro(e?.message || 'Falha ao carregar o check-in.');
    } finally {
      setCarregando(false);
    }
  }, [eventoId, token]);

  const carregarAcessos = useCallback(async () => {
    if (somenteOperacao || perfilAcesso !== 'dono') return;
    setCarregandoAcessos(true);
    try {
      const r = await fetch(`/api/conviteria/gestao/checkin/acessos?eventoId=${encodeURIComponent(eventoId)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.erro || 'Não foi possível carregar a equipe de check-in.');
      setAcessos(d.acessos ?? []);
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível carregar a equipe de check-in.');
    } finally {
      setCarregandoAcessos(false);
    }
  }, [eventoId, perfilAcesso, somenteOperacao, token]);

  useEffect(() => {
    void carregar();
    return () => { readerRef.current?.reset?.(); };
  }, [carregar]);

  useEffect(() => {
    if (perfilAcesso === 'dono' && !somenteOperacao) void carregarAcessos();
  }, [carregarAcessos, perfilAcesso, somenteOperacao]);

  async function post(body: any) {
    const r = await fetch('/api/conviteria/gestao/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ eventoId, ...body }),
    });
    const d = await r.json().catch(() => null);
    if (!r.ok) throw new Error(d?.erro || 'Falha no check-in.');
    return d;
  }

  async function resolver(valor = codigo) {
    setErro('');
    setAviso('');
    try {
      const d = await post({ acao: 'resolver', codigo: valor });
      setAlvo(d.alvo);
      const confirmados = (d.alvo?.pessoas ?? [])
        .filter((p: any) => p.status === 'confirmado')
        .map((p: any) => p.id);
      setSelecionados(confirmados.length ? confirmados : (d.alvo?.pessoas ?? []).map((p: any) => p.id));
    } catch (e: any) {
      setErro(e.message);
      setAlvo(null);
    }
  }

  async function registrar() {
    try {
      await post({ acao: 'registrar', codigo: alvo?.token, convidadoIds: selecionados });
      setAlvo(null);
      setCodigo('');
      setAviso('Entrada registrada.');
      await carregar();
    } catch (e: any) {
      setErro(e.message);
    }
  }

  async function cameraOn() {
    setErro('');
    try {
      const { BrowserQRCodeReader } = await import('@zxing/library');
      const reader = new BrowserQRCodeReader();
      readerRef.current = reader;
      setCamera(true);

      setTimeout(() => {
        const video = videoRef.current;
        if (!video) return;

        reader.decodeFromVideoDevice(null, video, (result: any) => {
          if (result && !travado.current) {
            travado.current = true;
            const txt = result.getText();
            setCodigo(txt);
            void resolver(txt).finally(() => {
              setTimeout(() => { travado.current = false; }, 1200);
            });
          }
        });
      }, 50);
    } catch {
      setErro('Não foi possível abrir a câmera. Use a busca manual ou cole o código.');
    }
  }

  function cameraOff() {
    readerRef.current?.reset?.();
    readerRef.current = null;
    setCamera(false);
  }

  const familiaPorId = useMemo(
    () => new Map(familias.map((f) => [f.id, f.nome])),
    [familias],
  );

  const checkinPorPessoa = useMemo(
    () => new Map(checkins.map((c) => [c.convidado_lista_id, c])),
    [checkins],
  );

  const presentes = useMemo(
    () => new Set(checkins.map((c) => c.convidado_lista_id)),
    [checkins],
  );

  const filtrados = useMemo(() => {
    const q = busca.toLowerCase().trim();
    return pessoas.filter((p) => {
      if (!q) return true;
      const familia = p.familia_id ? familiaPorId.get(p.familia_id) ?? '' : '';
      return p.nome.toLowerCase().includes(q) || familia.toLowerCase().includes(q);
    });
  }, [busca, familiaPorId, pessoas]);

  const ordenadosExportacao = useMemo(() => {
    return [...pessoas].sort((a, b) => {
      const fa = a.familia_id ? familiaPorId.get(a.familia_id) ?? '' : '';
      const fb = b.familia_id ? familiaPorId.get(b.familia_id) ?? '' : '';
      const grupo = fa.localeCompare(fb, 'pt-BR', { sensitivity: 'base' });
      if (grupo) return grupo;
      return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
    });
  }, [familiaPorId, pessoas]);

  function baixarCsv() {
    const cabecalho = ['Nome', 'Família / grupo', 'Tipo', 'RSVP', 'Check-in', 'Horário de entrada'];
    const linhas = ordenadosExportacao.map((p) => {
      const entrada = checkinPorPessoa.get(p.id);
      return [
        p.nome,
        p.familia_id ? familiaPorId.get(p.familia_id) ?? '' : 'Individual',
        tipoPessoa(p),
        statusRsvp(p.status),
        entrada ? 'Presente' : 'Não registrado',
        entrada ? new Date(entrada.checked_in_at).toLocaleString('pt-BR') : '',
      ];
    });

    const csv = '\uFEFF' + [cabecalho, ...linhas]
      .map((linha) => linha.map(textoCsv).join(';'))
      .join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Lista-check-in-${nomeArquivo(eventoTitulo)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function baixarPdf() {
    try {
      const [{ jsPDF }, autoTableModulo] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);
      const autoTable = autoTableModulo.default;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text(`Lista de convidados — ${eventoTitulo}`, 14, 15);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(
        `Gerada em ${new Date().toLocaleString('pt-BR')} · ${resumo.esperados} confirmados · ${resumo.presentes} entradas registradas`,
        14,
        21,
      );

      autoTable(doc, {
        startY: 26,
        head: [['Nome', 'Família / grupo', 'Tipo', 'RSVP', 'Entrada']],
        body: ordenadosExportacao.map((p) => {
          const entrada = checkinPorPessoa.get(p.id);
          return [
            p.nome,
            p.familia_id ? familiaPorId.get(p.familia_id) ?? '' : 'Individual',
            p.tipo === 'crianca' ? 'Criança' : 'Adulto',
            statusRsvp(p.status),
            entrada ? new Date(entrada.checked_in_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
          ];
        }),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 48 },
          1: { cellWidth: 50 },
          2: { cellWidth: 22 },
          3: { cellWidth: 28 },
          4: { cellWidth: 23 },
        },
        margin: { left: 14, right: 14 },
      });

      doc.save(`Lista-check-in-${nomeArquivo(eventoTitulo)}.pdf`);
    } catch {
      setErro('Não foi possível gerar o PDF da lista.');
    }
  }

  async function enviarAcesso(email = emailAcesso) {
    const limpo = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpo)) {
      setErro('Informe um e-mail válido para o responsável.');
      return;
    }

    setEnviandoAcesso(true);
    setErro('');
    setAviso('');
    try {
      const r = await fetch('/api/conviteria/gestao/checkin/acessos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ eventoId, email: limpo }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.erro || 'Não foi possível enviar o acesso.');

      setEmailAcesso('');
      setAviso(d?.mensagem || 'Link de acesso enviado por e-mail.');
      await carregarAcessos();
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível enviar o acesso.');
      await carregarAcessos();
    } finally {
      setEnviandoAcesso(false);
    }
  }

  async function revogarAcesso(acessoId: string) {
    setErro('');
    setAviso('');
    try {
      const r = await fetch('/api/conviteria/gestao/checkin/acessos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ eventoId, acessoId }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.erro || 'Não foi possível revogar o acesso.');
      setAviso('Acesso revogado.');
      await carregarAcessos();
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível revogar o acesso.');
    }
  }

  if (carregando) {
    return <div className="grid place-items-center py-16"><Loader2 className="h-7 w-7 animate-spin" /></div>;
  }

  return (
    <section className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ['Cadastrados', resumo.cadastrados],
          ['Esperados', resumo.esperados],
          ['Presentes', resumo.presentes],
          ['Ainda não chegaram', resumo.faltam],
        ].map(([nome, valor]) => (
          <div key={String(nome)} className="rounded-2xl border border-[#c0607833] bg-white p-4">
            <p className="text-xs text-[#7c5560]">{nome}</p>
            <p className="mt-1 text-2xl font-semibold">{valor}</p>
          </div>
        ))}
      </div>

      {aviso && <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{aviso}</p>}
      {erro && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{erro}</p>}

      {!somenteOperacao && perfilAcesso === 'dono' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#c0607833] bg-white p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#fff5f8] text-[#a04a63]">
                <FileSpreadsheet className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-semibold">Lista para recepção / buffet</h2>
                <p className="mt-1 text-sm leading-6 text-[#7c5560]">
                  Exporte uma lista operacional sem telefone ou e-mail dos convidados.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={baixarCsv}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#c06078] px-4 py-2.5 text-sm font-semibold text-white"
              >
                <Download className="h-4 w-4" />Baixar CSV
              </button>
              <button
                type="button"
                onClick={() => void baixarPdf()}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#c0607840] bg-white px-4 py-2.5 text-sm font-semibold text-[#a04a63]"
              >
                <FileText className="h-4 w-4" />PDF para impressão
              </button>
            </div>
            <p className="mt-3 text-[11px] leading-5 text-[#9b7b84]">
              O PDF leva nome, família/grupo, tipo, RSVP e horário de entrada. O CSV inclui os mesmos dados para planilha.
            </p>
          </div>

          <div className="rounded-2xl border border-[#c0607833] bg-white p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#fff5f8] text-[#a04a63]">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-semibold">Equipe de check-in</h2>
                <p className="mt-1 text-sm leading-6 text-[#7c5560]">
                  Envie um magic link para quem ficará na recepção. Esse acesso abre somente o check-in.
                </p>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-[#9b7b84]" />
                <input
                  type="email"
                  value={emailAcesso}
                  onChange={(e) => setEmailAcesso(e.target.value)}
                  placeholder="responsavel@email.com"
                  className="w-full rounded-xl border border-[#c0607835] bg-white py-2.5 pl-9 pr-3 text-sm text-[#40232c]"
                />
              </div>
              <button
                type="button"
                onClick={() => void enviarAcesso()}
                disabled={enviandoAcesso}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#40232c] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {enviandoAcesso ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                Enviar
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {carregandoAcessos ? (
                <div className="grid place-items-center py-5"><Loader2 className="h-5 w-5 animate-spin text-[#a04a63]" /></div>
              ) : acessos.filter((a) => a.ativo).length === 0 ? (
                <p className="rounded-xl bg-[#fff9fb] p-3 text-xs leading-5 text-[#7c5560]">
                  Nenhum responsável externo ativo.
                </p>
              ) : (
                acessos.filter((a) => a.ativo).map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#fff9fb] px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#40232c]">{a.email}</p>
                      <p className="mt-0.5 text-[11px] text-[#8b6872]">
                        {a.ultimo_acesso_em
                          ? `Último acesso: ${new Date(a.ultimo_acesso_em).toLocaleString('pt-BR')}`
                          : a.convite_enviado_em
                            ? `Convite enviado: ${new Date(a.convite_enviado_em).toLocaleString('pt-BR')}`
                            : 'Aguardando primeiro acesso'}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => void enviarAcesso(a.email)}
                        className="rounded-lg px-2 py-1.5 text-xs font-semibold text-[#a04a63] hover:bg-white"
                      >
                        Reenviar
                      </button>
                      <button
                        type="button"
                        onClick={() => void revogarAcesso(a.id)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />Revogar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {somenteOperacao && (
        <div className="rounded-2xl border border-[#c0607830] bg-white p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-[#40232c]">
            <ShieldCheck className="h-4 w-4 text-[#a04a63]" />Acesso restrito
          </p>
          <p className="mt-1 text-xs leading-5 text-[#7c5560]">
            Você pode ler QR Codes, localizar convidados, registrar entradas e desfazer um check-in feito por engano.
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#c0607833] bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Ler QR Code</h2>
              <p className="text-sm text-[#7c5560]">QR familiar permite escolher quem chegou.</p>
            </div>
            {camera ? (
              <button onClick={cameraOff} className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm">
                <StopCircle className="h-4 w-4" />Parar
              </button>
            ) : (
              <button onClick={() => void cameraOn()} className="inline-flex items-center gap-2 rounded-xl bg-[#c06078] px-3 py-2 text-sm font-semibold text-white">
                <Camera className="h-4 w-4" />Abrir câmera
              </button>
            )}
          </div>

          {camera && <video ref={videoRef} className="mt-4 aspect-video w-full rounded-xl bg-black object-cover" muted playsInline />}

          <div className="mt-4 flex gap-2">
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Cole o código/URL do QR"
              className="min-w-0 flex-1 rounded-xl border px-3 py-2"
            />
            <button onClick={() => void resolver()} className="rounded-xl bg-[#fff5f8] px-4 py-2 font-semibold">Ler</button>
          </div>

          {alvo && (
            <div className="mt-4 rounded-xl bg-[#fff9fb] p-4">
              <p className="font-semibold">{alvo.nome}</p>
              <div className="mt-2 space-y-2">
                {alvo.pessoas.map((p) => (
                  <label key={p.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selecionados.includes(p.id)}
                      onChange={(e) => setSelecionados((s) =>
                        e.target.checked ? [...s, p.id] : s.filter((id) => id !== p.id)
                      )}
                    />
                    <span>
                      {p.nome}
                      <small className="ml-1 text-[#8b6872]">· {statusRsvp(p.status)}</small>
                    </span>
                  </label>
                ))}
              </div>
              <button
                onClick={() => void registrar()}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-semibold text-white"
              >
                <CheckCircle2 className="h-4 w-4" />Registrar entrada
              </button>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[#c0607833] bg-white p-5">
          <h2 className="font-semibold">Busca manual</h2>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#7c5560]" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Nome do convidado ou família"
              className="w-full rounded-xl border py-2 pl-9 pr-3"
            />
          </div>

          <div className="mt-3 max-h-[520px] space-y-2 overflow-y-auto">
            {filtrados.map((p) => {
              const entrou = presentes.has(p.id);
              const familia = p.familia_id ? familiaPorId.get(p.familia_id) : null;
              return (
                <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#fff9fb] px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.nome}</p>
                    <p className="mt-0.5 truncate text-xs text-[#7c5560]">
                      {familia || 'Convidado individual'} · {statusRsvp(p.status)}
                    </p>
                  </div>
                  {entrou ? (
                    <button
                      onClick={async () => {
                        await post({ acao: 'desfazer', convidadoId: p.id });
                        await carregar();
                      }}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1.5 text-xs text-emerald-700"
                    >
                      <RotateCcw className="h-3 w-3" />Desfazer
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        await post({ acao: 'manual', convidadoId: p.id });
                        await carregar();
                      }}
                      className="shrink-0 rounded-lg bg-[#c06078] px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Entrou
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
