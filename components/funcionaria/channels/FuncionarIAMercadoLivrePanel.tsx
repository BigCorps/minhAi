'use client';

import { CheckCircle2, ExternalLink, Loader2, RefreshCw, Store } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useFuncionarIAState } from '@/components/funcionaria/FuncionarIADashboardShell';

export default function FuncionarIAMercadoLivrePanel() {
  const { state } = useFuncionarIAState();
  const companyId = state.company?.id || '';
  const supabase = useMemo(() => createClient(), []);
  const [connection, setConnection] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  if (loading) return <div className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-[#6D28D9]" /></div>;
  if (!companyId) return null;

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-yellow-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2"><Store className="h-5 w-5 text-yellow-500" /><h2 className="text-lg font-black">Mercado Livre</h2>{connection?.is_active && <span className="inline-flex items-center gap-1 rounded-full bg-lime-100 px-2.5 py-1 text-[10px] font-black text-lime-800"><CheckCircle2 className="h-3 w-3" /> CONECTADO</span>}</div>
            <p className="mt-2 text-sm leading-6 text-slate-500">A integração OAuth, token e webhook são os mesmos já usados pela minhAi. A FuncionarIA muda apenas a ordem da resposta: FAQ e dados do produto antes de IA.</p>
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
