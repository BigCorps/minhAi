'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Banknote, Check, Copy, CreditCard, Loader2, QrCode, ScanLine, X } from 'lucide-react';
import FuncionarIAHeader from '@/components/funcionaria/FuncionarIAHeader';
import {
  formatarBRL,
  normalizarCodigoFuncionarIA,
  resolverCheckoutFuncionarIA,
  type FuncionarIACheckoutDetalhe,
} from '@/lib/funcionaria';
import { invokeFuncionarIAEdge } from '@/lib/funcionaria-api';

const NOTES = [2, 5, 10, 20, 50, 100, 200];
type PayView = 'choose' | 'pix' | 'card' | 'cash' | 'waiting_cash' | 'paid';
type CardMethod = 'debit' | 'credit';

export default function FuncionarIATerminalPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [entry, setEntry] = useState('');
  const [checkout, setCheckout] = useState<FuncionarIACheckoutDetalhe | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<PayView>('choose');
  const [pix, setPix] = useState<any>(null);
  const [caps, setCaps] = useState<any>(null);
  const [card, setCard] = useState<any>(null);
  const [cardMethod, setCardMethod] = useState<CardMethod>('debit');
  const [installments, setInstallments] = useState(1);
  const [banknotes, setBanknotes] = useState<Record<string, number>>({});
  const [cash, setCash] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const queryCode = new URLSearchParams(window.location.search).get('codigo');
    if (queryCode) {
      setEntry(queryCode);
      void locate(queryCode);
    } else {
      inputRef.current?.focus();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!checkout || !['pix', 'card', 'waiting_cash'].includes(view)) return;
    const timer = window.setInterval(() => {
      if (view === 'pix') void checkPix(true);
      if (view === 'card') void checkCard(true);
      if (view === 'waiting_cash') void refreshCheckout(true);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [checkout?.codigo, view]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadCapabilities(code: string) {
    try {
      const data = await invokeFuncionarIAEdge<any>('funcionaria-card', { action: 'availability', codigo: code });
      setCaps({ ...(data.capabilities || {}), checkout_enabled: true });
    } catch {
      setCaps({ checkout_enabled: false, debit: { enabled: false }, credit: { enabled: false } });
    }
  }

  async function locate(value = entry) {
    const code = normalizarCodigoFuncionarIA(value);
    if (code.length !== 8) {
      setError('Digite ou leia o código de 8 caracteres.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const detail = await resolverCheckoutFuncionarIA(code, { allowPaid: true });
      setCheckout(detail);
      setEntry(detail.codigo);
      await loadCapabilities(detail.codigo);
      await restorePaymentView(detail);
    } catch (err: any) {
      setCheckout(null);
      setError(err?.message || 'Venda não encontrada.');
    } finally {
      setLoading(false);
    }
  }

  async function restorePaymentView(detail: FuncionarIACheckoutDetalhe) {
    if (detail.status === 'pago') {
      setView('paid');
      return;
    }
    if (['aguardando_dinheiro', 'aguardando_troco'].includes(detail.status)) {
      setCash({
        tendered_cents: detail.cash_tendered_cents,
        change_cents: detail.cash_change_cents,
        notified: null,
      });
      setView('waiting_cash');
      return;
    }
    if (detail.status === 'em_pagamento' && detail.pix_transaction_id) {
      try {
        const data = await invokeFuncionarIAEdge<any>('funcionaria-pix', { action: 'create', codigo: detail.codigo });
        setPix(data);
        setView('pix');
        return;
      } catch (err: any) {
        setError(err?.message || 'Não foi possível retomar o Pix.');
      }
    }
    if (detail.status === 'em_pagamento' && detail.card_provider && detail.card_reference_id) {
      setCard({
        provider: detail.card_provider,
        reference_id: detail.card_reference_id,
        deep_link: detail.card_deep_link || null,
      });
      setCardMethod(detail.card_payment_type === 'credit' ? 'credit' : 'debit');
      setInstallments(Math.max(1, Number(detail.card_installments || 1)));
      setView('card');
      return;
    }
    setView('choose');
  }

  async function refreshCheckout(silent = false) {
    if (!checkout) return;
    try {
      const detail = await resolverCheckoutFuncionarIA(checkout.codigo, { allowPaid: true });
      setCheckout(detail);
      if (detail.status === 'pago') setView('paid');
      else if (!silent) await restorePaymentView(detail);
    } catch (err: any) {
      if (!silent) setError(err?.message || 'Não foi possível atualizar a venda.');
    }
  }

  async function createPix() {
    if (!checkout) return;
    setBusy(true);
    setError(null);
    try {
      const data = await invokeFuncionarIAEdge<any>('funcionaria-pix', { action: 'create', codigo: checkout.codigo });
      setPix(data);
      setView('pix');
    } catch (err: any) {
      setError(paymentError(err, 'Não foi possível gerar o Pix.'));
    } finally {
      setBusy(false);
    }
  }

  async function checkPix(silent = false) {
    if (!checkout) return;
    if (!silent) setBusy(true);
    try {
      const data = await invokeFuncionarIAEdge<any>('funcionaria-pix', { action: 'check', codigo: checkout.codigo });
      if (data.status === 'pago' || data.finalized?.status === 'pago') {
        await refreshCheckout(true);
        setView('paid');
      } else if (!silent) {
        setError('Pagamento ainda não identificado.');
      }
    } catch (err: any) {
      if (!silent) setError(paymentError(err, 'Pagamento ainda não identificado.'));
    } finally {
      if (!silent) setBusy(false);
    }
  }


  async function createCard(method: CardMethod) {
    if (!checkout) return;
    setBusy(true);
    setError(null);
    try {
      const requestedInstallments = method === 'credit' ? installments : 1;
      const data = await invokeFuncionarIAEdge<any>('funcionaria-card', {
        action: 'create',
        codigo: checkout.codigo,
        payment_method: method,
        installments: requestedInstallments,
      });
      setCardMethod(method);
      setCard(data);
      setView('card');
      if (data.deep_link) window.location.href = data.deep_link;
    } catch (err: any) {
      setError(paymentError(err, 'Cartão não configurado.'));
    } finally {
      setBusy(false);
    }
  }

  async function checkCard(silent = false) {
    if (!checkout) return;
    if (!silent) setBusy(true);
    try {
      const data = await invokeFuncionarIAEdge<any>('funcionaria-card', { action: 'check', codigo: checkout.codigo });
      if (data.status === 'paid') {
        await refreshCheckout(true);
        setView('paid');
      } else if (data.status === 'cancelled') {
        setCard(null);
        await locate(checkout.codigo);
      } else if (!silent) {
        setError('Pagamento ainda aguardando na maquininha.');
      }
    } catch (err: any) {
      if (!silent) setError(paymentError(err, 'Não foi possível consultar o cartão.'));
    } finally {
      if (!silent) setBusy(false);
    }
  }

  async function cancelCard() {
    if (!checkout) return;
    setBusy(true);
    setError(null);
    try {
      await invokeFuncionarIAEdge('funcionaria-card', { action: 'cancel', codigo: checkout.codigo });
      setCard(null);
      await locate(checkout.codigo);
    } catch (err: any) {
      setError(paymentError(err, 'Não foi possível cancelar a cobrança no cartão.'));
    } finally {
      setBusy(false);
    }
  }

  async function requestCash(exact = false) {
    if (!checkout) return;
    setBusy(true);
    setError(null);
    try {
      const data = await invokeFuncionarIAEdge<any>('funcionaria-cash', {
        action: 'request',
        codigo: checkout.codigo,
        exact,
        banknotes,
      });
      setCash(data);
      setView('waiting_cash');
      if (!data.notified) {
        setError('O valor foi registrado, mas não foi possível notificar automaticamente um responsável. Chame um responsável do estabelecimento.');
      }
    } catch (err: any) {
      setError(err?.data?.error === 'cash_below_total' ? 'O valor informado é menor que o total da compra.' : paymentError(err, 'Não foi possível solicitar o pagamento em dinheiro.'));
    } finally {
      setBusy(false);
    }
  }

  async function cancelCash() {
    if (!checkout) return;
    setBusy(true);
    setError(null);
    try {
      await invokeFuncionarIAEdge('funcionaria-cash', { action: 'cancel_request', codigo: checkout.codigo });
      setCash(null);
      setBanknotes({});
      await locate(checkout.codigo);
    } catch (err: any) {
      setError(paymentError(err, 'Não foi possível cancelar a solicitação de dinheiro.'));
    } finally {
      setBusy(false);
    }
  }

  const tender = useMemo(
    () => Object.entries(banknotes).reduce((sum, [denomination, quantity]) => sum + Number(denomination) * Number(quantity || 0), 0),
    [banknotes],
  );

  const creditMaxInstallments = Math.max(1, Number(caps?.credit?.max_installments || 1));
  const creditOptions = Array.from({ length: creditMaxInstallments }, (_, index) => index + 1).filter(value => {
    const min = Number(caps?.credit?.min_installment_value_cents || 0);
    if (!checkout || min <= 0) return true;
    return Math.ceil(Math.round(Number(checkout.total) * 100) / value) >= min;
  });

  function reset() {
    setCheckout(null);
    setEntry('');
    setError(null);
    setView('choose');
    setPix(null);
    setCard(null);
    setCash(null);
    setInstallments(1);
    setBanknotes({});
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <FuncionarIAHeader title="Terminal" subtitle="Finalize a compra com segurança." />
      <section className="mx-auto max-w-6xl p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm font-black text-slate-500"><ArrowLeft className="h-4 w-4" />Dashboard</Link>
          <div className="text-sm font-black text-[#6D28D9]">Terminal FuncionarIA</div>
        </div>

        <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm">
          <div className="flex gap-3">
            <input
              ref={inputRef}
              value={entry}
              onChange={event => setEntry(event.target.value.toUpperCase())}
              onKeyDown={event => { if (event.key === 'Enter') void locate(); }}
              placeholder="Código da venda"
              className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-center font-mono text-xl font-black tracking-[.25em]"
            />
            <button disabled={loading} onClick={() => void locate()} className="rounded-2xl bg-[#6D28D9] px-5 font-black text-white">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ScanLine className="h-5 w-5" />}
            </button>
          </div>
          {error && <div className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">{error}</div>}
        </div>

        {checkout && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_.8fr]">
            <OrderSummary checkout={checkout} />
            <aside className="rounded-3xl bg-white p-6 shadow-sm">
              {view === 'choose' && (
                <>
                  <h2 className="text-xl font-black">Como deseja pagar?</h2>
                  <div className="mt-5 grid gap-3">
                    <PaymentButton icon={<QrCode />} label="Pix" onClick={() => void createPix()} disabled={busy || caps?.checkout_enabled === false} />
                    <PaymentButton icon={<CreditCard />} label="Débito" onClick={() => void createCard('debit')} disabled={busy || caps?.checkout_enabled === false || caps?.debit?.enabled === false} />
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-center gap-3 font-black"><CreditCard className="h-5 w-5 text-[#6D28D9]" /> Crédito</div>
                      {creditMaxInstallments > 1 && (
                        <select value={installments} onChange={event => setInstallments(Number(event.target.value))} className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold">
                          {creditOptions.map(value => <option key={value} value={value}>{value}x</option>)}
                        </select>
                      )}
                      <button onClick={() => void createCard('credit')} disabled={busy || caps?.checkout_enabled === false || caps?.credit?.enabled === false} className="mt-3 w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-35">Pagar no crédito</button>
                    </div>
                    <PaymentButton icon={<Banknote />} label="Dinheiro" onClick={() => setView('cash')} disabled={busy || caps?.checkout_enabled === false} />
                  </div>
                </>
              )}

              {view === 'pix' && (
                <>
                  <h2 className="text-xl font-black">Pague com Pix</h2>
                  <img alt="QR Code Pix" src={pix?.qr_code_url || `/api/qrcode?size=300&data=${encodeURIComponent(pix?.pix_code || '')}&color=%236D28D9`} className="mx-auto mt-4 h-56 w-56 object-contain" />
                  <button onClick={() => void navigator.clipboard.writeText(pix?.pix_code || '')} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border p-3 font-black"><Copy className="h-4 w-4" />Copiar Pix</button>
                  <button onClick={() => void checkPix(false)} disabled={busy} className="mt-3 w-full rounded-xl bg-[#6D28D9] p-3 font-black text-white">Já paguei, verificar</button>
                </>
              )}

              {view === 'card' && (
                <>
                  <h2 className="text-xl font-black">Aguardando cartão</h2>
                  <p className="mt-3 text-sm text-slate-500">{card?.provider === 'mp_point' ? 'Siga as instruções na maquininha Mercado Pago Point.' : 'Conclua o pagamento no InfinitePay.'}</p>
                  {cardMethod === 'credit' && installments > 1 && <p className="mt-2 text-sm font-black text-[#6D28D9]">Crédito em {installments}x</p>}
                  {card?.deep_link && <a href={card.deep_link} className="mt-4 block rounded-xl bg-[#6D28D9] p-3 text-center font-black text-white">Abrir InfinitePay</a>}
                  <button onClick={() => void checkCard(false)} disabled={busy} className="mt-4 w-full rounded-xl border p-3 font-black">Verificar pagamento</button>
                  {card?.provider === 'mp_point' && <button onClick={() => void cancelCard()} disabled={busy} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl p-3 text-sm font-black text-slate-500"><X className="h-4 w-4" />Cancelar e escolher outra forma</button>}
                </>
              )}

              {view === 'cash' && (
                <>
                  <h2 className="text-xl font-black">Pagamento em dinheiro</h2>
                  <button onClick={() => void requestCash(true)} disabled={busy} className="mt-4 w-full rounded-xl bg-lime-100 p-3 font-black text-lime-900">Tenho o valor exato</button>
                  <p className="my-4 text-center text-xs font-black text-slate-400">OU INFORME AS NOTAS</p>
                  <div className="grid grid-cols-2 gap-2">
                    {NOTES.map(note => (
                      <div key={note} className="flex items-center justify-between rounded-xl border p-2">
                        <span className="font-black">R$ {note}</span>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setBanknotes({ ...banknotes, [note]: Math.max(0, (banknotes[note] || 0) - 1) })} className="h-8 w-8 rounded-lg bg-slate-100 font-black">−</button>
                          <span className="w-5 text-center font-black">{banknotes[note] || 0}</span>
                          <button onClick={() => setBanknotes({ ...banknotes, [note]: (banknotes[note] || 0) + 1 })} className="h-8 w-8 rounded-lg bg-slate-100 font-black">+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm font-black">Informado: {formatarBRL(tender)}</div>
                  <button onClick={() => void requestCash(false)} disabled={busy || tender <= 0} className="mt-3 w-full rounded-xl bg-[#6D28D9] p-3 font-black text-white disabled:opacity-40">Calcular troco e chamar responsável</button>
                  <button onClick={() => setView('choose')} className="mt-2 w-full rounded-xl p-3 text-sm font-black text-slate-500">Voltar</button>
                </>
              )}

              {view === 'waiting_cash' && (
                <>
                  <h2 className="text-xl font-black">{cash?.notified === true ? 'Responsável notificado' : 'Pagamento em dinheiro registrado'}</h2>
                  <div className="mt-5 rounded-2xl bg-lime-50 p-5 text-center">
                    <div className="text-sm font-bold text-lime-800">{Number(cash?.change_cents || checkout.cash_change_cents || 0) > 0 ? 'Troco necessário' : 'Valor informado'}</div>
                    <div className="mt-1 text-3xl font-black text-lime-900">
                      {Number(cash?.change_cents || checkout.cash_change_cents || 0) > 0
                        ? formatarBRL(Number(cash?.change_cents || checkout.cash_change_cents || 0) / 100)
                        : formatarBRL(Number(cash?.tendered_cents || checkout.cash_tendered_cents || 0) / 100)}
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-slate-500">O pagamento só será concluído quando um responsável confirmar o recebimento no painel.</p>
                  <button onClick={() => void refreshCheckout(false)} className="mt-4 w-full rounded-xl border p-3 font-black">Atualizar status</button>
                  <button onClick={() => void cancelCash()} disabled={busy} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl p-3 text-sm font-black text-slate-500"><X className="h-4 w-4" />Cancelar solicitação</button>
                </>
              )}

              {view === 'paid' && (
                <>
                  <div className="text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-lime-100 text-lime-700"><Check className="h-8 w-8" /></div>
                    <h2 className="mt-4 text-2xl font-black">Pagamento aprovado</h2>
                    <p className="mt-2 text-sm text-slate-500">A venda foi finalizada e o estoque atualizado.</p>
                    {checkout.receipt_token && (
                      <>
                        <img alt="QR do comprovante" src={`/api/qrcode?size=260&data=${encodeURIComponent(`https://${checkout.empresa_slug}.funcionaria.net/recibo/${checkout.receipt_token}`)}&color=%236D28D9`} className="mx-auto mt-5 h-48 w-48" />
                        <a target="_blank" rel="noreferrer" href={`https://${checkout.empresa_slug}.funcionaria.net/recibo/${checkout.receipt_token}`} className="mt-3 inline-block font-black text-[#6D28D9]">Abrir comprovante</a>
                      </>
                    )}
                  </div>
                  <button onClick={reset} className="mt-6 w-full rounded-xl bg-[#6D28D9] p-3 font-black text-white">Próxima venda</button>
                </>
              )}
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}

function paymentError(error: any, fallback: string) {
  if (error?.data?.error === 'payment_in_progress') return 'Já existe outra forma de pagamento em andamento para esta venda.';
  if (error?.data?.error === 'skill_not_active') return 'A habilidade Caixa & Cobrança não está ativa para esta empresa.';
  return error?.message || fallback;
}

function PaymentButton({ icon, label, onClick, disabled }: { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return <button onClick={onClick} disabled={disabled} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 text-left font-black disabled:opacity-35"><span className="text-[#6D28D9]">{icon}</span>{label}</button>;
}

function OrderSummary({ checkout }: { checkout: FuncionarIACheckoutDetalhe }) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="text-xs font-black uppercase text-[#6D28D9]">{checkout.empresa_nome}</div>
      <h2 className="mt-1 text-2xl font-black">Venda {checkout.codigo}</h2>
      <div className="mt-5 space-y-2">
        {checkout.itens.map(item => (
          <div key={item.id} className="flex justify-between rounded-xl bg-slate-50 p-3">
            <div>
              <div className="font-black">{item.nome}</div>
              <div className="text-xs text-slate-400">{item.quantidade} × {formatarBRL(item.preco_unitario)}</div>
            </div>
            <div className="font-black">{formatarBRL(item.subtotal)}</div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex justify-between rounded-2xl bg-slate-950 p-5 text-white">
        <span className="font-bold text-slate-400">Total</span>
        <span className="text-3xl font-black text-[#A3E635]">{formatarBRL(checkout.total)}</span>
      </div>
    </section>
  );
}
