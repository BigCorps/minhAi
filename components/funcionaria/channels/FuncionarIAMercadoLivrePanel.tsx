'use client';

import { CheckCircle2, Download, ExternalLink, Loader2, PackageCheck, RefreshCw, Store } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useFuncionarIAState } from '@/components/funcionaria/FuncionarIADashboardShell';
import { invokeFuncionarIAEdge } from '@/lib/funcionaria-api';

export default function FuncionarIAMercadoLivrePanel() {
  const { state } = useFuncionarIAState();
  const companyId = state.company?.id || '';
  const supabase = useMemo(() => createClient(), []);
  const [connection, setConnection] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState('');
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [syncMap, setSyncMap] = useState<Record<string, any>>({});
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  async function loadSyncState() {
    if (!companyId) return;
    try {
      const data = await invokeFuncionarIAEdge<any>('funcionaria-ml-sync', {
        action: 'status', company_id: companyId,
      });
      setSyncMap(Object.fromEntries((data.items || []).map((item: any) => [item.ml_item_id, item])));
    } catch {
      // A Edge 7I pode ainda não estar publicada no rollout gradual.
      setSyncMap({});
    }
  }

  async function configureSelectedSync(enabled: boolean) {
    const ids = selected.filter(id => catalog.some(item => item.id === id && item.imported));
    if (!ids.length || syncBusy) return;
    setSyncBusy(true);
    setSyncNotice(null);
    let changed = 0;
    let errors = 0;
    try {
      for (const id of ids) {
        try {
          await invokeFuncionarIAEdge('funcionaria-ml-sync', {
            action: 'configure', company_id: companyId, item_id: id, enabled,
          });
          changed++;
        } catch { errors++; }
      }
      setSyncNotice(`${changed} produto(s) ${enabled ? 'habilitados' : 'desabilitados'} para sincronização.${errors ? ` ${errors} não alterados.` : ''}`);
      await loadSyncState();
    } finally {
      setSyncBusy(false);
    }
  }

  async function syncSelectedNow() {
    const ids = selected.filter(id => !!syncMap[id]?.sync_enabled);
    if (!ids.length || syncBusy) return;
    setSyncBusy(true);
    setSyncNotice(null);
    try {
      const results: any[] = [];
      for (let i = 0; i < ids.length; i += 5) {
        const data = await invokeFuncionarIAEdge<any>('funcionaria-ml-sync', {
          action: 'run', company_id: companyId, item_ids: ids.slice(i, i + 5),
        });
        results.push(...(data.results || []));
      }
      const conflicts = results.filter(r => r.status === 'conflict').length;
      const failed = results.filter(r => r.status === 'error').length;
      const baselines = results.filter(r => r.status === 'baseline_created').length;
      setSyncNotice(`Sincronização consultou ${results.length} produto(s): ${baselines} referências seguras criadas, ${conflicts} conflitos, ${failed} falhas. Nenhuma edição local conflitante é sobrescrita.`);
      await loadSyncState();
    } catch (error: any) {
      setSyncNotice(error?.message || 'Falha ao consultar sincronização.');
    } finally {
      setSyncBusy(false);
    }
  }

  async function load() {
    if (!companyId) return;
    setLoading(true);
    const [{ data: conn }, { data: q }] = await Promise.all([
      supabase.from('ml_connections').select('id,seller_id,seller_nickname,is_active,ml_reply_enabled,ml_auto_reply,updated_at').eq('company_id', companyId).maybeSingle(),
      supabase.from('ml_questions').select('id,ml_question_id,produto_nome,texto_pergunta,resposta_gerada,status,created_at').eq('company_id', companyId).order('created_at', { ascending: false }).limit(8),
    ]);
    setConnection(conn || null);
    setQuestions(q || []);
    setLoading(false);
  }

  useEffect(() => { void load(); }, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function updatePreference(field: 'ml_reply_enabled' | 'ml_auto_reply', value: boolean) {
    if (!connection?.id) return;
    setSaving(true);
    const { error } = await supabase.from('ml_connections').update({ [field]: value }).eq('id', connection.id);
    setSaving(false);
    if (!error) setConnection((c: any) => ({ ...c, [field]: value }));
  }

  async function loadCatalog(reset = true) {
    if (!companyId || !connection?.is_active) return;
    setCatalogLoading(true);
    setImportNotice(null);
    try {
      const offset = reset ? 0 : Number(nextOffset || 0);
      const data = await invokeFuncionarIAEdge<any>('funcionaria-ml-importar-produtos', {
        action: 'list', company_id: companyId, offset, limit: 50,
      });
      setCatalog(current => reset ? (data.items || []) : [...current, ...(data.items || [])]);
      setCatalogTotal(Number(data.total || 0));
      setNextOffset(data.next_offset == null ? null : Number(data.next_offset));
      if (reset) setSelected([]);
      await loadSyncState();
    } catch (error: any) {
      setImportNotice(error?.message || 'Não foi possível listar os anúncios.');
    } finally {
      setCatalogLoading(false);
    }
  }

  function toggleItem(id: string) {
    setSelected(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
  }

  async function importSelected() {
    const toImport = selected.filter(id => !syncMap[id]?.sync_enabled);
    if (!toImport.length || importing || syncBusy) {
      setImportNotice('Os anúncios com sincronização ativa devem ser atualizados pela função “Sincronizar agora”.');
      return;
    }
    setImporting(true);
    setImportNotice(null);
    try {
      let imported = 0;
      let updated = 0;
      let linked = 0;
      let errors = 0;
      let protectedItems = 0;
      for (let i = 0; i < toImport.length; i += 10) {
        const chunk = toImport.slice(i, i + 10);
        setImportProgress(`Importando ${Math.min(i + 10, toImport.length)} de ${toImport.length}…`);
        const data = await invokeFuncionarIAEdge<any>('funcionaria-ml-importar-produtos', {
          action: 'import', company_id: companyId, item_ids: chunk,
        });
        for (const row of data.results || []) {
          if (row.status === 'imported') imported++;
          else if (row.status === 'updated' || row.status === 'unchanged') updated++;
          else if (row.status === 'linked_local') linked++;
          else if (row.status === 'managed_by_sync') protectedItems++;
          else if (row.status === 'error') errors++;
        }
      }
      setImportNotice(`Concluído: ${imported} novos, ${updated} atualizados${linked ? `, ${linked} já vinculados localmente` : ''}${protectedItems ? `, ${protectedItems} sob sincronização protegida` : ''}${errors ? `, ${errors} com erro` : ''}.`);
      setSelected([]);
      await loadCatalog(true);
    } catch (error: any) {
      setImportNotice(error?.message || 'A importação não pôde ser concluída.');
    } finally {
      setImportProgress('');
      setImporting(false);
    }
  }

  async function importAll() {
    if (importing) return;
    setImporting(true);
    setImportNotice(null);
    try {
      let scrollId: string | null = null;
      let processed = 0;
      let imported = 0;
      let updated = 0;
      let linked = 0;
      let errors = 0;
      let protectedItems = 0;
      let finished = false;
      let lastFingerprint = '';
      for (let batch = 0; batch < 20000; batch++) {
        setImportProgress(`Importando catálogo… ${processed} processados`);
        const data = await invokeFuncionarIAEdge<any>('funcionaria-ml-importar-produtos', {
          action: 'import_all', company_id: companyId, scroll_id: scrollId,
        });
        const rows = data.results || [];
        processed += Number(data.batch_count || rows.length || 0);
        for (const row of rows) {
          if (row.status === 'imported') imported++;
          else if (row.status === 'updated' || row.status === 'unchanged') updated++;
          else if (row.status === 'linked_local') linked++;
          else if (row.status === 'managed_by_sync') protectedItems++;
          else if (row.status === 'error') errors++;
        }
        if (data.done === true || !data.next_scroll_id || !rows.length) {
          finished = true;
          break;
        }
        const fingerprint = `${String(data.next_scroll_id)}:${rows.map((row: any) => row.item_id).join(',')}`;
        if (fingerprint === lastFingerprint) throw new Error('ml_scan_stalled');
        lastFingerprint = fingerprint;
        scrollId = String(data.next_scroll_id);
      }
      if (!finished) throw new Error('ml_import_safety_limit');
      setImportNotice(`Importação completa: ${imported} novos, ${updated} atualizados${linked ? `, ${linked} já vinculados localmente` : ''}${protectedItems ? `, ${protectedItems} sob sincronização protegida` : ''}${errors ? `, ${errors} com erro` : ''}.`);
      await loadCatalog(true);
    } catch (error: any) {
      setImportNotice(error?.message || 'Não foi possível importar todos os anúncios.');
    } finally {
      setImportProgress('');
      setImporting(false);
    }
  }

  if (loading) return <div className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-[#6D28D9]" /></div>;
  if (!companyId) return null;

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-yellow-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2"><Store className="h-5 w-5 text-yellow-500" /><h2 className="text-lg font-black">Mercado Livre</h2>{connection?.is_active && <span className="inline-flex items-center gap-1 rounded-full bg-lime-100 px-2.5 py-1 text-[10px] font-black text-lime-800"><CheckCircle2 className="h-3 w-3" /> CONECTADO</span>}</div>
            <p className="mt-2 text-sm leading-6 text-slate-500">A integração OAuth, token e webhook são os mesmos já usados pela minhAi. A FuncionarIA usa essa conexão para importar produtos e responder compradores.</p>
          </div>
          <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-500"><RefreshCw className="h-3.5 w-3.5" /> Atualizar</button>
        </div>

        {!connection ? (
          <a href={`/api/ml/authorize?company_id=${companyId}`} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#FFE600] px-5 py-3 text-sm font-black text-slate-900">Conectar Mercado Livre <ExternalLink className="h-4 w-4" /></a>
        ) : (
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 p-4"><div className="text-xs font-black text-slate-400">CONTA</div><div className="mt-1 font-black">{connection.seller_nickname || connection.seller_id}</div></div>
            <div className="rounded-2xl border border-slate-100 p-4"><div className="flex items-center justify-between gap-3"><div><div className="font-black">Responder perguntas</div><div className="mt-1 text-xs text-slate-500">Usa FAQ, produto e IA opcional.</div></div><button type="button" disabled={saving} onClick={() => void updatePreference('ml_reply_enabled', !connection.ml_reply_enabled)} className={`relative h-6 w-11 rounded-full ${connection.ml_reply_enabled ? 'bg-[#6D28D9]' : 'bg-slate-200'}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${connection.ml_reply_enabled ? 'left-6' : 'left-1'}`} /></button></div></div>
            <div className="rounded-2xl border border-slate-100 p-4 lg:col-span-2"><div className="flex items-center justify-between gap-3"><div><div className="font-black">Enviar respostas automaticamente</div><div className="mt-1 text-xs leading-5 text-slate-500">Se desligado, a resposta fica pendente para revisão. Se a IA estiver desligada e nenhuma resposta segura for encontrada, a pergunta também fica pendente.</div></div><button type="button" disabled={saving || !connection.ml_reply_enabled} onClick={() => void updatePreference('ml_auto_reply', !connection.ml_auto_reply)} className={`relative h-6 w-11 rounded-full ${connection.ml_auto_reply ? 'bg-[#6D28D9]' : 'bg-slate-200'} disabled:opacity-40`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${connection.ml_auto_reply ? 'left-6' : 'left-1'}`} /></button></div></div>
          </div>
        )}

        <div className="mt-4 rounded-2xl bg-violet-50 p-4 text-xs font-semibold leading-5 text-violet-800">IA da FuncionarIA: <strong>{state.settings?.ai_enabled ? 'ativada como fallback por créditos' : 'desativada'}</strong>. Respostas determinísticas do Mercado Livre não consomem créditos de IA.</div>
      </div>

      {connection?.is_active ? (
        <div className="rounded-3xl border border-yellow-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2"><Download className="h-5 w-5 text-yellow-500" /><h2 className="text-lg font-black">Importar produtos para sua loja</h2></div>
              <p className="mt-2 text-sm leading-6 text-slate-500">Os anúncios entram no mesmo catálogo da FuncionarIA. Reimportar atualiza o produto sem criar duplicata.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void loadCatalog(true)} disabled={catalogLoading || importing} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 disabled:opacity-50">{catalogLoading ? 'Carregando…' : 'Listar anúncios'}</button>
              <button type="button" onClick={() => void importAll()} disabled={importing} className="rounded-xl bg-[#FFE600] px-3 py-2 text-xs font-black text-slate-900 disabled:opacity-50">Importar todos</button>
            </div>
          </div>

          {importProgress ? <div className="mt-4 rounded-xl bg-yellow-50 px-4 py-3 text-xs font-black text-yellow-800"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />{importProgress}</div> : null}
          {importNotice ? <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs font-bold text-slate-600">{importNotice}</div> : null}

          {catalog.length ? (
            <>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-bold text-slate-400">{catalog.length} de {catalogTotal} anúncios carregados • {selected.length} selecionados</div>
                <button type="button" onClick={() => void importSelected()} disabled={!selected.length || importing || syncBusy} className="inline-flex items-center gap-2 rounded-xl bg-[#6D28D9] px-3 py-2 text-xs font-black text-white disabled:opacity-40"><PackageCheck className="h-4 w-4" />Importar selecionados</button>
              </div>
              <div className="mt-3 rounded-2xl border border-violet-100 bg-violet-50 p-3">
                <div className="text-xs font-black text-violet-900">Sincronização Mercado Livre → FuncionarIA</div>
                <p className="mt-1 text-[11px] leading-5 text-violet-700">Desligada por produto até você habilitar. A atualização imediata funciona pelos botões abaixo; a rotina programada depende da ativação geral da plataforma. Edições locais conflitantes e variações não são sobrescritas.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" disabled={syncBusy || importing || !selected.some(id => catalog.some(item => item.id === id && item.imported))} onClick={() => void configureSelectedSync(true)} className="rounded-lg border border-violet-200 bg-white px-3 py-2 text-[11px] font-bold text-violet-800 disabled:opacity-40">Ativar selecionados</button>
                  <button type="button" disabled={syncBusy || importing || !selected.some(id => syncMap[id]?.sync_enabled)} onClick={() => void configureSelectedSync(false)} className="rounded-lg border border-violet-200 bg-white px-3 py-2 text-[11px] font-bold text-violet-800 disabled:opacity-40">Desativar selecionados</button>
                  <button type="button" disabled={syncBusy || importing || !selected.some(id => syncMap[id]?.sync_enabled)} onClick={() => void syncSelectedNow()} className="rounded-lg bg-violet-700 px-3 py-2 text-[11px] font-bold text-white disabled:opacity-40">{syncBusy ? 'Consultando…' : 'Sincronizar agora'}</button>
                </div>
                {syncNotice ? <div role="status" className="mt-2 text-[11px] font-semibold text-violet-900">{syncNotice}</div> : null}
              </div>
              <div className="mt-3 max-h-[520px] space-y-2 overflow-y-auto pr-1">
                {catalog.map(item => (
                  <label key={item.id} className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 ${item.linked_local ? 'border-slate-100 bg-slate-50 opacity-70' : selected.includes(item.id) ? 'border-violet-300 bg-violet-50' : 'border-slate-100 bg-white'}`}>
                    <input type="checkbox" checked={selected.includes(item.id)} disabled={item.linked_local || importing} onChange={() => toggleItem(item.id)} className="h-4 w-4 accent-[#6D28D9]" />
                    {item.thumbnail ? <img src={item.thumbnail} alt="" className="h-12 w-12 rounded-xl object-cover" /> : <div className="h-12 w-12 rounded-xl bg-slate-100" />}
                    <div className="min-w-0 flex-1"><div className="truncate text-sm font-black">{item.title}</div><div className="mt-1 text-[11px] font-bold text-slate-400">{item.id} • {String(item.status || '').toUpperCase()}</div></div>
                    {item.linked_local ? <span className="rounded-full bg-slate-200 px-2 py-1 text-[10px] font-black text-slate-600">JÁ VINCULADO</span> : item.imported ? (
                      <span className={`rounded-full px-2 py-1 text-[10px] font-black ${['conflict','variants_review'].includes(syncMap[item.id]?.sync_last_state) ? 'bg-red-100 text-red-800' : syncMap[item.id]?.sync_enabled ? 'bg-violet-100 text-violet-800' : 'bg-lime-100 text-lime-800'}`}>
                        {syncMap[item.id]?.sync_last_state === 'variants_review' ? 'REVISAR VARIAÇÕES' : syncMap[item.id]?.sync_last_state === 'conflict' ? 'CONFLITO' : syncMap[item.id]?.sync_enabled ? 'SYNC CONFIGURADO' : 'IMPORTADO'}
                      </span>
                    ) : null}
                  </label>
                ))}
              </div>
              {nextOffset != null ? <button type="button" onClick={() => void loadCatalog(false)} disabled={catalogLoading || importing} className="mt-3 w-full rounded-xl border border-slate-200 py-2.5 text-xs font-black text-slate-600 disabled:opacity-50">Carregar mais</button> : null}
            </>
          ) : null}

          <p className="mt-4 text-[11px] leading-5 text-slate-400">Preço é confirmado pela API de preços do Mercado Livre. Estoque com User Products usa o estoque por localização; quando isso não estiver disponível, a quantidade do anúncio é tratada como referência.</p>
        </div>
      ) : null}

      <div className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between"><h2 className="text-lg font-black">Perguntas recentes</h2><span className="text-xs font-bold text-slate-400">{questions.length} exibidas</span></div>
        <div className="mt-4 space-y-3">
          {questions.length === 0 ? <div className="rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-500">Nenhuma pergunta registrada ainda.</div> : questions.map(q => (
            <div key={q.id} className="rounded-2xl border border-slate-100 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><div className="text-xs font-black text-slate-400">{q.produto_nome || 'Produto'}</div><span className={`rounded-full px-2 py-1 text-[10px] font-black ${q.status === 'sent' ? 'bg-lime-100 text-lime-800' : q.status === 'pending_manual' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>{String(q.status || 'pending').toUpperCase()}</span></div>
              <div className="mt-2 text-sm font-black">{q.texto_pergunta}</div>
              {q.resposta_gerada && <div className="mt-2 text-xs leading-5 text-slate-500">{q.resposta_gerada}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}