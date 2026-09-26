'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { AlertCircle, CheckCircle2, Copy, Loader2, RefreshCw, Upload } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { formatBrlCents, MIDIA_BRAND } from '@/lib/midia/constants';
import { billingDurationForVideo, inspectAdMedia, normalizeAdMime } from '@/lib/midia/ads';

type Props = {
  publisherSlug: string;
  screenName: string;
  campaignId: string;
  totalPriceCents: number;
  estimatedOccurrences: number;
};

type CheckoutState = {
  campaign: { id: string; status: string; paidAt?: string | null; rejectionReason?: string | null; totalPriceCents?: number; estimatedOccurrences?: number };
  payment: null | {
    id: string; transactionId: string; txid: string | null; pixCode: string; qrCodeUrl: string | null;
    amountCents: number; status: string; providerStatus?: string | null; expiresAt: string; confirmedAt?: string | null;
  };
  delivery?: null | { totalOccurrences: number; deliveredOccurrences: number; status: string };
};

export default function MidiaCampaignCheckout({ publisherSlug, screenName, campaignId, totalPriceCents, estimatedOccurrences }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [state, setState] = useState<CheckoutState | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replacementBusy, setReplacementBusy] = useState(false);
  const [replacementError, setReplacementError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/midia/public/campaign/payment?campaignId=${encodeURIComponent(campaignId)}`, { cache: 'no-store' });
    const json = await response.json().catch(() => null);
    if (!response.ok) throw new Error(json?.error || 'Não foi possível atualizar o pagamento.');
    setState(json as CheckoutState);
    return json as CheckoutState;
  }, [campaignId]);

  const createPayment = useCallback(async () => {
    setCreating(true); setError(null);
    try {
      const response = await fetch('/api/midia/public/campaign/payment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaignId }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error || 'Não foi possível gerar o PIX.');
      setState(json as CheckoutState);
    } catch (err: any) { setError(err?.message || 'Não foi possível gerar o PIX.'); }
    finally { setCreating(false); setLoading(false); }
  }, [campaignId]);

  useEffect(() => {
    let cancelled = false;
    void refresh().then((value) => {
      if (cancelled) return;
      if (!value.payment && !['under_review','rejected','scheduled','running','completed'].includes(value.campaign.status)) void createPayment();
      else setLoading(false);
    }).catch(() => { if (!cancelled) void createPayment(); });
    return () => { cancelled = true; };
  }, [createPayment, refresh]);

  useEffect(() => {
    const code = state?.payment?.pixCode;
    if (!code) { setQr(null); return; }
    let cancelled = false;
    QRCode.toDataURL(code, { width: 380, margin: 2, errorCorrectionLevel: 'M', color: { dark: MIDIA_BRAND.blue, light: '#FFFFFF' } })
      .then((url) => { if (!cancelled) setQr(url); })
      .catch(() => { if (!cancelled) setQr(state.payment?.qrCodeUrl ?? null); });
    return () => { cancelled = true; };
  }, [state?.payment?.pixCode, state?.payment?.qrCodeUrl]);

  useEffect(() => {
    if (!state?.payment || state.payment.status !== 'pending') return;
    const timer = window.setInterval(() => void refresh().catch(() => undefined), 4000);
    return () => window.clearInterval(timer);
  }, [refresh, state?.payment?.status]);

  useEffect(() => {
    if (!['scheduled','running'].includes(state?.campaign.status || '')) return;
    const timer = window.setInterval(() => void refresh().catch(() => undefined), 30_000);
    return () => window.clearInterval(timer);
  }, [refresh, state?.campaign.status]);

  async function copyPix() {
    if (!state?.payment?.pixCode) return;
    await navigator.clipboard?.writeText(state.payment.pixCode);
  }

  async function replaceCreative(file?: File) {
    if (!file) return;
    setReplacementBusy(true); setReplacementError(null);
    try {
      if (file.size > 50 * 1024 * 1024) throw new Error('O arquivo deve ter no máximo 50 MB.');
      const mime = normalizeAdMime(file);
      if (!mime) throw new Error('Use JPG, PNG, WEBP, MP4 ou WEBM.');
      const normalized = file.type ? file : new File([file], file.name, { type: mime });
      const meta = await inspectAdMedia(normalized, mime);
      if (meta.height <= meta.width) throw new Error('A propaganda precisa estar em formato vertical.');
      if (meta.kind === 'video' && (meta.duration < 29.5 || meta.duration > 60.5)) throw new Error('O vídeo precisa ter entre 30 e 60 segundos.');

      const prepareResponse = await fetch('/api/midia/public/campaign/upload-url', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId, fileName: normalized.name, mimeType: mime, sizeBytes: normalized.size,
          width: meta.width, height: meta.height, durationSeconds: meta.kind === 'video' ? meta.duration : null, source: 'upload',
          billedDuration: meta.kind === 'video' ? billingDurationForVideo(meta.duration) : null,
        }),
      });
      const prepare = await prepareResponse.json().catch(() => null);
      if (!prepareResponse.ok) throw new Error(prepare?.error || 'Não foi possível preparar o novo arquivo.');

      const { error: uploadError } = await supabase.storage.from(prepare.bucket).uploadToSignedUrl(prepare.path, prepare.token, normalized);
      if (uploadError) throw uploadError;

      const completeResponse = await fetch('/api/midia/public/campaign/complete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaignId, creativeId: prepare.creativeId }),
      });
      const complete = await completeResponse.json().catch(() => null);
      if (!completeResponse.ok) throw new Error(complete?.error || 'Não foi possível reenviar a peça.');
      await refresh();
    } catch (err: any) { setReplacementError(err?.message || 'Não foi possível reenviar a peça.'); }
    finally { setReplacementBusy(false); }
  }

  if (loading) return <Shell><Loader2 className="mx-auto h-9 w-9 animate-spin" style={{ color: MIDIA_BRAND.blue }} /><p className="mt-4 text-sm font-bold text-slate-500">Preparando seu PIX…</p></Shell>;

  const campaignStatus = state?.campaign.status;
  if (['under_review','scheduled','running','completed'].includes(campaignStatus || '')) {
    const scheduled = ['scheduled','running','completed'].includes(campaignStatus || '');
    const delivery = state?.delivery;
    const totalDelivery = delivery?.totalOccurrences ?? state?.campaign.estimatedOccurrences ?? estimatedOccurrences;
    const delivered = delivery?.deliveredOccurrences ?? 0;
    const deliveryPercent = totalDelivery > 0 ? Math.min(100, Math.round(delivered * 100 / totalDelivery)) : 0;
    return <Shell><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-8 w-8" /></div><div className="mt-5 text-xs font-black uppercase tracking-[.16em]" style={{ color: MIDIA_BRAND.red }}>{scheduled ? 'Campanha aprovada' : 'Pagamento confirmado'}</div><h1 className="mt-2 text-3xl font-black">{campaignStatus === 'completed' ? 'Campanha entregue' : scheduled ? 'Sua propaganda entrou na programação' : 'Agora a peça está em revisão'}</h1><p className="mt-3 text-sm leading-6 text-slate-500">{scheduled ? <>A tela <strong>{screenName}</strong> registra cada exibição concluída com proof-of-play. Você pode acompanhar a entrega por esta página.</> : <>O PIX foi confirmado e o espaço está reservado. O responsável por <strong>{screenName}</strong> revisará a peça antes da exibição.</>}</p><Summary total={state?.campaign.totalPriceCents ?? totalPriceCents} occurrences={totalDelivery} />{scheduled && delivery && <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-left"><div className="flex items-end justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Proof-of-play confirmado</div><div className="mt-1 text-xl font-black" style={{ color: MIDIA_BRAND.blue }}>{delivered.toLocaleString('pt-BR')} de {totalDelivery.toLocaleString('pt-BR')}</div></div><div className="text-sm font-black text-slate-500">{deliveryPercent}%</div></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full" style={{ width: `${deliveryPercent}%`, backgroundColor: MIDIA_BRAND.blue }} /></div></div>}<a href={`https://${publisherSlug}.midia.pro`} className="mt-6 inline-flex rounded-xl px-5 py-3 text-sm font-black text-white" style={{ backgroundColor: MIDIA_BRAND.blue }}>Voltar ao ponto Midia.Pro</a></Shell>;
  }

  if (campaignStatus === 'rejected') {
    return <Shell><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-amber-50 text-amber-600"><AlertCircle className="h-8 w-8" /></div><div className="mt-5 text-xs font-black uppercase tracking-[.16em] text-amber-700">Ajuste solicitado</div><h1 className="mt-2 text-3xl font-black">Envie uma nova versão da peça</h1><p className="mt-3 text-sm leading-6 text-slate-500">Seu pagamento continua válido e o inventário permanece reservado.</p><div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left text-sm font-semibold text-amber-900">{state?.campaign.rejectionReason || 'O responsável pediu uma revisão da peça.'}</div><label className={`mt-5 inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-black text-white ${replacementBusy ? 'pointer-events-none opacity-60' : ''}`} style={{ backgroundColor: MIDIA_BRAND.red }}><Upload className="h-5 w-5" />{replacementBusy ? 'Enviando nova peça…' : 'Enviar nova peça'}<input className="hidden" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={(e) => { const file=e.target.files?.[0]; e.currentTarget.value=''; void replaceCreative(file); }} /></label>{replacementError && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{replacementError}</div>}</Shell>;
  }

  const expired = !!state?.payment && (state.payment.status === 'expired' || new Date(state.payment.expiresAt).getTime() <= Date.now());
  return <Shell><div className="text-xs font-black uppercase tracking-[.16em]" style={{ color: MIDIA_BRAND.red }}>Pagamento da campanha</div><h1 className="mt-2 text-3xl font-black">Pague com PIX para reservar definitivamente</h1><p className="mt-3 text-sm leading-6 text-slate-500">Após a confirmação, a peça vai para revisão e só então entra na programação de <strong>{screenName}</strong>.</p><Summary total={totalPriceCents} occurrences={estimatedOccurrences} />{error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}{expired ? <button onClick={() => void createPayment()} disabled={creating} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 font-black text-white disabled:opacity-50" style={{ backgroundColor: MIDIA_BRAND.red }}>{creating ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />} Gerar novo PIX</button> : state?.payment ? <><div className="mx-auto mt-6 w-full max-w-[290px] rounded-3xl border border-blue-100 bg-white p-4 shadow-sm">{qr ? <img src={qr} alt="QR Code PIX" className="h-auto w-full" /> : <Loader2 className="mx-auto my-20 h-8 w-8 animate-spin" />}</div><div className="mt-4 text-3xl font-black">{formatBrlCents(state.payment.amountCents)}</div><button onClick={() => void copyPix()} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-black" style={{ color: MIDIA_BRAND.blue }}><Copy className="h-4 w-4" /> Copiar PIX copia e cola</button><p className="mt-4 text-xs font-semibold text-slate-400">Aguardando confirmação automática · vence {new Date(state.payment.expiresAt).toLocaleString('pt-BR')}</p></> : <button onClick={() => void createPayment()} disabled={creating} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 font-black text-white disabled:opacity-50" style={{ backgroundColor: MIDIA_BRAND.red }}>{creating ? <Loader2 className="h-5 w-5 animate-spin" /> : null} Gerar PIX</button>}</Shell>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="grid min-h-screen place-items-center bg-[#F7F9FF] px-4 py-10 text-slate-950"><div className="w-full max-w-xl rounded-[34px] border border-blue-100 bg-white p-7 text-center shadow-xl shadow-blue-950/5 sm:p-9"><Image src="/brands/midia/logo.png" alt="Midia.Pro" width={180} height={90} className="mx-auto h-16 w-auto object-contain" />{children}</div></main>;
}
function Summary({ total, occurrences }: { total: number; occurrences: number }) {
  return <div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-slate-50 p-4"><div className="text-2xl font-black">{formatBrlCents(total)}</div><div className="text-[10px] font-black uppercase tracking-wider text-slate-400">valor</div></div><div className="rounded-2xl bg-slate-50 p-4"><div className="text-2xl font-black">{occurrences.toLocaleString('pt-BR')}</div><div className="text-[10px] font-black uppercase tracking-wider text-slate-400">exibições estimadas</div></div></div>;
}
