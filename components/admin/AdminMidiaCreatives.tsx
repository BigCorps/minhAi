'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  CalendarClock,
  FileImage,
  Images,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Trash2,
  Upload,
  Video,
} from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import { createClient } from '@/lib/supabase-browser';
import type { AdminIdentity } from '@/types/platform-admin-business';

type Props = {
  admin: AdminIdentity;
  basePath: '' | '/admin';
};

type HouseCreative = {
  id: string;
  name: string;
  advertiserLabel: string;
  kind: 'image' | 'video';
  fileName: string;
  displaySeconds: number;
  priority: number;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  targetInventoryClasses: string[];
  targetVenueTypes: string[];
  previewUrl: string | null;
  createdAt: string;
};

const INVENTORY = [
  ['standard', 'Standard'],
  ['movement', 'Movimento'],
  ['premium', 'Premium'],
  ['led', 'LED / Destaque'],
] as const;

const VENUES = [
  ['all', 'Todos os locais'],
  ['store', 'Loja / comércio'],
  ['restaurant', 'Restaurante'],
  ['gym', 'Academia'],
  ['clinic', 'Clínica'],
  ['office', 'Escritório'],
  ['residential_elevator', 'Elevador residencial'],
  ['commercial_elevator', 'Elevador comercial'],
  ['vehicle', 'Veículo / motorista'],
  ['outdoor', 'Área externa'],
  ['other', 'Outros'],
] as const;

function apiMessage(payload: any, fallback: string) {
  return String(payload?.error || payload?.message || fallback);
}

function dateTime(value: string | null) {
  if (!value) return 'Sem limite';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

export default function AdminMidiaCreatives({ admin, basePath }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<HouseCreative[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/midia/overview', {
        cache: 'no-store',
        credentials: 'same-origin',
      });

      if (response.status === 401 || response.status === 403) {
        window.location.assign(`${basePath}/login`);
        return;
      }

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(apiMessage(payload, 'Não foi possível carregar os criativos.'));
      }

      setItems((payload.data?.house ?? []) as HouseCreative[]);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível carregar os criativos.');
    } finally {
      setLoading(false);
    }
  }, [basePath]);

  useEffect(() => {
    void load();
  }, [load]);

  async function post(url: string, body?: unknown) {
    const response = await fetch(url, {
      method: 'POST',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.ok === false) {
      throw new Error(apiMessage(payload, 'Operação não concluída.'));
    }
    return payload;
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    const file = form.get('file');

    if (!(file instanceof File) || !file.size) {
      setError('Escolha uma imagem ou vídeo.');
      return;
    }

    setBusy('upload');
    setError(null);
    setNotice(null);

    try {
      const meta = await inspectMedia(file);

      if (meta.height <= meta.width) {
        throw new Error('Use uma peça vertical. Para a rede, priorize 1080 × 1920 (9:16).');
      }

      if (meta.kind === 'video' && (meta.duration < 29.5 || meta.duration > 60.5)) {
        throw new Error('Vídeos precisam ter entre 30 e 60 segundos.');
      }

      const inventory = String(form.get('inventory') || 'all');
      const venue = String(form.get('venue') || 'all');
      const startsAt = localDateTimeToIso(String(form.get('startsAt') || ''));
      const endsAt = localDateTimeToIso(String(form.get('endsAt') || ''));

      const prepared = await post('/api/admin/midia/house/upload-url', {
        name: String(form.get('name') || ''),
        advertiserLabel: String(form.get('advertiser') || 'BigCorps'),
        destinationUrl: String(form.get('destinationUrl') || '').trim() || null,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        width: meta.width,
        height: meta.height,
        durationSeconds: meta.kind === 'video' ? meta.duration : null,
        displaySeconds: Number(form.get('seconds') || 30),
        priority: Number(form.get('priority') || 100),
        startsAt,
        endsAt,
        targetInventoryClasses:
          inventory === 'all'
            ? ['standard', 'movement', 'premium', 'led']
            : [inventory],
        targetVenueTypes: venue === 'all' ? [] : [venue],
      });

      const { error: uploadError } = await supabase.storage
        .from(prepared.bucket)
        .uploadToSignedUrl(prepared.path, prepared.token, file);

      if (uploadError) throw uploadError;

      await post('/api/admin/midia/house/complete', { id: prepared.id });

      element.reset();
      setSelectedFileName(null);
      setNotice('Criativo publicado. Os players elegíveis receberão a atualização da programação.');
      await load();
    } catch (err: any) {
      setError(err?.message || 'Não foi possível publicar o criativo.');
    } finally {
      setBusy(null);
    }
  }

  async function action(id: string, operation: 'activate' | 'pause' | 'delete') {
    if (operation === 'delete' && !window.confirm('Excluir definitivamente este criativo da rede?')) {
      return;
    }

    setBusy(`item:${id}`);
    setError(null);
    setNotice(null);

    try {
      await post('/api/admin/midia/house/action', { id, action: operation });
      setNotice(
        operation === 'activate'
          ? 'Criativo ativado.'
          : operation === 'pause'
            ? 'Criativo pausado.'
            : 'Criativo removido.',
      );
      await load();
    } catch (err: any) {
      setError(err?.message || 'Não foi possível atualizar o criativo.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <AdminHeader admin={admin} basePath={basePath} active="midia-creatives" />

      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-blue-300">
              <Images className="h-4 w-4" />
              Midia.Pro · inventário institucional
            </div>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">
              Criativos BigCorps / minhAi
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Publique campanhas institucionais que preenchem os espaços livres da rede.
              Anúncios pagos continuam com prioridade e estes criativos não geram saldo ao parceiro.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100">
            {error}
          </div>
        )}

        {notice && (
          <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
            {notice}
          </div>
        )}

        <section className="mt-6 rounded-3xl border border-white/10 bg-white/[.035] p-5 sm:p-6">
          <div>
            <h2 className="text-xl font-black">Novo criativo</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Imagem JPG/PNG/WEBP ou vídeo MP4/WEBM vertical de 30–60 segundos, até 50 MB.
              Para melhor resultado, use 1080 × 1920.
            </p>
          </div>

          <form onSubmit={upload} className="mt-5 grid gap-3 rounded-2xl border border-white/10 bg-slate-950/55 p-4 md:grid-cols-2 xl:grid-cols-6">
            <label className="xl:col-span-2">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Nome interno</span>
              <input
                name="name"
                required
                minLength={2}
                placeholder="Ex.: MonitorIA institucional setembro"
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
              />
            </label>

            <label>
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Marca exibida</span>
              <input
                name="advertiser"
                defaultValue="BigCorps"
                required
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
              />
            </label>

            <label>
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Tempo na tela</span>
              <select name="seconds" defaultValue="30" className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white">
                <option value="30">30 segundos</option>
                <option value="45">45 segundos</option>
                <option value="60">60 segundos</option>
              </select>
            </label>

            <label className="md:col-span-2 xl:col-span-2">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Site do anúncio / QR (opcional)</span>
              <input
                name="destinationUrl"
                type="url"
                placeholder="https://monitoria.cam"
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
              />
            </label>

            <label>
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Classe de tela</span>
              <select name="inventory" defaultValue="all" className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white">
                <option value="all">Todas as classes</option>
                {INVENTORY.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </label>

            <label>
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Tipo de local</span>
              <select name="venue" defaultValue="all" className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white">
                {VENUES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </label>

            <label>
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Prioridade</span>
              <input
                name="priority"
                type="number"
                min="1"
                max="10000"
                defaultValue="100"
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white"
              />
            </label>

            <label>
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Começa em (opcional)</span>
              <input name="startsAt" type="datetime-local" className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white" />
            </label>

            <label>
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Termina em (opcional)</span>
              <input name="endsAt" type="datetime-local" className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white" />
            </label>

            <div className="md:col-span-2 xl:col-span-3">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-blue-400/20 bg-blue-500/10 px-4 py-3 text-sm font-black text-blue-200 transition hover:bg-blue-500/15">
                <Upload className="h-4 w-4" />
                {selectedFileName ? 'Trocar arquivo' : 'Escolher imagem ou vídeo'}
                <input
                  name="file"
                  required
                  type="file"
                  accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
                  className="hidden"
                  disabled={busy === 'upload'}
                  onChange={(event) => setSelectedFileName(event.target.files?.[0]?.name || null)}
                />
              </label>
              <div className="mt-2 min-h-5 truncate text-center text-[11px] font-bold text-slate-500">
                {selectedFileName || 'Nenhum arquivo selecionado'}
              </div>
            </div>

            <button
              type="submit"
              disabled={busy === 'upload'}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2 xl:col-span-3"
            >
              {busy === 'upload' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {busy === 'upload' ? 'Enviando criativo…' : 'Publicar criativo'}
            </button>
          </form>
        </section>

        <section className="mt-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">Criativos cadastrados</h2>
              <p className="mt-1 text-xs text-slate-500">
                Pause uma peça sem apagá-la ou remova-a definitivamente quando não for mais necessária.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-600">{items.length} item(ns)</span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {loading && !items.length ? (
              <div className="col-span-full flex min-h-52 items-center justify-center rounded-3xl border border-white/10 bg-white/[.025] text-sm text-slate-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Carregando…
              </div>
            ) : !items.length ? (
              <div className="col-span-full rounded-3xl border border-dashed border-white/10 p-10 text-center text-sm text-slate-600">
                Nenhum criativo BigCorps publicado ainda.
              </div>
            ) : (
              items.map((item) => (
                <article key={item.id} className="overflow-hidden rounded-3xl border border-white/10 bg-white/[.035]">
                  <div className="aspect-[9/16] max-h-[430px] bg-black">
                    {item.previewUrl ? (
                      item.kind === 'video' ? (
                        <video src={item.previewUrl} muted controls playsInline className="h-full w-full object-contain" />
                      ) : (
                        <img src={item.previewUrl} alt="" className="h-full w-full object-contain" />
                      )
                    ) : (
                      <div className="grid h-full place-items-center text-slate-700">
                        {item.kind === 'video' ? <Video className="h-9 w-9" /> : <FileImage className="h-9 w-9" />}
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-black">{item.name}</h3>
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {item.advertiserLabel} · {item.displaySeconds}s · prioridade {item.priority}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${
                        item.status === 'ready'
                          ? 'bg-emerald-400/10 text-emerald-300'
                          : item.status === 'paused'
                            ? 'bg-amber-400/10 text-amber-200'
                            : 'bg-slate-700/50 text-slate-400'
                      }`}>
                        {item.status}
                      </span>
                    </div>

                    <div className="mt-3 flex items-start gap-2 rounded-xl bg-slate-950/45 p-3 text-[11px] leading-5 text-slate-500">
                      <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        {dateTime(item.startsAt)} → {dateTime(item.endsAt)}
                      </span>
                    </div>

                    <div className="mt-4 flex gap-2">
                      {item.status === 'ready' ? (
                        <button
                          type="button"
                          disabled={busy === `item:${item.id}`}
                          onClick={() => void action(item.id, 'pause')}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2.5 text-xs font-black text-amber-200 disabled:opacity-50"
                        >
                          <Pause className="h-4 w-4" />
                          Pausar
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busy === `item:${item.id}`}
                          onClick={() => void action(item.id, 'activate')}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-3 py-2.5 text-xs font-black text-slate-950 disabled:opacity-50"
                        >
                          <Play className="h-4 w-4" />
                          Ativar
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={busy === `item:${item.id}`}
                        onClick={() => void action(item.id, 'delete')}
                        className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2.5 text-red-200 disabled:opacity-50"
                        aria-label="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function localDateTimeToIso(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

async function inspectMedia(file: File): Promise<{
  kind: 'image' | 'video';
  width: number;
  height: number;
  duration: number;
}> {
  if (file.type.startsWith('image/')) {
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
        image.src = url;
      });

      return {
        kind: 'image',
        width: image.naturalWidth,
        height: image.naturalHeight,
        duration: 0,
      };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  if (file.type.startsWith('video/')) {
    const url = URL.createObjectURL(file);
    try {
      const video = document.createElement('video');
      video.preload = 'metadata';

      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error('Não foi possível ler o vídeo.'));
        video.src = url;
      });

      return {
        kind: 'video',
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration,
      };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  throw new Error('Formato não suportado.');
}
