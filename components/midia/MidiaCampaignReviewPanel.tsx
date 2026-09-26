'use client';

import { useState } from 'react';
import { BadgeCheck, CheckCircle2, Clock3, Loader2, Megaphone, PlayCircle, WalletCards, XCircle } from 'lucide-react';
import { formatBrlCents, MIDIA_BRAND } from '@/lib/midia/constants';

export type MidiaCampaignSummary = {
  id: string; screenId: string; screenName: string; productKey: string; productName: string; buyerName: string;
  durationSeconds: number; totalPriceCents: number; estimatedOccurrences: number; status: string;
  scheduleDate: string | null; scheduleTime: string | null; startDate: string | null; endDate: string | null;
  paidAt: string | null; reviewedAt: string | null; approvedAt: string | null; rejectionReason: string | null; createdAt: string;
  settlement: null | {
    grossCents: number; providerFeeCents: number; netCents: number; publisherShareBps: number;
    publisherTotalCents: number; publisherEarnedCents: number; bigcorpsTotalCents: number;
    totalOccurrences: number; deliveredOccurrences: number; status: string;
  };
  creative: null | { id: string; kind: 'image' | 'video'; fileName: string; mimeType: string; sizeBytes: number; durationSeconds: number | null; width: number; height: number; previewUrl: string | null };
};

export default function MidiaCampaignReviewPanel({ campaigns, onChanged }: { campaigns: MidiaCampaignSummary[]; onChanged: () => Promise<void> }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function review(campaignId: string, action: 'approve' | 'reject') {
    setBusy(`${action}:${campaignId}`); setError(null);
    try {
      const response = await fetch('/api/midia/campaigns/review', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, action, reason: action === 'reject' ? reason : null }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error || 'Não foi possível revisar a campanha.');
      setRejecting(null); setReason(''); await onChanged();
    } catch (err: any) { setError(err?.message || 'Não foi possível revisar a campanha.'); }
    finally { setBusy(null); }
  }

  if (!campaigns.length) return null;
  return (
    <section className="mt-8 rounded-[30px] border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-red-50" style={{ color: MIDIA_BRAND.red }}><Megaphone className="h-5 w-5" /></div><div><div className="text-xs font-black uppercase tracking-[.16em]" style={{ color: MIDIA_BRAND.red }}>Publicidade da rede</div><h2 className="mt-1 text-xl font-black">Campanhas das suas telas</h2><p className="mt-1 text-sm text-slate-500">Depois da aprovação, cada exibição válida gera proof-of-play e libera a sua participação no saldo.</p></div></div>
      {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}
      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {campaigns.map((campaign) => {
          const settlement = campaign.settlement;
          const total = settlement?.totalOccurrences ?? campaign.estimatedOccurrences;
          const delivered = settlement?.deliveredOccurrences ?? 0;
          const progress = total > 0 ? Math.min(100, Math.round(delivered * 100 / total)) : 0;
          return <article key={campaign.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-4 sm:p-5"><div className="grid gap-4 sm:grid-cols-[140px_1fr]"><div className="mx-auto aspect-[9/16] w-full max-w-[140px] overflow-hidden rounded-2xl bg-slate-950">{campaign.creative?.previewUrl ? campaign.creative.kind === 'video' ? <video src={campaign.creative.previewUrl} muted playsInline controls className="h-full w-full object-contain" /> : <img src={campaign.creative.previewUrl} alt="Peça publicitária" className="h-full w-full object-contain" /> : <div className="grid h-full place-items-center p-3 text-center text-xs font-bold text-white/40">Sem prévia</div>}</div><div><div className="flex flex-wrap items-center justify-between gap-2"><div><div className="font-black">{campaign.productName} · {campaign.durationSeconds}s</div><div className="mt-1 text-xs font-semibold text-slate-500">{campaign.screenName} · {campaign.buyerName}</div></div><Status status={campaign.status} /></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><Info label="Valor" value={formatBrlCents(campaign.totalPriceCents)} /><Info label="Exibições" value={`${delivered.toLocaleString('pt-BR')} / ${total.toLocaleString('pt-BR')}`} /></div>{settlement && <><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: MIDIA_BRAND.blue }} /></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><Info icon={<WalletCards className="h-3.5 w-3.5" />} label={`Sua parte · ${settlement.publisherShareBps / 100}%`} value={formatBrlCents(settlement.publisherTotalCents)} /><Info icon={<PlayCircle className="h-3.5 w-3.5" />} label="Já liberado" value={formatBrlCents(settlement.publisherEarnedCents)} /></div></>}{campaign.rejectionReason && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900">Ajuste solicitado: {campaign.rejectionReason}</div>}{campaign.status === 'under_review' && <div className="mt-4"><div className="grid gap-2 sm:grid-cols-2"><button disabled={!!busy} onClick={() => void review(campaign.id,'approve')} className="inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black text-white disabled:opacity-50" style={{ backgroundColor: MIDIA_BRAND.blue }}>{busy === `approve:${campaign.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />} Aprovar e agendar</button><button disabled={!!busy} onClick={() => { setRejecting(campaign.id); setReason(''); }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2.5 text-xs font-black text-red-700 disabled:opacity-50"><XCircle className="h-4 w-4" /> Solicitar ajuste</button></div>{rejecting === campaign.id && <div className="mt-3 rounded-2xl border border-amber-200 bg-white p-3"><textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={500} placeholder="Ex.: substitua a imagem porque o texto está ilegível." className="w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-amber-400" /><div className="mt-2 flex gap-2"><button onClick={() => void review(campaign.id,'reject')} disabled={reason.trim().length < 5 || !!busy} className="rounded-xl bg-amber-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50">Enviar solicitação</button><button onClick={() => { setRejecting(null); setReason(''); }} className="rounded-xl px-3 py-2 text-xs font-black text-slate-500">Cancelar</button></div></div>}</div>}</div></div></article>;
        })}
      </div>
    </section>
  );
}

function Status({ status }: { status: string }) {
  const config: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    under_review: { label: 'Revisar', cls: 'bg-amber-100 text-amber-800', icon: <Clock3 className="h-3.5 w-3.5" /> },
    rejected: { label: 'Aguardando nova peça', cls: 'bg-red-100 text-red-700', icon: <XCircle className="h-3.5 w-3.5" /> },
    scheduled: { label: 'Agendada', cls: 'bg-blue-100 text-blue-800', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    running: { label: 'Em exibição', cls: 'bg-emerald-100 text-emerald-800', icon: <PlayCircle className="h-3.5 w-3.5" /> },
    completed: { label: 'Concluída', cls: 'bg-slate-200 text-slate-700', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  };
  const item = config[status] ?? { label: status, cls: 'bg-slate-200 text-slate-700', icon: null };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${item.cls}`}>{item.icon}{item.label}</span>;
}
function Info({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) { return <div className="rounded-xl bg-white p-2.5"><div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-slate-400">{icon}{label}</div><div className="mt-1 font-black text-slate-700">{value}</div></div>; }
