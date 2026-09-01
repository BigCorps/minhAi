'use client';

import Image from 'next/image';
import { useParams } from 'next/navigation';
import { ExternalLink, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import FuncionarIAAvatarPhoto from '@/components/funcionaria/visual/FuncionarIAAvatarPhoto';
import FuncionarIAInteraction from '@/components/funcionaria/interaction/FuncionarIAInteraction';
import { useFuncionarIATTS } from '@/components/funcionaria/interaction/useFuncionarIATTS';
import FuncionarIAHumanAssist from '@/components/funcionaria/assistance/FuncionarIAHumanAssist';
import { contrastTextColor, rgbaFromHex } from '@/lib/funcionaria-visual';

export default function FuncionarIAWidget() {
  const params = useParams<{ slug: string }>();
  const slug = String(params.slug || '');
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [humanReason, setHumanReason] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.rpc('funcionaria_public_profile', { p_slug: slug });
      setProfile(data?.company?.id ? data : null);
      setLoading(false);
    }
    if (slug) void load();
  }, [slug, supabase]);

  const voice = profile?.company?.tts_voice || null;
  const voiceSpeed = Number(profile?.company?.voice_speed || 1.2);
  // A personalidade de voz vem das configuracoes da empresa; `tts_voice` fica
  // como fallback para instalacoes que ainda nao passaram pelo editor novo.
  const voiceId = profile?.settings?.voice_id || null;
  const { playText, speaking, audioElement } = useFuncionarIATTS({ voiceId, voice, speed: voiceSpeed });

  async function aiFallback(message: string): Promise<string | null> {
    if (!profile?.company?.id) return null;
    try {
      const response = await fetch('/api/funcionaria/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: profile.company.id, message, source: 'widget' }),
      });
      const data = await response.json().catch(() => ({}));
      return response.ok && data?.ok && data?.answer ? String(data.answer) : null;
    } catch {
      return null;
    }
  }

  function closeWidget() {
    window.parent?.postMessage('funcionaria:close', '*');
  }

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-50 text-xs font-black text-slate-400">Carregando…</main>;
  }

  if (!profile?.company) {
    return <main className="flex min-h-screen items-center justify-center bg-white p-6 text-center text-sm font-black text-slate-500">FuncionarIA não encontrada.</main>;
  }

  const company = profile.company;
  const settings = profile.settings || {};
  const primary = settings.primary_color || '#6D28D9';
  const secondary = settings.secondary_color || '#A3E635';
  const primaryText = contrastTextColor(primary);
  const activeSkillKeys = Array.isArray(profile.active_skill_keys) ? profile.active_skill_keys : [];
  const activeFunctionKeys = Array.isArray(profile.active_function_keys) ? profile.active_function_keys : [];
  const fullUrl = `https://${company.slug}.funcionaria.net`;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-black/5 bg-white/95 px-3 backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-2.5">
          {company.logo_url ? (
            <img src={company.logo_url} alt={company.name} className="h-9 w-9 rounded-xl object-contain" />
          ) : (
            <Image src="/brands/funcionaria/logo.png" alt="FuncionarIA" width={36} height={36} className="h-9 w-9 object-contain" />
          )}
          <div className="min-w-0">
            <div className="truncate text-sm font-black">{company.name}</div>
            <div className="text-[10px] font-black" style={{ color: primary }}>FuncionarIA online</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <a href={fullUrl} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Abrir atendimento completo">
            <ExternalLink className="h-4 w-4" />
          </a>
          <button type="button" onClick={closeWidget} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="space-y-3 p-3">
        <div className="overflow-hidden rounded-[24px] border border-black/5 bg-white shadow-sm">
          <FuncionarIAAvatarPhoto
            primaryColor={primary}
            secondaryColor={secondary}
            shirtColor={settings.shirt_color || primary}
            shirtDetailColor={settings.shirt_detail_color || secondary}
            uniformLogoUrl={settings.uniform_logo_url}
            companyLogoUrl={company.logo_url}
            backgroundPreset={settings.background_preset || 'escritorio'}
            backgroundUrl={settings.background_url}
            counter={settings.counter || 'nenhum'}
            logoPlacement={settings.logo_placement || 'cracha'}
            speaking={speaking}
            audioElement={audioElement}
            className="min-h-[235px]"
          />
        </div>

        <FuncionarIAInteraction
          company={company}
          activeSkillKeys={activeSkillKeys}
          activeFunctionKeys={activeFunctionKeys}
          aiEnabled={settings.ai_enabled === true}
          voiceInputEnabled={settings.voice_input_enabled === true}
          source="widget"
          onAiFallback={aiFallback}
          primaryColor={primary}
          secondaryColor={secondary}
          playText={playText}
          onCallHuman={(reason) => setHumanReason(reason || 'Cliente solicitou atendimento humano pelo widget FuncionarIA.')}
        />

        <a
          href={fullUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-xs font-black shadow-sm"
          style={{ backgroundColor: primary, color: primaryText }}
        >
          Abrir atendimento completo <ExternalLink className="h-4 w-4" />
        </a>

        <div className="pb-2 text-center text-[10px] font-bold text-slate-400">
          Atendimento por <span style={{ color: primary }}>FuncionarIA</span>
        </div>
      </div>

      {humanReason && (
        <FuncionarIAHumanAssist
          companyId={company.id}
          reason={humanReason}
          onClose={() => setHumanReason(null)}
          playText={playText}
        />
      )}

      <div className="pointer-events-none fixed inset-x-0 top-14 h-10" style={{ background: `linear-gradient(180deg, ${rgbaFromHex(primary, .05)}, transparent)` }} />
    </main>
  );
}
