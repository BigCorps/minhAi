'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { CheckCircle2, Clock3, Loader2, Palette, Puzzle, Sparkles, Upload } from 'lucide-react';
import { useFuncionarIAState } from '@/components/funcionaria/FuncionarIADashboardShell';
import { formatBrlCents } from '@/lib/funcionaria-skills';
import FuncionarIAVisualPreview from '@/components/funcionaria/visual/FuncionarIAVisualPreview';
import { FuncionarIAWidgetInstallCard } from '@/components/funcionaria/channels/FuncionarIAChannelsPanel';
import FuncionarIATerminalRequestCard from '@/components/funcionaria/management/FuncionarIATerminalRequestCard';
import { createClient } from '@/lib/supabase-browser';
import { prepareFuncionarIALogo } from '@/lib/funcionaria-assets';

export default function FuncionarIADashboardPage() {
  const { state, loading, reload } = useFuncionarIAState();
  const supabase = useMemo(() => createClient(), []);
  const companyLogoInputRef = useRef<HTMLInputElement>(null);
  const [logoSaving, setLogoSaving] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  if (loading) return <div className="py-16 text-center text-sm font-bold text-slate-400">Carregando sua FuncionarIA…</div>;
  if (!state.company) return null;

  const activeSkills = state.skills.filter(s => ['active', 'cancel_pending'].includes(String(s.company_status)));
  const selectedSkills = state.skills.filter(s => s.company_status === 'selected');

  async function updateCompanyLogo(file?: File) {
    if (!file || !state.company?.id || logoSaving) return;
    setLogoSaving(true);
    setLogoError(null);
    try {
      const prepared = await prepareFuncionarIALogo(file);
      const path = `logos/${state.company.id}/logo.png`;
      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(path, prepared.file, {
          upsert: true,
          contentType: 'image/png',
          cacheControl: '3600',
        });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('company-assets').getPublicUrl(path);
      if (!data?.publicUrl) throw new Error('Não foi possível obter a URL pública do logo.');
      const publicUrl = `${data.publicUrl}?v=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('companies')
        .update({ logo_url: publicUrl, webapp_logo_url: publicUrl })
        .eq('id', state.company.id);
      if (updateError) throw updateError;

      await reload();
    } catch (error: any) {
      setLogoError(error?.message || 'Não foi possível atualizar o logo.');
    } finally {
      setLogoSaving(false);
      if (companyLogoInputRef.current) companyLogoInputRef.current.value = '';
    }
  }

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="text-xs font-black uppercase tracking-[.18em] text-[#6D28D9]">Minha FuncionarIA</div>
          <h1 className="mt-2 text-3xl font-black tracking-tight">{state.company.name}</h1>
          <p className="mt-2 text-sm text-slate-500">{state.company.slug}.funcionaria.net</p>
        </div>
        {!state.settings?.onboarding_completed && (
          <Link href="/onboarding?edit=setup" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6D28D9] px-4 py-3 text-sm font-black text-white">
            <Sparkles className="h-4 w-4" /> Concluir configuração
          </Link>
        )}
      </div>

      <section className="mt-7 grid gap-5 xl:grid-cols-[.78fr_1.22fr]">
        <FuncionarIAVisualPreview
          companyName={state.company.name}
          primaryColor={state.settings?.primary_color || '#6D28D9'}
          secondaryColor={state.settings?.secondary_color || '#A3E635'}
          shirtColor={state.settings?.shirt_color || '#6D28D9'}
          shirtDetailColor={state.settings?.shirt_detail_color || '#A3E635'}
          uniformLogoUrl={state.settings?.uniform_logo_url}
          companyLogoUrl={state.company.logo_url}
          backgroundPreset={state.settings?.background_preset || 'escritorio'}
          backgroundUrl={state.settings?.background_url}
          counter={state.settings?.counter || 'nenhum'}
          logoPlacement={state.settings?.logo_placement || 'cracha'}
          allowSpeechPreview
        />
        <div className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-black uppercase tracking-[.16em] text-[#6D28D9]">Identidade visual</div>
              <h2 className="mt-2 text-xl font-black">Ela veste a camisa da sua empresa</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">O mesmo visual será usado no subdomínio, terminal e, depois, no widget. As cores da interface acompanham a sua marca.</p>
            </div>
            <Palette className="h-6 w-6 shrink-0 text-[#6D28D9]" />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 text-xs font-bold text-slate-500">
            <div className="rounded-2xl border border-slate-100 p-3"><div className="mb-2 h-7 rounded-lg" style={{ backgroundColor: state.settings?.shirt_color || '#6D28D9' }} /><span>Camisa</span></div>
            <div className="rounded-2xl border border-slate-100 p-3"><div className="mb-2 h-7 rounded-lg" style={{ backgroundColor: state.settings?.shirt_detail_color || '#A3E635' }} /><span>Gola e mangas</span></div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  {state.company.logo_url ? (
                    <img src={state.company.logo_url} alt={state.company.name} className="h-full w-full object-contain p-1.5" />
                  ) : (
                    <Image src="/brands/funcionaria/logo.png" alt="Logo provisório" width={48} height={48} className="h-10 w-10 object-contain opacity-45" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-black text-slate-900">Logo da empresa</div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Aparece no seu subdomínio, no dashboard e nas experiências públicas da FuncionarIA.</p>
                </div>
              </div>
              <div>
                <input ref={companyLogoInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={event => void updateCompanyLogo(event.target.files?.[0])} />
                <button type="button" disabled={logoSaving} onClick={() => companyLogoInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-xs font-black text-[#6D28D9] hover:bg-violet-50 disabled:opacity-50">
                  {logoSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {state.company.logo_url ? 'Trocar logo' : 'Adicionar logo'}
                </button>
              </div>
            </div>
            {logoError && <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{logoError}</div>}
          </div>

          <Link href="/onboarding?edit=visual" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#6D28D9] px-4 py-3 text-sm font-black text-white"><Palette className="h-4 w-4" /> Editar visual</Link>
        </div>
      </section>

      <div className="mt-7 grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-[#6D28D9]"><CheckCircle2 className="h-5 w-5" /></div>
          <div className="mt-4 text-2xl font-black">{activeSkills.length}</div>
          <div className="text-sm font-bold text-slate-500">habilidades ativas</div>
        </div>
        <div className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-lime-50 text-lime-700"><Clock3 className="h-5 w-5" /></div>
          <div className="mt-4 text-2xl font-black">{selectedSkills.length}</div>
          <div className="text-sm font-bold text-slate-500">aguardando contratação</div>
        </div>
        <div className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-600"><Puzzle className="h-5 w-5" /></div>
          <div className="mt-4 text-2xl font-black">{formatBrlCents(state.quote.total_cents)}</div>
          <div className="text-sm font-bold text-slate-500">seleção mensal em revisão</div>
        </div>
      </div>

      <FuncionarIAWidgetInstallCard />
      <FuncionarIATerminalRequestCard companyId={state.company.id} />

      <section className="mt-7 rounded-3xl border border-violet-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black">O que ela já sabe fazer</h2>
            <p className="mt-1 text-sm text-slate-500">Somente habilidades ativas aparecem como seções no menu.</p>
          </div>
          <Link href="/dashboard/habilidades" className="text-sm font-black text-[#6D28D9]">Gerenciar →</Link>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {activeSkills.map(skill => (
            <div key={skill.skill_key} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-lime-600" /><span className="font-black">{skill.name}</span></div>
              <p className="mt-2 text-xs leading-5 text-slate-500">{skill.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
