'use client';

import { useCallback, useEffect, useState } from 'react';
import { Banknote, CheckCircle2, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { brlSaque } from '@/lib/conviteria/saque';

const campo =
  'w-full rounded-xl border px-4 py-3 text-sm outline-none transition ' +
  '!bg-white !text-[#40232c] placeholder:!text-[#9b7b84] ' +
  'focus:!border-[#c06078] focus:!ring-2 focus:!ring-[#c0607820]';

export default function SaldoSaque({ eventoId }: { eventoId: string }) {
  const [aberto, setAberto] = useState(false);
  const [dados, setDados] = useState<any>(null);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [cpf, setCpf] = useState('');
  const [chavePix, setChavePix] = useState('');
  const [emailRecebedor, setEmailRecebedor] = useState('');
  const [valor, setValor] = useState('');

  const token = useCallback(async () =>
    (await createClient().auth.getSession()).data.session?.access_token ?? '', []);

  const carregar = useCallback(async () => {
    setErro('');
    try {
      const r = await fetch(`/api/conviteria/saque?evento=${encodeURIComponent(eventoId)}`, {
        headers: { Authorization: `Bearer ${await token()}` },
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.erro);
      setDados(d);
      if (d.recebedor?.nomeCompleto) setNomeCompleto(d.recebedor.nomeCompleto);
      if (d.recebedor?.chavePix) setChavePix(d.recebedor.chavePix);
      if (d.recebedor?.email) setEmailRecebedor(d.recebedor.email);
      if (!valor && d.saldo.disponivelCentavos > 0)
        setValor((d.saldo.disponivelCentavos / 100).toFixed(2).replace('.', ','));
    } catch (e: any) {
      setErro(e.message || 'Falha ao carregar saldo.');
    }
  }, [eventoId, token, valor]);

  useEffect(() => {
    if (aberto && !dados) void carregar();
  }, [aberto, dados, carregar]);

  async function solicitar() {
    setEnviando(true);
    setErro('');
    setMensagem('');
    try {
      const valorCentavos = Math.round(Number(valor.replace(/\./g, '').replace(',', '.')) * 100);
      const r = await fetch('/api/conviteria/saque', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await token()}`,
        },
        body: JSON.stringify({
          eventoId, nomeCompleto, cpf, chavePix, emailRecebedor, valorCentavos,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.erro);
      setCpf('');
      setMensagem(
        d.aviso ||
        d.mensagem ||
        'Saque solicitado com sucesso. O repasse será realizado via PIX em até 24 horas.'
      );
      setDados(null);
      await carregar();
    } catch (e: any) {
      setErro(e.message || 'Falha ao solicitar saque.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mt-3 border-t pt-3" style={{ borderColor: '#c0607822' }}>
      <button
        type="button"
        onClick={() => setAberto(v => !v)}
        className="inline-flex items-center gap-2 text-sm font-medium"
        style={{ color: '#a04a63' }}
      >
        <Banknote className="h-4 w-4" />
        {aberto ? 'Fechar saldo' : 'Saldo e saque'}
      </button>

      {aberto && (
        <div
          className="mt-4 rounded-2xl border p-4 sm:p-5"
          style={{ backgroundColor: '#fff9fb', borderColor: '#c0607833' }}
        >
          {!dados && !erro ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm" style={{ color: '#7c5560' }}>
              <Loader2 className="h-5 w-5 animate-spin" /> Carregando saldo…
            </div>
          ) : dados && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border bg-white p-4" style={{ borderColor: '#c0607828' }}>
                  <p className="text-xs" style={{ color: '#7c5560' }}>Disponível para saque (líquido)</p>
                  <p className="mt-1 text-lg font-semibold" style={{ color: '#40232c' }}>
                    {brlSaque(dados.saldo.disponivelCentavos)}
                  </p>
                </div>
                <div className="rounded-xl border bg-white p-4" style={{ borderColor: '#c0607828' }}>
                  <p className="text-xs" style={{ color: '#7c5560' }}>Já repassado</p>
                  <p className="mt-1 text-lg font-semibold" style={{ color: '#40232c' }}>
                    {brlSaque(dados.saldo.repassadoCentavos)}
                  </p>
                </div>
              </div>

              <div
                className="my-4 rounded-xl px-4 py-3 text-xs leading-5"
                style={{ backgroundColor: '#fdf0f3', color: '#7c5560' }}
              >
                <strong style={{ color: '#40232c' }}>Taxa dos presentes: 1%.</strong>{' '}
                O ConviteIA desconta a taxa antes de creditar o saldo, então o valor
                disponível acima já é líquido.
                <br />
                Saque mínimo: <strong style={{ color: '#40232c' }}>
                  {brlSaque(dados.saqueMinimoCentavos)}
                </strong>. O repasse será realizado via PIX em até 24 horas.
              </div>

              <div className="grid gap-3">
                <input className={campo} style={{ borderColor: '#c0607840' }}
                  placeholder="Nome completo do titular"
                  value={nomeCompleto} onChange={e => setNomeCompleto(e.target.value)} />
                <input className={campo} style={{ borderColor: '#c0607840' }}
                  placeholder="CPF do titular" inputMode="numeric"
                  value={cpf} onChange={e => setCpf(e.target.value)} />
                <input className={campo} style={{ borderColor: '#c0607840' }}
                  placeholder="E-mail do beneficiário/casal" type="email"
                  value={emailRecebedor} onChange={e => setEmailRecebedor(e.target.value)} />
                <input className={campo} style={{ borderColor: '#c0607840' }}
                  placeholder="Chave PIX"
                  value={chavePix} onChange={e => setChavePix(e.target.value)} />
                <input className={campo} style={{ borderColor: '#c0607840' }}
                  placeholder="Valor do saque (R$)" inputMode="decimal"
                  value={valor} onChange={e => setValor(e.target.value)} />

                <button
                  type="button"
                  disabled={enviando || dados.saldo.disponivelCentavos < dados.saqueMinimoCentavos}
                  onClick={solicitar}
                  className="mt-1 rounded-full px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
                  style={{ backgroundColor: '#c06078' }}
                >
                  {enviando ? 'Solicitando…' : 'Solicitar saque'}
                </button>
              </div>

              {mensagem && (
                <div className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-xs text-emerald-800">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  {mensagem}
                </div>
              )}

              {dados.repasses?.length > 0 && (
                <div className="mt-5">
                  <p className="mb-2 text-xs font-semibold" style={{ color: '#40232c' }}>
                    Últimas solicitações
                  </p>
                  <ul className="space-y-2">
                    {dados.repasses.map((r: any) => (
                      <li
                        key={r.id}
                        className="flex items-center justify-between rounded-xl border bg-white px-3 py-2 text-xs"
                        style={{ borderColor: '#c0607828', color: '#40232c' }}
                      >
                        <span>{brlSaque(r.valorCentavos)}</span>
                        <strong style={{ color: '#a04a63' }}>{r.status}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {erro && <p className="mt-3 text-xs text-red-700">{erro}</p>}
        </div>
      )}
    </div>
  );
}
