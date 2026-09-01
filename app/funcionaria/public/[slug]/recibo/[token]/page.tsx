'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, Printer, ReceiptText } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { formatarBRL } from '@/lib/funcionaria';

type ReceiptData = {
  receipt_token: string;
  code: string;
  company: {
    name: string;
    slug: string;
    logo_url?: string | null;
    business_address?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  items: Array<{ name: string; quantity: number; unit_price: number; subtotal: number }>;
  subtotal: number;
  discount: number;
  total: number;
  payment_method: string;
  paid_at: string;
  customer_name?: string | null;
};

const PAYMENT_LABELS: Record<string, string> = {
  pix: 'Pix',
  tef: 'Cartão',
  nfc: 'Cartão por aproximação',
  dinheiro: 'Dinheiro',
};

export default function FuncionarIAReceiptPage() {
  const params = useParams<{ slug: string; token: string }>();
  const supabase = useMemo(() => createClient(), []);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error: rpcError } = await supabase.rpc('funcionaria_public_receipt', { p_token: String(params.token || '') });
      if (!alive) return;
      if (rpcError || !data) {
        setError('Comprovante não encontrado.');
      } else if (String((data as any)?.company?.slug || '').toLowerCase() !== String(params.slug || '').toLowerCase()) {
        setError('Este comprovante não pertence a este estabelecimento.');
      } else {
        setReceipt(data as ReceiptData);
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [params.slug, params.token, supabase]);

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-50"><Loader2 className="h-7 w-7 animate-spin text-[#6D28D9]" /></main>;
  }

  if (error || !receipt) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-5">
        <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">
          <ReceiptText className="mx-auto h-9 w-9 text-slate-300" />
          <h1 className="mt-4 text-xl font-black">Comprovante indisponível</h1>
          <p className="mt-2 text-sm text-slate-500">{error || 'Não foi possível carregar o comprovante.'}</p>
        </div>
      </main>
    );
  }

  const paidAt = receipt.paid_at ? new Date(receipt.paid_at) : null;

  return (
    <main className="min-h-screen bg-slate-50 p-4 print:bg-white print:p-0">
      <article className="mx-auto max-w-xl rounded-3xl bg-white p-6 shadow-sm print:max-w-none print:rounded-none print:shadow-none sm:p-8">
        <header className="border-b border-dashed border-slate-200 pb-6 text-center">
          {receipt.company.logo_url && <img src={receipt.company.logo_url} alt={receipt.company.name} className="mx-auto mb-4 max-h-20 max-w-[180px] object-contain" />}
          <h1 className="text-2xl font-black text-slate-950">{receipt.company.name}</h1>
          {receipt.company.business_address && <p className="mt-1 text-xs text-slate-500">{receipt.company.business_address}</p>}
          <div className="mt-5 text-xs font-black uppercase tracking-[.16em] text-[#6D28D9]">Comprovante de pagamento</div>
          <div className="mt-1 font-mono text-lg font-black">Venda {receipt.code}</div>
        </header>

        <section className="py-6">
          <div className="space-y-3">
            {receipt.items.map((item, index) => (
              <div key={`${item.name}-${index}`} className="flex items-start justify-between gap-4 text-sm">
                <div>
                  <div className="font-bold text-slate-800">{item.name}</div>
                  <div className="text-xs text-slate-400">{Number(item.quantity)} × {formatarBRL(Number(item.unit_price))}</div>
                </div>
                <div className="font-black text-slate-800">{formatarBRL(Number(item.subtotal))}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-2 border-t border-dashed border-slate-200 pt-5 text-sm">
            <Line label="Subtotal" value={formatarBRL(Number(receipt.subtotal))} />
            {Number(receipt.discount) > 0 && <Line label="Desconto" value={`− ${formatarBRL(Number(receipt.discount))}`} />}
            <div className="flex items-end justify-between gap-4 pt-2">
              <span className="font-black text-slate-900">Total pago</span>
              <span className="text-3xl font-black text-slate-950">{formatarBRL(Number(receipt.total))}</span>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-slate-50 p-4 text-sm">
          <Line label="Forma de pagamento" value={PAYMENT_LABELS[receipt.payment_method] || receipt.payment_method || 'Pagamento'} />
          {paidAt && <Line label="Data" value={paidAt.toLocaleString('pt-BR')} />}
          {receipt.customer_name && <Line label="Cliente" value={receipt.customer_name} />}
        </section>

        <footer className="mt-6 text-center text-xs text-slate-400">
          <p>Comprovante eletrônico gerado pela FuncionarIA.</p>
          <p className="mt-1">Documento fiscal, quando aplicável, é emitido separadamente pelo estabelecimento.</p>
        </footer>

        <button type="button" onClick={() => window.print()} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#6D28D9] px-5 py-3.5 text-sm font-black text-white print:hidden">
          <Printer className="h-4 w-4" /> Imprimir ou salvar em PDF
        </button>
      </article>
    </main>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4"><span className="text-slate-500">{label}</span><span className="text-right font-bold text-slate-800">{value}</span></div>;
}
