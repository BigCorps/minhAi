'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, RefreshCcw } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { formatarBRL } from '@/lib/funcionaria';

export default function FuncionarIAOrdersPanel({ companyId }: { companyId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('pedidos')
      .select('id,cliente_nome,total,status,metodo_pagamento,created_at,paid_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) setNotice(error.message);
    else setRows(data || []);
    setLoading(false);
  }

  useEffect(() => { void load(); }, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function markDelivered(id: string) {
    setBusy(id);
    setNotice(null);
    try {
      let { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const refreshed = await supabase.auth.refreshSession();
        session = refreshed.data.session;
      }
      if (!session) throw new Error('Faça login novamente para continuar.');

      const response = await fetch('/api/funcionaria/orders/mark-delivered', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: 'no-store',
        body: JSON.stringify({ company_id: companyId, pedido_id: id }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.ok !== true) {
        if (response.status === 401) throw new Error('Faça login novamente para continuar.');
        if (response.status === 403) throw new Error('Você não tem permissão para alterar este pedido.');
        if (response.status === 409) throw new Error('Este pedido não está mais disponível para marcar como entregue.');
        throw new Error(data?.error || 'Falha ao atualizar o pedido.');
      }

      setNotice('Pedido marcado como entregue.');
    } catch (error: any) {
      setNotice(error?.message || 'Falha ao atualizar o pedido.');
    } finally {
      setBusy(null);
      await load();
    }
  }

  return (
    <div className="space-y-3">
      {notice && <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">{notice}</div>}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <div className="font-black">Últimos pedidos</div>
            <div className="mt-1 text-xs text-slate-400">O status de pagamento é alterado somente pelos fluxos de pagamento confirmados.</div>
          </div>
          <button onClick={() => void load()} className="rounded-xl border p-2" aria-label="Atualizar pedidos"><RefreshCcw className="h-4 w-4" /></button>
        </div>
        {loading ? (
          <div className="p-12 text-center text-slate-400"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>
        ) : (
          <div className="divide-y">
            {rows.map(row => (
              <div key={row.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                <div>
                  <div className="font-black">#{row.id.slice(0, 8).toUpperCase()} {row.cliente_nome ? `• ${row.cliente_nome}` : ''}</div>
                  <div className="text-xs text-slate-400">{new Date(row.created_at).toLocaleString('pt-BR')} • {row.metodo_pagamento || 'sem pagamento'}</div>
                </div>
                <div className="font-black">{formatarBRL(Number(row.total))}</div>
                <div className="flex items-center justify-end gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${row.status === 'pago' || row.status === 'entregue' ? 'bg-lime-100 text-lime-800' : row.status === 'cancelado' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                    {String(row.status).replaceAll('_', ' ').toUpperCase()}
                  </span>
                  {row.status === 'pago' && (
                    <button disabled={busy === row.id} onClick={() => void markDelivered(row.id)} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 disabled:opacity-50">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {busy === row.id ? 'Salvando…' : 'Marcar entregue'}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {!rows.length && <div className="p-10 text-center text-sm font-bold text-slate-400">Nenhum pedido ainda.</div>}
          </div>
        )}
      </div>
    </div>
  );
}
