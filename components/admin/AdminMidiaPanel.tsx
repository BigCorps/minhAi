'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  AlertTriangle,
  BadgeDollarSign,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Eye,
  FileImage,
  Loader2,
  MonitorPlay,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  Trash2,
  Upload,
  Video,
  WalletCards,
  Wifi,
  WifiOff,
} from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import { createClient } from '@/lib/supabase-browser';
import type { AdminIdentity } from '@/types/platform-admin-business';

const BLUE = '#003295';
const RED = '#EA0D16';

type Snapshot = {
  generatedAt: string;
  summary: {
    publishers: number; screens: number; activeScreens: number; onlineScreens: number; offlineScreens: number;
    campaignsUnderReview: number; campaignsRunning: number; revenue30dCents: number; campaignRevenue30dCents: number; screenPlanRevenue30dCents: number; paidScreens: number; providerFees30dCents: number;
    partnerPendingCents: number; partnerAvailableCents: number; withdrawalPendingCents: number;
    missedOccurrences: number; houseActive: number;
  };
  campaigns: Array<any>;
  withdrawals: Array<any>;
  screens: Array<any>;
  house: Array<any>;
  settlement: {
    grossCents: number; publisherContractedCents: number; publisherEarnedCents: number;
    bigcorpsContractedCents: number; bigcorpsEarnedCents: number;
    deliveredOccurrences: number; contractedOccurrences: number;
  };
};

type Props = { admin: AdminIdentity; basePath: '' | '/admin' };

function brl(cents: number) {
  return (Number(cents || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function dateTime(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function apiMessage(payload: any, fallback: string) {
  return String(payload?.error || payload?.message || fallback);
}

export default function AdminMidiaPanel({ admin, basePath }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await fetch('/api/admin/midia/overview', { cache:'no-store', credentials:'same-origin' });
      if (response.status === 401 || response.status === 403) { window.location.assign(`${basePath}/login`); return; }
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.ok) throw new Error(apiMessage(json, 'Não foi possível carregar o Midia.Pro.'));
      setSnapshot(json.data as Snapshot);
    } catch (err: any) { setError(err?.message || 'Não foi possível carregar o Midia.Pro.'); }
    finally { setLoading(false); }
  }, [basePath]);

  useEffect(() => { void load(); }, [load]);

  async function post(url: string, body?: unknown, method = 'POST') {
    const response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type':'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials:'same-origin',
    });
    const json = await response.json().catch(() => null);
    if (!response.ok || json?.ok === false) throw new Error(apiMessage(json, 'Operação não concluída.'));
    return json;
  }

  async function reviewCampaign(id: string, action: 'approve'|'reject') {
    const reason = action === 'reject' ? (window.prompt('O que o anunciante precisa ajustar?') || '').trim() : '';
    if (action === 'reject' && reason.length < 5) return;
    if (action === 'approve' && !window.confirm('Aprovar esta campanha e agendar as exibições?')) return;
    setBusy(`campaign:${id}`); setError(null); setNotice(null);
    try {
      await post('/api/admin/midia/campaigns', { campaignId:id, action, reason });
      setNotice(action === 'approve' ? 'Campanha aprovada e programada.' : 'Campanha devolvida para ajuste.');
      await load();
    } catch (err:any) { setError(err?.message || 'Falha ao revisar campanha.'); }
    finally { setBusy(null); }
  }

  async function withdrawalAction(id: string, status: 'processing'|'paid'|'rejected') {
    let reason = '';
    if (status === 'rejected') {
      reason = (window.prompt('Motivo da rejeição/cancelamento do saque:') || '').trim();
      if (reason.length < 5) return;
    }
    if (status === 'paid' && !window.confirm('Confirma que o PIX já foi realizado para o beneficiário? Esta ação move o valor para “repassado”.')) return;
    setBusy(`withdrawal:${id}`); setError(null); setNotice(null);
    try {
      await post('/api/admin/midia/withdrawals', { withdrawalId:id, status, error:reason });
      setNotice(status === 'paid' ? 'Saque marcado como pago.' : status === 'processing' ? 'Saque marcado como processando.' : 'Saque rejeitado e saldo devolvido.');
      await load();
    } catch (err:any) { setError(err?.message || 'Falha ao atualizar saque.'); }
    finally { setBusy(null); }
  }

  async function recover() {
    setBusy('recover'); setError(null); setNotice(null);
    try {
      const json = await post('/api/admin/midia/recover');
      const row = Array.isArray(json.data) ? json.data[0] : json.data;
      setNotice(`Recuperação concluída: ${Number(row?.missed_marked ?? 0)} vencidas marcadas e ${Number(row?.replacements_created ?? 0)} reposições criadas.`);
      await load();
    } catch (err:any) { setError(err?.message || 'Falha na recuperação.'); }
    finally { setBusy(null); }
  }

  async function uploadHouse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get('file');
    if (!(file instanceof File) || !file.size) return;
    setBusy('house-upload'); setError(null); setNotice(null);
    try {
      const meta = await inspectMedia(file);
      if (meta.height <= meta.width) throw new Error('Use uma peça vertical.');
      if (meta.kind === 'video' && (meta.duration < 29.5 || meta.duration > 60.5)) throw new Error('Vídeos precisam ter entre 30 e 60 segundos.');
      const classValue = String(form.get('class') || 'all');
      const classes = classValue === 'all' ? ['standard','movement','premium','led'] : [classValue];
      const prepared = await post('/api/admin/midia/house/upload-url', {
        name: String(form.get('name') || ''),
        advertiserLabel: String(form.get('advertiser') || 'Midia.Pro'),
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        width: meta.width,
        height: meta.height,
        durationSeconds: meta.kind === 'video' ? meta.duration : null,
        displaySeconds: Number(form.get('seconds') || 30),
        priority: Number(form.get('priority') || 100),
        targetInventoryClasses: classes,
      });
      const { error: uploadError } = await supabase.storage.from(prepared.bucket).uploadToSignedUrl(prepared.path, prepared.token, file);
      if (uploadError) throw uploadError;
      await post('/api/admin/midia/house/complete', { id:prepared.id });
      (event.currentTarget as HTMLFormElement).reset();
      setNotice('Filler publicado na rede. Os players serão avisados em Realtime.');
      await load();
    } catch (err:any) { setError(err?.message || 'Não foi possível publicar o filler.'); }
    finally { setBusy(null); }
  }

  async function houseAction(id: string, action: 'activate'|'pause'|'delete') {
    if (action === 'delete' && !window.confirm('Excluir definitivamente este filler da rede?')) return;
    setBusy(`house:${id}`); setError(null); setNotice(null);
    try {
      await post('/api/admin/midia/house/action', { id, action });
      setNotice(action === 'activate' ? 'Filler ativado.' : action === 'pause' ? 'Filler pausado.' : 'Filler removido.');
      await load();
    } catch (err:any) { setError(err?.message || 'Não foi possível atualizar o filler.'); }
    finally { setBusy(null); }
  }

  const summary = snapshot?.summary;
  const deliveryPct = snapshot?.settlement?.contractedOccurrences
    ? Math.round(snapshot.settlement.deliveredOccurrences * 1000 / snapshot.settlement.contractedOccurrences) / 10
    : 0;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <AdminHeader admin={admin} basePath={basePath} active="midia" />
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[.18em] text-blue-300">Midia.Pro · operação</div>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">Rede de mídia</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Campanhas, telas, fillers, proof-of-play, obrigações com parceiros e saques em um único painel.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => void recover()} disabled={busy === 'recover'} className="inline-flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-2.5 text-sm font-bold text-amber-200 disabled:opacity-50">{busy === 'recover' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Recuperar exibições</button>
            <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold text-slate-300 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar</button>
          </div>
        </div>

        {error && <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100">{error}</div>}
        {notice && <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">{notice}</div>}

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
          <Metric label="Parceiros" value={summary?.publishers ?? null} icon={<MonitorPlay className="h-4 w-4" />} />
          <Metric label="Telas online" value={summary?.onlineScreens ?? null} icon={<Wifi className="h-4 w-4" />} accent />
          <Metric label="Telas offline" value={summary?.offlineScreens ?? null} icon={<WifiOff className="h-4 w-4" />} />
          <Metric label="Em revisão" value={summary?.campaignsUnderReview ?? null} icon={<Eye className="h-4 w-4" />} />
          <Metric label="Receita 30d" value={summary ? brl(summary.revenue30dCents) : null} icon={<CircleDollarSign className="h-4 w-4" />} />
          <Metric label="Saldo parceiros" value={summary ? brl(summary.partnerAvailableCents) : null} icon={<WalletCards className="h-4 w-4" />} />
          <Metric label="Saques abertos" value={summary ? brl(summary.withdrawalPendingCents) : null} icon={<BadgeDollarSign className="h-4 w-4" />} />
          <Metric label="Entrega" value={snapshot ? `${deliveryPct}%` : null} icon={<CheckCircle2 className="h-4 w-4" />} />
        </section>

        <nav className="mt-6 flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-white/[.03] p-2 text-xs font-black [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[['campanhas','Campanhas'],['saques','Saques'],['telas','Telas'],['fillers','Fillers']].map(([id,label]) => <a key={id} href={`#${id}`} className="shrink-0 rounded-xl px-4 py-2 text-slate-300 hover:bg-white/5">{label}</a>)}
        </nav>

        <section id="campanhas" className="mt-6 rounded-3xl border border-white/10 bg-white/[.035] p-5 sm:p-6">
          <SectionTitle title="Campanhas aguardando revisão" subtitle="O parceiro pode aprovar no próprio dashboard; o Admin BigCorps também consegue moderar qualquer campanha pendente." />
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {!snapshot?.campaigns?.length ? <Empty text="Nenhuma campanha aguardando revisão." /> : snapshot.campaigns.map((campaign) => (
              <article key={campaign.id} className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50">
                <div className="grid sm:grid-cols-[180px_1fr]">
                  <div className="aspect-[9/16] max-h-[290px] bg-black">{campaign.creative?.previewUrl ? campaign.creative.kind === 'video' ? <video src={campaign.creative.previewUrl} muted controls className="h-full w-full object-contain" /> : <img src={campaign.creative.previewUrl} alt="" className="h-full w-full object-contain" /> : <div className="grid h-full min-h-48 place-items-center text-slate-700"><FileImage className="h-8 w-8" /></div>}</div>
                  <div className="p-4">
                    <div className="text-xs font-black uppercase tracking-wider text-blue-300">{campaign.productName}</div>
                    <h3 className="mt-2 font-black">{campaign.buyerName}</h3>
                    <p className="mt-1 text-xs text-slate-500">{campaign.publisherName} · {campaign.screenName}</p>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs"><Info label="Valor" value={brl(campaign.totalPriceCents)} /><Info label="Duração" value={`${campaign.durationSeconds}s`} /><Info label="Exibições" value={String(campaign.estimatedOccurrences)} /><Info label="Pago" value={dateTime(campaign.paidAt)} /></div>
                    <div className="mt-4 flex gap-2"><button disabled={busy === `campaign:${campaign.id}`} onClick={() => void reviewCampaign(campaign.id,'approve')} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-3 py-2.5 text-xs font-black text-slate-950 disabled:opacity-50"><CheckCircle2 className="h-4 w-4" /> Aprovar</button><button disabled={busy === `campaign:${campaign.id}`} onClick={() => void reviewCampaign(campaign.id,'reject')} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2.5 text-xs font-black text-red-200 disabled:opacity-50"><AlertTriangle className="h-4 w-4" /> Ajustar</button></div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="saques" className="mt-6 rounded-3xl border border-white/10 bg-white/[.035] p-5 sm:p-6">
          <SectionTitle title="Saques PIX" subtitle="Marque como pago somente depois de efetuar o PIX fora do sistema. Rejeitar devolve o valor ao saldo disponível do parceiro." />
          <div className="mt-5 space-y-3">
            {!snapshot?.withdrawals?.length ? <Empty text="Nenhum saque pendente." /> : snapshot.withdrawals.map((item) => (
              <article key={item.id} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div><div className="text-lg font-black">{brl(item.amountCents)} · {item.publisherName}</div><div className="mt-1 text-xs text-slate-500">Solicitado {dateTime(item.requestedAt)} · status <strong className="text-slate-300">{item.status}</strong></div>{item.payout && <div className="mt-3 grid gap-1 text-xs text-slate-400"><span><strong className="text-slate-200">Titular:</strong> {item.payout.fullName}</span><span><strong className="text-slate-200">Documento:</strong> {String(item.payout.documentType).toUpperCase()} final {item.payout.documentFinal}</span><span><strong className="text-slate-200">PIX:</strong> {item.payout.pixKey} ({item.payout.pixKeyType})</span><span><strong className="text-slate-200">E-mail:</strong> {item.payout.email}</span></div>}</div>
                  <div className="flex flex-wrap gap-2"><button disabled={busy === `withdrawal:${item.id}`} onClick={() => void withdrawalAction(item.id,'processing')} className="rounded-xl border border-blue-400/20 bg-blue-400/10 px-3 py-2 text-xs font-black text-blue-200">Processando</button><button disabled={busy === `withdrawal:${item.id}`} onClick={() => void withdrawalAction(item.id,'paid')} className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-black text-slate-950">PIX pago</button><button disabled={busy === `withdrawal:${item.id}`} onClick={() => void withdrawalAction(item.id,'rejected')} className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs font-black text-red-200">Rejeitar</button></div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="telas" className="mt-6 rounded-3xl border border-white/10 bg-white/[.035] p-5 sm:p-6">
          <SectionTitle title="Telas da rede" subtitle="A classe e o fator comercial são definidos pela plataforma. O fator multiplica a tabela base no checkout público." />
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {!snapshot?.screens?.length ? <Empty text="Nenhuma tela cadastrada." /> : snapshot.screens.map((screen) => <ScreenCard key={screen.id} screen={screen} busy={busy === `screen:${screen.id}`} onBusy={setBusy} onError={setError} onNotice={setNotice} onSaved={load} />)}
          </div>
        </section>

        <section id="fillers" className="mt-6 rounded-3xl border border-white/10 bg-white/[.035] p-5 sm:p-6">
          <SectionTitle title="Campanhas BigCorps / fillers" subtitle="Entram somente no inventário da rede e não geram saldo ao parceiro. Campanhas pagas sempre têm prioridade." />
          <form onSubmit={uploadHouse} className="mt-5 grid gap-3 rounded-2xl border border-white/10 bg-slate-950/50 p-4 md:grid-cols-2 xl:grid-cols-6">
            <input name="name" required minLength={2} placeholder="Nome interno" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm outline-none xl:col-span-2" />
            <input name="advertiser" defaultValue="Midia.Pro" required placeholder="Marca exibida" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm outline-none" />
            <select name="seconds" defaultValue="30" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm"><option value="30">30 s</option><option value="45">45 s</option><option value="60">60 s</option></select>
            <select name="class" defaultValue="all" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm"><option value="all">Todas as classes</option><option value="standard">Standard</option><option value="movement">Movimento</option><option value="premium">Premium</option><option value="led">LED</option></select>
            <input name="priority" type="number" min="1" max="10000" defaultValue="100" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm" />
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black xl:col-span-6"><Upload className="h-4 w-4" /> {busy === 'house-upload' ? 'Enviando…' : 'Escolher e publicar imagem/vídeo vertical'}<input name="file" required type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" className="hidden" /></label>
          </form>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {!snapshot?.house?.length ? <Empty text="Nenhum filler publicado." /> : snapshot.house.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50">
                <div className="aspect-[9/16] max-h-[330px] bg-black">{item.previewUrl ? item.kind === 'video' ? <video src={item.previewUrl} muted controls className="h-full w-full object-contain" /> : <img src={item.previewUrl} alt="" className="h-full w-full object-contain" /> : <div className="grid h-full place-items-center text-slate-700">{item.kind === 'video' ? <Video /> : <FileImage />}</div>}</div>
                <div className="p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black">{item.name}</h3><p className="mt-1 text-xs text-slate-500">{item.advertiserLabel} · {item.displaySeconds}s · prioridade {item.priority}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-black ${item.status === 'ready' ? 'bg-emerald-400/10 text-emerald-300' : 'bg-amber-400/10 text-amber-300'}`}>{item.status}</span></div><div className="mt-4 flex gap-2">{item.status === 'ready' ? <button disabled={busy === `house:${item.id}`} onClick={() => void houseAction(item.id,'pause')} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs font-black text-amber-200"><Pause className="h-4 w-4" /> Pausar</button> : <button disabled={busy === `house:${item.id}`} onClick={() => void houseAction(item.id,'activate')} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-black text-slate-950"><Play className="h-4 w-4" /> Ativar</button>}<button disabled={busy === `house:${item.id}`} onClick={() => void houseAction(item.id,'delete')} className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-red-200"><Trash2 className="h-4 w-4" /></button></div></div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value, icon, accent = false }: { label:string; value:string|number|null; icon:ReactNode; accent?:boolean }) {
  return <article className={`rounded-2xl border p-4 ${accent ? 'border-emerald-400/20 bg-emerald-400/[.07]' : 'border-white/10 bg-white/[.035]'}`}><div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-500"><span>{label}</span><span className={accent ? 'text-emerald-300' : 'text-slate-600'}>{icon}</span></div><div className="mt-3 text-2xl font-black">{value == null ? '—' : value}</div></article>;
}
function SectionTitle({ title, subtitle }: { title:string; subtitle:string }) { return <div><h2 className="text-xl font-black">{title}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p></div>; }
function Info({ label, value }: { label:string; value:string }) { return <div className="rounded-xl bg-white/[.04] p-2"><div className="text-[10px] font-black uppercase tracking-wider text-slate-600">{label}</div><div className="mt-1 font-bold text-slate-300">{value}</div></div>; }
function Empty({ text }: { text:string }) { return <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-600">{text}</div>; }

function ScreenCard({ screen, busy, onBusy, onError, onNotice, onSaved }: { screen:any; busy:boolean; onBusy:(v:string|null)=>void; onError:(v:string|null)=>void; onNotice:(v:string|null)=>void; onSaved:()=>Promise<void> }) {
  const [inventoryClass, setInventoryClass] = useState(screen.inventoryClass);
  const [priceFactor, setPriceFactor] = useState(String(screen.priceFactor));
  const [network, setNetwork] = useState(String(screen.networkInventoryPercent));
  const [status, setStatus] = useState(screen.status);
  const [accepting, setAccepting] = useState(Boolean(screen.acceptingAds));
  const [start, setStart] = useState(String(screen.activeStartTime || '08:00').slice(0,5));
  const [end, setEnd] = useState(String(screen.activeEndTime || '20:00').slice(0,5));

  async function save() {
    onBusy(`screen:${screen.id}`); onError(null); onNotice(null);
    try {
      const response = await fetch('/api/admin/midia/screens', { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ screenId:screen.id, inventoryClass, priceFactor:Number(priceFactor), networkInventoryPercent:Number(network), status, acceptingAds:accepting, activeStartTime:start, activeEndTime:end }) });
      const json = await response.json().catch(() => null);
      if (!response.ok || json?.ok === false) throw new Error(apiMessage(json,'Não foi possível salvar a tela.'));
      onNotice(`Tela ${screen.name} atualizada.`); await onSaved();
    } catch (err:any) { onError(err?.message || 'Não foi possível salvar a tela.'); }
    finally { onBusy(null); }
  }

  return <article className="rounded-2xl border border-white/10 bg-slate-950/50 p-4"><div className="flex items-start justify-between gap-3"><div><div className="font-black">{screen.publisherName} · {screen.name}</div><div className="mt-1 text-xs text-slate-500">{screen.locationName || 'Local'} · {screen.city || ''}{screen.state ? `/${screen.state}` : ''} · {screen.publicCode}</div></div><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black ${screen.online ? 'bg-emerald-400/10 text-emerald-300' : 'bg-amber-400/10 text-amber-300'}`}>{screen.online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}{screen.online ? 'ONLINE' : 'OFFLINE'}</span></div><div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3"><select value={inventoryClass} onChange={e=>setInventoryClass(e.target.value)} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-xs"><option value="standard">Standard ×1</option><option value="movement">Movimento</option><option value="premium">Premium</option><option value="led">LED / Destaque</option></select><input value={priceFactor} onChange={e=>setPriceFactor(e.target.value)} type="number" min="0.5" max="100" step="0.05" title="Fator de preço" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-xs" /><input value={network} onChange={e=>setNetwork(e.target.value)} disabled={screen.commercialMode === 'private'} type="number" min="0" max="80" step="1" title="% inventário da rede" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-xs disabled:opacity-50" /><select value={status} onChange={e=>setStatus(e.target.value)} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-xs"><option value="draft">Rascunho</option><option value="active">Ativa</option><option value="paused">Pausada</option><option value="suspended">Suspensa</option><option value="archived">Arquivada</option></select><input value={start} onChange={e=>setStart(e.target.value)} type="time" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-xs" /><input value={end} onChange={e=>setEnd(e.target.value)} type="time" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-xs" /></div><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><label className="inline-flex items-center gap-2 text-xs font-bold text-slate-400"><input type="checkbox" checked={accepting} disabled={screen.commercialMode === 'private'} onChange={e=>setAccepting(e.target.checked)} /> Aceitando anúncios</label><div className="text-[11px] text-slate-600">App {screen.appVersion || '—'} · proofs pendentes {screen.pendingProofs || 0} · visto {dateTime(screen.lastSeenAt)}</div><button disabled={busy} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar</button></div></article>;
}

async function inspectMedia(file: File): Promise<{ kind:'image'|'video'; width:number; height:number; duration:number }> {
  if (file.type.startsWith('image/')) {
    const url = URL.createObjectURL(file);
    try { const image = new Image(); await new Promise<void>((resolve,reject)=>{ image.onload=()=>resolve(); image.onerror=()=>reject(new Error('Não foi possível ler a imagem.')); image.src=url; }); return { kind:'image', width:image.naturalWidth, height:image.naturalHeight, duration:0 }; }
    finally { URL.revokeObjectURL(url); }
  }
  if (file.type.startsWith('video/')) {
    const url = URL.createObjectURL(file);
    try { const video = document.createElement('video'); video.preload='metadata'; await new Promise<void>((resolve,reject)=>{ video.onloadedmetadata=()=>resolve(); video.onerror=()=>reject(new Error('Não foi possível ler o vídeo.')); video.src=url; }); return { kind:'video', width:video.videoWidth, height:video.videoHeight, duration:video.duration }; }
    finally { URL.revokeObjectURL(url); }
  }
  throw new Error('Formato não suportado.');
}
