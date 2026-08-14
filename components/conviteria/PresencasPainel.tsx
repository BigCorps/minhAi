'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, Mail, Trash2, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

type Confirmacao = {
  id: string;
  nome: string;
  email: string | null;
  acompanhantes: string[];
  totalPessoas: number;
  criadoEm: string;
  atualizadoEm: string;
};

export default function PresencasPainel({ eventoId }: { eventoId: string }) {
  const [aberto, setAberto] = useState(false);
  const [confirmacoes, setConfirmacoes] = useState<Confirmacao[]>([]);
  const [totalFamilias, setTotalFamilias] = useState(0);
  const [totalPessoas, setTotalPessoas] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  const token = useCallback(async () =>
    (await createClient().auth.getSession()).data.session?.access_token ?? '', []);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');

    try {
      const r = await fetch(
        `/api/conviteria/presencas-painel?evento=${encodeURIComponent(eventoId)}`,
        { headers: { Authorization: `Bearer ${await token()}` } }
      );

      const d = await r.json();
      if (!r.ok) throw new Error(d.erro);

      setConfirmacoes(d.confirmacoes ?? []);
      setTotalFamilias(Number(d.totalFamilias ?? 0));
      setTotalPessoas(Number(d.totalPessoas ?? 0));
    } catch (e: any) {
      setErro(e.message || 'Falha ao carregar confirmações.');
    } finally {
      setCarregando(false);
    }
  }, [eventoId, token]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function remover(confirmacaoId: string) {
    if (!window.confirm('Remover esta confirmação de presença?')) return;

    const r = await fetch('/api/conviteria/presencas-painel', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await token()}`,
      },
      body: JSON.stringify({ eventoId, confirmacaoId }),
    });

    if (r.ok) void carregar();
  }

  return (
    <div className="mt-3 border-t pt-3" style={{ borderColor: '#c0607822' }}>
      <button
        type="button"
        onClick={() => setAberto(v => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span
          className="inline-flex items-center gap-2 text-sm font-medium"
          style={{ color: '#a04a63' }}
        >
          <Users className="h-4 w-4" />
          Confirmações de presença
          {totalPessoas > 0 && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
              style={{ backgroundColor: '#c06078' }}
            >
              {totalPessoas}
            </span>
          )}
        </span>

        {aberto
          ? <ChevronUp className="h-4 w-4" style={{ color: '#9b7b84' }} />
          : <ChevronDown className="h-4 w-4" style={{ color: '#9b7b84' }} />}
      </button>

      {aberto && (
        <div
          className="mt-4 rounded-2xl border p-4"
          style={{ backgroundColor: '#fff9fb', borderColor: '#c0607833' }}
        >
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div
              className="rounded-xl border bg-white p-3"
              style={{ borderColor: '#c0607828' }}
            >
              <p className="text-xs" style={{ color: '#7c5560' }}>
                Famílias confirmadas
              </p>
              <p className="mt-1 text-xl font-semibold" style={{ color: '#40232c' }}>
                {totalFamilias}
              </p>
            </div>

            <div
              className="rounded-xl border bg-white p-3"
              style={{ borderColor: '#c0607828' }}
            >
              <p className="text-xs" style={{ color: '#7c5560' }}>
                Total de pessoas
              </p>
              <p className="mt-1 text-xl font-semibold" style={{ color: '#40232c' }}>
                {totalPessoas}
              </p>
            </div>
          </div>

          <p className="mb-4 text-xs leading-5" style={{ color: '#7c5560' }}>
            Nome, e-mail e integrantes da família ficam organizados aqui. Essa
            estrutura será usada posteriormente para Gmail, Drive e lembretes do evento.
          </p>

          {carregando && confirmacoes.length === 0 ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: '#c06078' }} />
            </div>
          ) : confirmacoes.length === 0 ? (
            <p
              className="rounded-xl bg-white p-4 text-center text-sm"
              style={{ color: '#7c5560' }}
            >
              Nenhuma presença confirmada ainda.
            </p>
          ) : (
            <ul className="space-y-3">
              {confirmacoes.map((c) => (
                <li
                  key={c.id}
                  className="rounded-xl border bg-white p-3"
                  style={{ borderColor: '#c0607828' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold" style={{ color: '#40232c' }}>
                        {c.nome}
                      </p>

                      {c.email && (
                        <p
                          className="mt-1 flex items-center gap-1.5 break-all text-xs"
                          style={{ color: '#7c5560' }}
                        >
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          {c.email}
                        </p>
                      )}
                    </div>

                    <span
                      className="shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold"
                      style={{ backgroundColor: '#fdf0f3', color: '#a04a63' }}
                    >
                      {c.totalPessoas} {c.totalPessoas === 1 ? 'pessoa' : 'pessoas'}
                    </span>
                  </div>

                  {c.acompanhantes.length > 0 && (
                    <div
                      className="mt-3 border-t pt-3"
                      style={{ borderColor: '#c0607818' }}
                    >
                      <p
                        className="mb-1.5 text-[11px] font-semibold"
                        style={{ color: '#7c5560' }}
                      >
                        Família
                      </p>

                      <div className="flex flex-wrap gap-1.5">
                        {c.acompanhantes.map((nome, i) => (
                          <span
                            key={`${nome}-${i}`}
                            className="rounded-full px-2 py-1 text-[11px]"
                            style={{ backgroundColor: '#fff4f7', color: '#7c5560' }}
                          >
                            {nome}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-[10px]" style={{ color: '#9b7b84' }}>
                      {new Date(c.atualizadoEm || c.criadoEm).toLocaleString('pt-BR')}
                    </span>

                    <button
                      type="button"
                      onClick={() => remover(c.id)}
                      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px]"
                      style={{ borderColor: '#e7c5cc', color: '#9b3a4c' }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remover
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
