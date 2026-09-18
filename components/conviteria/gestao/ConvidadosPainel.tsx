'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
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
  Trash2,
  Users,
  X,
} from 'lucide-react';

type Familia = { id: string; nome: string; telefone?: string | null; email?: string | null; lado: string; max_acompanhantes: number; observacoes?: string | null; qr_token: string };
type Convidado = { id: string; familia_id?: string | null; nome: string; telefone?: string | null; email?: string | null; tipo: 'adulto'|'crianca'; lado: string; observacoes?: string | null; status: 'pendente'|'confirmado'|'nao_vai'; qr_token: string };
type LinhaCsv = { nome: string; dependentes: string[]; email: string; telefone: string };

const vazioFamilia = { id: '', nome: '', telefone: '', email: '', lado: 'ambos', maxAcompanhantes: 0, observacoes: '' };
const vazioPessoa = { id: '', familiaId: '', nome: '', telefone: '', email: '', tipo: 'adulto' as 'adulto'|'crianca', lado: 'ambos', observacoes: '', status: 'pendente' };

function semAcento(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

function parseCsv(texto: string): string[][] {
  const primeira = texto.split(/\r?\n/, 1)[0] ?? '';
  const sep = (primeira.match(/;/g)?.length ?? 0) >= (primeira.match(/,/g)?.length ?? 0) ? ';' : ',';
  const linhas: string[][] = [];
  let linha: string[] = [];
  let campo = '';
  let aspas = false;

  for (let i = 0; i < texto.length; i += 1) {
    const ch = texto[i];
    if (ch === '"') {
      if (aspas && texto[i + 1] === '"') { campo += '"'; i += 1; }
      else aspas = !aspas;
      continue;
    }
    if (!aspas && ch === sep) { linha.push(campo.trim()); campo = ''; continue; }
    if (!aspas && (ch === '\n' || ch === '\r')) {
      if (ch === '\r' && texto[i + 1] === '\n') i += 1;
      linha.push(campo.trim()); campo = '';
      if (linha.some((x) => x !== '')) linhas.push(linha);
      linha = [];
      continue;
    }
    campo += ch;
  }
  linha.push(campo.trim());
  if (linha.some((x) => x !== '')) linhas.push(linha);
  return linhas;
}

function linhasDoCsv(texto: string): LinhaCsv[] {
  const tabela = parseCsv(texto.replace(/^\uFEFF/, ''));
  if (tabela.length < 2) return [];
  const cab = tabela[0].map(semAcento);
  const achar = (...nomes: string[]) => cab.findIndex((x) => nomes.includes(x));
  const iNome = achar('nome', 'convidado', 'nome do convidado');
  const iDeps = achar('dependentes', 'acompanhantes', 'familia', 'familia/dependentes');
  const iEmail = achar('email', 'e-mail');
  const iTel = achar('telefone', 'celular', 'whatsapp', 'whats');
  if (iNome < 0) return [];

  return tabela.slice(1).map((r) => ({
    nome: String(r[iNome] ?? '').trim(),
    dependentes: String(iDeps >= 0 ? r[iDeps] ?? '' : '')
      .split('|').map((x) => x.trim()).filter(Boolean).slice(0, 20),
    email: String(iEmail >= 0 ? r[iEmail] ?? '' : '').trim(),
    telefone: String(iTel >= 0 ? r[iTel] ?? '' : '').trim(),
  })).filter((x) => x.nome).slice(0, 600);
}

export default function ConvidadosPainel({ eventoId, token, slug, qrModo }: { eventoId: string; token: string; slug: string; qrModo: 'familia'|'individual' }) {
  const [familias, setFamilias] = useState<Familia[]>([]);
  const [pessoas, setPessoas] = useState<Convidado[]>([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [familia, setFamilia] = useState(vazioFamilia);
  const [pessoa, setPessoa] = useState(vazioPessoa);
  const [salvando, setSalvando] = useState(false);
  const [linhasCsv, setLinhasCsv] = useState<LinhaCsv[]>([]);
  const [nomeCsv, setNomeCsv] = useState('');
  const [importando, setImportando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const r = await fetch(`/api/conviteria/gestao/convidados?eventoId=${encodeURIComponent(eventoId)}`, {
      headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
    });
    const d = await r.json().catch(() => null);
    if (!r.ok) setErro(d?.erro || 'Falha ao carregar.');
    else { setFamilias(d.familias ?? []); setPessoas(d.convidados ?? []); setErro(''); }
    setCarregando(false);
  }, [eventoId, token]);

  useEffect(() => { void carregar(); }, [carregar]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return q ? pessoas.filter((p) => [p.nome,p.email,p.telefone].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))) : pessoas;
  }, [busca, pessoas]);

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

  async function salvarFamilia() {
    if (!familia.nome.trim()) return;
    setSalvando(true); setErro('');
    try { await acao({ acao: 'salvar_familia', ...familia }); setFamilia(vazioFamilia); await carregar(); }
    catch (e:any) { setErro(e.message); }
    finally { setSalvando(false); }
  }

  async function salvarPessoa() {
    if (!pessoa.nome.trim()) return;
    setSalvando(true); setErro('');
    try { await acao({ acao: 'salvar_convidado', ...pessoa }); setPessoa(vazioPessoa); await carregar(); }
    catch (e:any) { setErro(e.message); }
    finally { setSalvando(false); }
  }

  async function excluir(tipo: 'familia'|'convidado', id: string) {
    if (!confirm('Excluir este cadastro?')) return;
    const r = await fetch(`/api/conviteria/gestao/convidados?eventoId=${encodeURIComponent(eventoId)}&tipo=${tipo}&id=${encodeURIComponent(id)}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    });
    if (r.ok) await carregar();
  }

  async function confirmarManual(id: string) {
    try { await acao({ acao: 'confirmar_manual', convidadoIds: [id] }); await carregar(); }
    catch (e:any) { setErro(e.message); }
  }

  async function baixarQr(tokenQr: string, nome: string) {
    const QRCode = (await import('qrcode')).default;
    const url = `https://${slug}.conviteia.com/entrada/${tokenQr}`;
    const data = await QRCode.toDataURL(url, { width: 1000, margin: 2 });
    const a = document.createElement('a'); a.href = data;
    a.download = `qr-${nome.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/gi,'-').toLowerCase()}.png`;
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
    const conteudo = '\uFEFFnome;dependentes;email;telefone\nMaria Silva;"João Silva|Pedro Silva";maria@exemplo.com;+5511999999999\nAna Souza;;ana@exemplo.com;+5511888888888\n';
    const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'modelo-convidados-conviteia.csv'; a.click();
    URL.revokeObjectURL(a.href);
  }

  async function lerCsv(file: File) {
    const texto = await file.text();
    const linhas = linhasDoCsv(texto);
    if (!linhas.length) {
      setErro('Não encontrei convidados. Use as colunas nome, dependentes, email e telefone.');
      return;
    }
    setErro(''); setNomeCsv(file.name); setLinhasCsv(linhas);
  }

  async function importarCsv() {
    if (!linhasCsv.length) return;
    setImportando(true); setErro(''); setAviso('');
    try {
      const d = await acao({ acao: 'importar_csv', linhas: linhasCsv });
      setAviso(`${d.importados ?? linhasCsv.length} linhas importadas. As confirmações anteriores também foram sincronizadas.`);
      setLinhasCsv([]); setNomeCsv('');
      await carregar();
    } catch (e:any) { setErro(e.message); }
    finally { setImportando(false); }
  }

  async function sincronizar() {
    setSincronizando(true); setErro(''); setAviso('');
    try {
      const d = await acao({ acao: 'sincronizar' });
      setAviso(`Sincronização concluída: ${d.statusAtualizados ?? 0} status atualizados e ${d.vinculadas ?? 0} confirmações vinculadas à lista.`);
      await carregar();
    } catch (e:any) { setErro(e.message); }
    finally { setSincronizando(false); }
  }

  return <section className="space-y-5">
    <div className="rounded-2xl border border-[#c0607833] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Importar lista de convidados</h2>
          <p className="mt-1 text-sm text-[#7c5560]">Carregue um CSV com nome, dependentes, e-mail e telefone. Dependentes devem ser separados por <strong>|</strong>.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={baixarModelo} className="inline-flex items-center gap-2 rounded-xl border border-[#c0607833] bg-white px-3 py-2 text-sm font-semibold text-[#a04a63]"><FileDown className="h-4 w-4"/>Baixar modelo</button>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#fff5f8] px-3 py-2 text-sm font-semibold text-[#a04a63]">
            <FileUp className="h-4 w-4"/>Importar CSV
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e)=>{const f=e.target.files?.[0];e.currentTarget.value='';if(f)void lerCsv(f)}}/>
          </label>
          <button type="button" onClick={sincronizar} disabled={sincronizando} className="inline-flex items-center gap-2 rounded-xl border border-[#c0607833] bg-white px-3 py-2 text-sm font-semibold text-[#7c5560]">
            {sincronizando?<Loader2 className="h-4 w-4 animate-spin"/>:<RefreshCw className="h-4 w-4"/>}Sincronizar confirmações
          </button>
        </div>
      </div>

      {linhasCsv.length > 0 && <div className="mt-4 rounded-xl bg-[#fff9fb] p-4">
        <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[#40232c]">{nomeCsv}</p><p className="text-xs text-[#7c5560]">{linhasCsv.length} linhas prontas para importar.</p></div><button type="button" onClick={()=>{setLinhasCsv([]);setNomeCsv('')}} className="p-1 text-[#7c5560]"><X className="h-4 w-4"/></button></div>
        <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-xs"><thead><tr className="border-b text-[#7c5560]"><th className="py-2">Nome</th><th>Dependentes</th><th>E-mail</th><th>Telefone</th></tr></thead><tbody>{linhasCsv.slice(0,8).map((l,i)=><tr key={`${l.nome}-${i}`} className="border-b border-[#c0607818]"><td className="py-2 font-medium">{l.nome}</td><td>{l.dependentes.join(', ')||'—'}</td><td>{l.email||'—'}</td><td>{l.telefone||'—'}</td></tr>)}</tbody></table></div>
        {linhasCsv.length>8&&<p className="mt-2 text-xs text-[#7c5560]">e mais {linhasCsv.length-8} linhas…</p>}
        <button type="button" onClick={importarCsv} disabled={importando} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#c06078] px-4 py-2.5 text-sm font-semibold text-white">{importando?<Loader2 className="h-4 w-4 animate-spin"/>:<FileUp className="h-4 w-4"/>}Confirmar importação</button>
      </div>}
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-[#c0607833] bg-white p-5"><h2 className="font-semibold">Famílias / grupos</h2><div className="mt-3 grid gap-2"><input placeholder="Família Silva" value={familia.nome} onChange={(e)=>setFamilia({...familia,nome:e.target.value})} className="rounded-xl border px-3 py-2" /><div className="grid grid-cols-2 gap-2"><input placeholder="Telefone" value={familia.telefone} onChange={(e)=>setFamilia({...familia,telefone:e.target.value})} className="rounded-xl border px-3 py-2" /><input placeholder="E-mail" value={familia.email} onChange={(e)=>setFamilia({...familia,email:e.target.value})} className="rounded-xl border px-3 py-2" /></div><div className="grid grid-cols-2 gap-2"><select value={familia.lado} onChange={(e)=>setFamilia({...familia,lado:e.target.value})} className="rounded-xl border px-3 py-2"><option value="ambos">Ambos</option><option value="noiva">Lado da noiva</option><option value="noivo">Lado do noivo</option><option value="outro">Outro</option></select><input type="number" min={0} max={50} value={familia.maxAcompanhantes} onChange={(e)=>setFamilia({...familia,maxAcompanhantes:Number(e.target.value)})} className="rounded-xl border px-3 py-2" title="Máximo de acompanhantes" /></div><textarea placeholder="Observações" value={familia.observacoes} onChange={(e)=>setFamilia({...familia,observacoes:e.target.value})} className="rounded-xl border px-3 py-2" /><button onClick={salvarFamilia} disabled={salvando} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#c06078] px-4 py-2.5 font-semibold text-white"><Plus className="h-4 w-4" />{familia.id ? 'Atualizar família' : 'Adicionar família'}</button></div></div>
      <div className="rounded-2xl border border-[#c0607833] bg-white p-5"><h2 className="font-semibold">Convidado</h2><div className="mt-3 grid gap-2"><input placeholder="Nome completo" value={pessoa.nome} onChange={(e)=>setPessoa({...pessoa,nome:e.target.value})} className="rounded-xl border px-3 py-2" /><select value={pessoa.familiaId} onChange={(e)=>setPessoa({...pessoa,familiaId:e.target.value})} className="rounded-xl border px-3 py-2"><option value="">Sem família/grupo</option>{familias.map((f)=><option key={f.id} value={f.id}>{f.nome}</option>)}</select><div className="grid grid-cols-2 gap-2"><input placeholder="Telefone" value={pessoa.telefone} onChange={(e)=>setPessoa({...pessoa,telefone:e.target.value})} className="rounded-xl border px-3 py-2" /><input placeholder="E-mail" value={pessoa.email} onChange={(e)=>setPessoa({...pessoa,email:e.target.value})} className="rounded-xl border px-3 py-2" /></div><div className="grid grid-cols-2 gap-2"><select value={pessoa.tipo} onChange={(e)=>setPessoa({...pessoa,tipo:e.target.value as any})} className="rounded-xl border px-3 py-2"><option value="adulto">Adulto</option><option value="crianca">Criança</option></select><select value={pessoa.lado} onChange={(e)=>setPessoa({...pessoa,lado:e.target.value})} className="rounded-xl border px-3 py-2"><option value="ambos">Ambos</option><option value="noiva">Lado da noiva</option><option value="noivo">Lado do noivo</option><option value="outro">Outro</option></select></div><textarea placeholder="Observações" value={pessoa.observacoes} onChange={(e)=>setPessoa({...pessoa,observacoes:e.target.value})} className="rounded-xl border px-3 py-2" /><button onClick={salvarPessoa} disabled={salvando} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#c06078] px-4 py-2.5 font-semibold text-white"><Plus className="h-4 w-4" />{pessoa.id ? 'Atualizar convidado' : 'Adicionar convidado'}</button></div></div>
    </div>

    {erro && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{erro}</p>}
    {aviso && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{aviso}</p>}

    <div className="rounded-2xl border border-[#c0607833] bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Central de convidados</h2><p className="text-sm text-[#7c5560]">{pessoas.length} pessoas · QR de check-in: {qrModo === 'familia' ? 'por família' : 'individual'}</p></div><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-[#7c5560]" /><input value={busca} onChange={(e)=>setBusca(e.target.value)} placeholder="Buscar" className="rounded-xl border py-2 pl-9 pr-3" /></div></div>
      {carregando ? <div className="grid place-items-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div> : <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[860px] text-left text-sm"><thead><tr className="border-b text-[#7c5560]"><th className="py-2">Nome</th><th>Família</th><th>Tipo</th><th>Status</th><th>Contato</th><th className="text-right">Ações</th></tr></thead><tbody>{filtrados.map((p)=>{ const f=familias.find((x)=>x.id===p.familia_id); const qr = f ? f.qr_token : p.qr_token; const qrCheckin = qrModo === 'familia' && f ? f.qr_token : p.qr_token; const qrNome = qrModo === 'familia' && f ? f.nome : p.nome; return <tr key={p.id} className="border-b border-[#c0607818]"><td className="py-3 font-medium">{p.nome}</td><td>{f?.nome ?? '—'}</td><td>{p.tipo === 'crianca' ? 'Criança' : 'Adulto'}</td><td><span className={`rounded-full px-2 py-1 text-xs ${p.status==='confirmado'?'bg-emerald-50 text-emerald-700':p.status==='nao_vai'?'bg-slate-100 text-slate-600':'bg-amber-50 text-amber-700'}`}>{p.status==='confirmado'?'Confirmado':p.status==='nao_vai'?'Não vai':'Pendente'}</span></td><td>{p.email || p.telefone || '—'}</td><td><div className="flex justify-end gap-1"><button title="Confirmar manualmente" onClick={()=>confirmarManual(p.id)} className="p-2 text-emerald-700"><Check className="h-4 w-4" /></button><button title="Copiar link do convite" onClick={()=>void copiar(linkConvite(qr),'Link do convite copiado.')} className="p-2 text-[#a04a63]"><Link2 className="h-4 w-4" /></button><button title="Copiar link direto de confirmação" onClick={()=>void copiar(linkConfirmacao(qr),'Link de confirmação copiado.')} className="p-2 text-[#a04a63]"><Copy className="h-4 w-4" /></button><button title="Baixar QR de check-in" onClick={()=>baixarQr(qrCheckin,qrNome)} className="p-2 text-[#a04a63]"><Download className="h-4 w-4" /></button><button title="Editar" onClick={()=>setPessoa({ id:p.id, familiaId:p.familia_id??'', nome:p.nome, telefone:p.telefone??'', email:p.email??'', tipo:p.tipo, lado:p.lado, observacoes:p.observacoes??'', status:p.status })} className="p-2"><Pencil className="h-4 w-4" /></button><button title="Excluir" onClick={()=>excluir('convidado',p.id)} className="p-2 text-red-500"><Trash2 className="h-4 w-4" /></button></div></td></tr>})}</tbody></table>{filtrados.length===0 && <div className="py-10 text-center text-sm text-[#7c5560]"><Users className="mx-auto mb-2 h-7 w-7" />Nenhum convidado encontrado.</div>}</div>}
    </div>

    {familias.length>0 && <div className="rounded-2xl border border-[#c0607833] bg-white p-5"><h2 className="font-semibold">Famílias cadastradas</h2><p className="mt-1 text-xs text-[#7c5560]">Os links da família já abrem a confirmação com todos os nomes prontos.</p><div className="mt-3 grid gap-2 md:grid-cols-2">{familias.map((f)=><div key={f.id} className="flex items-center justify-between gap-2 rounded-xl bg-[#fff9fb] p-3"><div className="min-w-0"><p className="truncate font-medium">{f.nome}</p><p className="truncate text-xs text-[#7c5560]">{f.email || f.telefone || 'sem contato principal'}</p></div><div className="flex shrink-0"><button title="Copiar link do convite" onClick={()=>void copiar(linkConvite(f.qr_token),'Link da família copiado.')} className="p-2 text-[#a04a63]"><Link2 className="h-4 w-4"/></button><button title="Copiar confirmação direta" onClick={()=>void copiar(linkConfirmacao(f.qr_token),'Link direto da família copiado.')} className="p-2 text-[#a04a63]"><Copy className="h-4 w-4"/></button><button onClick={()=>setFamilia({ id:f.id,nome:f.nome,telefone:f.telefone??'',email:f.email??'',lado:f.lado,maxAcompanhantes:f.max_acompanhantes,observacoes:f.observacoes??'' })} className="p-2"><Pencil className="h-4 w-4" /></button><button onClick={()=>excluir('familia',f.id)} className="p-2 text-red-500"><Trash2 className="h-4 w-4" /></button></div></div>)}</div></div>}
  </section>;
}
