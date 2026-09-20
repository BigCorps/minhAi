'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  Check,
  ChevronDown,
  Copy,
  Download,
  FileDown,
  FileUp,
  Loader2,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Search,
  Save,
  Trash2,
  UserCheck,
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
  created_at?: string;
};

type Convidado = {
  id: string;
  familia_id?: string | null;
  nome: string;
  telefone?: string | null;
  email?: string | null;
  tipo: 'adulto' | 'crianca';
  idade?: number | null;
  lado: string;
  observacoes?: string | null;
  status: 'pendente' | 'confirmado' | 'nao_vai';
  qr_token: string;
  rsvp_extra?: boolean;
  created_at?: string;
};

type MembroForm = { id?: string; nome: string; tipo: 'adulto' | 'crianca'; idade: number | null };
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
  idade?: number | null;
  lado: string;
  observacoes: string;
  status: 'pendente' | 'confirmado' | 'nao_vai';
  criarNovaFamilia: boolean;
  novaFamiliaNome: string;
};

type ConfirmacaoManual = {
  titulo: string;
  pessoas: Convidado[];
  selecionados: string[];
  idadesCriancas: Record<string, number | null>;
};

type SugestaoReconciliacao = {
  tipo: 'familia' | 'individual';
  alvoId: string;
  alvoNome: string;
  membroIds: string[];
  confianca: 'alta' | 'media';
  motivo: string;
};

type ReconciliacaoItem = {
  id: string;
  nome: string;
  email?: string | null;
  contato?: string | null;
  comparecera?: boolean | null;
  acompanhantes: string[];
  sugestao?: SugestaoReconciliacao | null;
};

type ReconciliacaoResumo = {
  pendentes: number;
  automaticasSeguras: number;
  itens: ReconciliacaoItem[];
};

type RevisaoReconciliacao = {
  item: ReconciliacaoItem;
  tipo: 'familia' | 'individual' | '';
  alvoId: string;
  selecionados: string[];
};

function novaFamilia(): FamiliaForm {
  return {
    id: '', nome: '', telefone: '', email: '', lado: 'ambos', extrasPermitidos: 0,
    observacoes: '', membros: [{ nome: '', tipo: 'adulto', idade: null }], removerMembroIds: [],
  };
}

const vazioPessoa: PessoaForm = {
  id: '', familiaId: '', nome: '', telefone: '', email: '', tipo: 'adulto',
  idade: null, lado: 'ambos', observacoes: '', status: 'pendente',
  criarNovaFamilia: false, novaFamiliaNome: '',
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
  const [modalCadastro, setModalCadastro] = useState<'familia' | 'pessoa' | null>(null);
  const [acoesAberta, setAcoesAberta] = useState<string | null>(null);
  const [mostrarPrazo, setMostrarPrazo] = useState(false);
  const [mostrarImportacao, setMostrarImportacao] = useState(false);
  const [toast, setToast] = useState('');
  const [reconciliacao, setReconciliacao] = useState<ReconciliacaoResumo>({ pendentes: 0, automaticasSeguras: 0, itens: [] });
  const [revisaoReconciliacao, setRevisaoReconciliacao] = useState<RevisaoReconciliacao | null>(null);
  const [salvandoReconciliacao, setSalvandoReconciliacao] = useState(false);

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

  const carregarReconciliacao = useCallback(async () => {
    try {
      const r = await fetch(`/api/conviteria/gestao/convidados/reconciliacao?eventoId=${encodeURIComponent(eventoId)}`, {
        headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
      });
      const d = await r.json().catch(() => null);
      if (r.ok) setReconciliacao({
        pendentes: Number(d?.pendentes ?? 0),
        automaticasSeguras: Number(d?.automaticasSeguras ?? 0),
        itens: Array.isArray(d?.itens) ? d.itens : [],
      });
    } catch {
      // A lista principal continua utilizável mesmo se esta análise auxiliar falhar.
    }
  }, [eventoId, token]);

  useEffect(() => { void carregarReconciliacao(); }, [carregarReconciliacao]);

  const gruposLista = useMemo(() => {
    const gruposFamilia = familias.map((f) => {
      const membros = pessoas
        .filter((p) => p.familia_id === f.id)
        .sort((a, b) => {
          if (Boolean(a.rsvp_extra) !== Boolean(b.rsvp_extra)) return a.rsvp_extra ? 1 : -1;
          return String(a.created_at ?? '').localeCompare(String(b.created_at ?? ''));
        });
      return {
        chave: `familia:${f.id}`,
        familia: f,
        pessoas: membros,
        ordem: membros[0]?.created_at ?? f.created_at ?? '',
      };
    }).filter((g) => g.pessoas.length > 0);

    const individuais = pessoas
      .filter((p) => !p.familia_id)
      .map((p) => ({
        chave: `individual:${p.id}`,
        familia: null as Familia | null,
        pessoas: [p],
        ordem: p.created_at ?? '',
      }));

    return [...gruposFamilia, ...individuais].sort((a, b) => {
      const porData = String(a.ordem).localeCompare(String(b.ordem));
      if (porData !== 0) return porData;
      return a.chave.localeCompare(b.chave);
    });
  }, [familias, pessoas]);

  const gruposFiltrados = useMemo(() => {
    const q = busca.trim().toLocaleLowerCase('pt-BR');
    if (!q) return gruposLista;
    return gruposLista.filter((grupo) => {
      if (grupo.familia?.nome.toLocaleLowerCase('pt-BR').includes(q)) return true;
      return grupo.pessoas.some((p) => [p.nome, p.email, p.telefone]
        .filter(Boolean)
        .some((v) => String(v).toLocaleLowerCase('pt-BR').includes(q)));
    });
  }, [busca, gruposLista]);

  const filtrados = useMemo(() => gruposFiltrados.flatMap((grupo) => grupo.pessoas), [gruposFiltrados]);

  function membrosFixos(familiaId: string) {
    return pessoas.filter((p) => p.familia_id === familiaId && !p.rsvp_extra);
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
    const membros = membrosFixos(f.id).map((p) => ({ id: p.id, nome: p.nome, tipo: p.tipo, idade: p.idade ?? null }));
    setFamilia({
      id: f.id,
      nome: f.nome,
      telefone: f.telefone ?? '',
      email: f.email ?? '',
      lado: f.lado,
      extrasPermitidos: Number(f.extras_permitidos ?? 0),
      observacoes: f.observacoes ?? '',
      membros: membros.length ? membros : [{ nome: '', tipo: 'adulto', idade: null }],
      removerMembroIds: [],
    });
    setModalCadastro('familia');
    setAcoesAberta(null);
  }

  function abrirNovaFamilia() {
    resetFamilia();
    setModalCadastro('familia');
    setAcoesAberta(null);
  }

  function abrirNovaPessoa() {
    setPessoa(vazioPessoa);
    setModalCadastro('pessoa');
    setAcoesAberta(null);
  }

  function editarPessoa(p: Convidado) {
    setPessoa({
      id: p.id,
      familiaId: p.familia_id ?? '',
      nome: p.nome,
      telefone: p.telefone ?? '',
      email: p.email ?? '',
      tipo: p.tipo,
      idade: p.idade ?? null,
      lado: p.lado,
      observacoes: p.observacoes ?? '',
      status: p.status,
      criarNovaFamilia: false,
      novaFamiliaNome: '',
    });
    setModalCadastro('pessoa');
    setAcoesAberta(null);
  }

  function adicionarMembro() {
    if (familia.membros.length >= 50) return;
    setFamilia((f) => ({ ...f, membros: [...f.membros, { nome: '', tipo: 'adulto', idade: null }] }));
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
        membros: restantes.length ? restantes : [{ nome: '', tipo: 'adulto', idade: null }],
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
      setModalCadastro(null);
      await carregar();
    } catch (e: any) { setErro(e.message); }
    finally { setSalvando(false); }
  }

  async function salvarPessoa() {
    if (!pessoa.nome.trim()) return setErro('Informe o nome do convidado.');
    setSalvando(true); setErro('');
    try {
      if (pessoa.criarNovaFamilia) {
        const r = await fetch('/api/conviteria/gestao/convidados/criar-familia', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            eventoId,
            ...pessoa,
            novaFamiliaNome: pessoa.novaFamiliaNome.trim() || `Família / grupo de ${pessoa.nome.trim()}`,
          }),
        });
        const d = await r.json().catch(() => null);
        if (!r.ok) throw new Error(d?.erro || 'Não foi possível criar a família para este convidado.');
      } else {
        await acao({ acao: 'salvar_convidado', ...pessoa });
      }
      setPessoa(vazioPessoa);
      setModalCadastro(null);
      await Promise.all([carregar(), carregarReconciliacao()]);
    } catch (e: any) { setErro(e.message); }
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
      idadesCriancas: Object.fromEntries(fixos.filter((p) => p.tipo === 'crianca').map((p) => [p.id, p.idade ?? null])),
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
      await acao({ acao: 'confirmar_manual', convidadoIds: confirmacaoManual.selecionados, idadesCriancas: confirmacaoManual.idadesCriancas });
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
    setErro('');
    setToast('Montando a arte do check-in…');
    try {
      const r = await fetch(`/api/conviteria/gestao?eventoId=${encodeURIComponent(eventoId)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.evento?.config) throw new Error(d?.erro || 'Não foi possível carregar o visual do convite.');

      const {
        baixarCanvasPng,
        formatoPapelaria,
        nomeSeguro,
        renderizarArteCheckin,
      } = await import('@/lib/conviteria/papelaria-canvas');

      const canvas = await renderizarArteCheckin({
        cfg: d.evento.config,
        slug,
        qrToken: tokenQr,
        nome,
        formato: formatoPapelaria('10x15'),
        dpi: 300,
      });

      baixarCanvasPng(canvas, `Check-in-${nomeSeguro(nome)}-10x15.png`);
      setToast('Arte de check-in baixada.');
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível gerar a arte do check-in.');
      setToast('');
      return;
    }
    window.setTimeout(() => setToast(''), 2200);
  }

  async function copiar(url: string, mensagem: string) {
    await navigator.clipboard.writeText(url);
    setToast(mensagem);
    window.setTimeout(() => setToast(''), 2200);
  }

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
      const r = await fetch('/api/conviteria/gestao/convidados/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ eventoId, linhas: linhasCsv.map((l) => ({ ...l, dependentes: l.membros })) }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.erro || 'Não foi possível importar a lista.');
      const avisosImportacao = [
        Number(d?.ambiguos ?? 0) > 0 ? `${d.ambiguos} linha(s) não foram importadas porque o telefone/e-mail apontava para mais de um cadastro.` : '',
        Number(d?.semIdentificador ?? 0) > 0 ? `${d.semIdentificador} cadastro(s) sem telefone/e-mail foram tratados como novos, sem tentar unir pelo nome.` : '',
      ].filter(Boolean).join(' ');
      setAviso(`${d.importados ?? linhasCsv.length} linhas importadas. As confirmações anteriores também foram sincronizadas.${avisosImportacao ? ` ${avisosImportacao}` : ''}`);
      setLinhasCsv([]); setNomeCsv(''); setCsvIgnoradas(0);
      await Promise.all([carregar(), carregarReconciliacao()]);
      avisarPresencasAtualizadas();
    } catch (e: any) { setErro(e.message); }
    finally { setImportando(false); }
  }

  async function sincronizar() {
    setSincronizando(true); setErro(''); setAviso('');
    try {
      const d = await acao({ acao: 'sincronizar' });
      setAviso(`Sincronização concluída: ${d.statusAtualizados ?? 0} status atualizados e ${d.vinculadas ?? 0} confirmações vinculadas à lista.`);
      await Promise.all([carregar(), carregarReconciliacao()]);
      avisarPresencasAtualizadas();
    } catch (e: any) { setErro(e.message); }
    finally { setSincronizando(false); }
  }

  async function reconciliarAutomaticamente() {
    setSincronizando(true); setErro(''); setAviso('');
    try {
      const r = await fetch('/api/conviteria/gestao/convidados/reconciliacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ eventoId, acao: 'auto' }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.erro || 'Não foi possível sincronizar automaticamente.');
      setAviso(`${d.aplicadas ?? 0} confirmação(ões) antiga(s) vinculada(s) com segurança.${Number(d.restantes ?? 0) ? ` ${d.restantes} ainda precisam de revisão.` : ''}`);
      await Promise.all([carregar(), carregarReconciliacao()]);
      avisarPresencasAtualizadas();
    } catch (e: any) { setErro(e.message); }
    finally { setSincronizando(false); }
  }

  function abrirRevisao(item: ReconciliacaoItem) {
    const sugestao = item.sugestao ?? null;
    setRevisaoReconciliacao({
      item,
      tipo: sugestao?.tipo ?? '',
      alvoId: sugestao?.alvoId ?? '',
      selecionados: sugestao?.membroIds ?? [],
    });
  }

  function trocarAlvoRevisao(valor: string) {
    const [tipo, alvoId] = valor.split(':', 2) as ['familia' | 'individual' | '', string];
    if (!tipo || !alvoId) {
      setRevisaoReconciliacao((atual) => atual ? { ...atual, tipo: '', alvoId: '', selecionados: [] } : atual);
      return;
    }
    const selecionados = tipo === 'individual' ? [alvoId] : [];
    setRevisaoReconciliacao((atual) => atual ? { ...atual, tipo, alvoId, selecionados } : atual);
  }

  function proximaRevisao() {
    if (!revisaoReconciliacao) return;
    const indice = itensRevisao.findIndex((item) => item.id === revisaoReconciliacao.item.id);
    const proximo = indice >= 0 ? itensRevisao[indice + 1] : null;
    setErro('');
    if (proximo) abrirRevisao(proximo);
    else {
      setRevisaoReconciliacao(null);
      setAviso('Você chegou ao fim das confirmações desta revisão. As respostas não vinculadas continuam pendentes para revisar depois.');
    }
  }

  async function ignorarReconciliacao() {
    if (!revisaoReconciliacao) return;
    if (!window.confirm('Ignorar esta resposta antiga? Use esta opção apenas quando ela for duplicada ou não deva ser vinculada à lista atual. Ela continuará no histórico, mas deixará de bloquear o WhatsApp e a conciliação.')) return;
    const idAtual = revisaoReconciliacao.item.id;
    const indice = itensRevisao.findIndex((item) => item.id === idAtual);
    const proximo = indice >= 0 ? itensRevisao[indice + 1] : null;
    setSalvandoReconciliacao(true); setErro(''); setAviso('');
    try {
      const r = await fetch('/api/conviteria/gestao/convidados/reconciliacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ eventoId, acao: 'ignorar', confirmacaoId: idAtual }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.erro || 'Não foi possível ignorar esta resposta.');
      setAviso('Resposta antiga ignorada na conciliação. Ela continua disponível no histórico.');
      await carregarReconciliacao();
      if (proximo) abrirRevisao(proximo);
      else setRevisaoReconciliacao(null);
    } catch (e: any) { setErro(e.message); }
    finally { setSalvandoReconciliacao(false); }
  }

  async function salvarReconciliacao() {
    if (!revisaoReconciliacao?.tipo || !revisaoReconciliacao.alvoId) return;
    const idAtual = revisaoReconciliacao.item.id;
    const proximo = reconciliacao.itens.find((item) => item.id !== idAtual) ?? null;
    setSalvandoReconciliacao(true); setErro(''); setAviso('');
    try {
      const r = await fetch('/api/conviteria/gestao/convidados/reconciliacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          eventoId,
          acao: 'aplicar',
          confirmacaoId: revisaoReconciliacao.item.id,
          tipo: revisaoReconciliacao.tipo,
          alvoId: revisaoReconciliacao.alvoId,
          convidadoIds: revisaoReconciliacao.selecionados,
        }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.erro || 'Não foi possível vincular esta confirmação.');
      setAviso('Confirmação antiga sincronizada com a Central de convidados.');
      await Promise.all([carregar(), carregarReconciliacao()]);
      avisarPresencasAtualizadas();
      if (proximo) abrirRevisao(proximo);
      else setRevisaoReconciliacao(null);
    } catch (e: any) { setErro(e.message); }
    finally { setSalvandoReconciliacao(false); }
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
  const resumo = useMemo(() => ({
    total: pessoas.length,
    confirmados: pessoas.filter((p) => p.status === 'confirmado').length,
    confirmadosAdultos: pessoas.filter((p) => p.status === 'confirmado' && p.tipo !== 'crianca').length,
    confirmadosCriancas: pessoas.filter((p) => p.status === 'confirmado' && p.tipo === 'crianca').length,
    pendentes: pessoas.filter((p) => p.status === 'pendente').length,
    naoVai: pessoas.filter((p) => p.status === 'nao_vai').length,
  }), [pessoas]);
  const familiasSemMembros = useMemo(() => familias.filter((f) => membrosFixos(f.id).length === 0), [familias, pessoas]);
  const listaPronta = pessoas.length > 0;
  const prazoPronto = Boolean(rsvpPrazo);
  const configuracaoInicialPendente = !listaPronta || !prazoPronto;
  const itensRevisao = reconciliacao.itens;
  const alvoFamiliaRevisao = revisaoReconciliacao?.tipo === 'familia'
    ? familias.find((f) => f.id === revisaoReconciliacao.alvoId) ?? null
    : null;
  const membrosAlvoRevisao = alvoFamiliaRevisao ? membrosFixos(alvoFamiliaRevisao.id) : [];

  const prazoCard = (
    <div className={`rounded-2xl border p-5 ${rsvpEncerrado ? 'border-amber-300 bg-amber-50/60' : 'border-[#c0607833] bg-white'}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2"><CalendarClock className="h-5 w-5 text-[#a04a63]" /><h2 className="font-semibold">Prazo para confirmação</h2></div>
          <p className="mt-2 text-sm leading-6 text-[#7c5560]">Defina até quando os convidados poderão confirmar ou alterar a presença pelo convite. Depois do prazo, você ainda poderá ajustar a lista manualmente por esta Gestão.</p>
          <p className="mt-1 text-xs text-[#9b7b84]">A mesma data também é usada nas comunicações do WhatsApp do Evento.</p>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${rsvpEncerrado ? 'bg-amber-100 text-amber-800' : rsvpPrazo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
          {rsvpEncerrado ? 'PRAZO ENCERRADO' : rsvpPrazo ? 'CONFIGURADO' : 'PENDENTE'}
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,260px)_auto]">
        <label className="text-sm font-medium text-[#40232c]">Confirmar presença até
          <input type="date" value={rsvpPrazo} max={dataEventoMax} onChange={(e) => setRsvpPrazo(e.target.value)} className="mt-1 block w-full rounded-xl border border-[#c0607833] bg-white px-3 py-2.5" />
        </label>
        <div className="flex flex-wrap items-end gap-2">
          <button type="button" onClick={salvarPrazoRsvp} disabled={salvandoPrazo} className="inline-flex items-center gap-2 rounded-xl bg-[#c06078] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {salvandoPrazo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Salvar prazo
          </button>
        </div>
      </div>
    </div>
  );

  const importacaoCard = (
    <div className="rounded-2xl border border-[#c0607833] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Importar lista de convidados</h2>
          <p className="mt-1 text-sm text-[#7c5560]">Baixe o modelo, preencha no Excel ou Google Sheets e envie novamente. O ConviteIA reconhece automaticamente os formatos mais comuns.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={baixarModelo} className="inline-flex items-center gap-2 rounded-xl border border-[#c0607833] bg-white px-3 py-2 text-sm font-semibold text-[#a04a63]"><FileDown className="h-4 w-4" />Baixar modelo</button>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#fff5f8] px-3 py-2 text-sm font-semibold text-[#a04a63]">
            <FileUp className="h-4 w-4" />Importar CSV
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.currentTarget.value = ''; if (f) void lerCsv(f); }} />
          </label>
        </div>
      </div>
      {linhasCsv.length > 0 && <div className="mt-4 rounded-xl bg-[#fff9fb] p-4">
        <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[#40232c]">{nomeCsv}</p><p className="text-xs text-[#7c5560]">{linhasCsv.length} linhas prontas para importar.{csvIgnoradas > 0 ? ` ${csvIgnoradas} linha(s) precisam de correção e serão ignoradas.` : ''}</p></div><button type="button" onClick={() => { setLinhasCsv([]); setNomeCsv(''); setCsvIgnoradas(0); }} className="p-1 text-[#7c5560]"><X className="h-4 w-4" /></button></div>
        <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-xs"><thead><tr className="border-b text-[#7c5560]"><th className="py-2">Membro principal</th><th>Outros membros</th><th>E-mail</th><th>Telefone</th></tr></thead><tbody>{linhasCsv.slice(0, 8).map((l, i) => <tr key={`${l.nome}-${i}`} className="border-b border-[#c0607818]"><td className="py-2 font-medium">{l.nome}</td><td>{l.membros.join(', ') || '—'}</td><td>{l.email || '—'}</td><td>{l.telefone || '—'}</td></tr>)}</tbody></table></div>
        {linhasCsv.length > 8 && <p className="mt-2 text-xs text-[#7c5560]">e mais {linhasCsv.length - 8} linhas…</p>}
        <button type="button" onClick={importarCsv} disabled={importando} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#c06078] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{importando ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}Confirmar importação</button>
      </div>}
    </div>
  );

  return <section className="space-y-5">
    {carregando && (
      <div className="rounded-xl border border-[#c0607826] bg-white px-4 py-3" aria-live="polite">
        <div className="flex items-center justify-between gap-3 text-xs text-[#7c5560]">
          <span className="inline-flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" />Carregando lista de convidados…</span>
          <span>Isso pode levar alguns segundos</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#f4e3e8]"><div className="h-full rounded-full bg-[#c06078] transition-[width] duration-200" style={{ width: `${Math.max(1, Math.min(100, progressoCarga))}%` }} /></div>
      </div>
    )}

    {erro && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{erro}</p>}
    {aviso && <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700" role="status">{aviso}</p>}

    {configuracaoInicialPendente && <div className="space-y-4">
      {!listaPronta && importacaoCard}
      {!prazoPronto && prazoCard}
    </div>}

    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <div className="rounded-2xl border border-[#c0607833] bg-white p-4"><p className="text-xs text-[#7c5560]">Convidados</p><p className="mt-1 text-2xl font-semibold text-[#40232c]">{resumo.total}</p></div>
      <div className="rounded-2xl border border-[#c0607833] bg-white p-4"><p className="text-xs text-[#7c5560]">Confirmados</p><p className="mt-1 text-2xl font-semibold text-[#40232c]">{resumo.confirmados}</p><p className="mt-1 text-[11px] text-[#9b7b84]">{resumo.confirmadosAdultos} adulto(s) · {resumo.confirmadosCriancas} criança(s)</p></div>
      <div className="rounded-2xl border border-[#c0607833] bg-white p-4"><p className="text-xs text-[#7c5560]">Pendentes</p><p className="mt-1 text-2xl font-semibold text-[#40232c]">{resumo.pendentes}</p></div>
      <div className="rounded-2xl border border-[#c0607833] bg-white p-4"><p className="text-xs text-[#7c5560]">Não irão</p><p className="mt-1 text-2xl font-semibold text-[#40232c]">{resumo.naoVai}</p></div>
    </div>

    {reconciliacao.pendentes > 0 && <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <p className="flex items-center gap-2 font-semibold text-amber-900"><AlertTriangle className="h-4 w-4" />Confirmações antigas para sincronizar</p>
          <p className="mt-1 text-sm leading-6 text-amber-800">Existem <strong>{reconciliacao.pendentes}</strong> resposta(s) recebida(s) antes da nova Central que ainda não estão vinculadas à lista atual. Faça a conciliação antes do primeiro disparo do WhatsApp para não cobrar quem já confirmou.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {reconciliacao.automaticasSeguras > 0 && <button type="button" onClick={() => void reconciliarAutomaticamente()} disabled={sincronizando} className="inline-flex items-center gap-2 rounded-xl bg-amber-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{sincronizando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Sincronizar {reconciliacao.automaticasSeguras} segura(s)</button>}
          <button type="button" onClick={() => itensRevisao[0] && abrirRevisao(itensRevisao[0])} className="rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900">Revisar pendentes</button>
        </div>
      </div>
    </div>}

    {familiasSemMembros.length > 0 && <div className="rounded-2xl border border-amber-200 bg-white p-4">
      <p className="flex items-center gap-2 font-semibold text-[#40232c]"><AlertTriangle className="h-4 w-4 text-amber-600" />{familiasSemMembros.length} grupo(s) sem membros cadastrados</p>
      <p className="mt-1 text-sm text-[#7c5560]">Esses grupos não podem usar RSVP familiar corretamente até que os nomes sejam preenchidos.</p>
      <div className="mt-3 flex flex-wrap gap-2">{familiasSemMembros.slice(0, 8).map((f) => <button key={f.id} type="button" onClick={() => editarFamilia(f)} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900">{f.nome}</button>)}{familiasSemMembros.length > 8 && <span className="px-2 py-1.5 text-xs text-[#7c5560]">+{familiasSemMembros.length - 8} grupos</span>}</div>
    </div>}

    <div className="rounded-2xl border border-[#c0607833] bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-semibold">Central de convidados</h2><p className="text-sm text-[#7c5560]">{pessoas.length} pessoas · {familias.length} grupos · QR de check-in {qrModo === 'familia' ? 'por família' : 'individual'}</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-[#7c5560]" /><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar convidado" className="w-[210px] rounded-xl border py-2 pl-9 pr-3 text-sm" /></div>
          <button type="button" onClick={abrirNovaFamilia} className="inline-flex items-center gap-1.5 rounded-xl border border-[#c0607833] bg-white px-3 py-2 text-sm font-semibold text-[#a04a63]"><Users className="h-4 w-4" />Família/grupo</button>
          <button type="button" onClick={abrirNovaPessoa} className="inline-flex items-center gap-1.5 rounded-xl bg-[#c06078] px-3 py-2 text-sm font-semibold text-white"><UserPlus className="h-4 w-4" />Convidado</button>
        </div>
      </div>

      {carregando ? <div className="grid place-items-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div> : <>
        <div className="mt-4 hidden md:block">
          <table className="w-full table-fixed text-left text-sm">
            <colgroup><col className="w-[23%]"/><col className="w-[30%]"/><col className="w-[10%]"/><col className="w-[13%]"/><col className="w-[24%]"/></colgroup>
            <thead><tr className="border-b text-[#7c5560]"><th className="py-2 pr-3">Nome</th><th className="pr-3">Família</th><th>Tipo</th><th>Status</th><th className="text-right">Ações</th></tr></thead>
            <tbody>{gruposFiltrados.map((grupo, grupoIndex) => {
              const f = grupo.familia;
              const membros = f ? membrosFixos(f.id) : grupo.pessoas;
              const grupoConfirmado = membros.some((x) => x.status === 'confirmado');
              const fundoGrupo = grupoIndex % 2 === 0 ? '#ffffff' : '#fff5f8';
              return grupo.pessoas.map((p, pessoaIndex) => {
                const principal = !f || (membros.length > 0 && membros[0].id === p.id);
                const qr = f ? f.qr_token : p.qr_token;
                const qrCheckin = qrModo === 'familia' && f ? f.qr_token : p.qr_token;
                const qrNome = qrModo === 'familia' && f ? f.nome : p.nome;
                return <tr key={p.id} className="border-b border-[#c0607818] align-middle" style={{ backgroundColor: fundoGrupo }}>
                  <td className="py-3 pr-3"><span className="block truncate font-medium" title={p.nome}>{p.nome}</span>{p.rsvp_extra && <span className="mt-1 inline-block rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">extra RSVP</span>}</td>
                  {pessoaIndex === 0 && <td rowSpan={grupo.pessoas.length} className="pr-3 align-top" style={{ paddingTop: 12 }}><span className="block font-medium text-[#7c5560]" title={f?.nome ?? ''}>{f?.nome ?? 'Convidado individual'}</span>{f && <span className="mt-1 block text-[11px] text-[#9b7b84]">{grupo.pessoas.length} {grupo.pessoas.length === 1 ? 'pessoa' : 'pessoas'}</span>}</td>}
                  <td>{p.tipo === 'crianca' ? <span>Criança<span className="block text-[11px] text-[#9b7b84]">{p.idade ? `${p.idade} ${p.idade === 1 ? 'ano' : 'anos'}` : 'idade não informada'}</span></span> : 'Adulto'}</td>
                  <td><span className={`rounded-full px-2 py-1 text-xs ${p.status === 'confirmado' ? 'bg-emerald-50 text-emerald-700' : p.status === 'nao_vai' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700'}`}>{p.status === 'confirmado' ? 'Confirmado' : p.status === 'nao_vai' ? 'Não vai' : 'Pendente'}</span></td>
                  <td><div className="flex items-center justify-end gap-1.5">
                    {principal && <button type="button" onClick={() => abrirConfirmacaoManual(f?.nome ?? p.nome, membros)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"><Check className="h-3.5 w-3.5" />{grupoConfirmado ? 'Revisar presença' : 'Confirmar presença'}</button>}
                    <div className="relative">
                      <button type="button" onClick={() => setAcoesAberta((atual) => atual === p.id ? null : p.id)} className="rounded-lg p-2 text-[#7c5560] hover:bg-white/70" title="Mais ações"><MoreHorizontal className="h-4 w-4" /></button>
                      {acoesAberta === p.id && <div className="absolute right-0 top-full z-30 mt-1 w-52 rounded-xl border border-[#c0607833] bg-white p-1.5 shadow-xl">
                        <button type="button" onClick={() => f ? editarFamilia(f) : editarPessoa(p)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-[#fff5f8]"><Pencil className="h-3.5 w-3.5" />{f ? 'Editar grupo e membros' : 'Editar convidado'}</button>
                        <button type="button" onClick={() => { setAcoesAberta(null); void copiar(linkConfirmacao(qr), 'Link de confirmação copiado.'); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-[#fff5f8]"><Copy className="h-3.5 w-3.5" />Copiar link de confirmação</button>
                        <button type="button" onClick={() => { setAcoesAberta(null); void baixarQr(qrCheckin, qrNome); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-[#fff5f8]"><Download className="h-3.5 w-3.5" />Baixar arte de check-in</button>
                        <button type="button" onClick={() => { setAcoesAberta(null); void excluir('convidado', p.id); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" />Excluir pessoa</button>
                      </div>}
                    </div>
                  </div></td>
                </tr>;
              });
            })}</tbody>
          </table>
        </div>

        <div className="mt-4 space-y-3 md:hidden">{gruposFiltrados.map((grupo, grupoIndex) => {
          const f = grupo.familia;
          const membros = f ? membrosFixos(f.id) : grupo.pessoas;
          const grupoConfirmado = membros.some((x) => x.status === 'confirmado');
          const fundoGrupo = grupoIndex % 2 === 0 ? '#ffffff' : '#fff5f8';
          return <div key={grupo.chave} className="overflow-hidden rounded-xl border border-[#c0607820]" style={{ backgroundColor: fundoGrupo }}>
            <div className="border-b border-[#c0607818] px-3 py-2"><p className="text-xs font-semibold text-[#a04a63]">{f?.nome ?? 'Convidado individual'}</p>{f && <p className="mt-0.5 text-[11px] text-[#9b7b84]">{grupo.pessoas.length} {grupo.pessoas.length === 1 ? 'pessoa' : 'pessoas'}</p>}</div>
            <div className="divide-y divide-[#c0607818]">{grupo.pessoas.map((p) => {
              const principal = !f || (membros.length > 0 && membros[0].id === p.id);
              const qr = f ? f.qr_token : p.qr_token;
              const qrCheckin = qrModo === 'familia' && f ? f.qr_token : p.qr_token;
              const qrNome = qrModo === 'familia' && f ? f.nome : p.nome;
              return <div key={p.id} className="p-3">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-medium text-[#40232c]">{p.nome}</p><p className="mt-0.5 truncate text-xs text-[#7c5560]">{p.tipo === 'crianca' ? `Criança · ${p.idade ? `${p.idade} ${p.idade === 1 ? 'ano' : 'anos'}` : 'idade não informada'}` : 'Adulto'}{p.rsvp_extra ? ' · extra RSVP' : ''}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-[11px] ${p.status === 'confirmado' ? 'bg-emerald-50 text-emerald-700' : p.status === 'nao_vai' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700'}`}>{p.status === 'confirmado' ? 'Confirmado' : p.status === 'nao_vai' ? 'Não vai' : 'Pendente'}</span></div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {principal && <button type="button" onClick={() => abrirConfirmacaoManual(f?.nome ?? p.nome, membros)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700"><Check className="h-3.5 w-3.5" />{grupoConfirmado ? 'Revisar presença' : 'Confirmar presença'}</button>}
                  <button type="button" onClick={() => f ? editarFamilia(f) : editarPessoa(p)} className="inline-flex items-center gap-1 rounded-lg bg-white/80 px-2.5 py-1.5 text-xs font-semibold text-[#a04a63]"><Pencil className="h-3.5 w-3.5" />Editar</button>
                  <button type="button" onClick={() => void copiar(linkConfirmacao(qr), 'Link de confirmação copiado.')} className="inline-flex items-center gap-1 rounded-lg border bg-white/70 px-2.5 py-1.5 text-xs text-[#7c5560]"><Copy className="h-3.5 w-3.5" />Confirmação</button>
                  <button type="button" onClick={() => void baixarQr(qrCheckin, qrNome)} className="inline-flex items-center gap-1 rounded-lg border bg-white/70 px-2.5 py-1.5 text-xs text-[#7c5560]"><Download className="h-3.5 w-3.5" />Arte QR</button>
                </div>
              </div>;
            })}</div>
          </div>;
        })}</div>
        {filtrados.length === 0 && <div className="py-10 text-center text-sm text-[#7c5560]"><Users className="mx-auto mb-2 h-7 w-7" />Nenhum convidado encontrado.</div>}
      </>}
    </div>

    {(listaPronta || prazoPronto) && <div className="rounded-2xl border border-[#c0607833] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="font-semibold text-[#40232c]">Ferramentas e configurações</p><p className="mt-1 text-xs text-[#7c5560]">O que já foi configurado fica recolhido aqui para deixar a Central mais limpa.</p></div>
        <div className="flex flex-wrap gap-2">
          {listaPronta && <button type="button" onClick={() => setMostrarImportacao((v) => !v)} className="inline-flex items-center gap-1.5 rounded-xl border border-[#c0607833] px-3 py-2 text-sm font-semibold text-[#7c5560]"><FileUp className="h-4 w-4" />Importar/atualizar lista <ChevronDown className={`h-4 w-4 transition ${mostrarImportacao ? 'rotate-180' : ''}`} /></button>}
          {prazoPronto && <button type="button" onClick={() => setMostrarPrazo((v) => !v)} className="inline-flex items-center gap-1.5 rounded-xl border border-[#c0607833] px-3 py-2 text-sm font-semibold text-[#7c5560]"><CalendarClock className="h-4 w-4" />Prazo: {new Date(`${rsvpPrazo}T12:00:00`).toLocaleDateString('pt-BR')} <ChevronDown className={`h-4 w-4 transition ${mostrarPrazo ? 'rotate-180' : ''}`} /></button>}
          {listaPronta && <button type="button" onClick={() => void sincronizar()} disabled={sincronizando} className="inline-flex items-center gap-1.5 rounded-xl bg-[#fff5f8] px-3 py-2 text-sm font-semibold text-[#a04a63]">{sincronizando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Verificar confirmações</button>}
        </div>
      </div>
      {mostrarImportacao && listaPronta && <div className="mt-4">{importacaoCard}</div>}
      {mostrarPrazo && prazoPronto && <div className="mt-4">{prazoCard}</div>}
    </div>}

    {modalCadastro && <div className="fixed inset-0 z-[80] grid place-items-center bg-black/35 p-4" role="dialog" aria-modal="true" onMouseDown={(e) => { if (e.target === e.currentTarget && !salvando) setModalCadastro(null); }}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-semibold text-[#40232c]">{modalCadastro === 'familia' ? (familia.id ? 'Editar família / grupo' : 'Adicionar família / grupo') : (pessoa.id ? 'Editar convidado' : 'Adicionar convidado')}</h3><p className="mt-1 text-sm text-[#7c5560]">{modalCadastro === 'familia' ? 'Contato principal, membros do grupo e acompanhantes extras ficam reunidos aqui.' : 'Os dados de contato ficam disponíveis somente nesta edição, sem ocupar espaço na tabela.'}</p></div><button type="button" onClick={() => setModalCadastro(null)} className="rounded-lg p-2 text-[#7c5560]"><X className="h-4 w-4" /></button></div>

        {modalCadastro === 'familia' ? <div className="mt-4 grid gap-2">
          <input placeholder="Ex.: Thais e Bruno" value={familia.nome} onChange={(e) => setFamilia({ ...familia, nome: e.target.value })} className="rounded-xl border px-3 py-2" />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><input placeholder="Telefone principal" value={familia.telefone} onChange={(e) => setFamilia({ ...familia, telefone: e.target.value })} className="rounded-xl border px-3 py-2" /><input placeholder="E-mail principal" value={familia.email} onChange={(e) => setFamilia({ ...familia, email: e.target.value })} className="rounded-xl border px-3 py-2" /></div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><select value={familia.lado} onChange={(e) => setFamilia({ ...familia, lado: e.target.value })} className="rounded-xl border px-3 py-2"><option value="ambos">Ambos</option><option value="noiva">Lado da noiva</option><option value="noivo">Lado do noivo</option><option value="outro">Outro</option></select><label className="grid gap-1 text-xs text-[#7c5560]">Acompanhantes extras permitidos<input type="number" min={0} max={50} value={familia.extrasPermitidos} onChange={(e) => setFamilia({ ...familia, extrasPermitidos: Math.max(0, Math.min(50, Number(e.target.value) || 0)) })} className="rounded-xl border px-3 py-2 text-sm text-[#40232c]" /></label></div>
          <div className="mt-1 rounded-xl border border-[#c0607822] bg-[#fff9fb] p-3"><div className="flex items-center justify-between gap-2"><div><p className="text-sm font-semibold">Membros do grupo</p><p className="text-xs text-[#7c5560]">São as pessoas que aparecerão no RSVP. Para crianças, a idade é opcional aqui e será confirmada pelo convidado no RSVP.</p></div><button type="button" onClick={adicionarMembro} className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1.5 text-xs font-semibold text-[#a04a63]"><UserPlus className="h-3.5 w-3.5" />Adicionar</button></div><div className="mt-3 space-y-2">{familia.membros.map((m, i) => <div key={m.id ?? `novo-${i}`} className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_108px_108px_36px]"><input placeholder={`Nome da pessoa ${i + 1}`} value={m.nome} onChange={(e) => alterarMembro(i, { nome: e.target.value })} className="min-w-0 rounded-lg border bg-white px-2.5 py-2 text-sm" /><select value={m.tipo} onChange={(e) => alterarMembro(i, { tipo: e.target.value as 'adulto' | 'crianca', idade: e.target.value === 'crianca' ? (m.idade ?? null) : null })} className="rounded-lg border bg-white px-2 py-2 text-xs"><option value="adulto">Adulto</option><option value="crianca">Criança</option></select>{m.tipo === 'crianca' ? <select value={m.idade ?? ''} onChange={(e) => alterarMembro(i, { idade: e.target.value ? Number(e.target.value) : null })} className="rounded-lg border bg-white px-2 py-2 text-xs"><option value="">Idade</option>{Array.from({ length: 12 }, (_, n) => n + 1).map((idade) => <option key={idade} value={idade}>{idade} {idade === 1 ? 'ano' : 'anos'}</option>)}</select> : <div className="hidden sm:block"/>}<button type="button" onClick={() => removerMembro(i)} title="Remover membro" className="grid place-items-center rounded-lg text-red-500"><Trash2 className="h-4 w-4" /></button></div>)}</div></div>
          <textarea placeholder="Observações" value={familia.observacoes} onChange={(e) => setFamilia({ ...familia, observacoes: e.target.value })} className="rounded-xl border px-3 py-2" />
          <div className="mt-2 flex flex-wrap justify-between gap-2">{familia.id ? <button type="button" onClick={() => { const id = familia.id; setModalCadastro(null); void excluir('familia', id); }} className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-600"><Trash2 className="h-4 w-4" />Excluir grupo</button> : <span/>}<div className="flex gap-2"><button type="button" onClick={() => setModalCadastro(null)} className="rounded-xl border px-4 py-2.5 text-sm font-semibold text-[#7c5560]">Cancelar</button><button type="button" onClick={salvarFamilia} disabled={salvando} className="inline-flex items-center gap-2 rounded-xl bg-[#c06078] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{familia.id ? 'Salvar alterações' : 'Adicionar grupo'}</button></div></div>
        </div> : <div className="mt-4 grid gap-2">
          <input placeholder="Nome completo" value={pessoa.nome} onChange={(e) => setPessoa({ ...pessoa, nome: e.target.value })} className="rounded-xl border px-3 py-2" />
          <select value={pessoa.familiaId} disabled={pessoa.criarNovaFamilia} onChange={(e) => setPessoa({ ...pessoa, familiaId: e.target.value, criarNovaFamilia: false, novaFamiliaNome: '' })} className="rounded-xl border px-3 py-2 disabled:bg-[#f8f2f4] disabled:text-[#9b7b84]"><option value="">Sem família/grupo</option>{familias.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}</select>
          {!pessoa.familiaId && <div className="rounded-xl border border-[#c0607822] bg-[#fff9fb] p-3">
            <label className="flex cursor-pointer items-start gap-3 text-sm text-[#40232c]"><input type="checkbox" checked={pessoa.criarNovaFamilia} onChange={(e) => setPessoa({ ...pessoa, criarNovaFamilia: e.target.checked, novaFamiliaNome: e.target.checked ? (pessoa.novaFamiliaNome || (pessoa.nome.trim() ? `Família / grupo de ${pessoa.nome.trim()}` : '')) : '' })} className="mt-0.5 h-4 w-4 accent-[#c06078]"/><span><strong className="block">Criar uma nova família/grupo para esta pessoa</strong><small className="mt-0.5 block text-[#7c5560]">Use quando este convidado era individual e passará a representar um novo grupo.</small></span></label>
            {pessoa.criarNovaFamilia && <input placeholder={`Família / grupo de ${pessoa.nome.trim() || 'nome do convidado'}`} value={pessoa.novaFamiliaNome} onChange={(e) => setPessoa({ ...pessoa, novaFamiliaNome: e.target.value })} className="mt-3 w-full rounded-xl border bg-white px-3 py-2" />}
          </div>}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><input placeholder="Telefone" value={pessoa.telefone} onChange={(e) => setPessoa({ ...pessoa, telefone: e.target.value })} className="rounded-xl border px-3 py-2" /><input placeholder="E-mail" value={pessoa.email} onChange={(e) => setPessoa({ ...pessoa, email: e.target.value })} className="rounded-xl border px-3 py-2" /></div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3"><select value={pessoa.tipo} onChange={(e) => setPessoa({ ...pessoa, tipo: e.target.value as 'adulto' | 'crianca', idade: e.target.value === 'crianca' ? (pessoa.idade ?? null) : null })} className="rounded-xl border px-3 py-2"><option value="adulto">Adulto</option><option value="crianca">Criança</option></select>{pessoa.tipo === 'crianca' ? <select value={pessoa.idade ?? ''} onChange={(e) => setPessoa({ ...pessoa, idade: e.target.value ? Number(e.target.value) : null })} className="rounded-xl border px-3 py-2"><option value="">Idade</option>{Array.from({ length: 12 }, (_, n) => n + 1).map((idade) => <option key={idade} value={idade}>{idade} {idade === 1 ? 'ano' : 'anos'}</option>)}</select> : <div className="hidden sm:block"/>}<select value={pessoa.lado} onChange={(e) => setPessoa({ ...pessoa, lado: e.target.value })} className="rounded-xl border px-3 py-2"><option value="ambos">Ambos</option><option value="noiva">Lado da noiva</option><option value="noivo">Lado do noivo</option><option value="outro">Outro</option></select></div>
          <textarea placeholder="Observações" value={pessoa.observacoes} onChange={(e) => setPessoa({ ...pessoa, observacoes: e.target.value })} className="rounded-xl border px-3 py-2" />
          <div className="mt-2 flex justify-end gap-2"><button type="button" onClick={() => setModalCadastro(null)} className="rounded-xl border px-4 py-2.5 text-sm font-semibold text-[#7c5560]">Cancelar</button><button type="button" onClick={salvarPessoa} disabled={salvando} className="inline-flex items-center gap-2 rounded-xl bg-[#c06078] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{pessoa.id ? 'Salvar alterações' : 'Adicionar convidado'}</button></div>
        </div>}
      </div>
    </div>}

    {confirmacaoManual && <div className="fixed inset-0 z-[80] grid place-items-center bg-black/35 p-4" role="dialog" aria-modal="true" aria-label="Confirmar presença" onMouseDown={(e) => { if (e.target === e.currentTarget && !salvandoConfirmacaoManual) setConfirmacaoManual(null); }}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-semibold text-[#40232c]">Confirmar presença</h3><p className="mt-1 text-sm text-[#7c5560]">{confirmacaoManual.titulo}</p></div><button type="button" disabled={salvandoConfirmacaoManual} onClick={() => setConfirmacaoManual(null)} className="rounded-lg p-2 text-[#7c5560]" aria-label="Fechar"><X className="h-4 w-4" /></button></div>
        <p className="mt-4 rounded-xl bg-[#fff9fb] p-3 text-xs leading-5 text-[#7c5560]">Use para confirmações recebidas por telefone, pessoalmente ou quando o convidado tiver dificuldade com o processo online. Marque exatamente quem estará presente.</p>
        <div className="mt-4 space-y-2">{confirmacaoManual.pessoas.map((p) => { const marcado = confirmacaoManual.selecionados.includes(p.id); return <label key={p.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#c0607826] p-3"><input type="checkbox" checked={marcado} onChange={(e) => setConfirmacaoManual((atual) => atual ? { ...atual, selecionados: e.target.checked ? [...new Set([...atual.selecionados, p.id])] : atual.selecionados.filter((id) => id !== p.id) } : atual)} className="h-4 w-4 accent-[#c06078]" /><span className="min-w-0 flex-1"><strong className="block text-sm text-[#40232c]">{p.nome}</strong><small className="text-[#7c5560]">{p.tipo === 'crianca' ? 'Criança' : 'Adulto'} · {p.status === 'confirmado' ? 'já confirmado' : p.status === 'nao_vai' ? 'marcado como não vai' : 'pendente'}</small></span>{p.tipo === 'crianca' && marcado && <select value={confirmacaoManual.idadesCriancas[p.id] ?? ''} onChange={(e) => setConfirmacaoManual((atual) => atual ? { ...atual, idadesCriancas: { ...atual.idadesCriancas, [p.id]: e.target.value ? Number(e.target.value) : null } } : atual)} className="rounded-lg border px-2 py-1.5 text-xs"><option value="">Idade</option>{Array.from({ length: 12 }, (_, n) => n + 1).map((idade) => <option key={idade} value={idade}>{idade} {idade === 1 ? 'ano' : 'anos'}</option>)}</select>}</label>; })}</div>
        <div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" disabled={salvandoConfirmacaoManual} onClick={() => setConfirmacaoManual(null)} className="rounded-xl border border-[#c0607833] bg-white px-4 py-2.5 text-sm font-semibold text-[#7c5560]">Cancelar</button><button type="button" disabled={salvandoConfirmacaoManual || confirmacaoManual.selecionados.length === 0} onClick={() => void salvarConfirmacaoManual()} className="inline-flex items-center gap-2 rounded-xl bg-[#c06078] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{salvandoConfirmacaoManual ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Registrar confirmação</button></div>
      </div>
    </div>}

    {revisaoReconciliacao && <div className="fixed inset-0 z-[90] grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Sincronizar confirmação antiga" onMouseDown={(e) => { if (e.target === e.currentTarget && !salvandoReconciliacao) setRevisaoReconciliacao(null); }}>
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-semibold text-[#40232c]">Sincronizar confirmação antiga</h3><p className="mt-1 text-sm text-[#7c5560]">Vincule a resposta recebida anteriormente à lista atual sem criar uma nova confirmação.</p></div><button type="button" onClick={() => setRevisaoReconciliacao(null)} className="rounded-lg p-2 text-[#7c5560]"><X className="h-4 w-4" /></button></div>
        <div className="mt-4 rounded-xl bg-[#fff9fb] p-4"><p className="font-semibold text-[#40232c]">{revisaoReconciliacao.item.nome}</p>{revisaoReconciliacao.item.email && <p className="mt-1 text-xs text-[#7c5560]">{revisaoReconciliacao.item.email}</p>}<p className="mt-2 text-xs text-[#7c5560]">Resposta antiga: {revisaoReconciliacao.item.comparecera === false ? 'não comparecerá' : 'presença confirmada'}{revisaoReconciliacao.item.acompanhantes.length ? ` · ${revisaoReconciliacao.item.acompanhantes.join(', ')}` : ''}</p>{revisaoReconciliacao.item.sugestao && <p className="mt-2 rounded-lg bg-white px-3 py-2 text-xs text-[#7c5560]">Sugestão: <strong>{revisaoReconciliacao.item.sugestao.alvoNome}</strong> · {revisaoReconciliacao.item.sugestao.motivo}</p>}</div>
        <label className="mt-4 block text-sm font-medium text-[#40232c]">Correspondente na lista<select value={revisaoReconciliacao.tipo && revisaoReconciliacao.alvoId ? `${revisaoReconciliacao.tipo}:${revisaoReconciliacao.alvoId}` : ''} onChange={(e) => trocarAlvoRevisao(e.target.value)} className="mt-1 block w-full rounded-xl border px-3 py-2.5"><option value="">Escolha…</option><optgroup label="Famílias / grupos">{familias.map((f) => <option key={`f-${f.id}`} value={`familia:${f.id}`}>{f.nome}</option>)}</optgroup><optgroup label="Convidados individuais">{pessoas.filter((p) => !p.familia_id).map((p) => <option key={`p-${p.id}`} value={`individual:${p.id}`}>{p.nome}</option>)}</optgroup></select></label>
        {revisaoReconciliacao.tipo === 'familia' && <div className="mt-4"><p className="text-sm font-semibold text-[#40232c]">Quem desta família confirmou?</p><div className="mt-2 space-y-2">{membrosAlvoRevisao.map((p) => <label key={p.id} className="flex cursor-pointer items-center gap-3 rounded-xl border p-3"><input type="checkbox" checked={revisaoReconciliacao.selecionados.includes(p.id)} disabled={revisaoReconciliacao.item.comparecera === false} onChange={(e) => setRevisaoReconciliacao((atual) => atual ? { ...atual, selecionados: e.target.checked ? [...new Set([...atual.selecionados, p.id])] : atual.selecionados.filter((id) => id !== p.id) } : atual)} className="h-4 w-4 accent-[#c06078]" /><span><strong className="block text-sm">{p.nome}</strong><small className="text-[#7c5560]">{p.tipo === 'crianca' ? `Criança · ${p.idade ? `${p.idade} ${p.idade === 1 ? 'ano' : 'anos'}` : 'idade não informada'}` : 'Adulto'}</small></span></label>)}</div></div>}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-[#7c5560]">{itensRevisao.length} confirmação(ões) ainda aguardam revisão.</span><div className="flex flex-wrap justify-end gap-2"><button type="button" disabled={salvandoReconciliacao} onClick={proximaRevisao} className="rounded-xl border px-4 py-2.5 text-sm font-semibold text-[#7c5560]">Próxima</button><button type="button" disabled={salvandoReconciliacao} onClick={() => void ignorarReconciliacao()} className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900">Ignorar esta resposta</button><button type="button" onClick={() => setRevisaoReconciliacao(null)} className="rounded-xl border px-4 py-2.5 text-sm font-semibold text-[#7c5560]">Fechar</button><button type="button" onClick={() => void salvarReconciliacao()} disabled={salvandoReconciliacao || !revisaoReconciliacao.tipo || !revisaoReconciliacao.alvoId || (revisaoReconciliacao.item.comparecera !== false && revisaoReconciliacao.tipo === 'familia' && revisaoReconciliacao.selecionados.length === 0)} className="inline-flex items-center gap-2 rounded-xl bg-[#c06078] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{salvandoReconciliacao ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}Vincular confirmação</button></div></div>
      </div>
    </div>}

    {toast && <div className="fixed bottom-5 right-5 z-[100] rounded-xl bg-[#40232c] px-4 py-3 text-sm font-semibold text-white shadow-xl" role="status">{toast}</div>}
  </section>;
}
