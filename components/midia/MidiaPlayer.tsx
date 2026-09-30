'use client';

import Image from 'next/image';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, Expand, Loader2, MonitorPlay, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { MIDIA_BRAND } from '@/lib/midia/constants';
import { inspectMidiaMediaCache, objectUrlForMidiaItem, syncMidiaMediaCache, uniqueMidiaItems, type MidiaManifestItem } from '@/lib/midia/player-cache';

const APP_VERSION = 'web-6';
const TOKEN_KEY_PREFIX = 'midiapro:device:';
const MANIFEST_KEY_PREFIX = 'midiapro:manifest:';
const PLAYED_KEY_PREFIX = 'midiapro:paid-played:';
const PROOF_QUEUE_KEY_PREFIX = 'midiapro:proof-queue:';
const OFFLINE_DAY_KEY_PREFIX = 'midiapro:offline-day:';
const MIN_PROOF_RATIO = 0.8;

// Transição curta para não consumir tempo relevante da campanha.
// O conteúdo atual desaparece, o próximo já vem do cache local e entra suavemente.
const TRANSITION_OUT_MS = 220;
const TRANSITION_IN_MS = 420;

type PaidOccurrence = {
  id: string;
  campaignId: string;
  creativeId: string;
  plannedAt: string;
  windowEndAt: string;
  displaySeconds: number;
  proofToken: string;
};

type HouseItem = MidiaManifestItem & { advertiserLabel?: string };

type Manifest = {
  screen: {
    id: string; name: string; publicCode: string; playlistVersion: number; status: string;
    billingStatus: string; canPlay: boolean; commercialMode: string;
    networkInventoryPercent: number; inventoryClass: string;
  };
  publisher: { slug: string; displayName: string };
  generatedAt: string;
  scheduleHorizonAt: string;
  items: MidiaManifestItem[];
  paidCreatives: MidiaManifestItem[];
  houseItems: HouseItem[];
  paidOccurrences: PaidOccurrence[];
};

type PlayTarget =
  | { kind: 'own'; index: number }
  | { kind: 'house'; index: number }
  | { kind: 'paid'; occurrenceId: string }
  | null;

type ProofQueueEvent = {
  eventId: string; occurrenceId: string; proofToken: string; startedAt: string; endedAt: string;
  playedMs: number; offline: boolean; appVersion: string;
};

type ActivePaidPlayback = { occurrenceId: string; startedAt: string; perfStarted: number };

type OfflineDayState = {
  date: string;
  screenId: string;
  preparedAt: string;
  total: number;
  cached: number;
  failed: number;
  bytes: number;
  playlistVersion: number;
};

function localIsoDate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function itemsForOfflineDay(manifest: Manifest, date: string) {
  const paidIds = new Set(
    (manifest.paidOccurrences ?? [])
      .filter((occurrence) => localIsoDate(new Date(occurrence.plannedAt)) === date)
      .map((occurrence) => occurrence.creativeId),
  );
  const paid = (manifest.paidCreatives ?? []).filter((item) => paidIds.has(item.creativeId));
  return uniqueMidiaItems([...(manifest.items ?? []), ...(manifest.houseItems ?? []), ...paid]);
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
  const mb = bytes / 1024 / 1024;
  if (mb < 1024) return `${mb.toFixed(mb >= 100 ? 0 : 1)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

function readPlayed(key: string) {
  try {
    const raw = localStorage.getItem(key);
    const values = raw ? JSON.parse(raw) : [];
    return new Set<string>(Array.isArray(values) ? values.slice(-5000) : []);
  } catch { return new Set<string>(); }
}

function markPlayed(key: string, id: string) {
  const set = readPlayed(key);
  set.add(id);
  try { localStorage.setItem(key, JSON.stringify([...set].slice(-5000))); } catch { /* storage pode estar cheio */ }
}

function readProofQueue(key: string): ProofQueueEvent[] {
  try {
    const raw = localStorage.getItem(key);
    const values = raw ? JSON.parse(raw) : [];
    return Array.isArray(values) ? values.slice(-5000) : [];
  } catch { return []; }
}

function writeProofQueue(key: string, values: ProofQueueEvent[]) {
  try { localStorage.setItem(key, JSON.stringify(values.slice(-5000))); } catch { /* storage pode estar cheio */ }
}

export default function MidiaPlayer({ publisherSlug }: { publisherSlug: string }) {
  const storageKey = `${TOKEN_KEY_PREFIX}${publisherSlug}`;
  const manifestKey = `${MANIFEST_KEY_PREFIX}${publisherSlug}`;
  const playedKey = `${PLAYED_KEY_PREFIX}${publisherSlug}`;
  const proofQueueKey = `${PROOF_QUEUE_KEY_PREFIX}${publisherSlug}`;
  const offlineDayKey = `${OFFLINE_DAY_KEY_PREFIX}${publisherSlug}`;
  const supabase = useMemo(() => createClient(), []);

  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [pairing, setPairing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [online, setOnline] = useState(true);
  const [target, setTarget] = useState<PlayTarget>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [playbackRevocable, setPlaybackRevocable] = useState(false);
  const [mediaVisible, setMediaVisible] = useState(false);
  const [offlineDay, setOfflineDay] = useState<OfflineDayState | null>(null);
  const [offlinePreparing, setOfflinePreparing] = useState(false);
  const [offlineProgress, setOfflineProgress] = useState({ current: 0, total: 0, bytes: 0, failed: 0 });
  const timerRef = useRef<number | null>(null);
  const transitionTimerRef = useRef<number | null>(null);
  const transitionRef = useRef(false);
  const paidPlaybackRef = useRef<ActivePaidPlayback | null>(null);
  const proofSyncingRef = useRef(false);
  const ownSinceNetworkRef = useRef(0);
  const houseCursorRef = useRef(0);

  useEffect(() => {
    setOnline(navigator.onLine);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) setDeviceToken(stored);
    const savedManifest = localStorage.getItem(manifestKey);
    if (savedManifest) {
      try { setManifest(JSON.parse(savedManifest) as Manifest); } catch { localStorage.removeItem(manifestKey); }
    }
    const savedOffline = localStorage.getItem(offlineDayKey);
    if (savedOffline) {
      try { setOfflineDay(JSON.parse(savedOffline) as OfflineDayState); } catch { localStorage.removeItem(offlineDayKey); }
    }
  }, [manifestKey, offlineDayKey, storageKey]);

  useEffect(() => () => {
    if (transitionTimerRef.current) window.clearTimeout(transitionTimerRef.current);
  }, []);

  const flushProofQueue = useCallback(async (token = deviceToken) => {
    if (!token || !navigator.onLine || proofSyncingRef.current) return;
    const queued = readProofQueue(proofQueueKey);
    if (!queued.length) return;
    proofSyncingRef.current = true;
    try {
      const batch = queued.slice(0, 100);
      const response = await fetch('/api/midia/player/proof', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ events: batch }),
      });
      const json = await response.json().catch(() => null);
      if (response.status === 401) { localStorage.removeItem(storageKey); setDeviceToken(null); return; }
      if (!response.ok || !Array.isArray(json?.results)) return;
      const terminal = new Set<string>(json.results.map((item: any) => String(item.eventId || '')).filter(Boolean));
      if (terminal.size) writeProofQueue(proofQueueKey, readProofQueue(proofQueueKey).filter((item) => !terminal.has(item.eventId)));
    } catch { /* offline/instabilidade: mantém fila */ }
    finally { proofSyncingRef.current = false; }
  }, [deviceToken, proofQueueKey, storageKey]);

  const enqueueProof = useCallback((occurrence: PaidOccurrence, active: ActivePaidPlayback) => {
    const playedMs = Math.max(0, Math.round(performance.now() - active.perfStarted));
    if (playedMs < occurrence.displaySeconds * 1000 * MIN_PROOF_RATIO) return false;
    const event: ProofQueueEvent = {
      eventId: crypto.randomUUID(), occurrenceId: occurrence.id, proofToken: occurrence.proofToken,
      startedAt: active.startedAt, endedAt: new Date().toISOString(), playedMs,
      offline: !navigator.onLine, appVersion: APP_VERSION,
    };
    const queue = readProofQueue(proofQueueKey);
    if (!queue.some((item) => item.occurrenceId === occurrence.id)) { queue.push(event); writeProofQueue(proofQueueKey, queue); }
    void flushProofQueue();
    return true;
  }, [flushProofQueue, proofQueueKey]);

  const prepareOfflineDay = useCallback(async (next: Manifest, explicit = false) => {
    const date = localIsoDate();
    const items = itemsForOfflineDay(next, date);
    if (!items.length) {
      const empty: OfflineDayState = {
        date, screenId: next.screen.id, preparedAt: new Date().toISOString(), total: 0, cached: 0,
        failed: 0, bytes: 0, playlistVersion: next.screen.playlistVersion,
      };
      setOfflineDay(empty);
      localStorage.setItem(offlineDayKey, JSON.stringify(empty));
      return empty;
    }

    if (!navigator.onLine) {
      const status = await inspectMidiaMediaCache(items);
      const local: OfflineDayState = {
        date, screenId: next.screen.id, preparedAt: offlineDay?.preparedAt || new Date().toISOString(),
        total: status.total, cached: status.cached, failed: status.missing, bytes: status.bytes,
        playlistVersion: next.screen.playlistVersion,
      };
      setOfflineDay(local);
      return local;
    }

    setOfflinePreparing(true);
    setOfflineProgress({ current: 0, total: items.length, bytes: 0, failed: 0 });
    try {
      // Solicita armazenamento persistente quando o navegador permitir. Isso reduz
      // a chance de o sistema apagar os vídeos do cache durante o dia.
      try { await navigator.storage?.persist?.(); } catch { /* opcional */ }

      const result = await syncMidiaMediaCache(items, {
        prune: true,
        onProgress: (progress) => setOfflineProgress({
          current: progress.current,
          total: progress.total,
          bytes: progress.bytes,
          failed: progress.failed,
        }),
      });
      const prepared: OfflineDayState = {
        date,
        screenId: next.screen.id,
        preparedAt: new Date().toISOString(),
        total: result.total,
        cached: result.cached,
        failed: result.failed,
        bytes: result.bytes,
        playlistVersion: next.screen.playlistVersion,
      };
      setOfflineDay(prepared);
      localStorage.setItem(offlineDayKey, JSON.stringify(prepared));
      if (explicit && result.failed > 0) setError(`${result.failed} mídia(s) não puderam ser baixadas. Tente novamente antes de sair do Wi-Fi.`);
      return prepared;
    } finally {
      setOfflinePreparing(false);
    }
  }, [offlineDay?.preparedAt, offlineDayKey]);

  const loadManifest = useCallback(async (token = deviceToken) => {
    if (!token) return;
    setSyncing(true);
    try {
      await flushProofQueue(token);
      const response = await fetch('/api/midia/player/manifest', { cache: 'no-store', headers: { Authorization: `Bearer ${token}` } });
      const json = await response.json().catch(() => null);
      if (response.status === 401) {
        localStorage.removeItem(storageKey); setDeviceToken(null); setManifest(null); setTarget(null);
        throw new Error('Este player precisa ser pareado novamente.');
      }
      if (!response.ok) throw new Error(json?.error || 'Não foi possível atualizar a programação.');
      const next = json as Manifest;
      setManifest(next);
      localStorage.setItem(manifestKey, JSON.stringify(next));
      await prepareOfflineDay(next);
      setTarget((current) => {
        if (current?.kind === 'own' && current.index < next.items.length) return current;
        if (current?.kind === 'house' && current.index < (next.houseItems ?? []).length) return current;
        if (current?.kind === 'paid' && next.paidOccurrences.some((item) => item.id === current.occurrenceId)) return current;
        if (next.items.length) return { kind: 'own', index: 0 };
        if (next.houseItems?.length) return { kind: 'house', index: 0 };
        return null;
      });
      setError(null);
      void flushProofQueue(token);
    } catch (err: any) {
      if (!manifest) setError(err?.message || 'Sem programação disponível.');
    } finally { setSyncing(false); }
  }, [deviceToken, flushProofQueue, manifest, manifestKey, prepareOfflineDay, storageKey]);

  useEffect(() => { if (deviceToken) void loadManifest(deviceToken); }, [deviceToken]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!manifest?.screen.id || !deviceToken || !online) return;
    const screenChannel = supabase.channel(`midia-screen:${manifest.screen.id}`)
      .on('broadcast', { event: 'playlist' }, () => void loadManifest())
      .subscribe();
    const houseChannel = supabase.channel('midia-house')
      .on('broadcast', { event: 'playlist' }, () => void loadManifest())
      .subscribe();
    return () => {
      void supabase.removeChannel(screenChannel);
      void supabase.removeChannel(houseChannel);
    };
  }, [deviceToken, loadManifest, manifest?.screen.id, online, supabase]);

  useEffect(() => {
    if (!deviceToken) return;
    let cancelled = false;
    async function beat() {
      try {
        const response = await fetch('/api/midia/player/heartbeat', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${deviceToken}` },
          body: JSON.stringify({
            playlistVersion: manifest?.screen.playlistVersion ?? null,
            appVersion: APP_VERSION,
            cacheItems: (manifest?.items.length ?? 0) + (manifest?.paidCreatives.length ?? 0) + (manifest?.houseItems?.length ?? 0),
            pendingProofs: readProofQueue(proofQueueKey).length,
          }),
        });
        const json = await response.json().catch(() => null);
        if (cancelled) return;
        if (response.status === 401) { localStorage.removeItem(storageKey); setDeviceToken(null); return; }
        if (response.ok && json?.refresh) void loadManifest();
        if (response.ok) void flushProofQueue();
      } catch { /* offline esperado */ }
    }
    void beat();
    const timer = window.setInterval(beat, 60_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [deviceToken, flushProofQueue, loadManifest, manifest?.items.length, manifest?.paidCreatives.length, manifest?.houseItems?.length, manifest?.screen.playlistVersion, proofQueueKey, storageKey]);

  useEffect(() => {
    if (!deviceToken || !online) return;
    void flushProofQueue();
    const timer = window.setInterval(() => void flushProofQueue(), 30_000);
    return () => window.clearInterval(timer);
  }, [deviceToken, flushProofQueue, online]);

  useEffect(() => {
    if (!deviceToken) return;
    const timer = window.setInterval(() => { if (navigator.onLine) void loadManifest(); }, 6 * 60 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [deviceToken, loadManifest]);

  useEffect(() => {
    if (!manifest) return;
    const checkDay = () => {
      const today = localIsoDate();
      if (navigator.onLine && (offlineDay?.date !== today || offlineDay.screenId !== manifest.screen.id || offlineDay.playlistVersion !== manifest.screen.playlistVersion)) {
        void prepareOfflineDay(manifest);
      }
    };
    checkDay();
    const timer = window.setInterval(checkDay, 15 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [manifest, offlineDay?.date, offlineDay?.playlistVersion, offlineDay?.screenId, prepareOfflineDay]);

  const paidCreativeById = useMemo(() => new Map((manifest?.paidCreatives ?? []).map((item) => [item.creativeId, item])), [manifest?.paidCreatives]);

  const pickDuePaid = useCallback((excludeId?: string) => {
    if (!manifest) return null;
    const played = readPlayed(playedKey);
    const now = Date.now();
    return manifest.paidOccurrences.find((item) =>
      item.id !== excludeId && !played.has(item.id) && new Date(item.plannedAt).getTime() <= now && new Date(item.windowEndAt).getTime() > now && paidCreativeById.has(item.creativeId)
    ) ?? null;
  }, [manifest, paidCreativeById, playedKey]);

  const currentOccurrence = useMemo(() => {
    if (!manifest || target?.kind !== 'paid') return null;
    return manifest.paidOccurrences.find((item) => item.id === target.occurrenceId) ?? null;
  }, [manifest, target]);

  const current = useMemo(() => {
    if (!manifest || !target) return null;
    if (target.kind === 'own') return manifest.items[target.index] ?? null;
    if (target.kind === 'house') return manifest.houseItems?.[target.index] ?? null;
    const occurrence = manifest.paidOccurrences.find((item) => item.id === target.occurrenceId);
    if (!occurrence) return null;
    const creative = paidCreativeById.get(occurrence.creativeId);
    if (!creative) return null;
    return { ...creative, id: occurrence.id, displaySeconds: occurrence.displaySeconds, source: 'network' } as MidiaManifestItem & { source: string };
  }, [manifest, paidCreativeById, target]);

  const advanceNow = useCallback((completed = true) => {
    if (!manifest) { setTarget(null); return; }
    let excluded: string | undefined;

    if (target?.kind === 'paid') {
      excluded = target.occurrenceId;
      const occurrence = manifest.paidOccurrences.find((item) => item.id === target.occurrenceId);
      const active = paidPlaybackRef.current;
      if (completed && occurrence && active?.occurrenceId === occurrence.id && enqueueProof(occurrence, active)) {
        markPlayed(playedKey, occurrence.id);
      }
      paidPlaybackRef.current = null;
      ownSinceNetworkRef.current = 0;
    } else if (target?.kind === 'house') {
      ownSinceNetworkRef.current = 0;
    } else if (target?.kind === 'own' && completed) {
      ownSinceNetworkRef.current += 1;
    }

    const due = pickDuePaid(excluded);
    if (due) { setTarget({ kind: 'paid', occurrenceId: due.id }); return; }

    const house = manifest.houseItems ?? [];
    const percent = Math.max(0, Number(manifest.screen.networkInventoryPercent || 0));
    const every = percent > 0 ? Math.max(2, Math.round(100 / percent)) : Number.POSITIVE_INFINITY;
    const shouldHouse = house.length > 0 && percent > 0
      && (manifest.items.length === 0 || ownSinceNetworkRef.current >= every - 1);

    if (shouldHouse) {
      const index = houseCursorRef.current % house.length;
      houseCursorRef.current = (index + 1) % house.length;
      setTarget({ kind: 'house', index });
      return;
    }

    if (manifest.items.length) {
      const nextIndex = target?.kind === 'own' ? (target.index + 1) % manifest.items.length : 0;
      setTarget({ kind: 'own', index: nextIndex });
      return;
    }

    if (house.length && percent > 0) {
      const index = houseCursorRef.current % house.length;
      houseCursorRef.current = (index + 1) % house.length;
      setTarget({ kind: 'house', index });
      return;
    }

    setTarget(null);
  }, [enqueueProof, manifest, pickDuePaid, playedKey, target]);

  const advance = useCallback((completed = true) => {
    if (transitionRef.current) return;

    transitionRef.current = true;
    setMediaVisible(false);

    if (transitionTimerRef.current) window.clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = window.setTimeout(() => {
      transitionTimerRef.current = null;
      advanceNow(completed);
    }, TRANSITION_OUT_MS);
  }, [advanceNow]);

  useEffect(() => {
    if (!manifest) return;
    const check = () => {
      if (target) return;
      const due = pickDuePaid();
      if (due) setTarget({ kind: 'paid', occurrenceId: due.id });
      else if (manifest.items.length) setTarget({ kind: 'own', index: 0 });
      else if (manifest.houseItems?.length && manifest.screen.networkInventoryPercent > 0) setTarget({ kind: 'house', index: 0 });
    };
    check();
    const timer = window.setInterval(check, 5000);
    return () => window.clearInterval(timer);
  }, [manifest, pickDuePaid, target]);

  const targetKey = target?.kind === 'paid'
    ? `paid:${target.occurrenceId}`
    : target?.kind === 'own'
      ? `own:${target.index}`
      : target?.kind === 'house'
        ? `house:${target.index}`
        : 'none';

  useEffect(() => {
    let cancelled = false;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    if (playbackUrl && playbackRevocable) URL.revokeObjectURL(playbackUrl);
    setPlaybackUrl(null);
    setPlaybackRevocable(false);
    setMediaVisible(false);
    paidPlaybackRef.current = null;

    if (!current) {
      transitionRef.current = false;
      return;
    }

    void objectUrlForMidiaItem(current).then((result) => {
      if (cancelled) {
        if (result?.revoke) URL.revokeObjectURL(result.url);
        return;
      }

      if (!result) {
        transitionRef.current = false;
        advance(false);
        return;
      }

      setPlaybackUrl(result.url);
      setPlaybackRevocable(result.revoke);

      if (target?.kind === 'paid' && currentOccurrence) {
        paidPlaybackRef.current = {
          occurrenceId: currentOccurrence.id,
          startedAt: new Date().toISOString(),
          perfStarted: performance.now(),
        };
      }

      // Duplo RAF garante que o browser pinte primeiro a mídia com opacity 0.
      // Na pintura seguinte ela entra suavemente até opacity 1.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (cancelled) return;
          setMediaVisible(true);
          transitionRef.current = false;
        });
      });

      if (current.kind === 'image') {
        timerRef.current = window.setTimeout(
          () => advance(true),
          current.displaySeconds * 1000 + TRANSITION_IN_MS,
        );
      } else {
        timerRef.current = window.setTimeout(
          () => advance(true),
          Math.max(35, current.displaySeconds + 5) * 1000 + TRANSITION_IN_MS,
        );
      }
    });

    return () => {
      cancelled = true;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [advance, current?.cacheKey, current?.creativeId, current?.displaySeconds, current?.kind, currentOccurrence?.id, targetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  async function pair(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const code = String(form.get('code') ?? '');
    setPairing(true); setError(null);
    try {
      const response = await fetch('/api/midia/player/pair', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, publisherSlug, deviceName: navigator.userAgent.slice(0, 80), appVersion: APP_VERSION }) });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.deviceToken) throw new Error(json?.error || 'Não foi possível parear esta tela.');
      localStorage.setItem(storageKey, json.deviceToken); setDeviceToken(json.deviceToken);
    } catch (err: any) { setError(err?.message || 'Não foi possível parear esta tela.'); }
    finally { setPairing(false); }
  }

  async function fullscreen() { try { await document.documentElement.requestFullscreen?.(); } catch { /* browser pode negar */ } }

  if (!deviceToken) return <main className="min-h-screen bg-[#F7F9FF] p-5 text-slate-950 grid place-items-center"><section className="w-full max-w-lg rounded-[32px] border border-blue-100 bg-white p-7 text-center shadow-2xl shadow-blue-950/10 sm:p-9"><Image src="/brands/midia/logo.png" alt="Midia.Pro" width={220} height={220} priority className="mx-auto h-auto w-48 object-contain" /><div className="mt-4 text-xs font-black uppercase tracking-[.18em]" style={{ color: MIDIA_BRAND.red }}>Parear player</div><h1 className="mt-2 text-3xl font-black">Conecte esta tela</h1><p className="mt-3 text-sm leading-6 text-slate-500">No dashboard Midia.Pro, escolha a tela e toque em <strong>Gerar código de pareamento</strong>. Digite o código abaixo.</p><form onSubmit={pair} className="mt-7"><input name="code" inputMode="text" autoCapitalize="characters" autoComplete="off" maxLength={9} required placeholder="ABCD-EFGH" className="w-full rounded-2xl border-2 border-blue-100 px-4 py-4 text-center font-mono text-3xl font-black uppercase tracking-[.12em] outline-none focus:border-blue-400" />{error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}<button disabled={pairing} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-black text-white disabled:opacity-50" style={{ backgroundColor: MIDIA_BRAND.blue }}>{pairing ? <Loader2 className="h-5 w-5 animate-spin" /> : <MonitorPlay className="h-5 w-5" />} Conectar esta tela</button></form><p className="mt-5 text-xs font-bold text-slate-400">{publisherSlug}.midia.pro</p></section></main>;

  if (!manifest) return <main className="min-h-screen grid place-items-center bg-black text-white"><div className="text-center"><Loader2 className="mx-auto h-9 w-9 animate-spin" /><p className="mt-3 text-sm font-bold text-white/60">Carregando programação…</p>{error && <p className="mt-3 max-w-md text-sm text-red-300">{error}</p>}</div></main>;

  if (!manifest.screen.canPlay) return <main className="min-h-screen grid place-items-center bg-[#07152f] p-6 text-white"><div className="max-w-lg text-center"><AlertTriangle className="mx-auto h-12 w-12 text-amber-400" /><h1 className="mt-5 text-3xl font-black">Tela aguardando ativação</h1><p className="mt-3 text-sm leading-6 text-white/60">O player está pareado corretamente, mas o plano desta tela ainda não está ativo.</p></div></main>;

  const mediaTransitionStyle = {
    opacity: mediaVisible ? 1 : 0,
    transition: `opacity ${mediaVisible ? TRANSITION_IN_MS : TRANSITION_OUT_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  };

  const todayKey = localIsoDate();
  const offlineReady = offlineDay?.date === todayKey && offlineDay.screenId === manifest.screen.id && offlineDay.failed === 0 && offlineDay.cached >= offlineDay.total;
  const pendingProofs = readProofQueue(proofQueueKey).length;
  const connectionLabel = online
    ? (syncing ? 'Sincronizando' : `Online · Realtime${offlineReady ? ' · offline pronto até 23:59' : ''}`)
    : `${offlineReady ? 'Offline · sem Realtime · programação local até 23:59' : 'Offline · sem Realtime · programação local desatualizada'}${pendingProofs ? ` · ${pendingProofs} exibição(ões) pendente(s)` : ''}`;

  return (
    <main className="fixed inset-0 overflow-hidden bg-black text-white select-none" onDoubleClick={() => void fullscreen()}>
      {current && playbackUrl ? current.kind === 'video' ? (
        <video
          key={`${current.cacheKey}:${targetKey}`}
          src={playbackUrl}
          autoPlay
          muted
          playsInline
          className="h-full w-full object-contain bg-black"
          style={mediaTransitionStyle}
          onEnded={() => advance(true)}
          onError={() => advance(false)}
        />
      ) : (
        <img
          key={`${current.cacheKey}:${targetKey}`}
          src={playbackUrl}
          alt=""
          className="h-full w-full object-contain bg-black"
          style={mediaTransitionStyle}
          onError={() => advance(false)}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-b from-[#06235f] to-[#020817]"><div className="px-8 text-center"><Image src="/brands/midia/logo.png" alt="Midia.Pro" width={300} height={300} className="mx-auto h-auto w-64 brightness-0 invert" /><h1 className="mt-6 text-3xl font-black">Tela pronta.</h1><p className="mt-3 text-sm font-bold text-white/55">Aguardando a próxima mídia ou campanha programada.</p></div></div>
      )}

      {(target?.kind === 'paid' || target?.kind === 'house') && <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-black/55 px-3 py-2 text-[10px] font-black uppercase tracking-wider backdrop-blur sm:left-6 sm:top-6">{target.kind === 'house' ? `Publicidade · ${(current as HouseItem | null)?.advertiserLabel || 'Midia.Pro'}` : 'Publicidade · Midia.Pro'}</div>}
      <div className="absolute bottom-4 left-4 max-w-[70vw] rounded-2xl bg-black/60 px-3 py-2 text-[10px] font-black backdrop-blur sm:bottom-6 sm:left-6 sm:text-[11px]">
        <div className="flex items-center gap-2">{online ? <Wifi className="h-4 w-4 shrink-0 text-emerald-400" /> : <WifiOff className="h-4 w-4 shrink-0 text-amber-400" />}<span>{connectionLabel}</span></div>
        {offlinePreparing && <div className="mt-1 text-white/60">Baixando o dia: {offlineProgress.current}/{offlineProgress.total}{offlineProgress.bytes ? ` · ${formatBytes(offlineProgress.bytes)}` : ''}</div>}
      </div>
      <div className="absolute bottom-4 right-4 flex gap-2 sm:bottom-6 sm:right-6">
        <button onClick={() => void prepareOfflineDay(manifest, true)} disabled={!online || offlinePreparing} className="rounded-full bg-black/55 p-3 backdrop-blur disabled:opacity-40" aria-label="Baixar programação de hoje" title={offlineReady ? `Programação de hoje pronta · ${formatBytes(offlineDay?.bytes || 0)}` : 'Baixar programação de hoje'}>{offlinePreparing ? <Loader2 className="h-5 w-5 animate-spin" /> : offlineReady ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <Download className="h-5 w-5" />}</button>
        <button onClick={() => void loadManifest()} className="rounded-full bg-black/55 p-3 backdrop-blur" aria-label="Atualizar"><RefreshCw className={`h-5 w-5 ${syncing ? 'animate-spin' : ''}`} /></button>
        <button onClick={() => void fullscreen()} className="rounded-full bg-black/55 p-3 backdrop-blur" aria-label="Tela cheia"><Expand className="h-5 w-5" /></button>
      </div>
    </main>
  );
}
