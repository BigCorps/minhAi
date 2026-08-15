'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Loader2, MessageSquareText, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

type Recado = {
  id: string; nome: string; mensagem: string; aprovado: boolean; created_at: string;
};

export default function RecadosPainel({ eventoId }: { eventoId: string }) {
  const [aberto, setAberto] = useState(false);
  const [recados, setRecados] = useState<Recado[]>([]);
  const [pendentes, setPendentes] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  const token = useCallback(async () =>
    (await createClient().auth.getSession()).data.session?.access_token ?? '', []);

  const carregar = useCallback(async () => {
    setCarregando(true); setErro('');
    try {
      const r = await fetch(`/api/conviteria/recados-painel?evento=${encodeURIComponent(eventoId)}`, {
        headers: { Authorization: `Bearer ${await token()}` },
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.erro);
      setRecados(d.recados ?? []);
      setPendentes(d.pendentes ?? 0);
    } catch (e: any) {
      setErro(e.message || 'Falha ao carregar recados.');
    } finally {
      setCarregando(false);
    }
  }, [eventoId, token]);

  useEffect(() => { void carregar(); }, [carregar]);

  async function atualizar(recadoId: string, aprovado: boolean) {
    const r = await fetch('/api/conviteria/recados-painel', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await token()}`,
      },
      body: JSON.stringify({ eventoId, recadoId, aprovado }),
    });
    if (r.ok) await carregar();
  }

  async function excluir(recadoId: string) {
    const r = await fetch('/api/conviteria/recados-painel', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await token()}`,
      },
      body: JSON.stringify({ eventoId, recadoId }),
    });
    if (r.ok) await carregar();
  }

  return (
    <div className="mt-3 border-t pt-3" style={{ borderColor:'#c0607822' }}>
      <button
        type="button"
        onClick={() => setAberto(v => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span
          className="inline-flex items-center gap-2 text-sm font-medium"
          style={{ color:'#a04a63' }}
        >
          <MessageSquareText className="h-4 w-4" />
          Recados
          {pendentes > 0 && (
            <span className="grid min-w-5 place-items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white"
              style={{ backgroundColor:'#c06078' }}>
              {pendentes}
            </span>
          )}
        </span>

        {aberto
          ? <ChevronUp className="h-4 w-4" style={{ color: '#9b7b84' }} />
          : <ChevronDown className="h-4 w-4" style={{ color: '#9b7b84' }} />}
      </button>

      {aberto && (
        <div className="mt-4 rounded-2xl border p-4" style={{ backgroundColor:'#fff9fb', borderColor:'#c0607833' }}>
          {carregando && recados.length === 0 ? (
            <div className="flex justify-center py-5"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : recados.length === 0 ? (
            <p className="text-sm" style={{ color:'#7c5560' }}>Nenhum recado recebido ainda.</p>
          ) : (
            <ul className="space-y-3">
              {recados.map(r => (
                <li key={r.id} className="rounded-xl border bg-white p-3" style={{ borderColor:'#c0607828' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold" style={{ color:'#40232c' }}>{r.nome}</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-5" style={{ color:'#7c5560' }}>
                        {r.mensagem}
                      </p>
                      <p className="mt-2 text-[11px]" style={{ color:'#9b7b84' }}>
                        {new Date(r.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold"
                      style={{
                        backgroundColor: r.aprovado ? '#ecfdf3' : '#fff4e5',
                        color: r.aprovado ? '#087443' : '#9a5b00'
                      }}>
                      {r.aprovado ? 'Publicado' : 'Pendente'}
                    </span>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button type="button" onClick={() => atualizar(r.id, !r.aprovado)}
                      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium"
                      style={{ borderColor:'#c0607840', color:'#a04a63' }}>
                      <Check className="h-3.5 w-3.5" />
                      {r.aprovado ? 'Ocultar' : 'Aprovar'}
                    </button>
                    <button type="button" onClick={() => excluir(r.id)}
                      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs"
                      style={{ borderColor:'#e5c1c8', color:'#9b3a4c' }}>
                      <Trash2 className="h-3.5 w-3.5" /> Excluir
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {erro && <p className="mt-3 text-xs text-red-700">{erro}</p>}
        </div>
      )}
    </div>
  );
}
