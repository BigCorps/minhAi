'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Download, HardDrive, Loader2, Usb, WifiOff } from 'lucide-react';
import type { MidiaScheduleScreen } from '@/components/midia/MidiaSchedulePanel';
import { MIDIA_BRAND } from '@/lib/midia/constants';

function localIso() {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
  const mb = bytes / 1024 / 1024;
  return mb < 1024 ? `${mb.toFixed(mb >= 100 ? 0 : 1)} MB` : `${(mb / 1024).toFixed(1)} GB`;
}

export default function MidiaOfflineExportCard({ screens, initialScreenId = '' }: { screens: MidiaScheduleScreen[]; initialScreenId?: string }) {
  const [screenId, setScreenId] = useState(initialScreenId || screens[0]?.id || '');
  const [date, setDate] = useState(localIso());
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const selected = useMemo(() => screens.find((screen) => screen.id === screenId) ?? null, [screenId, screens]);

  async function downloadPackage() {
    if (!screenId || !date) return;
    setBusy(true);
    setError(null);
    setProgress('Montando a programação do dia…');
    try {
      const qs = new URLSearchParams({ screenId, date });
      const response = await fetch(`/api/midia/offline/export-manifest?${qs.toString()}`, { cache: 'no-store' });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error || 'Não foi possível montar o pacote offline.');

      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      const media = zip.folder('media');
      if (!media) throw new Error('Não foi possível criar a pasta de mídias.');

      const assets = Array.isArray(json.assets) ? json.assets : [];
      for (let index = 0; index < assets.length; index += 1) {
        const asset = assets[index];
        setProgress(`Baixando mídia ${index + 1} de ${assets.length} · ${asset.localFile}`);
        const assetResponse = await fetch(asset.signedUrl, { cache: 'no-store' });
        if (!assetResponse.ok) throw new Error(`Falha ao baixar ${asset.localFile}.`);
        const blob = await assetResponse.blob();
        media.file(asset.localFile, blob, { binary: true, compression: 'STORE' });
      }

      zip.file('playlist.json', JSON.stringify(json.playlist, null, 2));
      zip.file('player.html', String(json.playerHtml || ''));
      zip.file('LEIA-ME.txt', String(json.readme || ''));
      setProgress(`Empacotando ${formatBytes(Number(json.totalBytes || 0))} para o pendrive…`);

      const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' }, (meta) => {
        setProgress(`Criando ZIP · ${Math.round(meta.percent)}%`);
      });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = String(json.fileName || `MidiaPro-${date}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
      setProgress(`Pronto · ${formatBytes(blob.size)}`);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível baixar a programação offline.');
      setProgress('');
    } finally {
      setBusy(false);
    }
  }

  if (!screens.length) return null;

  return (
    <section className="rounded-[28px] border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em]" style={{ color: MIDIA_BRAND.blue }}><Usb className="h-4 w-4" /> Pendrive / tela sem internet</div>
          <h3 className="mt-2 text-2xl font-black">Baixe a programação do dia.</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">Gera um ZIP com as mídias, `playlist.json`, instruções e um `player.html` que roda localmente em computador ou mini-PC. É ideal para locais onde não existe conexão durante a exibição.</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-bold leading-5 text-amber-900 lg:max-w-sm"><div className="flex items-start gap-2"><WifiOff className="mt-0.5 h-4 w-4 shrink-0" /><span><strong>Sem Realtime:</strong> o pendrive não recebe alterações depois do download e não envia confirmação automática de exibição.</span></div></div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_180px_auto]">
        <label className="text-xs font-black uppercase tracking-wider text-slate-500">Tela<select value={screenId} onChange={(event) => setScreenId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold normal-case tracking-normal text-slate-900">{screens.map((screen) => <option key={screen.id} value={screen.id}>{screen.name}{screen.locationName ? ` · ${screen.locationName}` : ''}</option>)}</select></label>
        <label className="text-xs font-black uppercase tracking-wider text-slate-500">Data<input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold normal-case tracking-normal text-slate-900" /></label>
        <button onClick={() => void downloadPackage()} disabled={busy || !screenId || !date} className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black text-white disabled:opacity-50" style={{ backgroundColor: MIDIA_BRAND.blue }}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}{busy ? 'Preparando…' : 'Baixar ZIP'}</button>
      </div>

      {selected && <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-slate-500"><span className="rounded-full bg-slate-100 px-3 py-2"><HardDrive className="mr-1 inline h-3.5 w-3.5" /> {selected.ownPlaylistItems} mídia(s) própria(s)</span><span className="rounded-full bg-slate-100 px-3 py-2">Rede: {selected.networkInventoryPercent}%</span><span className="rounded-full bg-slate-100 px-3 py-2">Fuso: {selected.timezone}</span></div>}
      {progress && <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs font-bold text-blue-900">{progress}</div>}
      {error && <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
    </section>
  );
}
