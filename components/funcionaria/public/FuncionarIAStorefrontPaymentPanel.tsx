'use client';

import { CheckCircle2, Copy, CreditCard, ExternalLink, Loader2, QrCode } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

function brlCents(cents: number) {
  return (Number(cents || 0) / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export default function FuncionarIAStorefrontPaymentPanel({
  paymentToken,
  primaryColor,
  onPaid,
}: {
  paymentToken: string;
  primaryColor: string;
  onPaid?: (payload: any) => void;
}) {
  const [payment, setPayment] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  async function request(action: 'create_pix' | 'create_card' | 'status') {
    const response = await fetch('/api/funcionaria/storefront-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        action,
        payment_token: paymentToken,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.error) {
      throw new Error(data?.error || 'payment_request_failed');
    }
    return data;
  }

  function stopPolling() {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }

  async function checkStatus(silent = false) {
    if (!silent) setChecking(true);
    try {
      const data = await request('status');
      setPayment((current: any) => ({ ...(current || {}), ...data }));
      if (data?.status === 'paid') {
        stopPolling();
        onPaid?.(data);
      }
      if (['expired', 'cancelled', 'canceled'].includes(String(data?.status || ''))) {
        stopPolling();
      }
    } catch (err: any) {
      if (!silent) setError(err?.message || 'Não foi possível confirmar o pagamento.');
    } finally {
      if (!silent) setChecking(false);
    }
  }

  async function createPix() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const data = await request('create_pix');
      setPayment(data);
      if (data?.status === 'paid') {
        onPaid?.(data);
        return;
      }
      stopPolling();
      timer.current = setInterval(() => {
        void checkStatus(true);
      }, 4000);
    } catch (err: any) {
      const code = String(err?.message || '');
      setError(
        code === 'checkout_expired'
          ? 'Este pedido expirou. Faça um novo pedido para gerar outra cobrança.'
          : 'Não foi possível gerar o Pix. Tente novamente.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function createCard() {
    if (loading) return;
    setLoading(true);
    setError(null);

    const popup = window.open('about:blank', '_blank');
    if (popup) popup.opener = null;

    try {
      const data = await request('create_card');
      setPayment(data);

      if (data?.status === 'paid') {
        popup?.close();
        onPaid?.(data);
        return;
      }

      const checkoutUrl = String(data?.checkout_url || '');
      if (!checkoutUrl.startsWith('https://checkout.bigcorps.com.br/')) {
        popup?.close();
        throw new Error('invalid_checkout_url');
      }

      if (popup) {
        popup.location.replace(checkoutUrl);
      } else {
        window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
      }

      stopPolling();
      timer.current = setInterval(() => {
        void checkStatus(true);
      }, 4000);
    } catch (err: any) {
      popup?.close();
      const code = String(err?.message || '');
      setError(
        code === 'checkout_expired'
          ? 'Este pedido expirou. Faça um novo pedido.'
          : code === 'payment_in_progress'
            ? 'Já existe outra forma de pagamento em andamento para este pedido.'
            : 'Não foi possível abrir o pagamento com cartão. Tente novamente.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => () => stopPolling(), []);

  async function copyPix() {
    const code = String(payment?.pix_code || '');
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  if (payment?.status === 'paid') {
    return (
      <div className="mt-5 rounded-3xl border border-lime-200 bg-lime-50 p-5 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-lime-600" />
        <div className="mt-2 text-lg font-black text-lime-950">Pagamento confirmado</div>
        <p className="mt-1 text-xs font-semibold leading-5 text-lime-800">
          O pedido já foi confirmado e a loja recebeu o saldo líquido da venda.
        </p>
      </div>
    );
  }

  if (payment?.payment_method === 'card' && payment?.checkout_url) {
    return (
      <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-sm">
        <div className="text-center">
          <CreditCard className="mx-auto h-7 w-7" style={{ color: primaryColor }} />
          <div className="mt-2 text-sm font-black">Cartão aguardando confirmação</div>
          <div className="mt-1 text-xl font-black">{brlCents(payment.amount_cents)}</div>
        </div>

        {payment.can_reopen !== false ? (
          <a
            href={payment.checkout_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black text-white"
            style={{ backgroundColor: primaryColor }}
          >
            <ExternalLink className="h-4 w-4" />
            Abrir checkout do cartão
          </a>
        ) : (
          <div className="mt-4 rounded-xl bg-amber-50 px-3 py-2.5 text-center text-xs font-bold text-amber-800">
            Pagamento recebido pela InfinitePay. Estamos confirmando no servidor; não abra uma nova cobrança.
          </div>
        )}

        <button
          type="button"
          onClick={() => void checkStatus()}
          disabled={checking}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-black text-slate-700 disabled:opacity-60"
        >
          {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Verificar pagamento
        </button>

        <p className="mt-3 text-center text-[11px] leading-4 text-slate-400">
          A InfinitePay processa o cartão. A taxa do meio de pagamento é contabilizada separadamente da comissão de 5% da loja.
        </p>

        {error ? <div className="mt-2 text-center text-xs font-bold text-red-600">{error}</div> : null}
      </div>
    );
  }

  if (!payment?.pix_code) {
    return (
      <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-left">
        <div className="text-sm font-black text-slate-950">Escolha como pagar</div>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Pix ou cartão pela infraestrutura BigCorps. No cartão, a taxa InfinitePay e a comissão de 5% são contabilizadas separadamente.
        </p>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void createPix()}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black text-white disabled:opacity-60"
            style={{ backgroundColor: primaryColor }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
            Pix
          </button>
          <button
            type="button"
            onClick={() => void createCard()}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-800 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            Cartão
          </button>
        </div>

        <p className="mt-2 text-[11px] leading-4 text-slate-400">
          No cartão, a cobrança abre em uma nova aba e esta tela acompanha a confirmação automaticamente.
        </p>
        {error ? <div className="mt-2 text-xs font-bold text-red-600">{error}</div> : null}
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-sm">
      <div className="text-center">
        <QrCode className="mx-auto h-7 w-7" style={{ color: primaryColor }} />
        <div className="mt-2 text-sm font-black">Pix aguardando pagamento</div>
        <div className="mt-1 text-xl font-black">{brlCents(payment.amount_cents)}</div>
      </div>

      {payment.qr_code_url ? (
        <div className="mx-auto mt-4 w-fit rounded-2xl border border-slate-100 bg-white p-2">
          <img src={payment.qr_code_url} alt="QR Code Pix" className="h-52 w-52" />
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => void copyPix()}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-black text-slate-700"
      >
        <Copy className="h-4 w-4" />
        {copied ? 'Pix copiado' : 'Copiar Pix copia e cola'}
      </button>

      <button
        type="button"
        onClick={() => void checkStatus()}
        disabled={checking}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black text-white disabled:opacity-60"
        style={{ backgroundColor: primaryColor }}
      >
        {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        Já paguei
      </button>

      <p className="mt-3 text-center text-[11px] leading-4 text-slate-400">
        A confirmação é feita no servidor diretamente com o Banco Inter.
      </p>

      {error ? <div className="mt-2 text-center text-xs font-bold text-red-600">{error}</div> : null}
    </div>
  );
}