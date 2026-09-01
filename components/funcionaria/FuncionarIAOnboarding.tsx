'use client';

import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, CheckCircle2, ChevronLeft, ChevronRight, ImagePlus, Loader2, Sparkles, Upload, XCircle } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import FuncionarIAVisualPreview from '@/components/funcionaria/visual/FuncionarIAVisualPreview';
import { prepareFuncionarIABackground, prepareFuncionarIALogo } from '@/lib/funcionaria-assets';
import {
  clearFuncionarIAOnboardingDraft,
  completeFuncionarIAOnboardingDraft,
  loadFuncionarIAOnboardingDraft,
  saveFuncionarIAOnboardingDraft,
  type FuncionarIAOnboardingDraft,
} from '@/lib/funcionaria-onboarding-draft';
import { FUNCIONARIA_BACKGROUND_PRESETS } from '@/lib/funcionaria-visual';
import { COUNTERS, LOGO_PLACEMENTS } from '@/lib/funcionaria-avatar';
import { DEFAULT_VOICE_ID } from '@/lib/funcionaria-voices';
import VoiceSelector from './visual/VoiceSelector';
import { useAssistant } from '@/contexts/AssistantContext';
import {
  calculateLocalQuote,
  formatBrlCents,
  slugifyCompanyName,
  type FuncionarIAEquipmentMode,
  type FuncionarIAQuote,
  type FuncionarIASkill,
  type FuncionarIAWhatsAppMode,
  type FuncionarIAWorkplaceMode,
} from '@/lib/funcionaria-skills';

const businessTypes = ['Loja', 'Restaurante', 'Clínica', 'Salão', 'Escritório', 'Prestador de serviço', 'Farmácia', 'Mercado / Mercearia', 'Padaria / Confeitaria', 'Academia', 'Hotel / Pousada', 'Outros'];

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'error';

export default function FuncionarIAOnboarding() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const search = useSearchParams();
  const { selectedAssistantId, selectedAssistantName, setSelectedAssistant, loadingAssistants } = useAssistant();
  const editMode = search.get('edit');
  const editingExisting = !!editMode && !!selectedAssistantId;
  const [step, setStep] = useState(editMode === 'skills' ? 3 : editMode === 'visual' ? 4 : 1);
  const [skills, setSkills] = useState<FuncionarIASkill[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [serverQuote, setServerQuote] = useState<FuncionarIAQuote | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle');
  const [slugMessage, setSlugMessage] = useState('');

  const [workplace, setWorkplace] = useState<FuncionarIAWorkplaceMode>('ambos');
  const [companyName, setCompanyName] = useState('');
  const [companySlug, setCompanySlug] = useState('');
  const [businessType, setBusinessType] = useState('Loja');
  const [primaryColor, setPrimaryColor] = useState('#6D28D9');
  const [secondaryColor, setSecondaryColor] = useState('#A3E635');
  const [shirtColor, setShirtColor] = useState('#6D28D9');
  const [shirtDetailColor, setShirtDetailColor] = useState('#A3E635');
  const [counter, setCounter] = useState<string>('nenhum');
  const [voiceId, setVoiceId] = useState<string>(DEFAULT_VOICE_ID);
  const [logoPlacement, setLogoPlacement] = useState<string>('cracha');
  const [backgroundPreset, setBackgroundPreset] = useState('office');
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);
  const [uniformLogoUrl, setUniformLogoUrl] = useState<string | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [uniformLogoFile, setUniformLogoFile] = useState<File | null>(null);
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [processingVisual, setProcessingVisual] = useState(false);
  const uniformLogoInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [whatsappMode, setWhatsappMode] = useState<FuncionarIAWhatsAppMode>('hybrid');
  const [equipmentMode, setEquipmentMode] = useState<FuncionarIAEquipmentMode>('own');

  /**
   * Espera o AssistantContext resolver antes de carregar.
   *
   * O contexto busca as empresas de forma assincrona, entao na primeira
   * renderizacao `selectedAssistantId` e null. Em modo de edicao isso caia num
   * vao: o branch de empresa existente nao rodava (sem id) e o de rascunho
   * tambem nao (porque `editMode` existe). O editor abria com os valores
   * padrao — sem nome de empresa, sem logo — e as vezes ficava preso na tela de
   * carregamento. Era a mesma causa dos dois sintomas.
   */
  useEffect(() => {
    if (editMode && loadingAssistants) return;

    async function load() {
      const { data, error } = await supabase.from('funcionaria_skill_catalog').select('*').eq('is_active', true).order('display_order');
      if (error) setError('Não foi possível carregar as habilidades.');
      else setSkills((data || []) as FuncionarIASkill[]);

      const { data: sessionData } = await supabase.auth.getSession();
      const authenticated = !!sessionData.session;
      setIsAuthenticated(authenticated);

      // Edição pelo dashboard continua usando a empresa real já cadastrada.
      //
      // O try/catch é local de propósito. Antes, qualquer falha aqui derrubava
      // o `load()` inteiro e mostrava "não foi possível carregar os dados" —
      // inclusive quando os dados já tinham sido carregados numa passada
      // anterior do efeito, o que deixava a mensagem de erro sobrando embaixo de
      // um editor que estava funcionando.
      if (authenticated && editingExisting && selectedAssistantId) {
        try {
        await supabase.rpc('funcionaria_bootstrap_company', { p_company_id: selectedAssistantId });
        const { data: state } = await supabase.rpc('funcionaria_get_state', { p_company_id: selectedAssistantId });
        if (state?.settings) {
          setWorkplace(state.settings.workplace_mode || 'ambos');
          setBusinessType(state.settings.business_type || 'Loja');
          setPrimaryColor(state.settings.primary_color || '#6D28D9');
          setSecondaryColor(state.settings.secondary_color || '#A3E635');
          setShirtColor(state.settings.shirt_color || '#6D28D9');
          setShirtDetailColor(state.settings.shirt_detail_color || '#A3E635');
          setBackgroundPreset(state.settings.background_url ? 'custom' : (state.settings.background_preset || 'escritorio'));
          setCounter(state.settings.counter || 'nenhum');
          setVoiceId(state.settings.voice_id || DEFAULT_VOICE_ID);
          setLogoPlacement(state.settings.logo_placement || 'cracha');
          setAvatarOptionId((state.settings.avatar_option_id || 'option-1') as FuncionarIAAvatarOptionId);
          setUniformLogoUrl(state.settings.uniform_logo_url || null);
          setBackgroundUrl(state.settings.background_url || null);
          setAiEnabled(!!state.settings.ai_enabled);
          setVoiceEnabled(!!state.settings.voice_input_enabled);
          setWhatsappMode(state.settings.whatsapp_mode || 'hybrid');
          setEquipmentMode(state.settings.equipment_mode || 'own');
        }
        if (state?.company) {
          setCompanyName(state.company.name || selectedAssistantName || '');
          setCompanySlug(state.company.slug || '');
          setCompanyLogoUrl(state.company.logo_url || null);
        }
        setSelected(Array.from(new Set([...(state?.active_skill_keys || []), ...(state?.selected_skill_keys || [])])).filter((k: string) => k !== 'basic_reception'));
        } catch (cause) {
          console.error('[FuncionarIA] falha ao carregar a empresa', cause);
        }
      } else if (!editMode) {
        // Mesmo padrão da ConviteIA: o visitante monta tudo antes do cadastro e
        // o rascunho fica no navegador, inclusive os arquivos preparados.
        const draft = await loadFuncionarIAOnboardingDraft();
        if (draft) {
          setStep(draft.step);
          setWorkplace(draft.workplace);
          setCompanyName(draft.companyName);
          setCompanySlug(draft.companySlug);
          setBusinessType(draft.businessType);
          setSelected(draft.selected || []);
          setPrimaryColor(draft.primaryColor);
          setSecondaryColor(draft.secondaryColor);
          setShirtColor(draft.shirtColor);
          setShirtDetailColor(draft.shirtDetailColor);
          setBackgroundPreset(draft.backgroundPreset);
          setCompanyLogoUrl(draft.companyLogoUrl || null);
          setAiEnabled(!!draft.aiEnabled);
          setVoiceEnabled(!!draft.voiceEnabled);
          setWhatsappMode(draft.whatsappMode || 'hybrid');
          setEquipmentMode(draft.equipmentMode || 'own');

          const restoredLogo = draft.uniformLogoFile instanceof File ? draft.uniformLogoFile : null;
          const restoredBackground = draft.backgroundFile instanceof File ? draft.backgroundFile : null;
          setUniformLogoFile(restoredLogo);
          setBackgroundFile(restoredBackground);
          setUniformLogoUrl(restoredLogo ? URL.createObjectURL(restoredLogo) : (draft.uniformLogoUrl || null));
          setBackgroundUrl(restoredBackground ? URL.createObjectURL(restoredBackground) : (draft.backgroundUrl || null));
        }
      }
    }

    // O finally garante que a tela de carregamento sempre sai. Sem ele, um erro
    // em qualquer chamada deixava o usuario preso em "Preparando sua
    // FuncionarIA" sem nenhuma pista do que aconteceu.
    //
    // O catch aqui e so rede de seguranca: cada secao ja trata a propria falha,
    // entao chegar aqui significa algo inesperado e vale o log no console.
    void load()
      .catch((cause) => {
        console.error('[FuncionarIA] falha inesperada ao carregar o editor', cause);
      })
      .finally(() => setLoading(false));
  }, [selectedAssistantId, editingExisting, editMode, loadingAssistants]); // eslint-disable-line react-hooks/exhaustive-deps

  // A minhAi já verifica unicidade pelo companies.slug. Como este onboarding
  // também funciona sem login, fazemos a mesma consulta por uma rota server-side
  // que devolve apenas disponível/ocupado, sem expor a tabela companies ao anon.
  useEffect(() => {
    if (editingExisting) {
      setSlugStatus('idle');
      setSlugMessage('');
      return;
    }

    const slug = slugifyCompanyName(companySlug);
    if (!slug) {
      setSlugStatus('idle');
      setSlugMessage('');
      return;
    }
    if (slug.length < 3) {
      setSlugStatus('invalid');
      setSlugMessage('Use pelo menos 3 caracteres.');
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSlugStatus('checking');
      setSlugMessage('Verificando disponibilidade…');
      try {
        const response = await fetch(`/api/funcionaria/slug-availability?slug=${encodeURIComponent(slug)}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        const data = await response.json().catch(() => null);
        if (!response.ok || !data) throw new Error(data?.error || 'availability_check_failed');

        if (data.available) {
          setSlugStatus('available');
          setSlugMessage(`${slug}.funcionaria.net está disponível.`);
        } else {
          setSlugStatus(data.reason === 'invalid' ? 'invalid' : 'taken');
          setSlugMessage(
            data.reason === 'reserved'
              ? 'Este endereço é reservado pela FuncionarIA. Escolha outro.'
              : data.reason === 'invalid'
                ? 'Use de 3 a 63 caracteres, apenas letras, números e hífen.'
                : 'Este endereço já está em uso. Escolha outro.',
          );
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        setSlugStatus('error');
        setSlugMessage('Não foi possível verificar agora. Tente novamente.');
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [companySlug, editingExisting]);

  const visibleSkills = skills.filter(s => !s.is_free).filter(skill => {
    if (!skill.applicable_workplaces?.length) return true;
    return skill.applicable_workplaces.includes(workplace) || skill.applicable_workplaces.includes('ambos');
  });
  const localQuote = calculateLocalQuote(skills, selected);
  const quote = serverQuote || localQuote;

  function toggleSkill(key: string) {
    setServerQuote(null);
    setSelected(current => current.includes(key) ? current.filter(k => k !== key) : [...current, key]);
  }

  async function handleUniformLogo(file?: File) {
    if (!file) return;
    setProcessingVisual(true);
    setError('');
    try {
      const prepared = await prepareFuncionarIALogo(file);
      setUniformLogoFile(prepared.file);
      setUniformLogoUrl(prepared.previewUrl);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível preparar o logo.');
    } finally {
      setProcessingVisual(false);
    }
  }

  async function handleBackground(file?: File) {
    if (!file) return;
    setProcessingVisual(true);
    setError('');
    try {
      const prepared = await prepareFuncionarIABackground(file);
      setBackgroundFile(prepared.file);
      setBackgroundUrl(prepared.previewUrl);
      setBackgroundPreset('custom');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível preparar o fundo.');
    } finally {
      setProcessingVisual(false);
    }
  }

  function chooseBackgroundPreset(key: string) {
    setBackgroundPreset(key);
    setBackgroundFile(null);
    setBackgroundUrl(null);
    if (backgroundInputRef.current) backgroundInputRef.current.value = '';
  }

  function buildDraft(targetStep = step): FuncionarIAOnboardingDraft {
    return {
      version: 1,
      step: targetStep,
      workplace,
      companyName: companyName.trim(),
      companySlug: companySlug.trim(),
      businessType,
      selected,
      primaryColor,
      secondaryColor,
      shirtColor,
      shirtDetailColor,
      backgroundPreset,
      counter,
      voiceId,
      logoPlacement,
      companyLogoUrl,
      // blob: URLs só existem nesta página. Se há um arquivo local, persistimos
      // o próprio File no IndexedDB e reconstruímos o preview ao voltar.
      uniformLogoUrl: uniformLogoFile ? null : uniformLogoUrl,
      backgroundUrl: backgroundFile ? null : backgroundUrl,
      uniformLogoFile,
      backgroundFile,
      aiEnabled,
      voiceEnabled,
      whatsappMode,
      equipmentMode,
      savedAt: new Date().toISOString(),
    };
  }

  async function next() {
    setError('');
    if (step === 2 && (!companyName.trim() || !companySlug.trim())) {
      setError('Informe o nome da empresa e o subdomínio.');
      return;
    }
    if (step === 2 && !editingExisting && slugStatus !== 'available') {
      setError(
        slugStatus === 'checking'
          ? 'Aguarde a verificação do subdomínio.'
          : 'Escolha um subdomínio disponível para continuar.',
      );
      return;
    }

    if (step === 6 && isAuthenticated) {
      const { data } = await supabase.rpc('funcionaria_quote_skills', { p_skill_keys: selected });
      if (data) setServerQuote(data as FuncionarIAQuote);
    }

    const nextStep = Math.min(7, step + 1);
    if (!isAuthenticated) await saveFuncionarIAOnboardingDraft(buildDraft(nextStep));
    setStep(nextStep);
  }

  async function finish() {
    setSaving(true);
    setError('');
    try {
      const draft = buildDraft(7);
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        // O cadastro só aparece AGORA, depois que o visitante já montou sua
        // funcionária e viu o preço. O rascunho é retomado automaticamente
        // pelo login, inclusive depois de OAuth/confirmação por e-mail.
        await saveFuncionarIAOnboardingDraft(draft);
        router.push('/login?mode=signup&destino=onboarding');
        return;
      }

      const completed = await completeFuncionarIAOnboardingDraft(
        supabase,
        draft,
        editingExisting ? selectedAssistantId : null,
      );
      setSelectedAssistant(completed.companyId, completed.companyName);
      await clearFuncionarIAOnboardingDraft();

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Não foi possível salvar sua FuncionarIA.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="min-h-screen bg-[#F7F7FB] py-24 text-center text-sm font-bold text-slate-400">Preparando sua FuncionarIA…</div>;

  return (
    <main className="funcionaria-onboarding min-h-screen bg-[#F7F7FB] px-4 py-6 text-slate-900 sm:py-10" style={{ colorScheme: 'light' }}>
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Image src="/brands/funcionaria/logo.png" alt="FuncionarIA" width={50} height={50} className="h-12 w-12 object-contain" />
            <div><div className="font-black text-slate-950">Contrate sua FuncionarIA</div><div className="text-xs font-bold text-slate-500">Passo {step} de 7</div></div>
          </div>
          <div className="hidden text-right sm:block"><div className="text-sm font-black text-[#6D28D9]">A funcionária IA que veste a camisa da sua empresa</div><div className="text-[12px] text-slate-500">Presencial e online, pronta para cobrar, atender e organizar.</div></div>
        </div>

        <div className="mb-6 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-[#6D28D9] transition-all" style={{ width: `${step / 7 * 100}%` }} /></div>

        <section className="rounded-[28px] border border-violet-100 bg-white p-5 text-slate-900 shadow-xl shadow-violet-950/5 sm:p-8">
          {step === 1 && <Step title="Onde sua FuncionarIA vai trabalhar?" subtitle="Isso serve apenas para recomendar as habilidades mais úteis.">
            <div className="grid gap-3 md:grid-cols-3">{([
              ['presencial', 'Presencial', 'Tablet, computador, terminal ou totem'],
              ['online', 'Online', 'Site, redes sociais e canais digitais'],
              ['ambos', 'Presencial e online', 'A mesma funcionária em todos os lugares'],
            ] as const).map(([key,label,desc]) => <Choice key={key} active={workplace===key} title={label} description={desc} onClick={() => setWorkplace(key)} />)}</div>
          </Step>}

          {step === 2 && <Step title="Qual é o seu negócio?" subtitle="Se você já usa uma empresa da minhAi, vamos aproveitar o mesmo cadastro.">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-slate-900"><span className="text-sm font-black text-slate-900">Nome da empresa</span><input value={companyName} onChange={e => { setCompanyName(e.target.value); if (!editingExisting) setCompanySlug(slugifyCompanyName(e.target.value)); }} disabled={editingExisting} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#6D28D9] focus:ring-2 focus:ring-violet-100 disabled:bg-slate-50 disabled:text-slate-500" placeholder="Minha empresa" /></label>
              <label className="block text-slate-900"><span className="text-sm font-black text-slate-900">Subdomínio</span><div className={`mt-2 flex overflow-hidden rounded-2xl border bg-white transition focus-within:ring-2 focus-within:ring-violet-100 ${slugStatus === 'available' ? 'border-emerald-300' : slugStatus === 'taken' || slugStatus === 'invalid' ? 'border-red-300' : 'border-slate-200 focus-within:border-[#6D28D9]'}`}><input value={companySlug} onChange={e => setCompanySlug(slugifyCompanyName(e.target.value))} disabled={editingExisting} className="min-w-0 flex-1 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none disabled:bg-slate-50 disabled:text-slate-500" placeholder="minhaempresa" /><span className="flex items-center border-l border-slate-100 bg-slate-50 px-3 text-xs font-bold text-slate-500">.funcionaria.net</span></div>{!editingExisting && slugStatus !== 'idle' && <div aria-live="polite" className={`mt-2 flex items-center gap-1.5 text-xs font-bold ${slugStatus === 'available' ? 'text-emerald-600' : slugStatus === 'checking' ? 'text-slate-500' : slugStatus === 'error' ? 'text-amber-600' : 'text-red-600'}`}>{slugStatus === 'checking' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : slugStatus === 'available' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}<span>{slugMessage}</span></div>}</label>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{businessTypes.map(type => <Choice key={type} active={businessType===type} title={type} description="" onClick={() => setBusinessType(type)} compact />)}</div>
          </Step>}

          {step === 3 && <Step title="O que você quer que ela faça?" subtitle="Escolha as responsabilidades. Os valores serão mostrados somente no final.">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-lime-300 bg-lime-50 p-4 text-left text-slate-900 ring-1 ring-lime-100">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-black text-lime-900">Recepção Básica</div>
                    <p className="mt-1 text-sm leading-5 text-lime-800">FAQ, informações da empresa, widget do site, subdomínio e chamar responsável.</p>
                    <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-lime-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-lime-800">
                      <Check className="h-3.5 w-3.5" /> Incluída grátis
                    </div>
                  </div>
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-lime-600 bg-lime-600 text-white">
                    <Check className="h-4 w-4" />
                  </div>
                </div>
              </div>
              {visibleSkills.map(skill => <button type="button" key={skill.skill_key} onClick={() => toggleSkill(skill.skill_key)} className={`rounded-2xl border p-4 text-left text-slate-900 transition ${selected.includes(skill.skill_key) ? 'border-[#6D28D9] bg-violet-50' : 'border-slate-200 bg-white hover:border-violet-200'}`}><div className="flex items-start justify-between gap-3"><div><div className="font-black">{skill.name}</div><p className="mt-1 text-sm leading-5 text-slate-500">{skill.description}</p></div><div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${selected.includes(skill.skill_key) ? 'border-[#6D28D9] bg-[#6D28D9] text-white' : 'border-slate-300'}`}>{selected.includes(skill.skill_key) && <Check className="h-4 w-4" />}</div></div></button>)}
            </div>
          </Step>}

          {step === 4 && <Step title="Vista sua FuncionarIA" subtitle="Ela realmente veste a camisa da sua empresa. Personalize e acompanhe a prévia em tempo real.">
            <div className="space-y-6">
              <FuncionarIAVisualPreview
                counter={counter}
                logoPlacement={logoPlacement}
                companyName={companyName || 'Sua empresa'}
                primaryColor={primaryColor}
                secondaryColor={secondaryColor}
                shirtColor={shirtColor}
                shirtDetailColor={shirtDetailColor}
                uniformLogoUrl={uniformLogoUrl}
                companyLogoUrl={companyLogoUrl}
                backgroundPreset={backgroundPreset}
                backgroundUrl={backgroundUrl}
                compact={false}
                showExpandButton
                className="w-full"
              />

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-5">
                  <div className="rounded-3xl border border-slate-200 bg-white p-5">
                    <div className="mb-4 text-sm font-black text-slate-950">Cores da marca e do uniforme</div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Color label="Cor principal da empresa" value={primaryColor} onChange={setPrimaryColor} />
                      <Color label="Cor secundária" value={secondaryColor} onChange={setSecondaryColor} />
                      <Color label="Cor da camiseta" value={shirtColor} onChange={setShirtColor} />
                      <Color label="Gola e mangas" value={shirtDetailColor} onChange={setShirtDetailColor} />
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-5">
                    <VoiceSelector value={voiceId} onChange={setVoiceId} />
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-black text-slate-950">Logo da empresa</div>
                        <p className="mt-1 text-xs leading-5 text-slate-500">Por padrão usamos o logo atual da empresa. Você pode enviar uma versão específica para a FuncionarIA.</p>
                      </div>
                      <ImagePlus className="h-5 w-5 shrink-0 text-[#6D28D9]" />
                    </div>
                    <input ref={uniformLogoInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e => void handleUniformLogo(e.target.files?.[0])} />
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" disabled={processingVisual} onClick={() => uniformLogoInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-black text-[#6D28D9] disabled:opacity-50"><Upload className="h-4 w-4" /> Enviar logo</button>
                      {companyLogoUrl && <button type="button" onClick={() => { setUniformLogoFile(null); setUniformLogoUrl(null); }} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-500">Usar logo atual da empresa</button>}
                    </div>

                    {/*
                      Onde o logo aparece fica no mesmo card do envio.

                      Separados, o usuario enviava o arquivo num card e
                      descobria a posicao noutro, do outro lado da tela — e a
                      coluna direita ficava mais alta que a esquerda. Sao duas
                      decisoes sobre o mesmo assunto.
                    */}
                    <div className="mt-5 border-t border-slate-100 pt-4">
                      <div className="text-xs font-black uppercase tracking-wide text-slate-500">Onde aparece</div>
                      <p className="mt-1 text-xs leading-5 text-slate-500">No crachá funciona com qualquer logo, porque o cartão dá o fundo. Direto no tecido, o logo precisa ter contraste com a cor da camisa.</p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {LOGO_PLACEMENTS.map(item => <Choice key={item.id} active={logoPlacement===item.id} title={item.label} description={item.description} compact onClick={() => setLogoPlacement(item.id)} />)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="rounded-3xl border border-slate-200 bg-white p-5">
                    <div className="text-sm font-black text-slate-950">Fundo do atendimento</div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {FUNCIONARIA_BACKGROUND_PRESETS.map(bg => <Choice key={bg.key} active={backgroundPreset===bg.key} title={bg.label} description={bg.description} compact onClick={() => chooseBackgroundPreset(bg.key)} />)}
                    </div>
                    <input ref={backgroundInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e => void handleBackground(e.target.files?.[0])} />
                    <button type="button" disabled={processingVisual} onClick={() => backgroundInputRef.current?.click()} className={`mt-3 flex w-full items-center justify-between rounded-2xl border p-3 text-left text-slate-900 transition ${backgroundPreset==='custom' ? 'border-[#6D28D9] bg-violet-50' : 'border-slate-200 bg-white hover:border-violet-200'} disabled:opacity-50`}><span><span className="block font-black">Usar meu próprio fundo</span><span className="mt-1 block text-xs text-slate-500">PNG, JPG ou WebP. A imagem é otimizada antes do envio.</span></span><Upload className="h-4 w-4 text-[#6D28D9]" /></button>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-5">
                    <div className="text-sm font-black text-slate-950">Balcão de atendimento</div>
                    <p className="mt-1 text-xs text-slate-500">Aparece só a ponta, na frente da atendente.</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {COUNTERS.map(item => <Choice key={item.key} active={counter===item.key} title={item.label} description={item.description} compact onClick={() => setCounter(item.key)} />)}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </Step>}

          {step === 5 && <Step title="Como ela deve conversar?" subtitle="Toque e texto são sempre incluídos. Recursos com custo variável usam créditos.">
            <div className="grid gap-3 md:grid-cols-2">
              <Toggle active={voiceEnabled} onClick={() => setVoiceEnabled(v=>!v)} title="Entender clientes por voz" description="Reconhecimento de fala. Usa Créditos de uso." />
              <Toggle active={aiEnabled} onClick={() => setAiEnabled(v=>!v)} title="Responder com IA quando necessário" description="FAQ e habilidades vêm primeiro. IA é apenas o fallback opcional." />
            </div>
            {workplace !== 'presencial' && selected.includes('whatsapp_service') && <div className="mt-6"><div className="text-sm font-black text-slate-900">WhatsApp</div><div className="mt-2 grid gap-3 md:grid-cols-3">{([
              ['redirect','Direcionar','Mais econômico: leva o cliente para o subdomínio.'],
              ['native','Atender no WhatsApp','Mantém o atendimento dentro do canal.'],
              ['hybrid','Atendimento inteligente','Recomendado: FAQ simples no WhatsApp e fluxos no site.'],
            ] as const).map(([key,label,desc]) => <Choice key={key} active={whatsappMode===key} title={label} description={desc} onClick={() => setWhatsappMode(key)} />)}</div></div>}
          </Step>}

          {step === 6 && <Step title="Onde ela vai trabalhar fisicamente?" subtitle="A FuncionarIA funciona no equipamento que você já tem. Aluguel de terminal é opcional.">
            <div className="grid gap-3 md:grid-cols-2"><Choice active={equipmentMode==='own'} title="Usar meu próprio equipamento" description="Tablet, computador, all-in-one, totem ou terminal touch. Incluído." onClick={() => setEquipmentMode('own')} /><Choice active={equipmentMode==='rental'} title="Quero alugar um terminal FuncionarIA" description="Solicitação comercial opcional. O valor do hardware será apresentado separadamente." onClick={() => setEquipmentMode('rental')} /></div>
          </Step>}

          {step === 7 && <Step title="Revise sua FuncionarIA" subtitle="Agora sim mostramos o valor da configuração escolhida.">
            <div className="grid gap-6 lg:grid-cols-[1fr_.8fr]">
              <div className="space-y-3"><div className="flex items-center justify-between rounded-2xl border border-lime-200 bg-lime-50 p-4 text-slate-900"><span className="font-black text-slate-900">FuncionarIA Start</span><span className="font-black text-lime-800">Grátis</span></div>{quote.items.map(item => <div key={item.skill_key} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-slate-900"><span className="font-bold text-slate-900">{item.name}</span><span className="font-black text-slate-900">{formatBrlCents(item.monthly_price_cents)}</span></div>)}</div>
              <div className="rounded-3xl bg-slate-950 p-6 text-white"><div className="text-xs font-black uppercase tracking-[.16em] text-lime-300">Sua configuração</div><div className="mt-5 space-y-2 text-sm"><div className="flex justify-between"><span className="text-white/60">Habilidades</span><span>{formatBrlCents(quote.subtotal_cents)}</span></div><div className="flex justify-between"><span className="text-white/60">Desconto ({quote.discount_percent}%)</span><span>- {formatBrlCents(quote.discount_cents)}</span></div><div className="mt-3 flex justify-between border-t border-white/10 pt-4 text-xl font-black"><span>Total mensal</span><span>{formatBrlCents(quote.total_cents)}</span></div></div><div className="mt-5 space-y-1 text-xs text-white/55"><div>IA: {aiEnabled?'ativada por créditos':'desativada'}</div><div>Voz do cliente: {voiceEnabled?'ativada por créditos':'desativada'}</div><div>Equipamento: {equipmentMode==='own'?'próprio':'solicitar aluguel'}</div></div></div>
            </div>
          </Step>}

          {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-600">{error}</div>}
          <div className="mt-7 flex items-center justify-between gap-3 border-t border-slate-100 pt-5"><button type="button" onClick={() => step===1?router.push(isAuthenticated?'/dashboard':'/'):setStep(s=>Math.max(1,s-1))} className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-black text-slate-500 hover:bg-slate-50"><ChevronLeft className="h-4 w-4" /> Voltar</button>{step<7?<button type="button" onClick={next} className="inline-flex items-center gap-2 rounded-xl bg-[#6D28D9] px-5 py-3 text-sm font-black text-white">Continuar <ChevronRight className="h-4 w-4" /></button>:<button type="button" onClick={finish} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#6D28D9] px-5 py-3 text-sm font-black text-white disabled:opacity-50"><Sparkles className="h-4 w-4" /> {saving?'Preparando…':isAuthenticated?'Salvar minha FuncionarIA':'Criar minha FuncionarIA'}</button>}</div>
        </section>
      </div>
    </main>
  );
}

function Step({title,subtitle,children}:{title:string;subtitle:string;children:React.ReactNode}){return <div className="text-slate-900"><div className="mb-6"><h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{title}</h1><p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p></div>{children}</div>}
function Choice({active,title,description,onClick,compact=false}:{active:boolean;title:string;description:string;onClick:()=>void;compact?:boolean}){return <button type="button" onClick={onClick} className={`rounded-2xl border text-left text-slate-900 transition ${compact?'p-3':'p-4'} ${active?'border-[#6D28D9] bg-violet-50 ring-1 ring-[#6D28D9]/10':'border-slate-200 bg-white hover:border-violet-200'}`}><div className="flex items-center justify-between gap-2"><span className="font-black text-slate-900">{title}</span>{active&&<Check className="h-4 w-4 text-[#6D28D9]"/>}</div>{description&&<p className="mt-1 text-xs leading-5 text-slate-600">{description}</p>}</button>}
function Toggle({active,title,description,onClick}:{active:boolean;title:string;description:string;onClick:()=>void}){return <button type="button" onClick={onClick} className={`rounded-2xl border p-4 text-left text-slate-900 ${active?'border-[#6D28D9] bg-violet-50':'border-slate-200 bg-white'}`}><div className="flex items-center justify-between gap-3"><div><div className="font-black text-slate-900">{title}</div><p className="mt-1 text-xs leading-5 text-slate-600">{description}</p></div><span className={`relative h-6 w-11 rounded-full transition ${active?'bg-[#6D28D9]':'bg-slate-200'}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${active?'left-6':'left-1'}`}/></span></div></button>}
function Color({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){return <label className="block text-slate-900"><span className="text-sm font-black text-slate-900">{label}</span><div className="mt-2 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2"><input type="color" value={value} onChange={e=>onChange(e.target.value)} className="h-9 w-12 cursor-pointer rounded border-0 bg-transparent"/><input value={value} onChange={e=>onChange(e.target.value)} className="min-w-0 flex-1 bg-white text-sm font-bold uppercase text-slate-900 outline-none"/></div></label>}
