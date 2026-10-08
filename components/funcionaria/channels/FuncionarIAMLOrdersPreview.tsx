'use client';

import { useState } from 'react';
import { AlertTriangle, ReceiptText, RefreshCw } from 'lucide-react';
import { invokeFuncionarIAEdge } from '@/lib/funcionaria-api';

type MLOrderSummary = {
  id: string;
  status: 'paid';
  currency: 'BRL';
  amount: number;
  date: string | null;
  listings: { item_id: string; title: string }[];
};
type OrdersPreviewResponse = {
  success: boolean; read_only: boolean;
  items: MLOrderSummary[];
  total: number | null;
  offset: number;
  limit: number;
  next_offset: number | null;
};

const money = (n: number) => new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL'
}).format(n);
const dateBR = (date: string | null) => {
  if (!date) return 'Data indisponível';
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? 'Data indisponível' : parsed.toLocaleDateString('pt-BR');
};

export default function FuncionarIAMLOrdersPreview({ companyId }: { companyId: string }) {
  const [orders, setOrders] = useState<MLOrderSummary[] | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function consult(next = false) {
    if (!companyId || busy) return;
    const offset = next ? nextOffset : 0;
    if (offset === null) return;
    setBusy(true);
    setError(null);
    try {
      const result = await invokeFuncionarIAEdge<OrdersPreviewResponse>('funcionaria-ml-sync', {
        action: 'orders_preview', company_id: companyId, offset, limit: 20,
      });
      if (!result.success || !result.read_only || !Array.isArray(result.items)) {
        throw new Error('Resposta de pedidos não reconhecida.');
      }
      const received = result.items.filter(
        row => /^\d{1,30}$/.test(String(row.id)) &&
          row.status === 'paid' && row.currency === 'BRL' &&
          Number.isFinite(row.amount) && row.amount >= 0
      );
      setOrders(current => {
        const seen = new Map<string,MLOrderSummary>(
          (next && current ? current : []).map(o => [o.id, o])
        );
        received.forEach(o => seen.set(o.id,o));
        return [...seen.values()];
      });
      setTotal(typeof result.total === 'number' && Number.isSafeInteger(result.total) && result.total >= 0 ? result.total : null);
      setNextOffset(result.next_offset == null ? null : Number(result.next_offset));
    } catch (reason: any) {
      setError(reason?.message || 'Não foi possível consultar os pedidos do Mercado Livre.');
    } finally {
      setBusy(false);
    }
  }

  const gross = (orders || []).reduce((sum,order) => sum + order.amount, 0);

  return (
    <section className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-violet-700" />
            <h3 className="text-base font-black text-slate-900">Pedidos pagos no Mercado Livre</h3>
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Consulta oficial por vendedor e status pago. Não cria pedidos, não altera estoque nem cobra pagamentos.
          </p>
        </div>
        <button type="button" onClick={() => void consult(false)} disabled={busy || !companyId}
          className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-3 py-2 text-xs font-bold text-violet-800 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
          {busy ? 'Consultando…' : orders === null ? 'Consultar pedidos' : 'Atualizar pedidos'}
        </button>
      </div>
      {orders === null ? (
        <p className="mt-3 text-xs leading-5 text-slate-500">
          Nenhum pedido é carregado sem solicitar a consulta. Os resultados não identificam compradores.
        </p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div className="rounded-xl bg-white p-3">
              <div className="text-[11px] text-slate-500">Pedidos pagos carregados</div>
              <div className="text-xl font-black">{orders.length}</div>
            </div>
            <div className="rounded-xl bg-white p-3">
              <div className="text-[11px] text-slate-500">Valor dos pedidos carregados</div>
              <div className="text-base font-black">{money(gross)}</div>
            </div>
            <div className="col-span-2 rounded-xl bg-white p-3 sm:col-span-1">
              <div className="text-[11px] text-slate-500">Total informado pela API</div>
              <div className="text-xl font-black">{total === null ? '—' : total}</div>
            </div>
          </div>
          <p className="mt-2 text-[11px] leading-5 text-slate-500">
            Valor bruto informado pelo ML somente para os pedidos carregados; não representa lucro, repasse líquido, nem todas as vendas históricas.
            Não atribuímos estas compras a perguntas, IA ou ações da FuncionarIA.
          </p>
          <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto">
            {!orders.length ? (
              <div className="rounded-xl bg-white p-4 text-xs text-slate-500">Nenhum pedido pago retornado nesta consulta.</div>
            ) : orders.map(order => (
              <article key={order.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl bg-white p-3">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-black">Pedido #{order.id}</div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {dateBR(order.date)} · PAGO · {order.listings.map(x => x.title || x.item_id).join(', ') || 'Itens sem descrição'}
                  </div>
                </div>
                <div className="text-sm font-black text-violet-800">{money(order.amount)}</div>
              </article>
            ))}
          </div>
          {nextOffset !== null && (
            <button type="button" disabled={busy} onClick={() => void consult(true)}
              className="mt-3 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold disabled:opacity-40">
              {busy ? 'Consultando…' : 'Carregar mais 20 pedidos'}
            </button>
          )}
        </>
      )}
      {error && <p role="alert" className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
        <AlertTriangle className="h-4 w-4 shrink-0" />{error}
      </p>}
    </section>
  );
}
