'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  Check,
  Copy,
  Download,
  FileDown,
  FileUp,
  Link2,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Save,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  CsvConvidadosErro,
  lerArquivoCsvConvidados,
  type LinhaCsvConvidado,
} from '@/lib/conviteria/csv-convidados';

type Familia = {
  id: string;
  nome: string;
  telefone?: string | null;
  email?: string | null;
  lado: string;
  max_acompanhantes: number; // legado: não é mais editado pela interface
  extras_permitidos?: number | null;
  observacoes?: string | null;
  qr_token: string;
};

type Convidado = {
  id: string;
  familia_id?: string | null;
  nome: string;
  telefone?: string | null;
  email?: string | null;
  tipo: 'adulto' | 'crianca';
  lado: string;
  observacoes?: string | null;
  status: 'pendente' | 'confirmado' | 'nao_vai';
  qr_token: string;
  rsvp_extra?: boolean;
};

type MembroForm = { id?: string; nome: string; tipo: 'adulto' | 'crianca' };
type LinhaCsv = LinhaCsvConvidado;
type FamiliaForm = {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  lado: string;
  extrasPermitidos: number;
  observacoes: string;
  membros: MembroForm[];
  removerMembroIds: string[];
};

type PessoaForm = {
  id: string;
  familiaId: string;
  nome: string;
  telefone: string;
  email: string;
  tipo: 'adulto' | 'crianca';
  lado: string;
  observacoes: string;
  status: 'pendente' | 'confirmado' | 'nao_vai';
};

type ConfirmacaoManual = {
  titulo: string;
  pessoas: Convidado[];
  selecionados: string[];
};

function novaFamilia(): FamiliaForm {
  return {
    id: '', nome: '', telefone: '', email: '', lado: 'ambos', extrasPermitidos: 0,
    observacoes: '', membros: [{ nome: '', tipo: 'adulto' }], removerMembroIds: [],
  };
}

const vazioPessoa: PessoaForm = {
  id: '', familiaId: '', nome: '', telefone: '', email: '', tipo: 'adulto',
  lado: 'ambos', observacoes: '', status: 'pendente',
};

export default function ConvidadosPainel({ eventoId, token, slug, qrModo }: {
  eventoId: string;
  token: string;
  slug: string;
  qrModo: 'familia' | 'individual';
}) {
  const [familias, setFamilias] = useState<Familia[]>([]);
  const [pessoas, setPessoas] = useState<Convidado[]>([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [familia, setFamilia] = useState<FamiliaForm>(() => novaFamilia());
  const [pessoa, setPessoa] = useState<PessoaForm>(vazioPessoa);
  const [salvando, setSalvando] = useState(false);
  const [linhasCsv, setLinhasCsv] = useState<LinhaCsv[]>([]);
  const [nomeCsv, setNomeCsv] = useState('');
  const [importando, setImportando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [rsvpPrazo, setRsvpPrazo] = useState('');
  const [rsvpEncerrado, setRsvpEncerrado] = useState(false);
  const [dataEvento, setDataEvento] = useState<string | null>(null);
  const [salvandoPrazo, setSalvandoPrazo] = useState(false);
  const [progressoCarga, setProgressoCarga] = useState(0);
  const [csvIgnoradas, setCsvIgnoradas] = useState(0);
  const [confirmacaoManual, setConfirmacaoManual] = useState<ConfirmacaoManual | null>(null);
  const [salvandoConfirmacaoManual, setSalvandoConfirmacaoManual] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setProgressoCarga(8);
    const timer = window.setInterval(() => {
      setProgressoCarga((atual) => Math.min(90, atual + 7));
    }, 220);

    try {
      const r = await fetch(`/api/conviteria/gestao/convidados?eventoId=${encodeURIComponent(eventoId)}`, {
        headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) setErro(d?.erro || 'Falha ao carregar.');
      else {
        setFamilias(d.familias ?? []);
        setPessoas(d.convidados ?? []);
        setRsvpPrazo(typeof d?.rsvpPrazo === 'string' ? d.rsvpPrazo : '');
        setRsvpEncerrado(Boolean(d?.rsvpEncerrado));
        setDataEvento(typeof d?.dataEvento === 'string' ? d.dataEvento : null);
        setErro('');
      }
      setProgressoCarga(100);
    } catch {
      setErro('Não foi possível carregar a lista de convidados. Tente novamente.');
    } finally {
      window.clearInterval(timer);
      setCarregando(false);
    }
  }, [eventoId, token]);

  useEffect(() => { void carregar(); }, [carregar]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return q
      ? pessoas.filter((p) => [p.nome, p.email, p.telefone].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)))
      : pessoas;
  }, [busca, pessoas]);

  function membrosFixos(familiaId: string) {
    return pessoas.filter((p) => p.familia_id === familiaId && !p.rsvp_extra);
  }

  function extrasDaFamilia(familiaId: string) {
    return pessoas.filter((p) => p.familia_id === familiaId && p.rsvp_extra);
  }

  function avisarPresencasAtualizadas() {
    window.dispatchEvent(new CustomEvent('conviteia:presencas-atualizadas', {
      detail: { eventoId },
    }));
  }

  async function acao(body: any) {
    const r = await fetch('/api/conviteria/gestao/convidados', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ eventoId, ...body }),
    });
    const d = await r.json().catch(() => null);
    if (!r.ok) throw new Error(d?.erro || 'Não foi possível salvar.');
    return d;
  }

  function resetFamilia() {
    setFamilia(novaFamilia());
  }

  function editarFamilia(f: Familia) {
    const membros = membrosFixos(f.id).map((p) => ({ id: p.id, nome: p.nome, tipo: p.tipo }));
    setFamilia({
      id: f.id,
      nome: f.nome,
      telefone: f.telefone ?? '',
      email: f.email ?? '',
      lado: f.lado,
      extrasPermitidos: Number(f.extras_permitidos ?? 0),
      observacoes: f.observacoes ?? '',
      membros: membros.length ? membros : [{ nome: '', tipo: 'adulto' }],
      removerMembroIds: [],
    });
    window.setTimeout(() => document.getElementById('form-familia')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
  }

  function adicionarMembro() {
    if (familia.membros.length >= 50) return;
    setFamilia((f) => ({ ...f, membros: [...f.membros, { nome: '', tipo: 'adulto' }] }));
  }

  function alterarMembro(i: number, patch: Partial<MembroForm>) {
    setFamilia((f) => ({ ...f, membros: f.membros.map((m, idx) => idx === i ? { ...m, ...patch } : m) }));
  }

  function removerMembro(i: number) {
    setFamilia((f) => {
      const alvo = f.membros[i];
      const restantes = f.membros.filter((_, idx) => idx !== i);
      return {
        ...f,
        membros: restantes.length ? restantes : [{ nome: '', tipo: 'adulto' }],
        removerMembroIds: alvo?.id ? [...new Set([...f.removerMembroIds, alvo.id])] : f.removerMembroIds,
      };
    });
  }

  async function salvarFamilia() {
    const membros = familia.membros
      .map((m) => ({ ...m, nome: m.nome.trim() }))
      .filter((m) => m.nome);
    if (!familia.nome.trim()) return setErro('Informe o nome da família ou grupo.');
    if (!membros.length) return setErro('Cadastre pelo menos uma pessoa neste grupo. O nome da família não cria membros automaticamente.');

    setSalvando(true); setErro(''); setAviso('');
    try {
      await acao({ acao: 'salvar_familia', ...familia, membros });
      setAviso(familia.id ? 'Família e membros atualizados.' : 'Família e membros cadastrados.');
      resetFamilia();
      await carregar();
    } catch (e: any) { setErro(e.message); }
    finally { setSalvando(false); }
  }

  async function salvarPessoa() {
    if (!pessoa.nome.trim()) return;
    setSalvando(true); setErro('');
    try { await acao({ acao: 'salvar_convidado', ...pessoa }); setPessoa(vazioPessoa); await carregar(); }
    catch (e: any) { setErro(e.message); }
    finally { setSalvando(false); }
  }

  async function excluir(tipo: 'familia' | 'convidado', id: string) {
    if (!confirm('Excluir este cadastro?')) return;
    const r = await fetch(`/api/conviteria/gestao/convidados?eventoId=${encodeURIComponent(eventoId)}&tipo=${tipo}&id=${encodeURIComponent(id)}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    });
    const d = await r.json().catch(() => null);
    if (!r.ok) return setErro(d?.erro || 'Não foi possível excluir.');
    await carregar();
  }

  function abrirConfirmacaoManual(titulo: string, pessoasDoGrupo: Convidado[]) {
    const fixos = pessoasDoGrupo.filter((p) => !p.rsvp_extra);
    if (!fixos.length) {
      setErro('Cadastre ao menos uma pessoa neste grupo antes de registrar a presença.');
      return;
    }
    const atuais = fixos.filter((p) => p.status === 'confirmado').map((p) => p.id);
    setConfirmacaoManual({
      titulo,
      pessoas: fixos,
      selecionados: atuais.length ? atuais : fixos.filter((p) => p.status !== 'nao_vai').map((p) => p.id),
    });
    setErro('');
    setAviso('');
  }

  async function salvarConfirmacaoManual() {
    if (!confirmacaoManual?.selecionados.length) {
      setErro('Selecione ao menos uma pessoa que irá ao evento.');
      return;
    }
    setSalvandoConfirmacaoManual(true);
    setErro('');
    setAviso('');
    try {
      await acao({ acao: 'confirmar_manual', convidadoIds: confirmacaoManual.selecionados });
      setAviso(`Presença registrada pela Gestão para ${confirmacaoManual.selecionados.length} ${confirmacaoManual.selecionados.length === 1 ? 'pessoa' : 'pessoas'}.`);
      setConfirmacaoManual(null);
      await carregar();
      avisarPresencasAtualizadas();
    } catch (e: any) {
      setErro(e.message || 'Não foi possível registrar a confirmação.');
    } finally {
      setSalvandoConfirmacaoManual(false);
    }
  }

  async function baixarQr(tokenQr: string, nome: string) {
    const QRCode = (await import('qrcode')).default;
    const url = `https://${slug}.conviteia.com/entrada/${tokenQr}`;
    const data = await QRCode.toDataURL(url, { width: 1000, margin: 2 });
    const a = document.createElement('a'); a.href = data;
    a.download = `qr-${nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`;
    a.click();
  }

  async function copiar(url: string, mensagem: string) {
    await navigator.clipboard.writeText(url);
    setAviso(mensagem);
    window.setTimeout(() => setAviso(''), 2500);
  }

  function linkConvite(qr: string) { return `https://conviteia.com/c/${qr}`; }
  function linkConfirmacao(qr: string) { return `https://conviteia.com/r/${qr}`; }

  function baixarModelo() {
    const conteudo = '\uFEFFnome;membros;email;telefone\nMaria Silva;"João Silva|Pedro Silva";maria@exemplo.com;+5511999999999\nAna Souza;;ana@exemplo.com;(11) 88888-8888\n';
    const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'modelo-convidados-conviteia.csv'; a.click();
    URL.revokeObjectURL(a.href);
  }

  async function lerCsv(file: File) {
    setErro('');
    setAviso('');
    setLinhasCsv([]);
    setNomeCsv('');
    setCsvIgnoradas(0);

    try {
      const resultado = await lerArquivoCsvConvidados(file);
      setNomeCsv(file.name);
      setLinhasCsv(resultado.linhas);
      setCsvIgnoradas(resultado.ignoradas);

      if (resultado.ignoradas > 0) {
        setAviso(`${resultado.linhas.length} convidados prontos para importar. ${resultado.ignoradas} ${resultado.ignoradas === 1 ? 'linha precisa' : 'linhas precisam'} de correção e ${resultado.ignoradas === 1 ? 'será ignorada' : 'serão ignoradas'}.`);
      } else {
        setAviso(`${resultado.linhas.length} convidados prontos para importar. Arquivo reconhecido automaticamente.`);
      }
    } catch (e: any) {
      setErro(e instanceof CsvConvidadosErro
        ? e.message
        : 'Não foi possível ler o arquivo. Use o modelo de convidados fornecido pelo ConviteIA.');
    }
  }

  async function importarCsv() {
    if (!linhasCsv.length) return;
    setImportando(true); setErro(''); setAviso('');
    try {
      const d = await acao({ acao: 'importar_csv', linhas: linhasCsv.map((l) => ({ ...l, dependentes: l.membros })) });
      setAviso(`${d.importados ?? linhasCsv.length} linhas importadas. As confirmações anteriores também foram sincronizadas.`);
      setLinhasCsv([]); setNomeCsv(''); setCsvIgnoradas(0);
      await carregar();
      avisarPresencasAtualizadas();
    } catch (e: any) { setErro(e.message); }
    finally { setImportando(false); }
  }

  async function sincronizar() {
    setSincronizando(true); setErro(''); setAviso('');
    try {
      const d = await acao({ acao: 'sincronizar' });
      setAviso(`Sincronização concluída: ${d.statusAtualizados ?? 0} status atualizados e ${d.vinculadas ?? 0} confirmações vinculadas à lista.`);
      await carregar();
      avisarPresencasAtualizadas();
    } catch (e: any) { setErro(e.message); }
    finally { setSincronizando(false); }
  }

  async function salvarPrazoRsvp() {
    setSalvandoPrazo(true); setErro(''); setAviso('');
    try {
      const d = await acao({ acao: 'salvar_prazo_rsvp', prazo: rsvpPrazo || null });
      setRsvpPrazo(typeof d?.rsvpPrazo === 'string' ? d.rsvpPrazo : '');
      setRsvpEncerrado(Boolean(d?.rsvpEncerrado));
      setAviso(d?.agendamentoWhatsAppRemovido
        ? 'Prazo salvo. O lembrete do WhatsApp foi desprogramado porque estava depois do novo prazo; escolha uma nova data em Comunicações.'
        : (d?.rsvpPrazo ? 'Prazo de confirmação salvo.' : 'Prazo de confirmação removido.'));
    } catch (e: any) { setErro(e.message); }
    finally { setSalvandoPrazo(false); }
  }

  const dataEventoMax = dataEvento?.slice(0, 10) || undefined;

  return <section className="space-y-5">
    {carregando && (
      <div className="rounded-xl border border-[#c0607826] bg-white px-4 py-3" aria-live="polite">
        <div className="flex items-center justify-between gap-3 text-xs text-[#7c5560]">
          <span className="inline-flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" />Carregando lista de convidados…</span>
          <span>Isso pode levar alguns segundos</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#f4e3e8]">
          <div className="h-full rounded-full bg-[#c06078] transition-[width] duration-200" style={{ width: `${Math.max(1, Math.min(100, progressoCarga))}%` }} />
        </div>
      </div>
    )}
    {erro && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{erro}</p>}
    {aviso && <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700" role="status">{aviso}</p>}
    <div className={`rounded-2xl border p-5 ${rsvpEncerrado ? 'border-amber-300 bg-amber-50/60' : 'border-[#c0607833] bg-white'}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2"><CalendarClock className="h-5 w-5 text-[#a04a63]" /><h2 className="font-semibold">Prazo para confirmação</h2></div>
          <p className="mt-2 text-sm leading-6 text-[#7c5560]">Defina até quando os convidados poderão confirmar ou alterar a presença pelo convite. O prazo vale até o fim do dia escolhido. Depois disso, o RSVP público é encerrado; você ainda poderá ajustar a lista manualmente nesta Gestão.</p>
          <p className="mt-1 text-xs text-[#9b7b84]">Este mesmo prazo é usado automaticamente nas duas mensagens do WhatsApp do Evento.</p>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${rsvpEncerrado ? 'bg-amber-100 text-amber-800' : rsvpPrazo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
          {rsvpEncerrado ? 'PRAZO ENCERRADO' : rsvpPrazo ? 'ATIVO' : 'SEM PRAZO'}
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,260px)_auto]">
        <label className="text-sm font-medium text-[#40232c]">Confirmar presença até
          <input
            type="date"
            value={rsvpPrazo}
            max={dataEventoMax}
            onChange={(e) => setRsvpPrazo(e.target.value)}
            className="mt-1 block w-full rounded-xl border border-[#c0607833] bg-white px-3 py-2.5"
          />
        </label>
        <div className="flex flex-wrap items-end gap-2">
          <button type="button" onClick={salvarPrazoRsvp} disabled={salvandoPrazo} className="inline-flex items-center gap-2 rounded-xl bg-[#c06078] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {salvandoPrazo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Salvar prazo
          </button>
        </div>
      </div>
      {rsvpPrazo && <p className="mt-3 text-xs text-[#7c5560]">Para reabrir, escolha uma nova data futura e salve. Para deixar sem fechamento automático, limpe a data e salve novamente.</p>}
    </div>
    <div className="rounded-2xl border border-[#c0607833] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Importar lista de convidados</h2>
          <p className="mt-1 text-sm text-[#7c5560]">No CSV, <strong>nome</strong> é o membro principal e <strong>membros</strong> são as outras pessoas já conhecidas do grupo, separadas por <strong>|</strong>. Acompanhantes extras são configurados depois por família.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={baixarModelo} className="inline-flex items-center gap-2 rounded-xl border border-[#c0607833] bg-white px-3 py-2 text-sm font-semibold text-[#a04a63]"><FileDown className="h-4 w-4" />Baixar modelo</button>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#fff5f8] px-3 py-2 text-sm font-semibold text-[#a04a63]">
            <FileUp className="h-4 w-4" />Importar CSV
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.currentTarget.value = ''; if (f) void lerCsv(f); }} />
          </label>
          <button type="button" onClick={sincronizar} disabled={sincronizando} className="inline-flex items-center gap-2 rounded-xl border border-[#c0607833] bg-white px-3 py-2 text-sm font-semibold text-[#7c5560]">
            {sincronizando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Sincronizar confirmações
          </button>
        </div>
      </div>

      {linhasCsv.length > 0 && <div className="mt-4 rounded-xl bg-[#fff9fb] p-4">
        <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[#40232c]">{nomeCsv}</p><p className="text-xs text-[#7c5560]">{linhasCsv.length} linhas prontas para importar.{csvIgnoradas > 0 ? ` ${csvIgnoradas} linha(s) sem nome serão ignoradas.` : ''}</p></div><button type="button" onClick={() => { setLinhasCsv([]); setNomeCsv(''); setCsvIgnoradas(0); }} className="p-1 text-[#7c5560]"><X className="h-4 w-4" /></button></div>
        <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-xs"><thead><tr className="border-b text-[#7c5560]"><th className="py-2">Membro principal</th><th>Outros membros</th><th>E-mail</th><th>Telefone</th></tr></thead><tbody>{linhasCsv.slice(0, 8).map((l, i) => <tr key={`${l.nome}-${i}`} className="border-b border-[#c0607818]"><td className="py-2 font-medium">{l.nome}</td><td>{l.membros.join(', ') || '—'}</td><td>{l.email || '—'}</td><td>{l.telefone || '—'}</td></tr>)}</tbody></table></div>
        {linhasCsv.length > 8 && <p className="mt-2 text-xs text-[#7c5560]">e mais {linhasCsv.length - 8} linhas…</p>}
        <button type="button" onClick={importarCsv} disabled={importando} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#c06078] px-4 py-2.5 text-sm font-semibold text-white">{importando ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}Confirmar importação</button>
      </div>}
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      <div id="form-familia" className="scroll-mt-6 rounded-2xl border border-[#c0607833] bg-white p-5">
        <div className="flex items-start justify-between gap-3">
          <div><h2 className="font-semibold">Família / grupo</h2><p className="mt-1 text-xs text-[#7c5560]">Cadastre o grupo, o contato principal e os nomes que pertencem a ele.</p></div>
          {familia.id && <button type="button" onClick={resetFamilia} className="rounded-lg px-2 py-1 text-xs text-[#7c5560]">Cancelar edição</button>}
        </div>
        <div className="mt-3 grid gap-2">
          <input placeholder="Ex.: Thais e Bruno" value={familia.nome} onChange={(e) => setFamilia({ ...familia, nome: e.target.value })} className="rounded-xl border px-3 py-2" />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input placeholder="Telefone principal" value={familia.telefone} onChange={(e) => setFamilia({ ...familia, telefone: e.target.value })} className="rounded-xl border px-3 py-2" />
            <input placeholder="E-mail principal" value={familia.email} onChange={(e) => setFamilia({ ...familia, email: e.target.value })} className="rounded-xl border px-3 py-2" />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <select value={familia.lado} onChange={(e) => setFamilia({ ...familia, lado: e.target.value })} className="rounded-xl border px-3 py-2"><option value="ambos">Ambos</option><option value="noiva">Lado da noiva</option><option value="noivo">Lado do noivo</option><option value="outro">Outro</option></select>
            <label className="grid gap-1 text-xs text-[#7c5560]">Acompanhantes extras permitidos
              <input type="number" min={0} max={50} value={familia.extrasPermitidos} onChange={(e) => setFamilia({ ...familia, extrasPermitidos: Math.max(0, Math.min(50, Number(e.target.value) || 0)) })} className="rounded-xl border px-3 py-2 text-sm text-[#40232c]" />
            </label>
          </div>

          <div className="mt-1 rounded-xl border border-[#c0607822] bg-[#fff9fb] p-3">
            <div className="flex items-center justify-between gap-2"><div><p className="text-sm font-semibold">Membros do grupo</p><p className="text-xs text-[#7c5560]">São as pessoas previamente cadastradas que aparecerão no RSVP.</p></div><button type="button" onClick={adicionarMembro} className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1.5 text-xs font-semibold text-[#a04a63]"><UserPlus className="h-3.5 w-3.5" />Adicionar</button></div>
            <div className="mt-3 space-y-2">
              {familia.membros.map((m, i) => <div key={m.id ?? `novo-${i}`} className="grid grid-cols-[1fr_108px_36px] gap-2">
                <input placeholder={`Nome da pessoa ${i + 1}`} value={m.nome} onChange={(e) => alterarMembro(i, { nome: e.target.value })} className="min-w-0 rounded-lg border bg-white px-2.5 py-2 text-sm" />
                <select value={m.tipo} onChange={(e) => alterarMembro(i, { tipo: e.target.value as 'adulto' | 'crianca' })} className="rounded-lg border bg-white px-2 py-2 text-xs"><option value="adulto">Adulto</option><option value="crianca">Criança</option></select>
                <button type="button" onClick={() => removerMembro(i)} title="Remover membro" className="grid place-items-center rounded-lg text-red-500"><Trash2 className="h-4 w-4" /></button>
              </div>)}
            </div>
          </div>

          <p className="text-xs leading-5 text-[#7c5560]"><strong>Membros do grupo</strong> são nomes fixos. <strong>Acompanhantes extras permitidos</strong> são pessoas adicionais que o convidado poderá informar pelo nome na confirmação.</p>
          <textarea placeholder="Observações" value={familia.observacoes} onChange={(e) => setFamilia({ ...familia, observacoes: e.target.value })} className="rounded-xl border px-3 py-2" />
          <button type="button" onClick={salvarFamilia} disabled={salvando} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#c06078] px-4 py-2.5 font-semibold text-white">{salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{familia.id ? 'Atualizar família e membros' : 'Adicionar família e membros'}</button>
        </div>
      </div>

      <div className="rounded-2xl border border-[#c0607833] bg-white p-5">
        <h2 className="font-semibold">Convidado individual</h2>
        <p className="mt-1 text-xs text-[#7c5560]">Use para uma pessoa sem grupo ou para adicionar alguém individualmente a uma família já existente.</p>
        <div className="mt-3 grid gap-2">
          <input placeholder="Nome completo" value={pessoa.nome} onChange={(e) => setPessoa({ ...pessoa, nome: e.target.value })} className="rounded-xl border px-3 py-2" />
          <select value={pessoa.familiaId} onChange={(e) => setPessoa({ ...pessoa, familiaId: e.target.value })} className="rounded-xl border px-3 py-2"><option value="">Sem família/grupo</option>{familias.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}</select>
          <div className="grid grid-cols-2 gap-2"><input placeholder="Telefone" value={pessoa.telefone} onChange={(e) => setPessoa({ ...pessoa, telefone: e.target.value })} className="rounded-xl border px-3 py-2" /><input placeholder="E-mail" value={pessoa.email} onChange={(e) => setPessoa({ ...pessoa, email: e.target.value })} className="rounded-xl border px-3 py-2" /></div>
          <div className="grid grid-cols-2 gap-2"><select value={pessoa.tipo} onChange={(e) => setPessoa({ ...pessoa, tipo: e.target.value as 'adulto' | 'crianca' })} className="rounded-xl border px-3 py-2"><option value="adulto">Adulto</option><option value="crianca">Criança</option></select><select value={pessoa.lado} onChange={(e) => setPessoa({ ...pessoa, lado: e.target.value })} className="rounded-xl border px-3 py-2"><option value="ambos">Ambos</option><option value="noiva">Lado da noiva</option><option value="noivo">Lado do noivo</option><option value="outro">Outro</option></select></div>
          <textarea placeholder="Observações" value={pessoa.observacoes} onChange={(e) => setPessoa({ ...pessoa, observacoes: e.target.value })} className="rounded-xl border px-3 py-2" />
          <button type="button" onClick={salvarPessoa} disabled={salvando} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#c06078] px-4 py-2.5 font-semibold text-white"><Plus className="h-4 w-4" />{pessoa.id ? 'Atualizar convidado' : 'Adicionar convidado'}</button>
        </div>
      </div>
    </div>

    <div className="rounded-2xl border border-[#c0607833] bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Central de convidados</h2><p className="text-sm text-[#7c5560]">{pessoas.length} pessoas · QR de check-in: {qrModo === 'familia' ? 'por família' : 'individual'}</p></div><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-[#7c5560]" /><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar" className="rounded-xl border py-2 pl-9 pr-3" /></div></div>
      {carregando ? <div className="grid place-items-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div> : <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead><tr className="border-b text-[#7c5560]"><th className="py-2">Nome</th><th>Família</th><th>Tipo</th><th>Status</th><th>Contato</th><th className="text-right">Ações</th></tr></thead><tbody>{filtrados.map((p) => { const f = familias.find((x) => x.id === p.familia_id); const qr = f ? f.qr_token : p.qr_token; const qrCheckin = qrModo === 'familia' && f ? f.qr_token : p.qr_token; const qrNome = qrModo === 'familia' && f ? f.nome : p.nome; return <tr key={p.id} className="border-b border-[#c0607818]"><td className="py-3 font-medium">{p.nome}{p.rsvp_extra && <span className="ml-2 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">extra RSVP</span>}</td><td>{f?.nome ?? '—'}</td><td>{p.tipo === 'crianca' ? 'Criança' : 'Adulto'}</td><td><span className={`rounded-full px-2 py-1 text-xs ${p.status === 'confirmado' ? 'bg-emerald-50 text-emerald-700' : p.status === 'nao_vai' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700'}`}>{p.status === 'confirmado' ? 'Confirmado' : p.status === 'nao_vai' ? 'Não vai' : 'Pendente'}</span></td><td>{p.email || p.telefone || '—'}</td><td><div className="flex justify-end gap-1">{!f && <button title={p.status === 'confirmado' ? 'Revisar confirmação registrada pela Gestão' : 'Confirmar presença pela Gestão'} onClick={() => abrirConfirmacaoManual(p.nome, [p])} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"><Check className="h-4 w-4" />{p.status === 'confirmado' ? 'Revisar' : 'Confirmar'}</button>}<button title="Copiar link do convite" onClick={() => void copiar(linkConvite(qr), 'Link do convite copiado.')} className="p-2 text-[#a04a63]"><Link2 className="h-4 w-4" /></button><button title="Copiar link direto de confirmação" onClick={() => void copiar(linkConfirmacao(qr), 'Link de confirmação copiado.')} className="p-2 text-[#a04a63]"><Copy className="h-4 w-4" /></button><button title="Baixar QR de check-in" onClick={() => baixarQr(qrCheckin, qrNome)} className="p-2 text-[#a04a63]"><Download className="h-4 w-4" /></button><button title="Editar" onClick={() => setPessoa({ id: p.id, familiaId: p.familia_id ?? '', nome: p.nome, telefone: p.telefone ?? '', email: p.email ?? '', tipo: p.tipo, lado: p.lado, observacoes: p.observacoes ?? '', status: p.status })} className="p-2"><Pencil className="h-4 w-4" /></button><button title="Excluir" onClick={() => excluir('convidado', p.id)} className="p-2 text-red-500"><Trash2 className="h-4 w-4" /></button></div></td></tr>; })}</tbody></table>{filtrados.length === 0 && <div className="py-10 text-center text-sm text-[#7c5560]"><Users className="mx-auto mb-2 h-7 w-7" />Nenhum convidado encontrado.</div>}</div>}
    </div>

    {familias.length > 0 && <div className="rounded-2xl border border-[#c0607833] bg-white p-5">
      <h2 className="font-semibold">Famílias cadastradas</h2>
      <p className="mt-1 text-xs text-[#7c5560]">O link familiar usa os membros cadastrados abaixo. Grupos vazios ficam sinalizados e o link não deve ser enviado até os nomes serem preenchidos.</p>
      <div className="mt-3 grid gap-2 md:grid-cols-2">{familias.map((f) => {
        const membros = membrosFixos(f.id);
        const extras = extrasDaFamilia(f.id).filter((p) => p.status === 'confirmado');
        const vazio = membros.length === 0;
        return <div key={f.id} className={`rounded-xl p-3 ${vazio ? 'border border-amber-300 bg-amber-50/60' : 'bg-[#fff9fb]'}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-medium">{f.nome} · {membros.length} {membros.length === 1 ? 'pessoa' : 'pessoas'}</p>
              <p className="truncate text-xs text-[#7c5560]">{f.email || f.telefone || 'sem contato principal'}</p>
              {vazio
                ? <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-amber-800"><AlertTriangle className="h-3.5 w-3.5" />Nenhuma pessoa cadastrada neste grupo</p>
                : <p className="mt-1 text-xs text-[#7c5560]">{membros.map((m) => m.nome).join(', ')}{extras.length ? ` · +${extras.length} extra confirmado` : ''}</p>}
              {!vazio && Number(f.extras_permitidos ?? 0) > 0 && <p className="mt-1 text-[11px] text-[#a04a63]">Até {f.extras_permitidos} acompanhante(s) extra(s) no RSVP</p>}
              {!vazio && <button type="button" onClick={() => abrirConfirmacaoManual(f.nome, membros)} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-700"><Check className="h-3.5 w-3.5" />Confirmar pela Gestão</button>}
            </div>
            <div className="flex shrink-0">
              <button disabled={vazio} title={vazio ? 'Cadastre os membros antes de copiar o link' : 'Copiar link do convite'} onClick={() => !vazio && void copiar(linkConvite(f.qr_token), 'Link da família copiado.')} className={`p-2 ${vazio ? 'cursor-not-allowed text-slate-300' : 'text-[#a04a63]'}`}><Link2 className="h-4 w-4" /></button>
              <button disabled={vazio} title={vazio ? 'Cadastre os membros antes de copiar a confirmação' : 'Copiar confirmação direta'} onClick={() => !vazio && void copiar(linkConfirmacao(f.qr_token), 'Link direto da família copiado.')} className={`p-2 ${vazio ? 'cursor-not-allowed text-slate-300' : 'text-[#a04a63]'}`}><Copy className="h-4 w-4" /></button>
              <button title="Editar família e membros" onClick={() => editarFamilia(f)} className="p-2"><Pencil className="h-4 w-4" /></button>
              <button title="Excluir família" onClick={() => excluir('familia', f.id)} className="p-2 text-red-500"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        </div>;
      })}</div>
    </div>}

    {confirmacaoManual && (
      <div className="fixed inset-0 z-[80] grid place-items-center bg-black/35 p-4" role="dialog" aria-modal="true" aria-label="Registrar confirmação pela Gestão" onMouseDown={(e) => { if (e.target === e.currentTarget && !salvandoConfirmacaoManual) setConfirmacaoManual(null); }}>
        <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-[#40232c]">Confirmar pela Gestão</h3>
              <p className="mt-1 text-sm text-[#7c5560]">{confirmacaoManual.titulo}</p>
            </div>
            <button type="button" disabled={salvandoConfirmacaoManual} onClick={() => setConfirmacaoManual(null)} className="rounded-lg p-2 text-[#7c5560]" aria-label="Fechar"><X className="h-4 w-4" /></button>
          </div>
          <p className="mt-4 rounded-xl bg-[#fff9fb] p-3 text-xs leading-5 text-[#7c5560]">Use esta opção quando a confirmação foi recebida por telefone, pessoalmente ou quando o convidado teve dificuldade para confirmar online. Marque exatamente quem estará presente.</p>
          <div className="mt-4 space-y-2">
            {confirmacaoManual.pessoas.map((p) => {
              const marcado = confirmacaoManual.selecionados.includes(p.id);
              return <label key={p.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#c0607826] p-3">
                <input
                  type="checkbox"
                  checked={marcado}
                  onChange={(e) => setConfirmacaoManual((atual) => atual ? {
                    ...atual,
                    selecionados: e.target.checked
                      ? [...new Set([...atual.selecionados, p.id])]
                      : atual.selecionados.filter((id) => id !== p.id),
                  } : atual)}
                  className="h-4 w-4 accent-[#c06078]"
                />
                <span className="min-w-0 flex-1"><strong className="block text-sm text-[#40232c]">{p.nome}</strong><small className="text-[#7c5560]">{p.tipo === 'crianca' ? 'Criança' : 'Adulto'} · {p.status === 'confirmado' ? 'já confirmado' : p.status === 'nao_vai' ? 'marcado como não vai' : 'pendente'}</small></span>
              </label>;
            })}
          </div>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button type="button" disabled={salvandoConfirmacaoManual} onClick={() => setConfirmacaoManual(null)} className="rounded-xl border border-[#c0607833] bg-white px-4 py-2.5 text-sm font-semibold text-[#7c5560]">Cancelar</button>
            <button type="button" disabled={salvandoConfirmacaoManual || confirmacaoManual.selecionados.length === 0} onClick={() => void salvarConfirmacaoManual()} className="inline-flex items-center gap-2 rounded-xl bg-[#c06078] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{salvandoConfirmacaoManual ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Registrar confirmação</button>
          </div>
        </div>
      </div>
    )}
  </section>;
}
