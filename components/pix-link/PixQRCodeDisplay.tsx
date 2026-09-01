'use client';

import { useEffect, useMemo, useState } from 'react';

interface PixData {
  transaction_id: string;
  amount_brl: string;
  original_amount_brl?: string;
  discount_cents?: number;
  qr_code_url: string;
  pix_code: string;
  expires_at: string;
  payment_provider?: 'bigcorps' | 'mercadopago' | 'pix_direct' | string;
  payment_mode?: 'free' | 'mercadopago' | string;
  company_name: string;
}

interface Props {
  company: { name: string; logo_url: string | null };
  pixData: PixData;
  amount: number;
  onConfirm: () => Promise<void>;
  onNewPix: () => void;
  loading: boolean;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

function brl(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function PixQRCodeDisplay({ company, pixData, amount, onConfirm, onNewPix, loading, theme, onToggleTheme }: Props) {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [qrCodeUrl, setQrCodeUrl] = useState(pixData.qr_code_url);
  const isDark = theme === 'dark';
  const effective = useMemo(() => {
    const n = Number(pixData.amount_brl);
    return Number.isFinite(n) && n > 0 ? n : amount;
  }, [pixData.amount_brl, amount]);
  const original = useMemo(() => {
    const n = Number(pixData.original_amount_brl);
    return Number.isFinite(n) && n > 0 ? n : amount;
  }, [pixData.original_amount_brl, amount]);
  const discount = Math.max(0, Number(pixData.discount_cents || 0));
  const isFree = pixData.payment_mode === 'free' || pixData.payment_provider === 'pix_direct';
  const isMp = pixData.payment_mode === 'mercadopago' || pixData.payment_provider === 'mercadopago';

  useEffect(() => {
    const update = () => setTimeLeft(Math.max(0, Math.floor((new Date(pixData.expires_at).getTime() - Date.now()) / 1000)));
    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [pixData.expires_at]);

  // O endpoint de QR é compartilhado por vários produtos. Só os QR Codes
  // desta tela recebem uma marca explícita, definida pelo domínio público.
  // Isso preserva o comportamento legado/white-label dos demais QR Codes.
  useEffect(() => {
    const raw = pixData.qr_code_url;
    if (!raw || !raw.includes('/api/qrcode')) {
      setQrCodeUrl(raw);
      return;
    }

    const hostname = window.location.hostname.toLowerCase();
    const brand = hostname === 'pix.wiki' || hostname.endsWith('.pix.wiki')
      ? 'pixwiki'
      : hostname === 'minhai.app' || hostname.endsWith('.minhai.app')
        ? 'minhai'
        : null;

    if (!brand) {
      setQrCodeUrl(raw);
      return;
    }

    try {
      const url = new URL(raw, window.location.origin);
      url.searchParams.set('brand', brand);
      setQrCodeUrl(url.toString());
    } catch {
      setQrCodeUrl(raw);
    }
  }, [pixData.qr_code_url]);

  async function copyCode() {
    await navigator.clipboard.writeText(pixData.pix_code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  const m = Math.floor(timeLeft / 60);
  const s = String(timeLeft % 60).padStart(2, '0');
  const page = isDark ? 'bg-[#020617] text-white' : 'bg-white text-slate-900';
  const card = isDark ? 'border-white/10 bg-slate-900' : 'border-slate-200 bg-white shadow-xl shadow-slate-200/40';
  const inner = isDark ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-slate-50';
  const muted = isDark ? 'text-white/55' : 'text-slate-500';

  return (
    <div className={`min-h-screen px-4 py-8 ${page}`}>
      <button type="button" onClick={onToggleTheme} aria-label="Alternar tema" className={`fixed right-5 top-5 z-20 flex h-11 w-11 items-center justify-center rounded-full border ${isDark ? 'border-white/15 bg-white/10' : 'border-black/10 bg-black/5'}`}>◐</button>
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 text-center">
          {company.logo_url ? <img src={company.logo_url} alt={company.name} className="mx-auto mb-3 max-h-16 max-w-40 object-contain" /> : <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500 text-xl font-black text-slate-950">{company.name.charAt(0)}</div>}
          <h1 className="text-xl font-black">{company.name}</h1>
          <p className={`mt-1 text-sm ${muted}`}>Pagamento de <strong className="text-emerald-400">{brl(effective)}</strong></p>
        </div>

        {discount > 0 && (
          <div className="mb-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4">
            <div className="flex items-center justify-between gap-3 text-sm"><span className={muted}>Total</span><span>{brl(original)}</span></div>
            <div className="mt-1 flex items-center justify-between gap-3 text-sm"><span className="text-emerald-400">Desconto Pix</span><span className="font-bold text-emerald-400">− {brl(discount / 100)}</span></div>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-emerald-500/20 pt-3"><span className="font-black">Pagar</span><span className="text-2xl font-black text-emerald-400">{brl(effective)}</span></div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <section className={`rounded-3xl border p-5 ${card}`}>
            <div className="flex items-center justify-between gap-3"><h2 className="font-black">1. Copia e Cola</h2><span className="rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-black text-amber-400">AGUARDANDO</span></div>
            <div className={`mt-4 rounded-2xl border p-4 ${inner}`}>
              <div className="flex justify-between gap-3 text-sm"><span className={muted}>Recebedor</span><span className="text-right font-semibold">{company.name}</span></div>
              <div className="mt-2 flex justify-between gap-3 text-sm"><span className={muted}>Confirmação</span><span className="text-right font-semibold">{isFree ? 'Pix Grátis' : isMp ? 'Mercado Pago' : 'Pix'}</span></div>
              <div className="mt-2 flex justify-between gap-3 text-sm"><span className={muted}>Validade</span><span className="font-semibold text-emerald-400">30 minutos</span></div>
              <div className="mt-4 flex items-center justify-between border-t border-black/10 pt-4 dark:border-white/10"><span className="font-black">{discount > 0 ? 'Pagar' : 'Total'}</span><span className="text-xl font-black text-emerald-400">{brl(effective)}</span></div>
            </div>
            <button type="button" onClick={copyCode} className={`mt-4 w-full rounded-xl px-4 py-3 text-sm font-black text-white ${copied ? 'bg-emerald-500' : 'bg-blue-600'}`}>{copied ? 'Código copiado!' : 'Copiar código PIX'}</button>
            <button type="button" onClick={onConfirm} disabled={loading} className={`mt-2 w-full rounded-xl border px-4 py-3 text-sm font-bold disabled:opacity-50 ${isDark ? 'border-white/15 text-white/75' : 'border-slate-300 text-slate-600'}`}>{loading ? 'Verificando…' : 'Já paguei, verificar agora'}</button>
            <button type="button" onClick={onNewPix} className={`mt-3 w-full text-xs ${muted}`}>← Novo valor</button>
          </section>

          <section className={`rounded-3xl border p-5 text-center ${card}`}>
            <h2 className="text-left font-black">2. Escaneie o QR Code</h2>
            <div className="mx-auto mt-5 max-w-[230px] rounded-2xl bg-white p-4"><img src={qrCodeUrl} alt="QR Code PIX" className="h-auto w-full" /></div>
            <div className={`mx-auto mt-4 inline-flex rounded-xl px-4 py-2 text-sm font-black ${timeLeft < 300 ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>Expira em {m}:{s}</div>
            <p className={`mt-4 text-xs leading-5 ${muted}`}>{isFree ? 'O valor vai direto para a chave Pix do recebedor. A confirmação é feita automaticamente pela conta Mercado Pago conectada.' : isMp ? 'Esta cobrança foi criada diretamente pelo Mercado Pago.' : 'Pague pelo aplicativo do seu banco e aguarde a confirmação.'}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
