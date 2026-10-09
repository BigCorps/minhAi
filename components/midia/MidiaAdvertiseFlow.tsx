'use client';

import Image from 'next/image';
import Link from 'next/link';
import MidiaCampaignCheckout from '@/components/midia/MidiaCampaignCheckout';
import MidiaAvailabilityCalendar from '@/components/midia/MidiaAvailabilityCalendar';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays, Check, CheckCircle2, Clock3, FileImage, Loader2, MapPin,
  MonitorSmartphone, Palette, PlayCircle, ShieldCheck, Upload, Video,
} from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { formatBrlCents, MIDIA_BRAND } from '@/lib/midia/constants';
import {
  billingDurationForVideo, inspectAdMedia, normalizeAdMime,
  type MidiaAdDuration,
} from '@/lib/midia/ads';

type Product = {
  productKey: string; name: string; description: string; basePriceCents: number; startingPriceCents: number;
  scheduleKind: string; campaignDays: number; occurrencesPerDay: number | null; intervalMinutes: number | null;
  windowMinutes: number | null; requiresDate: boolean; requiresTime: boolean; flexibleWithinDays: number | null;
};
type PublicData = {
  publisher: { slug: string; displayName: string };
  screen: { publicCode: string; name: string; screenType: string; inventoryClass: string; locationName: string; city: string | null; state: string | null; bookingHorizonDays: number; minNoticeMinutes: number };
  durations: MidiaAdDuration[];
  products: Product[];
};
type Quote = {
  productName: string; basePriceCents: number; durationMultiplier: number; screenFactor: number; totalPriceCents: number;
  reservedFrom: string; reservedUntil: string; estimatedOccurrences: number; requestedSecondsPerDay: number;
  capacitySecondsPerDay: number; currentlyReservedSecondsPerDay: number;
};
type MediaMeta = { kind: 'image' | 'video'; width: number; height: number; duration: number };

type CardDraft = {
  headline: string;
  body: string;
  cta: string;
  background: string;
  accent: string;
  logo: File | null;
};

export default function MidiaAdvertiseFlow({ slug, code }: { slug: string; code: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [data, setData] = useState<PublicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState<string | null>(null);
  const [productKey, setProductKey] = useState('experiment');
  const [duration, setDuration] = useState<MidiaAdDuration>(30);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [startDate, setStartDate] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [mode, setMode] = useState<'upload' | 'card'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [meta, setMeta] = useState<MediaMeta | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [creativeError, setCreativeError] = useState<string | null>(null);
  const [card, setCard] = useState<CardDraft>({
    headline: '', body: '', cta: 'Saiba mais', background: '#003295', accent: '#EA0D16', logo: null,
  });
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState<{ campaignId: string; totalPriceCents: number; estimatedOccurrences: number; quoteExpiresAt: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/midia/public/screen?slug=${encodeURIComponent(slug)}&code=${encodeURIComponent(code)}`, { cache: 'no-store' })
      .then(async (response) => {
        const json = await response.json().catch(() => null);
        if (!response.ok) throw new Error(json?.error || 'Tela indisponível.');
        if (!cancelled) setData(json as PublicData);
      })
      .catch((error) => { if (!cancelled) setFatal(error?.message || 'Tela indisponível.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug, code]);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const product = data?.products.find((item) => item.productKey === productKey) ?? null;
  const today = useMemo(() => localIsoDate(new Date()), []);
  const maxDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + (data?.screen.bookingHorizonDays ?? 90));
    return localIsoDate(date);
  }, [data?.screen.bookingHorizonDays]);

  useEffect(() => {
    if (!data || !product) return;
    if (product.scheduleKind === 'flexible_once') {
      setScheduleDate(''); setScheduleTime(''); setStartDate('');
    } else if (['date_once','window_once'].includes(product.scheduleKind)) {
      setStartDate('');
    } else {
      setScheduleDate('');
    }
  }, [data, productKey, product]);

  const scheduleReady = !!product && (
    product.scheduleKind === 'flexible_once'
      || (['date_once','window_once'].includes(product.scheduleKind)
        ? Boolean(scheduleDate && (!product.requiresTime || scheduleTime))
        : Boolean(startDate && (!product.requiresTime || scheduleTime)))
  );

  useEffect(() => {
    if (!data || !product || !scheduleReady) { setQuote(null); setQuoteError(null); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setQuoteLoading(true); setQuoteError(null);
      try {
        const response = await fetch('/api/midia/public/quote', {
          method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, code, productKey, durationSeconds: duration, scheduleDate: scheduleDate || null, scheduleTime: scheduleTime || null, startDate: startDate || null }),
        });
        const json = await response.json().catch(() => null);
        if (!response.ok) throw new Error(json?.error || 'Não foi possível calcular o preço.');
        setQuote(json.quote as Quote);
      } catch (error: any) {
        if (error?.name !== 'AbortError') { setQuote(null); setQuoteError(error?.message || 'Não foi possível calcular o preço.'); }
      } finally { if (!controller.signal.aborted) setQuoteLoading(false); }
    }, 320);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [data, product, productKey, duration, scheduleDate, scheduleTime, startDate, scheduleReady, slug, code]);

  async function chooseFile(next?: File) {
    if (!next) return;
    setCreativeError(null);
    try {
      if (next.size > 50 * 1024 * 1024) throw new Error('O arquivo deve ter no máximo 50 MB.');
      const mime = normalizeAdMime(next);
      if (!mime) throw new Error('Use JPG, PNG, WEBP, MP4 ou WEBM.');
      const normalized = next.type ? next : new File([next], next.name, { type: mime });
      const inspected = await inspectAdMedia(normalized, mime);
      if (inspected.height <= inspected.width) throw new Error('A propaganda precisa estar em formato vertical.');
      if (inspected.kind === 'video' && (inspected.duration < 29.5 || inspected.duration > 60.5)) throw new Error('O vídeo precisa ter entre 30 e 60 segundos.');
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setFile(normalized); setMeta(inspected); setPreviewUrl(URL.createObjectURL(normalized));
      if (inspected.kind === 'video') setDuration(billingDurationForVideo(inspected.duration));
    } catch (error: any) { setFile(null); setMeta(null); setCreativeError(error?.message || 'Não foi possível usar esse arquivo.'); }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!quote || !data || !product) return;
    setSubmitting(true); setSubmitError(null);
    try {
      let uploadFile: File;
      let uploadMeta: MediaMeta;
      let source: 'upload' | 'card_builder';

      if (mode === 'upload') {
        if (!file || !meta) throw new Error('Envie a imagem ou o vídeo do anúncio.');
        uploadFile = file; uploadMeta = meta; source = 'upload';
      } else {
        if (card.headline.trim().length < 3) throw new Error('Escreva o título do card.');
        uploadFile = await buildCardFile(card);
        uploadMeta = { kind: 'image', width: 1080, height: 1920, duration: 0 };
        source = 'card_builder';
      }

      const campaignResponse = await fetch('/api/midia/public/campaign', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug, code, productKey, durationSeconds: duration,
          scheduleDate: scheduleDate || null, scheduleTime: scheduleTime || null, startDate: startDate || null,
          buyerName, buyerEmail, buyerPhone, destinationUrl: destinationUrl.trim() || null, acceptedContentTerms: accepted,
        }),
      });
      const campaignJson = await campaignResponse.json().catch(() => null);
      if (!campaignResponse.ok) throw new Error(campaignJson?.error || 'Não foi possível reservar a campanha.');

      const campaignId = campaignJson.campaign.id as string;
      const mimeType = uploadFile.type || 'image/png';
      const prepareResponse = await fetch('/api/midia/public/campaign/upload-url', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId, fileName: uploadFile.name, mimeType, sizeBytes: uploadFile.size,
          width: uploadMeta.width, height: uploadMeta.height,
          durationSeconds: uploadMeta.kind === 'video' ? uploadMeta.duration : null,
          source,
        }),
      });
      const prepare = await prepareResponse.json().catch(() => null);
      if (!prepareResponse.ok) throw new Error(prepare?.error || 'Não foi possível preparar o upload.');

      const { error: uploadError } = await supabase.storage
        .from(prepare.bucket)
        .uploadToSignedUrl(prepare.path, prepare.token, uploadFile);
      if (uploadError) throw uploadError;

      const completeResponse = await fetch('/api/midia/public/campaign/complete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, creativeId: prepare.creativeId }),
      });
      const complete = await completeResponse.json().catch(() => null);
      if (!completeResponse.ok) throw new Error(complete?.error || 'Não foi possível finalizar sua campanha.');

      setDone({
        campaignId,
        totalPriceCents: Number(complete.campaign.totalPriceCents),
        estimatedOccurrences: Number(complete.campaign.estimatedOccurrences),
        quoteExpiresAt: complete.campaign.quoteExpiresAt,
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) { setSubmitError(error?.message || 'Não foi possível preparar sua campanha.'); }
    finally { setSubmitting(false); }
  }

  if (loading) return <main className="grid min-h-screen place-items-center bg-[#F7F9FF]"><Loader2 className="h-9 w-9 animate-spin" style={{ color: MIDIA_BRAND.blue }} /></main>;
  if (fatal || !data) return <main className="grid min-h-screen place-items-center bg-[#F7F9FF] px-5 text-center"><div><h1 className="text-2xl font-black">Tela indisponível</h1><p className="mt-2 text-sm text-slate-500">{fatal || 'Não foi possível abrir este ponto de mídia.'}</p><Link href="https://midia.pro" className="mt-5 inline-flex rounded-xl px-5 py-3 text-sm font-black text-white" style={{ backgroundColor: MIDIA_BRAND.blue }}>Ir para Midia.Pro</Link></div></main>;

  if (done) return <Success data={data} done={done} />;

  return (
    <main className="min-h-screen bg-[#F7F9FF] text-slate-950">
      <header className="border-b border-blue-100 bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6"><Link href="https://midia.pro"><Image src="/brands/midia/logo.png" alt="Midia.Pro" width={160} height={90} className="h-12 w-auto object-contain" priority /></Link><div className="text-right"><div className="text-xs font-black uppercase tracking-wider" style={{ color: MIDIA_BRAND.red }}>Anuncie nesta tela</div><div className="text-sm font-black">{data.publisher.displayName}</div></div></div></header>

      <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10">
        <section className="grid gap-5 lg:grid-cols-[.72fr_1.28fr]">
          <aside className="h-fit rounded-[30px] border border-blue-100 bg-white p-5 shadow-sm lg:sticky lg:top-5 sm:p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50"><MonitorSmartphone className="h-6 w-6" style={{ color: MIDIA_BRAND.blue }} /></div>
            <div className="mt-4 text-xs font-black uppercase tracking-[.16em]" style={{ color: MIDIA_BRAND.red }}>Ponto selecionado</div>
            <h1 className="mt-2 text-2xl font-black">{data.screen.name}</h1>
            <div className="mt-3 flex items-start gap-2 text-sm font-semibold text-slate-500"><MapPin className="mt-0.5 h-4 w-4 shrink-0" /> <span>{data.screen.locationName}{data.screen.city ? ` · ${data.screen.city}${data.screen.state ? `/${data.screen.state}` : ''}` : ''}</span></div>
            <div className="mt-5 rounded-2xl bg-slate-50 p-4"><div className="text-xs font-black text-slate-500">Como funciona</div><div className="mt-3 space-y-2 text-xs leading-5 text-slate-500"><p>1. Escolha frequência, duração e horário.</p><p>2. Envie sua arte ou crie um card aqui.</p><p>3. A Midia.Pro reserva o espaço e prepara a campanha.</p></div></div>
            {quote && <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4"><div className="text-xs font-black uppercase tracking-wider" style={{ color: MIDIA_BRAND.blue }}>Preço desta configuração</div><div className="mt-1 text-3xl font-black">{formatBrlCents(quote.totalPriceCents)}</div><div className="mt-1 text-xs font-semibold text-slate-500">aprox. {quote.estimatedOccurrences.toLocaleString('pt-BR')} {quote.estimatedOccurrences === 1 ? 'exibição' : 'exibições'}</div></div>}
          </aside>

          <form onSubmit={submit} className="space-y-5">
            <CardSection number="1" title="Escolha a frequência" icon={<PlayCircle className="h-5 w-5" />}>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{data.products.map((item) => <button type="button" key={item.productKey} onClick={() => setProductKey(item.productKey)} className={`rounded-2xl border p-4 text-left transition ${productKey === item.productKey ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100' : 'border-slate-200 bg-white hover:border-blue-200'}`}><div className="flex items-start justify-between gap-2"><div className="font-black">{item.name}</div>{productKey === item.productKey && <Check className="h-4 w-4" style={{ color: MIDIA_BRAND.blue }} />}</div><p className="mt-2 text-xs leading-5 text-slate-500">{item.description}</p><div className="mt-3 text-sm font-black" style={{ color: MIDIA_BRAND.blue }}>a partir de {formatBrlCents(item.startingPriceCents)}</div></button>)}</div>
            </CardSection>

            <CardSection number="2" title="Duração e agenda" icon={<CalendarDays className="h-5 w-5" />}>
              <div className="grid gap-4 sm:grid-cols-3">{data.durations.map((seconds) => { const lockedByVideo = mode === 'upload' && meta?.kind === 'video'; return <button type="button" key={seconds} disabled={lockedByVideo} onClick={() => setDuration(seconds)} className={`rounded-2xl border px-4 py-4 text-center disabled:cursor-not-allowed disabled:opacity-55 ${duration === seconds ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100' : 'border-slate-200'}`}><div className="text-xl font-black">{seconds}s</div><div className="mt-1 text-[11px] font-bold text-slate-400">{seconds === 30 ? 'preço base' : seconds === 45 ? '× 1,5' : '× 2'}</div></button>; })}</div>{mode === 'upload' && meta?.kind === 'video' && <div className="mt-3 text-xs font-semibold text-slate-500">O vídeo de {meta.duration.toFixed(1)} s foi enquadrado automaticamente na faixa de {duration} s.</div>}
              {product && product.scheduleKind !== 'flexible_once' && <div className="mt-5 space-y-4">
                <MidiaAvailabilityCalendar
                  slug={slug}
                  code={code}
                  minDate={today}
                  maxDate={maxDate}
                  campaignDays={['recurring_fixed','recurring_interval'].includes(product.scheduleKind) ? product.campaignDays : 1}
                  value={['date_once','window_once'].includes(product.scheduleKind) ? scheduleDate : startDate}
                  onChange={(date) => {
                    if (['date_once','window_once'].includes(product.scheduleKind)) setScheduleDate(date);
                    else setStartDate(date);
                  }}
                />
                {product.requiresTime && <div className="max-w-sm"><Field label={product.windowMinutes === 15 ? 'Início da janela de 15 min' : 'Horário'}><input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} required className="input" /></Field></div>}
              </div>}
              {product?.scheduleKind === 'flexible_once' && <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500"><Clock3 className="mr-2 inline h-4 w-4" />A Midia.Pro escolherá um espaço disponível dentro dos próximos 30 dias.</div>}
              <div className="mt-4 min-h-10">{quoteLoading ? <div className="flex items-center gap-2 text-sm font-bold text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Conferindo inventário e preço…</div> : quoteError ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800">{quoteError}</div> : quote ? <div className="flex items-center gap-2 text-sm font-black text-emerald-700"><CheckCircle2 className="h-5 w-5" /> Espaço disponível · {formatBrlCents(quote.totalPriceCents)}</div> : null}</div>
            </CardSection>

            <CardSection number="3" title="Crie sua propaganda" icon={<Palette className="h-5 w-5" />}>
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1"><button type="button" onClick={() => setMode('upload')} className={`rounded-xl px-4 py-3 text-sm font-black ${mode === 'upload' ? 'bg-white shadow-sm' : 'text-slate-500'}`}><Upload className="mr-2 inline h-4 w-4" />Enviar arte</button><button type="button" onClick={() => setMode('card')} className={`rounded-xl px-4 py-3 text-sm font-black ${mode === 'card' ? 'bg-white shadow-sm' : 'text-slate-500'}`}><Palette className="mr-2 inline h-4 w-4" />Criar card</button></div>
              {mode === 'upload' ? <UploadCreative file={file} meta={meta} previewUrl={previewUrl} error={creativeError} onFile={chooseFile} /> : <CardBuilder value={card} onChange={setCard} />}
            </CardSection>

            <CardSection number="4" title="Seus dados e resumo" icon={<ShieldCheck className="h-5 w-5" />}>
              <div className="grid gap-4 sm:grid-cols-2"><Field label="Nome / empresa"><input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} required maxLength={100} placeholder="Quem está anunciando" className="input" /></Field><Field label="E-mail"><input type="email" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} required maxLength={254} placeholder="voce@empresa.com" className="input" /></Field></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="WhatsApp (opcional)"><input value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} maxLength={30} placeholder="(11) 99999-9999" className="input" /></Field><Field label="Site para o QR Code (opcional)"><input type="url" value={destinationUrl} onChange={(e) => setDestinationUrl(e.target.value)} maxLength={1000} placeholder="https://seusite.com.br" className="input" /></Field></div><p className="mt-2 text-[11px] font-semibold text-slate-400">Quando informado, o QR Code aparece no canto inferior direito da tela enquanto sua propaganda estiver sendo exibida.</p>
              {quote && <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center justify-between gap-4"><div><div className="font-black">{quote.productName} · {duration}s</div><div className="mt-1 text-xs font-semibold text-slate-500">{quote.estimatedOccurrences.toLocaleString('pt-BR')} exibição(ões) estimadas</div></div><div className="text-xl font-black">{formatBrlCents(quote.totalPriceCents)}</div></div></div>}
              <label className="mt-4 flex items-start gap-3 rounded-2xl border border-slate-200 p-4 text-xs font-semibold leading-5 text-slate-600"><input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} required className="mt-1 h-4 w-4" /><span>Declaro que tenho autorização para usar os textos, imagens, logos e vídeos enviados e entendo que a peça poderá passar por revisão antes de ser exibida.</span></label>
              {submitError && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{submitError}</div>}
              <button disabled={!quote || submitting || !accepted} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 font-black text-white shadow-lg disabled:opacity-50" style={{ backgroundColor: MIDIA_BRAND.red }}>{submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />} {submitting ? 'Preparando campanha…' : `Preparar campanha · ${quote ? formatBrlCents(quote.totalPriceCents) : '—'}`}</button>
              <p className="mt-3 text-center text-[11px] font-semibold text-slate-400">Nenhuma cobrança é feita nesta tela. O pagamento acontece somente depois que a campanha estiver pronta.</p>
            </CardSection>
          </form>
        </section>
      </div>
      <style jsx global>{`.input{margin-top:.5rem;width:100%;border-radius:.75rem;border:1px solid rgb(226 232 240);background:#fff;padding:.75rem 1rem;font-size:.875rem;outline:none}.input:focus{border-color:#60a5fa;box-shadow:0 0 0 2px #dbeafe}`}</style>
    </main>
  );
}

function CardSection({ number, title, icon, children }: { number: string; title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <section className="rounded-[30px] border border-blue-100 bg-white p-5 shadow-sm sm:p-6"><div className="mb-5 flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl text-sm font-black text-white" style={{ backgroundColor: MIDIA_BRAND.blue }}>{number}</div><div className="flex items-center gap-2"><span style={{ color: MIDIA_BRAND.red }}>{icon}</span><h2 className="text-lg font-black">{title}</h2></div></div>{children}</section>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm font-bold text-slate-700">{label}{children}</label>; }

function UploadCreative({ file, meta, previewUrl, error, onFile }: { file: File | null; meta: MediaMeta | null; previewUrl: string | null; error: string | null; onFile: (file?: File) => Promise<void> }) {
  return <div className="mt-5 grid gap-5 sm:grid-cols-[.55fr_1fr]"><div className="mx-auto aspect-[9/16] w-full max-w-[220px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-950">{previewUrl && meta ? (meta.kind === 'video' ? <video src={previewUrl} muted playsInline controls className="h-full w-full object-contain" /> : <img src={previewUrl} alt="Prévia" className="h-full w-full object-contain" />) : <div className="grid h-full place-items-center p-5 text-center text-xs font-bold text-white/45"><div><FileImage className="mx-auto mb-3 h-8 w-8" />Prévia vertical 9:16</div></div>}</div><div><label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-blue-200 bg-blue-50/50 px-5 py-8 text-center"><Upload className="h-7 w-7" style={{ color: MIDIA_BRAND.blue }} /><div className="mt-3 font-black">Escolher imagem ou vídeo</div><div className="mt-1 text-xs font-semibold text-slate-500">JPG, PNG, WEBP, MP4 ou WEBM · até 50 MB</div><input type="file" className="hidden" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={(e) => { const selected = e.target.files?.[0]; e.currentTarget.value=''; void onFile(selected); }} /></label>{file && meta && <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs font-semibold text-slate-500"><div className="flex items-center gap-2 font-black text-slate-700">{meta.kind === 'video' ? <Video className="h-4 w-4" /> : <FileImage className="h-4 w-4" />}{file.name}</div><div className="mt-1">{meta.width}×{meta.height}{meta.kind === 'video' ? ` · ${meta.duration.toFixed(1)}s` : ''}</div></div>}{error && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">{error}</div>}</div></div>;
}

function CardBuilder({ value, onChange }: { value: CardDraft; onChange: (value: CardDraft) => void }) {
  const textColor = contrastText(value.background);
  return <div className="mt-5 grid gap-5 lg:grid-cols-[.55fr_1fr]"><div className="mx-auto aspect-[9/16] w-full max-w-[220px] overflow-hidden rounded-3xl p-5 shadow-inner" style={{ backgroundColor: value.background, color: textColor }}><div className="flex h-full flex-col"><div className="min-h-16">{value.logo ? <img src={URL.createObjectURL(value.logo)} alt="Logo" className="h-16 max-w-full object-contain" onLoad={(e) => URL.revokeObjectURL((e.currentTarget as HTMLImageElement).src)} /> : <div className="text-[10px] font-black uppercase tracking-widest opacity-50">Seu logo</div>}</div><div className="my-auto"><div className="text-2xl font-black leading-tight">{value.headline || 'Seu anúncio aqui'}</div><div className="mt-4 text-sm font-semibold leading-5 opacity-80">{value.body || 'Escreva uma mensagem curta e objetiva para quem está vendo esta tela.'}</div><div className="mt-6 inline-flex rounded-full px-4 py-2 text-xs font-black text-white" style={{ backgroundColor: value.accent }}>{value.cta || 'Saiba mais'}</div></div><div className="text-[9px] font-bold opacity-45">Formato 1080 × 1920</div></div></div><div className="space-y-4"><Field label="Título"><input value={value.headline} maxLength={70} onChange={(e) => onChange({ ...value, headline: e.target.value })} placeholder="Ex.: Pizza em dobro hoje" className="input" /></Field><Field label="Mensagem"><textarea value={value.body} maxLength={180} onChange={(e) => onChange({ ...value, body: e.target.value })} placeholder="Uma frase curta com sua oferta." rows={3} className="input resize-none" /></Field><Field label="Chamada"><input value={value.cta} maxLength={32} onChange={(e) => onChange({ ...value, cta: e.target.value })} placeholder="Ex.: Peça agora" className="input" /></Field><div className="grid grid-cols-2 gap-3"><Field label="Fundo"><input type="color" value={value.background} onChange={(e) => onChange({ ...value, background: e.target.value })} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white p-1" /></Field><Field label="Destaque"><input type="color" value={value.accent} onChange={(e) => onChange({ ...value, accent: e.target.value })} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white p-1" /></Field></div><label className="block text-sm font-bold text-slate-700">Logo (opcional)<input type="file" accept="image/png,image/jpeg,image/webp" className="mt-2 block w-full text-xs font-semibold text-slate-500" onChange={(e) => onChange({ ...value, logo: e.target.files?.[0] ?? null })} /></label></div></div>;
}

function Success({ data, done }: { data: PublicData; done: { campaignId: string; totalPriceCents: number; estimatedOccurrences: number; quoteExpiresAt: string } }) {
  return <MidiaCampaignCheckout publisherSlug={data.publisher.slug} screenName={data.screen.name} campaignId={done.campaignId} totalPriceCents={done.totalPriceCents} estimatedOccurrences={done.estimatedOccurrences} />;
}

function localIsoDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function contrastText(hex: string) {
  const clean = hex.replace('#','');
  const r = parseInt(clean.slice(0,2),16), g = parseInt(clean.slice(2,4),16), b = parseInt(clean.slice(4,6),16);
  return (r*299 + g*587 + b*114) / 1000 > 150 ? '#0F172A' : '#FFFFFF';
}

async function buildCardFile(card: CardDraft) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080; canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Seu navegador não conseguiu criar o card.');
  ctx.fillStyle = card.background; ctx.fillRect(0,0,1080,1920);
  const textColor = contrastText(card.background); ctx.fillStyle = textColor;

  let top = 170;
  if (card.logo) {
    const image = await fileImage(card.logo);
    const maxW = 520, maxH = 250;
    const scale = Math.min(maxW / image.width, maxH / image.height, 1);
    const w = image.width * scale, h = image.height * scale;
    ctx.drawImage(image, (1080 - w) / 2, top, w, h);
    top += h + 150;
  } else top = 360;

  ctx.textAlign = 'center';
  ctx.font = '900 92px Arial, sans-serif';
  const headlineEnd = drawWrapped(ctx, card.headline.trim(), 540, top, 860, 108, 4);
  ctx.globalAlpha = .84; ctx.font = '600 48px Arial, sans-serif';
  const bodyEnd = drawWrapped(ctx, card.body.trim(), 540, headlineEnd + 80, 820, 66, 5);
  ctx.globalAlpha = 1;

  const label = (card.cta.trim() || 'Saiba mais').slice(0,32);
  ctx.font = '800 42px Arial, sans-serif';
  const metrics = ctx.measureText(label);
  const buttonW = Math.min(820, Math.max(360, metrics.width + 120));
  const buttonY = Math.min(1530, bodyEnd + 130);
  roundRect(ctx, (1080-buttonW)/2, buttonY, buttonW, 112, 56);
  ctx.fillStyle = card.accent; ctx.fill();
  ctx.fillStyle = '#FFFFFF'; ctx.fillText(label, 540, buttonY + 72);

  ctx.globalAlpha = .45; ctx.font = '700 28px Arial, sans-serif'; ctx.fillStyle = textColor;
  ctx.fillText('Anúncio criado com Midia.Pro', 540, 1780); ctx.globalAlpha = 1;

  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Não foi possível gerar o PNG.')), 'image/png', .94));
  return new File([blob], 'anuncio-midia-pro.png', { type: 'image/png' });
}

function drawWrapped(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
  if (!text) return y;
  const words = text.split(/\s+/); let line = '', lines: string[] = [];
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) { lines.push(line); line = word; }
    else line = candidate;
    if (lines.length >= maxLines) break;
  }
  if (lines.length < maxLines && line) lines.push(line);
  lines = lines.slice(0,maxLines);
  lines.forEach((value,index) => ctx.fillText(value, x, y + index * lineHeight));
  return y + Math.max(1, lines.length) * lineHeight;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
}

async function fileImage(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve,reject) => { image.onload=()=>resolve(); image.onerror=()=>reject(new Error('Não foi possível ler o logo.')); image.src=url; });
    return image;
  } finally { URL.revokeObjectURL(url); }
}
