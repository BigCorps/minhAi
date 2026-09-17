'use client';

import { useState } from 'react';
import { CheckCircle2, Heart, Loader2 } from 'lucide-react';

export default function AceitarPadrinhos({ eventoId, slug, aceito }: { eventoId: string; slug: string; aceito: boolean }) {
  const [ok, setOk] = useState(aceito); const [carregando, setCarregando] = useState(false); const [erro, setErro] = useState('');
  async function aceitar() {
    setCarregando(true); setErro('');
    try {
      const r = await fetch('/api/conviteria/padrinhos/responder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventoId, slug }) });
      const d = await r.json().catch(() => null); if (!r.ok) throw new Error(d?.erro || 'Não foi possível responder.'); setOk(true);
    } catch (e: any) { setErro(e.message || 'Não foi possível responder.'); } finally { setCarregando(false); }
  }
  if (ok) return <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-5 py-4 font-semibold text-emerald-700"><CheckCircle2 className="h-5 w-5" />Resposta registrada. Que alegria ter vocês conosco!</div>;
  return <div className="mt-6"><button type="button" onClick={aceitar} disabled={carregando} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#c06078] px-6 py-4 font-semibold text-white shadow-lg disabled:opacity-60">{carregando ? <Loader2 className="h-5 w-5 animate-spin" /> : <Heart className="h-5 w-5" />}{carregando ? 'Registrando…' : 'Aceitamos ❤️'}</button>{erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}</div>;
}
