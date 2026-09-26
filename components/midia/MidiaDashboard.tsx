'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2, Check, CircleDollarSign, Copy, Download, ExternalLink, FileImage, Loader2, MapPin, Megaphone, MonitorPlay,
  MonitorSmartphone, Plus, QrCode, RefreshCw, Trash2, Upload, Video, Wifi, WifiOff,
} from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { formatBrlCents, MIDIA_BRAND, MIDIA_SCREEN_TYPES, MIDIA_VENUE_TYPES } from '@/lib/midia/constants';
import { normalizeMidiaSlug } from '@/lib/midia/slug';
import MidiaCampaignReviewPanel, { type MidiaCampaignSummary } from '@/components/midia/MidiaCampaignReviewPanel';
import MidiaFinancePanel, { type MidiaFinanceState } from '@/components/midia/MidiaFinancePanel';

type Plan = {
  plan_key: string; name: string; description: string; monthly_price_cents: number;
  commercial_mode: 'partner' | 'private' | 'hybrid'; default_network_inventory_percent: number;
  features: Record<string, unknown>; sort_order: number;
};
type Publisher = { id: string; slug: string; displayName: string; accountType: string; status: string; publicUrl: string; createdAt: string };
type Location = { id: string; name: string; venueType: string; city: string | null; state: string | null; active: boolean };
type Screen = {
  id: string; locationId: string; publicCode: string; name: string; screenType: string; planKey: string;
  commercialMode: string; networkInventoryPercent: number; billingStatus: string; billingCurrentPeriodStart: string | null; billingCurrentPeriodEnd: string | null; status: string;
  inventoryClass: string; priceFactor: number; playlistVersion: number; lastSeenAt: string | null;
};
type Device = { id: string; screenId: string; deviceName: string | null; pairedAt: string | null; appVersion: string | null; lastSeenAt: string | null; lastPlaylistVersion: number | null; pendingProofs: number; cacheItems: number };
type PlaylistItem = {
  id: string; screenId: string; creativeId: string; source: string; sortOrder: number; displaySeconds: number;
  kind: 'image' | 'video'; fileName: string; mimeType: string; sizeBytes: number; durationSeconds: number | null;
  width: number; height: number; status: string; createdAt: string;
};
type DashboardState = { publisher: Publisher | null; locations: Location[]; screens: Screen[]; plans: Plan[]; devices: Device[]; playlist: PlaylistItem[]; campaigns: MidiaCampaignSummary[]; finance: MidiaFinanceState | null };
type PairInfo = { code: string; expiresAt: string; playerUrl: string; activationPending: boolean };

export type MidiaDashboardSection = 'overview' | 'screens' | 'ads' | 'media' | 'finance';

export default function MidiaDashboard({ section = 'overview' }: { section?: MidiaDashboardSection }) {
  const [data, setData] = useState<DashboardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<string | null>(null);
  const [pairing, setPairing] = useState<Record<string, PairInfo>>({});

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await fetch('/api/midia/dashboard', { cache: 'no-store' });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error || 'Não foi possível carregar o painel.');
      setData(json as DashboardState);
    } catch (err: any) { setError(err?.message || 'Não foi possível carregar o painel.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(timer);
  }, [load]);

  if (loading && !data) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" style={{ color: MIDIA_BRAND.blue }} /></div>;
  if (error && !data) return <div className="mx-auto max-w-xl rounded-3xl border border-red-200 bg-white p-7 text-center shadow-sm"><p className="font-bold text-red-700">{error}</p><button onClick={() => void load()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white"><RefreshCw className="h-4 w-4" /> Tentar novamente</button></div>;
  if (!data) return null;

  if (!data.publisher) {
    return (
      <div>
        <div className="mb-7 rounded-[30px] border border-blue-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="text-xs font-black uppercase tracking-[.18em]" style={{ color: MIDIA_BRAND.red }}>Bem-vindo à Midia.Pro</div>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Sua central de mídia começa aqui.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">Depois do cadastro você poderá controlar telas e conteúdos, receber anúncios pagos da rede e acompanhar saldo e repasses. O menu acima continuará disponível em todas as páginas.</p>
        </div>
        <PublisherSetup onCreated={load} action={action} setAction={setAction} />
      </div>
    );
  }

  const onlineScreens = data.screens.filter((screen) => {
    const device = data.devices.find((item) => item.screenId === screen.id);
    if (!device?.lastSeenAt) return false;
    const lastSeen = new Date(device.lastSeenAt).getTime();
    return Number.isFinite(lastSeen) && Date.now() - lastSeen < 2 * 60_000;
  }).length;
  const pendingAds = (data.campaigns ?? []).filter((campaign) => campaign.status === 'under_review').length;

  const header = (
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div>
        <div className="text-xs font-black uppercase tracking-[.18em]" style={{ color: MIDIA_BRAND.red }}>Central Midia.Pro</div>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{data.publisher.displayName}</h1>
        <a href={data.publisher.publicUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-sm font-black hover:underline" style={{ color: MIDIA_BRAND.blue }}>{data.publisher.slug}.midia.pro <ExternalLink className="h-3.5 w-3.5" /></a>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:flex"><Stat value={String(data.locations.length)} label="locais" /><Stat value={String(data.screens.length)} label="telas" /></div>
    </div>
  );

  return (
    <div>
      {header}
      {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}

      {section === 'overview' && (
        <DashboardOverview
          locations={data.locations.length}
          screens={data.screens.length}
          onlineScreens={onlineScreens}
          pendingAds={pendingAds}
          mediaCount={data.playlist.length}
          availableCents={data.finance?.wallet.availableCents ?? 0}
        />
      )}

      {section === 'screens' && (
        <section className="mt-8 grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
          <LocationPanel locations={data.locations} onCreated={load} action={action} setAction={setAction} />
          <ScreenPanel publisherSlug={data.publisher.slug} locations={data.locations} screens={data.screens} plans={data.plans} devices={data.devices} pairing={pairing} setPairing={setPairing} onCreated={load} action={action} setAction={setAction} />
        </section>
      )}

      {section === 'ads' && (
        <div className="mt-8">
          <div className="mb-5 rounded-2xl border border-blue-100 bg-white p-5">
            <div className="flex items-center gap-2 font-black"><Megaphone className="h-5 w-5" style={{ color: MIDIA_BRAND.red }} /> Anúncios na sua rede</div>
            <p className="mt-2 text-sm leading-6 text-slate-500">Aprove, devolva para ajuste e acompanhe as campanhas compradas para suas telas. O QR individual de cada tela fica em <strong>Telas e locais</strong>.</p>
          </div>
          <MidiaCampaignReviewPanel campaigns={data.campaigns ?? []} onChanged={load} />
        </div>
      )}

      {section === 'media' && (
        <div className="mt-8">
          <MediaPanel screens={data.screens} playlist={data.playlist} onChanged={load} />
        </div>
      )}

      {section === 'finance' && (
        <div className="mt-8">
          {data.finance ? <MidiaFinancePanel finance={data.finance} onChanged={load} /> : <Empty text="O financeiro aparecerá depois que sua conta estiver configurada." />}
        </div>
      )}
    </div>
  );
}

function DashboardOverview({ locations, screens, onlineScreens, pendingAds, mediaCount, availableCents }: { locations: number; screens: number; onlineScreens: number; pendingAds: number; mediaCount: number; availableCents: number }) {
  return (
    <div className="mt-8">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <OverviewCard href="/dashboard/telas" icon={<MonitorSmartphone className="h-6 w-6" />} title="Telas e locais" value={`${screens} tela${screens === 1 ? '' : 's'}`} description={`${onlineScreens} online agora · ${locations} local${locations === 1 ? '' : 'is'}`} />
        <OverviewCard href="/dashboard/anuncios" icon={<Megaphone className="h-6 w-6" />} title="Anúncios" value={pendingAds ? `${pendingAds} aguardando` : 'Tudo em dia'} description="Campanhas pagas e aprovações da sua rede." />
        <OverviewCard href="/dashboard/midias" icon={<FileImage className="h-6 w-6" />} title="Minhas mídias" value={`${mediaCount} ativa${mediaCount === 1 ? '' : 's'}`} description="Imagens e vídeos próprios exibidos nas telas." />
        <OverviewCard href="/dashboard/financeiro" icon={<CircleDollarSign className="h-6 w-6" />} title="Financeiro" value={formatBrlCents(availableCents)} description="Saldo disponível para saque e histórico." />
      </section>

      <section className="mt-6 rounded-[28px] border border-blue-100 bg-white p-6 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[.16em]" style={{ color: MIDIA_BRAND.blue }}>Comece por onde precisar</div>
            <h2 className="mt-2 text-2xl font-black">O painel agora está separado por função.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Cadastre e pareie telas em <strong>Telas e locais</strong>, acompanhe publicidade paga em <strong>Anúncios</strong>, gerencie sua programação própria em <strong>Minhas mídias</strong> e consulte repasses em <strong>Financeiro</strong>.</p>
          </div>
          <a href="/dashboard/telas" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black text-white" style={{ backgroundColor: MIDIA_BRAND.blue }}><Plus className="h-4 w-4" /> Cadastrar ou gerenciar tela</a>
        </div>
      </section>
    </div>
  );
}

function OverviewCard({ href, icon, title, value, description }: { href: string; icon: React.ReactNode; title: string; value: string; description: string }) {
  return (
    <a href={href} className="group rounded-[24px] border border-blue-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-950/5">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 transition group-hover:bg-blue-100" style={{ color: MIDIA_BRAND.blue }}>{icon}</div>
      <div className="mt-4 text-xs font-black uppercase tracking-[.13em] text-slate-400">{title}</div>
      <div className="mt-1 text-2xl font-black text-slate-950">{value}</div>
      <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
    </a>
  );
}

function PublisherSetup({ onCreated, action, setAction }: { onCreated: () => Promise<void>; action: string | null; setAction: (value: string | null) => void }) {
  const [name, setName] = useState(''); const [slug, setSlug] = useState(''); const [slugEdited, setSlugEdited] = useState(false);
  const [accountType, setAccountType] = useState<'company' | 'person'>('company'); const [error, setError] = useState<string | null>(null);
  function changeName(value: string) { setName(value); if (!slugEdited) setSlug(normalizeMidiaSlug(value)); }
  async function submit(event: FormEvent) {
    event.preventDefault(); setAction('publisher'); setError(null);
    try {
      const response = await fetch('/api/midia/publisher', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ displayName: name, slug, accountType }) });
      const json = await response.json().catch(() => null); if (!response.ok) throw new Error(json?.error || 'Não foi possível criar sua conta Midia.Pro.'); await onCreated();
    } catch (err: any) { setError(err?.message || 'Não foi possível criar sua conta Midia.Pro.'); } finally { setAction(null); }
  }
  return <div className="mx-auto max-w-3xl"><div className="rounded-[32px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-950/5 sm:p-9"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50" style={{ color: MIDIA_BRAND.blue }}><Building2 className="h-6 w-6" /></div><div className="mt-5 text-xs font-black uppercase tracking-[.18em]" style={{ color: MIDIA_BRAND.red }}>Primeiro cadastro</div><h1 className="mt-2 text-3xl font-black tracking-tight">Escolha seu endereço Midia.Pro</h1><p className="mt-3 text-sm leading-6 text-slate-500">Este endereço identifica você na rede. Depois, uma mesma conta poderá ter vários locais e várias telas.</p><form onSubmit={submit} className="mt-7 space-y-5"><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-bold text-slate-700">Tipo de conta<select value={accountType} onChange={(e) => setAccountType(e.target.value as 'company' | 'person')} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3"><option value="company">Empresa / estabelecimento</option><option value="person">Pessoa física</option></select></label><label className="block text-sm font-bold text-slate-700">Nome exibido<input value={name} onChange={(e) => changeName(e.target.value)} required maxLength={100} placeholder="Ex.: Padaria do Zé" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" /></label></div><label className="block text-sm font-bold text-slate-700">Seu endereço<div className="mt-2 flex overflow-hidden rounded-xl border border-slate-200 bg-white"><input value={slug} onChange={(e) => { setSlugEdited(true); setSlug(normalizeMidiaSlug(e.target.value)); }} required minLength={3} maxLength={40} placeholder="padariadoze" className="min-w-0 flex-1 px-4 py-3 outline-none" /><span className="flex items-center border-l border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-500">.midia.pro</span></div></label>{error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}<button disabled={action === 'publisher'} className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 font-black text-white disabled:opacity-50" style={{ backgroundColor: MIDIA_BRAND.blue }}>{action === 'publisher' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Criar meu endereço</button></form></div></div>;
}

function LocationPanel({ locations, onCreated, action, setAction }: { locations: Location[]; onCreated: () => Promise<void>; action: string | null; setAction: (value: string | null) => void }) {
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setAction('location'); setError(null);
    try { const response = await fetch('/api/midia/locations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.get('name'), venueType: form.get('venueType'), city: form.get('city'), state: form.get('state') }) }); const json = await response.json().catch(() => null); if (!response.ok) throw new Error(json?.error || 'Não foi possível cadastrar o local.'); event.currentTarget.reset(); await onCreated(); }
    catch (err: any) { setError(err?.message || 'Não foi possível cadastrar o local.'); } finally { setAction(null); }
  }
  return <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center gap-3"><MapPin className="h-6 w-6" style={{ color: MIDIA_BRAND.red }} /><div><h2 className="text-xl font-black">Locais</h2><p className="text-xs font-bold text-slate-400">Onde suas telas estão instaladas</p></div></div><div className="mt-5 space-y-2">{locations.length === 0 ? <Empty text="Cadastre o primeiro local para depois adicionar uma tela." /> : locations.map((location) => <div key={location.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><div className="font-black">{location.name}</div><div className="mt-1 text-xs font-bold text-slate-400">{venueLabel(location.venueType)}{location.city ? ` · ${location.city}${location.state ? `/${location.state}` : ''}` : ''}</div></div>)}</div><form onSubmit={submit} className="mt-5 space-y-3 border-t border-slate-100 pt-5"><div className="text-xs font-black uppercase tracking-[.14em]" style={{ color: MIDIA_BRAND.blue }}>Adicionar local</div><input name="name" required placeholder="Nome do local" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" /><select name="venueType" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">{MIDIA_VENUE_TYPES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select><div className="grid grid-cols-[1fr_90px] gap-3"><input name="city" placeholder="Cidade" className="min-w-0 rounded-xl border border-slate-200 px-4 py-3 text-sm" /><input name="state" maxLength={2} placeholder="UF" className="rounded-xl border border-slate-200 px-4 py-3 text-sm uppercase" /></div>{error && <p className="text-xs font-bold text-red-700">{error}</p>}<button disabled={action === 'location'} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-black disabled:opacity-50" style={{ color: MIDIA_BRAND.blue }}>{action === 'location' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Adicionar local</button></form></div>;
}

function ScreenPanel({ publisherSlug, locations, screens, plans, devices, pairing, setPairing, onCreated, action, setAction }: { publisherSlug: string; locations: Location[]; screens: Screen[]; plans: Plan[]; devices: Device[]; pairing: Record<string, PairInfo>; setPairing: React.Dispatch<React.SetStateAction<Record<string, PairInfo>>>; onCreated: () => Promise<void>; action: string | null; setAction: (value: string | null) => void }) {
  const [error, setError] = useState<string | null>(null);
  const planByKey = useMemo(() => new Map(plans.map((plan) => [plan.plan_key, plan])), [plans]);
  const deviceByScreen = useMemo(() => { const map = new Map<string, Device>(); for (const device of devices) if (device.pairedAt && !map.has(device.screenId)) map.set(device.screenId, device); return map; }, [devices]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setAction('screen'); setError(null);
    try { const response = await fetch('/api/midia/screens', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ locationId: form.get('locationId'), name: form.get('name'), screenType: form.get('screenType'), planKey: form.get('planKey') }) }); const json = await response.json().catch(() => null); if (!response.ok) throw new Error(json?.error || 'Não foi possível cadastrar a tela.'); event.currentTarget.reset(); await onCreated(); }
    catch (err: any) { setError(err?.message || 'Não foi possível cadastrar a tela.'); } finally { setAction(null); }
  }

  async function generatePairing(screenId: string) {
    setAction(`pair:${screenId}`); setError(null);
    try { const response = await fetch('/api/midia/device-pairing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ screenId }) }); const json = await response.json().catch(() => null); if (!response.ok) throw new Error(json?.error || 'Não foi possível gerar o código.'); setPairing((current) => ({ ...current, [screenId]: json as PairInfo })); }
    catch (err: any) { setError(err?.message || 'Não foi possível gerar o código.'); } finally { setAction(null); }
  }

  return <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center gap-3"><MonitorSmartphone className="h-6 w-6" style={{ color: MIDIA_BRAND.blue }} /><div><h2 className="text-xl font-black">Telas e players</h2><p className="text-xs font-bold text-slate-400">Pareie cada TV, tablet ou painel uma única vez</p></div></div><div className="mt-5 grid gap-3 lg:grid-cols-2">{screens.length === 0 ? <div className="lg:col-span-2"><Empty text="Nenhuma tela cadastrada ainda." /></div> : screens.map((screen) => {
    const plan = planByKey.get(screen.planKey); const device = deviceByScreen.get(screen.id); const isOnline = device?.lastSeenAt ? Date.now() - new Date(device.lastSeenAt).getTime() < 150_000 : false; const pair = pairing[screen.id];
    return <div key={screen.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><div className="flex items-start justify-between gap-3"><div><div className="font-black">{screen.name}</div><div className="mt-1 text-[10px] font-black uppercase tracking-wider text-slate-400">Código {screen.publicCode} · playlist v{screen.playlistVersion}</div></div><span className="rounded-full bg-white px-2 py-1 text-[10px] font-black" style={{ color: screen.commercialMode === 'private' ? MIDIA_BRAND.red : MIDIA_BRAND.blue }}>{screen.commercialMode === 'private' ? 'PRIVADO' : screen.commercialMode === 'hybrid' ? 'HÍBRIDO' : 'PARCEIRO'}</span></div><div className="mt-3 text-xs font-bold text-slate-500">{screenTypeLabel(screen.screenType)} · 9:16 vertical</div><div className="mt-1 text-xs text-slate-400">{plan?.name ?? screen.planKey}{screen.networkInventoryPercent > 0 ? ` · ${screen.networkInventoryPercent}% rede` : ' · 100% próprio'}</div><div className="mt-1 text-[11px] font-bold text-slate-400">Classe {inventoryClassLabel(screen.inventoryClass)} · fator comercial ×{Number(screen.priceFactor || 1).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</div><div className="mt-3 flex items-center gap-2 text-xs font-black">{device ? (isOnline ? <><Wifi className="h-4 w-4 text-emerald-600" /><span className="text-emerald-700">Player online</span></> : <><WifiOff className="h-4 w-4 text-amber-600" /><span className="text-amber-700">Player offline</span></>) : <><WifiOff className="h-4 w-4 text-slate-400" /><span className="text-slate-500">Ainda não pareado</span></>}</div>{device && device.pendingProofs > 0 && <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-800">{device.pendingProofs} proof-of-play{device.pendingProofs === 1 ? '' : 's'} aguardando sincronização.</div>}{plan && Number(plan.monthly_price_cents) > 0 && <ScreenBilling screen={screen} plan={plan} onChanged={onCreated} />}{pair && <div className="mt-3 rounded-2xl border border-blue-200 bg-white p-3"><div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Código válido por 15 minutos</div><div className="mt-1 font-mono text-2xl font-black tracking-[.12em]" style={{ color: MIDIA_BRAND.blue }}>{pair.code}</div><div className="mt-1 text-[11px] text-slate-500">Abra <strong>{publisherSlug}.midia.pro/play</strong> na tela e digite este código.</div><button type="button" onClick={() => navigator.clipboard?.writeText(pair.code)} className="mt-2 inline-flex items-center gap-1 text-[11px] font-black" style={{ color: MIDIA_BRAND.blue }}><Copy className="h-3.5 w-3.5" /> Copiar código</button></div>}<div className="mt-4 grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => void generatePairing(screen.id)} disabled={action === `pair:${screen.id}`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-xs font-black disabled:opacity-50" style={{ color: MIDIA_BRAND.blue }}>{action === `pair:${screen.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <MonitorPlay className="h-4 w-4" />} Gerar código</button><a href={`https://${publisherSlug}.midia.pro/play`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2.5 text-xs font-black text-white"><ExternalLink className="h-4 w-4" /> Abrir player</a>{screen.commercialMode !== 'private' && <><a href={`https://${publisherSlug}.midia.pro/anuncie/${screen.publicCode}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black text-white" style={{ backgroundColor: MIDIA_BRAND.red }}><ExternalLink className="h-4 w-4" /> Página do anúncio</a><a href={`/api/midia/screens/qr?screenId=${encodeURIComponent(screen.id)}&download=1`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2.5 text-xs font-black" style={{ color: MIDIA_BRAND.red }}><QrCode className="h-4 w-4" /> Baixar QR</a><a href={`/api/midia/screens/material?screenId=${encodeURIComponent(screen.id)}&format=a5`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-xs font-black" style={{ color: MIDIA_BRAND.blue }}><QrCode className="h-4 w-4" /> Placa A5</a><a href={`/api/midia/screens/material?screenId=${encodeURIComponent(screen.id)}&format=a4`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-xs font-black" style={{ color: MIDIA_BRAND.blue }}><QrCode className="h-4 w-4" /> Cartaz A4</a></>}</div></div>;
  })}</div>{error && <p className="mt-4 text-xs font-bold text-red-700">{error}</p>}<form onSubmit={submit} className="mt-5 space-y-3 border-t border-slate-100 pt-5"><div className="text-xs font-black uppercase tracking-[.14em]" style={{ color: MIDIA_BRAND.red }}>Adicionar tela</div><div className="grid gap-3 sm:grid-cols-2"><select name="locationId" required disabled={locations.length === 0} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm disabled:bg-slate-50"><option value="">Escolha o local</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select><input name="name" required disabled={locations.length === 0} placeholder="Ex.: TV do balcão" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-50" /></div><div className="grid gap-3 sm:grid-cols-2"><select name="screenType" disabled={locations.length === 0} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm disabled:bg-slate-50">{MIDIA_SCREEN_TYPES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select><select name="planKey" disabled={locations.length === 0} defaultValue="partner_free" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm disabled:bg-slate-50">{plans.map((plan) => <option key={plan.plan_key} value={plan.plan_key}>{plan.name} · {plan.monthly_price_cents ? `${formatBrlCents(plan.monthly_price_cents)}/mês` : 'grátis'}</option>)}</select></div><div className="rounded-2xl bg-slate-50 p-3 text-xs leading-5 text-slate-500"><strong className="text-slate-700">Parceiro grátis:</strong> 20% do inventário para a rede. <strong className="text-slate-700">Uso Próprio:</strong> 100% da programação fica com você.</div><button disabled={locations.length === 0 || action === 'screen'} className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black text-white disabled:opacity-50" style={{ backgroundColor: MIDIA_BRAND.blue }}>{action === 'screen' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Cadastrar tela</button></form></div>;
}


type ScreenBillingState = {
  screen: { billingStatus: string; currentPeriodStart: string | null; currentPeriodEnd: string | null };
  plan: { key: string; name: string; monthlyPriceCents: number };
  payment: null | { id: string; status: string; amountCents: number; pixCode: string | null; qrCodeUrl: string | null; expiresAt: string; confirmedAt: string | null; periodStart: string | null; periodEnd: string | null };
};

function ScreenBilling({ screen, plan, onChanged }: { screen: Screen; plan: Plan; onChanged: () => Promise<void> }) {
  const [state, setState] = useState<ScreenBillingState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async (refreshParent = false) => {
    try {
      const response = await fetch(`/api/midia/billing?screenId=${encodeURIComponent(screen.id)}`, { cache: 'no-store' });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error || 'Não foi possível verificar a mensalidade.');
      setState(json as ScreenBillingState);
      if (refreshParent && json?.payment?.status === 'confirmed') await onChanged();
      return json as ScreenBillingState;
    } catch (err: any) {
      setError(err?.message || 'Não foi possível verificar a mensalidade.');
      return null;
    }
  }, [onChanged, screen.id]);

  useEffect(() => { if (screen.billingStatus !== 'active') void loadStatus(false); }, [loadStatus, screen.billingStatus]);
  useEffect(() => {
    if (state?.payment?.status !== 'pending') return;
    const timer = window.setInterval(() => void loadStatus(true), 5000);
    return () => window.clearInterval(timer);
  }, [loadStatus, state?.payment?.status]);

  async function startPayment() {
    setBusy(true); setError(null);
    try {
      const response = await fetch('/api/midia/billing', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ screenId: screen.id }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error || 'Não foi possível gerar o PIX.');
      setState(json as ScreenBillingState);
    } catch (err: any) { setError(err?.message || 'Não foi possível gerar o PIX.'); }
    finally { setBusy(false); }
  }

  const currentEnd = state?.screen.currentPeriodEnd ?? screen.billingCurrentPeriodEnd;
  const active = (state?.screen.billingStatus ?? screen.billingStatus) === 'active' && currentEnd && new Date(currentEnd).getTime() > Date.now();
  const payment = state?.payment;
  const pending = payment?.status === 'pending' && new Date(payment.expiresAt).getTime() > Date.now();

  return <div className={`mt-3 rounded-xl border px-3 py-3 text-xs ${active ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
    <div className="flex flex-wrap items-center justify-between gap-2"><div><strong>{active ? 'Plano ativo' : 'Mensalidade necessária'}</strong><div className="mt-0.5 text-[11px] opacity-75">{active && currentEnd ? `Ativo até ${new Date(currentEnd).toLocaleDateString('pt-BR')}` : `${plan.name} · ${formatBrlCents(plan.monthly_price_cents)}/mês`}</div></div><button type="button" disabled={busy} onClick={() => void startPayment()} className="rounded-lg bg-white px-3 py-2 text-[11px] font-black shadow-sm disabled:opacity-50" style={{ color: MIDIA_BRAND.blue }}>{busy ? 'Gerando…' : active ? 'Renovar' : pending ? 'Ver PIX' : 'Pagar por PIX'}</button></div>
    {pending && payment && <div className="mt-3 rounded-xl bg-white p-3"><div className="flex flex-col gap-3 sm:flex-row sm:items-center">{payment.qrCodeUrl && <img src={payment.qrCodeUrl} alt="QR Code PIX" className="h-28 w-28 rounded-lg border border-slate-100 object-contain" />}<div className="min-w-0 flex-1"><div className="font-black text-slate-800">PIX {formatBrlCents(payment.amountCents)}</div><p className="mt-1 text-[10px] text-slate-500">A confirmação é automática. Esta tela será ativada assim que o pagamento for identificado.</p>{payment.pixCode && <button type="button" onClick={() => navigator.clipboard?.writeText(payment.pixCode || '')} className="mt-2 inline-flex items-center gap-1 rounded-lg border border-blue-100 px-2.5 py-1.5 text-[10px] font-black" style={{ color: MIDIA_BRAND.blue }}><Copy className="h-3 w-3" /> Copiar PIX</button>}</div></div></div>}
    {error && <div className="mt-2 text-[11px] font-bold text-red-700">{error}</div>}
  </div>;
}

function MediaPanel({ screens, playlist, onChanged }: { screens: Screen[]; playlist: PlaylistItem[]; onChanged: () => Promise<void> }) {
  const supabase = useMemo(() => createClient(), []);
  const [screenId, setScreenId] = useState(screens[0]?.id ?? '');
  const [displaySeconds, setDisplaySeconds] = useState(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const items = playlist.filter((item) => item.screenId === screenId).sort((a, b) => a.sortOrder - b.sortOrder);

  useEffect(() => { if (!screenId && screens[0]) setScreenId(screens[0].id); }, [screenId, screens]);

  async function upload(file?: File) {
    if (!file || !screenId) return;
    setBusy(true); setError(null);
    try {
      const mimeType = normalizeMediaMime(file);
      if (!mimeType) throw new Error('Formato não suportado. Use JPG, PNG, WEBP, MP4 ou WEBM.');
      const uploadFile = file.type ? file : new File([file], file.name, { type: mimeType });
      const meta = await inspectMedia(uploadFile, mimeType);
      if (meta.height <= meta.width) throw new Error('Use uma imagem ou vídeo vertical.');
      if (meta.kind === 'video' && (meta.duration < 29.5 || meta.duration > 60.5)) throw new Error('O vídeo precisa ter entre 30 e 60 segundos.');
      if (file.size > 50 * 1024 * 1024) throw new Error('O arquivo deve ter no máximo 50 MB.');
      const seconds = meta.kind === 'video' ? Math.max(30, Math.min(60, Math.round(meta.duration))) : displaySeconds;

      const prepare = await fetch('/api/midia/media/upload-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ screenId, fileName: uploadFile.name, mimeType, sizeBytes: uploadFile.size, durationSeconds: meta.kind === 'video' ? meta.duration : null, width: meta.width, height: meta.height, displaySeconds: seconds }) });
      const payload = await prepare.json().catch(() => null); if (!prepare.ok) throw new Error(payload?.error || 'Não foi possível preparar o upload.');

      const { error: uploadError } = await supabase.storage.from(payload.bucket).uploadToSignedUrl(payload.path, payload.token, uploadFile);
      if (uploadError) throw uploadError;

      const complete = await fetch('/api/midia/media/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ creativeId: payload.creativeId, screenId }) });
      const completed = await complete.json().catch(() => null); if (!complete.ok) throw new Error(completed?.error || 'Não foi possível finalizar a mídia.');
      await onChanged();
    } catch (err: any) { setError(err?.message || 'Não foi possível enviar a mídia.'); }
    finally { setBusy(false); }
  }

  async function remove(itemId: string) {
    if (!confirm('Remover esta mídia da programação?')) return;
    setBusy(true); setError(null);
    try { const response = await fetch('/api/midia/media/remove', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playlistItemId: itemId }) }); const json = await response.json().catch(() => null); if (!response.ok) throw new Error(json?.error || 'Não foi possível remover.'); await onChanged(); }
    catch (err: any) { setError(err?.message || 'Não foi possível remover.'); } finally { setBusy(false); }
  }

  return <section className="mt-6 rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="text-xs font-black uppercase tracking-[.16em]" style={{ color: MIDIA_BRAND.blue }}>Programação própria</div><h2 className="mt-2 text-xl font-black">Imagens e vídeos da sua tela</h2><p className="mt-2 text-sm leading-6 text-slate-500">Arquivos verticais. Imagens ficam de 30 a 60 s; vídeos precisam ter entre 30 e 60 s. O player baixa uma vez e continua reproduzindo localmente se a internet cair. Você também pode baixar cada arquivo para usar manualmente em um dispositivo sem internet.</p></div>{screens.length > 0 && <select value={screenId} onChange={(e) => setScreenId(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold">{screens.map((screen) => <option key={screen.id} value={screen.id}>{screen.name}</option>)}</select>}</div>
  {screens.length === 0 ? <div className="mt-5"><Empty text="Cadastre uma tela antes de enviar mídias." /></div> : <><div className="mt-5 grid gap-3 sm:grid-cols-[150px_1fr]"><select value={displaySeconds} onChange={(e) => setDisplaySeconds(Number(e.target.value))} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"><option value={30}>Imagem · 30 s</option><option value={45}>Imagem · 45 s</option><option value={60}>Imagem · 60 s</option></select><label className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black text-white ${busy ? 'pointer-events-none opacity-50' : ''}`} style={{ backgroundColor: MIDIA_BRAND.red }}><Upload className="h-4 w-4" /> {busy ? 'Enviando…' : 'Enviar imagem ou vídeo'}<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; e.currentTarget.value = ''; void upload(file); }} /></label></div>{error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}<div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{items.length === 0 ? <div className="md:col-span-2 xl:col-span-3"><Empty text="Esta tela ainda não tem mídia própria. O player mostrará a tela de espera Midia.Pro." /></div> : items.map((item, index) => <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white" style={{ color: item.kind === 'video' ? MIDIA_BRAND.red : MIDIA_BRAND.blue }}>{item.kind === 'video' ? <Video className="h-5 w-5" /> : <FileImage className="h-5 w-5" />}</div><div className="min-w-0 flex-1"><div className="truncate text-sm font-black">{index + 1}. {item.fileName}</div><div className="mt-1 text-[11px] font-bold text-slate-400">{item.width}×{item.height} · {item.displaySeconds}s · {formatBytes(item.sizeBytes)}</div></div><div className="flex shrink-0 items-center gap-1"><a href={`/api/midia/media/download?creativeId=${encodeURIComponent(item.creativeId)}`} className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-700" aria-label="Baixar arquivo" title="Baixar para uso offline"><Download className="h-4 w-4" /></a><button type="button" disabled={busy} onClick={() => void remove(item.id)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50" aria-label="Remover"><Trash2 className="h-4 w-4" /></button></div></div></div>)}</div></>}
  </section>;
}

function normalizeMediaMime(file: File) {
  if (['image/jpeg','image/png','image/webp','video/mp4','video/webm'].includes(file.type)) return file.type;
  const ext = file.name.toLowerCase().split('.').pop();
  return ({ jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', webp:'image/webp', mp4:'video/mp4', webm:'video/webm' } as Record<string,string>)[ext || ''] || '';
}

async function inspectMedia(file: File, mimeType: string): Promise<{ kind: 'image' | 'video'; width: number; height: number; duration: number }> {
  if (mimeType.startsWith('image/')) {
    const url = URL.createObjectURL(file);
    try { const image = new Image(); await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('Não foi possível ler a imagem.')); image.src = url; }); return { kind: 'image', width: image.naturalWidth, height: image.naturalHeight, duration: 0 }; }
    finally { URL.revokeObjectURL(url); }
  }
  if (mimeType.startsWith('video/')) {
    const url = URL.createObjectURL(file);
    try { const video = document.createElement('video'); video.preload = 'metadata'; await new Promise<void>((resolve, reject) => { video.onloadedmetadata = () => resolve(); video.onerror = () => reject(new Error('Não foi possível ler o vídeo.')); video.src = url; }); return { kind: 'video', width: video.videoWidth, height: video.videoHeight, duration: video.duration }; }
    finally { URL.revokeObjectURL(url); }
  }
  throw new Error('Formato não suportado.');
}

function Stat({ value, label }: { value: string; label: string }) { return <div className="rounded-2xl border border-blue-100 bg-white px-5 py-3 text-center shadow-sm"><div className="text-2xl font-black" style={{ color: MIDIA_BRAND.blue }}>{value}</div><div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</div></div>; }
function Empty({ text }: { text: string }) { return <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-center text-sm font-bold text-slate-400">{text}</div>; }
function venueLabel(key: string) { return MIDIA_VENUE_TYPES.find((item) => item.key === key)?.label ?? 'Outro'; }
function screenTypeLabel(key: string) { return MIDIA_SCREEN_TYPES.find((item) => item.key === key)?.label ?? 'Tela'; }
function inventoryClassLabel(key: string) { return ({ standard: 'Standard', movement: 'Movimento', premium: 'Premium', led: 'LED / Destaque' } as Record<string,string>)[key] ?? key; }
function formatBytes(value: number) { if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`; return `${Math.max(1, Math.round(value / 1024))} KB`; }
