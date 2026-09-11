'use client';

import Link from 'next/link';
import { AlertCircle, ArrowLeft, ListOrdered } from 'lucide-react';
import { useEffect, useState } from 'react';
import PainelFilaDisplay from '@/components/VoiceAssistant/modals/FilaAtendimentoDisplay/PainelFilaDisplay';
import { useFuncionarIATTS } from '@/components/funcionaria/interaction/useFuncionarIATTS';

type Props = { slug: string };

export default function FuncionarIAPublicQueue({ slug }: Props) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch(`/api/public/company?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data?.company?.id || !data?.is_funcionaria) throw new Error('FuncionarIA não encontrada.');
        if (active) setProfile(data);
      } catch (err: any) {
        if (active) setError(err?.message || 'Não foi possível abrir a fila.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [slug]);

  const voiceId = profile?.settings?.voice_id || null;
  const voiceSpeed = Number(profile?.company?.voice_speed || 1.2);
  const { playText } = useFuncionarIATTS({ voiceId, speed: voiceSpeed });

  if (loading) return <main className="min-h-screen bg-slate-950 py-24 text-center text-sm font-bold text-slate-400">Carregando fila…</main>;

  const hasQueue = profile?.active_skill_keys?.includes('queue_service') === true;
  if (!profile?.company || error || !hasQueue) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-20">
        <div className="mx-auto max-w-xl rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-sm">
          {error ? <AlertCircle className="mx-auto h-9 w-9 text-red-500" /> : <ListOrdered className="mx-auto h-9 w-9 text-amber-500" />}
          <h1 className="mt-4 text-2xl font-black">{error ? 'Fila indisponível' : 'Fila não contratada'}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{error || 'Esta empresa ainda não ativou a habilidade Fila & Atendimento.'}</p>
          <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white"><ArrowLeft className="h-4 w-4" />Voltar ao atendimento</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-screen min-h-[540px] flex-col overflow-hidden bg-slate-950">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-slate-950 px-4 py-3 text-white sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" className="rounded-xl border border-white/10 p-2 hover:bg-white/10" aria-label="Voltar"><ArrowLeft className="h-5 w-5" /></Link>
          {profile.company.logo_url ? <img src={profile.company.logo_url} alt="" className="h-10 w-10 rounded-xl bg-white object-contain p-1" /> : null}
          <div className="min-w-0"><h1 className="truncate text-base font-black sm:text-lg">{profile.company.name}</h1><p className="text-xs font-bold text-slate-400">Fila de atendimento</p></div>
        </div>
        <div className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-black text-white">Ao vivo</div>
      </header>
      <div className="min-h-0 flex-1">
        <PainelFilaDisplay companyId={profile.company.id} theme="dark" playText={playText} />
      </div>
    </main>
  );
}
