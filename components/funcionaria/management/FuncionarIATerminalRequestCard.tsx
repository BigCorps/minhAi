'use client';

import { useMemo, useState } from 'react';
import { Check, Loader2, MonitorSmartphone } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

export default function FuncionarIATerminalRequestCard({ companyId }: { companyId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [quantity, setQuantity] = useState(1);
  const [orientation, setOrientation] = useState('either');
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setSending(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc('funcionaria_request_terminal', {
      p_company_id: companyId,
      p_quantity: Math.max(1, Math.min(20, quantity)),
      p_orientation: orientation,
      p_notes: notes.trim() || null,
    });
    setSending(false);
    if (rpcError) setError(rpcError.message);
    else setDone(true);
  }

  return (
    <section className="mt-7 rounded-3xl border border-violet-100 bg-white p-5 text-slate-900 shadow-sm sm:p-6" style={{ colorScheme: 'light' }}>
      <div className="flex gap-4">
        <div className="h-fit rounded-2xl bg-violet-50 p-3 text-[#6D28D9]"><MonitorSmartphone className="h-6 w-6" /></div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-black">Onde sua FuncionarIA vai trabalhar?</h2>
          <p className="mt-1 text-sm text-slate-500">Use qualquer tablet, PC ou terminal touch. Se preferir, peça uma cotação de terminal alugado.</p>
          {error && <div className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}
          {done ? (
            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-lime-50 p-4 text-sm font-black text-lime-800"><Check className="h-4 w-4" />Solicitação enviada. Entraremos em contato para cotação.</div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-[100px_180px_1fr_auto]">
              <input type="number" min={1} max={20} value={quantity} onChange={event => setQuantity(Math.max(1, Math.min(20, Number(event.target.value || 1))))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100" aria-label="Quantidade de terminais" />
              <select value={orientation} onChange={event => setOrientation(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100" aria-label="Formato do terminal">
                <option value="either">Qualquer formato</option>
                <option value="portrait">Em pé</option>
                <option value="landscape">Deitado</option>
              </select>
              <input value={notes} onChange={event => setNotes(event.target.value)} placeholder="Observação opcional" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-violet-300 focus:ring-2 focus:ring-violet-100" />
              <button disabled={sending} onClick={() => void send()} className="rounded-xl bg-[#6D28D9] px-4 py-2 text-sm font-black text-white disabled:opacity-50">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Pedir cotação'}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
