'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Loader2,
  MessageCircle,
  Share2,
  Sparkles,
} from 'lucide-react';
import {
  AREA_OPTIONS,
  BR_UFS,
  AREA_QUESTIONS,
  FATURAMENTO_OPTIONS,
  GESTAO_OPTIONS,
  INFRAESTRUTURA_OPTIONS,
  CHECKOUT_PROVIDER_OPTIONS,
  MELHOR_HORARIO_OPTIONS,
  PORTE_OPTIONS,
  SEGMENTO_OPTIONS,
  TEMPO_EMPRESA_OPTIONS,
  TIPO_EMPRESA_OPTIONS,
  areaResultText,
  type Area,
  type LeadPriority,
  type SymptomAnswer,
  isValidBrazilPhone,
} from '@/lib/bigcorps-leads';
import { readAnalyticsConsent, trackEvent } from '@/lib/analytics';
import { trackBigCorpsLead, trackBigCorpsQuizStarted } from '@/lib/meta-pixel-bigcorps';

const STORAGE_KEY = 'bigcorps:ajuda:diagnostico:v1';
const ORANGE = '#FD9219';
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_BIGCORPS_WHATSAPP_NUMBER?.replace(/\D/g, '') || '';


type Attribution = {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  fbclid: string;
  fbc: string;
  fbp: string;
};

type FormState = {
  tipoEmpresa: string;
  segmento: string;
  porte: string;
  tempoEmpresa: string;
  areas: Area[];
  sintomas: Partial<Record<Area, SymptomAnswer>>;
  gestao: string[];
  infraestrutura: string[];
  checkoutProvider: string;
  faturamento: string;
  nome: string;
  empresa: string;
  whatsapp: string;
  email: string;
  cidade: string;
  uf: string;
  melhorHorario: string;
  consentimento: boolean;
  website: string;
  attribution: Attribution;
};

type ResultState = {
  id: string;
  prioridade: LeadPriority;
  areasPrioritarias: Area[];
};

type ScreenKey =
  | 'tipo'
  | 'segmento'
  | 'porte'
  | 'tempo'
  | 'areas'
  | `sintoma:${Area}`
  | 'gestao'
  | 'infraestrutura'
  | 'checkout'
  | 'faturamento'
  | 'contato'
  | 'resultado';

const EMPTY_ATTRIBUTION: Attribution = {
  utm_source: '',
  utm_medium: '',
  utm_campaign: '',
  utm_content: '',
  fbclid: '',
  fbc: '',
  fbp: '',
};

const INITIAL_FORM: FormState = {
  tipoEmpresa: '',
  segmento: '',
  porte: '',
  tempoEmpresa: '',
  areas: [],
  sintomas: {},
  gestao: [],
  infraestrutura: [],
  checkoutProvider: '',
  faturamento: '',
  nome: '',
  empresa: '',
  whatsapp: '',
  email: '',
  cidade: '',
  uf: '',
  melhorHorario: '',
  consentimento: false,
  website: '',
  attribution: EMPTY_ATTRIBUTION,
};

function cookieValue(name: string) {
  if (typeof document === 'undefined') return '';
  try {
    const found = document.cookie.split('; ').find((item) => item.startsWith(`${name}=`));
    return found ? decodeURIComponent(found.slice(name.length + 1)) : '';
  } catch {
    return '';
  }
}

function analyticsGranted() {
  try {
    return readAnalyticsConsent() === 'granted';
  } catch {
    return false;
  }
}

function captureAttribution(previous: Attribution): Attribution {
  if (typeof window === 'undefined') return previous;
  const params = new URLSearchParams(window.location.search);
  const fbclid = params.get('fbclid') || previous.fbclid;
  const cookieFbc = cookieValue('_fbc');
  const cookieFbp = cookieValue('_fbp');
  return {
    utm_source: params.get('utm_source') || previous.utm_source,
    utm_medium: params.get('utm_medium') || previous.utm_medium,
    utm_campaign: params.get('utm_campaign') || previous.utm_campaign,
    utm_content: params.get('utm_content') || previous.utm_content,
    fbclid,
    fbc: cookieFbc || previous.fbc || (fbclid ? `fb.1.${Date.now()}.${fbclid}` : ''),
    fbp: cookieFbp || previous.fbp,
  };
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

function formatWhatsapp(value: string) {
  let digits = onlyDigits(value);
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) digits = digits.slice(2);
  digits = digits.slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  if (rest.length <= 8) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
}

function validWhatsapp(value: string) {
  return isValidBrazilPhone(value);
}

function validEmail(value: string) {
  if (!value.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function symptomLabel(answer: SymptomAnswer) {
  if (answer === 'sim') return 'Sim';
  if (answer === 'as_vezes') return 'Às vezes';
  return 'Não';
}

function priorityLabel(priority: LeadPriority) {
  if (priority === 'alta') return 'Alta prioridade';
  if (priority === 'media') return 'Média prioridade';
  return 'Oportunidade de evolução';
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return true;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  document.body.removeChild(textarea);
  return copied;
}

function selectionClass(selected: boolean) {
  return `group grid min-h-14 w-full grid-cols-[24px_1fr_24px] items-center gap-3 rounded-2xl border px-4 py-3 text-center text-[15px] font-semibold transition active:scale-[.99] ${
    selected
      ? 'border-[#FD9219] bg-[#FFF7ED] text-[#7A3E00] shadow-[0_0_0_1px_rgba(253,146,25,.08)]'
      : 'border-slate-200 bg-white text-slate-700 hover:border-[#FD9219]/50 hover:bg-[#FFFBF5]'
  }`;
}

function SelectChip({ selected, children, onClick }: { selected: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={selectionClass(selected)} aria-pressed={selected}>
      <span aria-hidden="true" className="h-6 w-6" />
      <span className="text-center">{children}</span>
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition ${
          selected ? 'border-[#FD9219] bg-[#FD9219] text-white' : 'border-slate-300 bg-white text-transparent'
        }`}
      >
        <Check className="h-4 w-4" strokeWidth={3} />
      </span>
    </button>
  );
}

function QuestionShell({
  title,
  subtitle,
  children,
  onBack,
  onNext,
  nextDisabled,
  nextLabel = 'Continuar',
  busy = false,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onBack: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
  busy?: boolean;
}) {
  return (
    <section className="mx-auto w-full max-w-xl text-center animate-[fadeIn_.22s_ease-out]">
      <button
        type="button"
        onClick={onBack}
        className="mx-auto mb-5 inline-flex min-h-11 items-center gap-2 rounded-full px-1 pr-3 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white">
          <ArrowLeft className="h-4 w-4" />
        </span>
        Voltar
      </button>
      <h1 className="text-center text-[27px] font-bold leading-[1.12] tracking-[-.02em] text-[#1F1F1F] sm:text-4xl">{title}</h1>
      {subtitle && <p className="mt-3 text-center text-[15px] leading-6 text-slate-500 sm:text-base">{subtitle}</p>}
      <div className="mt-6">{children}</div>
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled || busy}
        className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#FD9219] px-5 text-base font-bold text-white shadow-[0_12px_28px_rgba(253,146,25,.22)] transition hover:brightness-105 active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
        {busy ? 'Enviando...' : nextLabel}
        {!busy && <ArrowRight className="h-5 w-5" />}
      </button>
    </section>
  );
}

export default function AjudaQuiz() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [started, setStarted] = useState(false);
  const [screen, setScreen] = useState<ScreenKey>('tipo');
  const [hydrated, setHydrated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [result, setResult] = useState<ResultState | null>(null);
  const [copied, setCopied] = useState(false);

  const sequence = useMemo<ScreenKey[]>(() => {
    return [
      'tipo',
      'segmento',
      'porte',
      'tempo',
      'areas',
      ...form.areas.map((area) => `sintoma:${area}` as ScreenKey),
      'gestao',
      'infraestrutura',
      ...(form.infraestrutura.includes('Checkout ou confirmação automática de pagamentos') ? ['checkout' as ScreenKey] : []),
      'faturamento',
      'contato',
      'resultado',
    ];
  }, [form.areas, form.infraestrutura]);

  const currentIndex = Math.max(0, sequence.indexOf(screen));
  const questionCount = Math.max(1, sequence.length - 1);
  const progress = screen === 'resultado' ? 100 : Math.round(((currentIndex + 1) / questionCount) * 100);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { form?: Partial<FormState>; started?: boolean; screen?: ScreenKey };
        const savedForm = saved.form || {};
        const merged: FormState = {
          ...INITIAL_FORM,
          ...savedForm,
          areas: Array.isArray(savedForm.areas)
            ? savedForm.areas.filter((area): area is Area => (AREA_OPTIONS as readonly string[]).includes(String(area))).slice(0, 3)
            : [],
          sintomas: savedForm.sintomas || {},
          gestao: Array.isArray(savedForm.gestao) ? savedForm.gestao.slice(0, 4) : [],
          infraestrutura: Array.isArray(savedForm.infraestrutura) ? savedForm.infraestrutura.slice(0, 5) : [],
          checkoutProvider: typeof savedForm.checkoutProvider === 'string' ? savedForm.checkoutProvider : '',
          attribution: { ...EMPTY_ATTRIBUTION, ...(savedForm.attribution || {}) },
        };
        merged.attribution = captureAttribution(merged.attribution);
        setForm(merged);
        if (saved.started) setStarted(true);
        if (saved.screen && saved.screen !== 'resultado') {
          const staticScreens: ScreenKey[] = ['tipo', 'segmento', 'porte', 'tempo', 'areas', 'gestao', 'infraestrutura', 'faturamento', 'contato'];
          const symptomArea = saved.screen.startsWith('sintoma:')
            ? saved.screen.slice('sintoma:'.length) as Area
            : null;
          const checkoutAllowed = saved.screen === 'checkout' && merged.infraestrutura.includes('Checkout ou confirmação automática de pagamentos');
          if (staticScreens.includes(saved.screen) || checkoutAllowed || (symptomArea && merged.areas.includes(symptomArea))) {
            setScreen(saved.screen);
          }
        }
      } else {
        setForm((current) => ({ ...current, attribution: captureAttribution(current.attribution) }));
      }
    } catch {
      setForm((current) => ({ ...current, attribution: captureAttribution(current.attribution) }));
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated || result) return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ form, started, screen }));
    } catch {
      // Safari/Instagram podem restringir storage; o fluxo continua em memória.
    }
  }, [form, hydrated, result, screen, started]);

  useEffect(() => {
    if (!started || screen === 'resultado') return;
    const index = sequence.indexOf(screen);
    if (index < 0) return;
    trackEvent('quiz_step', {
      product: 'bigcorps_ajuda',
      step: index + 1,
    });
  }, [screen, sequence, started]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const start = () => {
    setStarted(true);
    setScreen('tipo');
    trackEvent('quiz_start', { product: 'bigcorps_ajuda' });
    trackBigCorpsQuizStarted();
  };

  const next = () => {
    const index = sequence.indexOf(screen);
    if (index >= 0 && index < sequence.length - 1) setScreen(sequence[index + 1]);
  };

  const back = () => {
    const index = sequence.indexOf(screen);
    if (index <= 0) {
      setStarted(false);
      return;
    }
    setScreen(sequence[index - 1]);
  };

  const toggleArea = (area: Area) => {
    setForm((current) => {
      const exists = current.areas.includes(area);
      if (exists) {
        const sintomas = { ...current.sintomas };
        delete sintomas[area];
        return { ...current, areas: current.areas.filter((item) => item !== area), sintomas };
      }
      if (current.areas.length >= 3) return current;
      return { ...current, areas: [...current.areas, area] };
    });
  };

  const toggleGestao = (value: string) => {
    setForm((current) => {
      if (value === 'Nenhum') {
        return { ...current, gestao: current.gestao.includes('Nenhum') ? [] : ['Nenhum'] };
      }
      const withoutNone = current.gestao.filter((item) => item !== 'Nenhum');
      return {
        ...current,
        gestao: withoutNone.includes(value)
          ? withoutNone.filter((item) => item !== value)
          : [...withoutNone, value],
      };
    });
  };


  const toggleInfraestrutura = (value: string) => {
    setForm((current) => {
      if (value === 'Nenhum destes') {
        return {
          ...current,
          infraestrutura: current.infraestrutura.includes('Nenhum destes') ? [] : ['Nenhum destes'],
          checkoutProvider: '',
        };
      }

      const withoutNone = current.infraestrutura.filter((item) => item !== 'Nenhum destes');
      const nextInfra = withoutNone.includes(value)
        ? withoutNone.filter((item) => item !== value)
        : [...withoutNone, value];
      const checkoutSelected = nextInfra.includes('Checkout ou confirmação automática de pagamentos');
      return {
        ...current,
        infraestrutura: nextInfra,
        checkoutProvider: checkoutSelected ? current.checkoutProvider : '',
      };
    });
  };

  const submit = async () => {
    setSubmitError('');
    if (!form.nome.trim() || !form.empresa.trim()) {
      setSubmitError('Preencha seu nome e o nome da empresa.');
      return;
    }
    if (!validWhatsapp(form.whatsapp)) {
      setSubmitError('Informe um WhatsApp válido com DDD.');
      return;
    }
    if (!validEmail(form.email)) {
      setSubmitError('Confira o e-mail informado ou deixe o campo em branco.');
      return;
    }
    if (!form.cidade.trim() || !form.uf || !form.melhorHorario) {
      setSubmitError('Informe cidade, UF e o melhor horário para contato.');
      return;
    }
    if (!form.consentimento) {
      setSubmitError('É necessário concordar com o contato e com a Política de Privacidade.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/ajuda/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome.trim(),
          empresa: form.empresa.trim(),
          whatsapp: onlyDigits(form.whatsapp),
          email: form.email.trim() || null,
          cidade: form.cidade.trim(),
          uf: form.uf,
          melhor_horario: form.melhorHorario,
          tipo_empresa: form.tipoEmpresa,
          segmento: form.segmento,
          porte: form.porte,
          tempo_empresa: form.tempoEmpresa,
          faturamento_faixa: form.faturamento,
          areas: form.areas,
          respostas: {
            sintomas: form.sintomas,
            gestao: form.gestao,
            infraestrutura: form.infraestrutura,
            checkout_provider: form.checkoutProvider || null,
          },
          ...form.attribution,
          website: form.website,
          page_url: window.location.href,
          analytics_consent: analyticsGranted(),
          consentimento: form.consentimento,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok || !payload?.lead?.id) {
        throw new Error(payload?.error || 'Não foi possível salvar sua análise. Tente novamente.');
      }

      const lead: ResultState = {
        id: String(payload.lead.id),
        prioridade: payload.lead.prioridade as LeadPriority,
        areasPrioritarias: (payload.lead.areas_prioritarias || []) as Area[],
      };
      setResult(lead);
      setScreen('resultado');
      trackEvent('generate_lead', {
        product: 'bigcorps_ajuda',
        priority: lead.prioridade,
      });
      trackBigCorpsLead(lead.id);
      try {
        window.sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // Sem impacto na conversão.
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Não foi possível concluir agora. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const share = async () => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/` : 'https://ajuda.bigcorps.com.br/';
    const data = {
      title: 'Análise gratuita do seu negócio — BigCorps',
      text: 'A BigCorps faz um diagnóstico rápido e gratuito para mostrar onde tecnologia e IA podem ajudar uma empresa.',
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(data);
        return;
      }
      if (await copyText(url)) {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2200);
      }
    } catch {
      try {
        if (await copyText(url)) {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2200);
        }
      } catch {
        // O navegador recusou tanto Web Share quanto a cópia local.
      }
    }
  };

  const whatsappHref = result && WHATSAPP_NUMBER
    ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
        `Olá! Acabei de fazer a análise gratuita da BigCorps. Meu código é ${result.id.slice(0, 8).toUpperCase()}.`,
      )}`
    : '';


  return (
    <main className="flex min-h-[100dvh] flex-col bg-white text-[#1F1F1F]">
      <style>{`@keyframes fadeIn{from{opacity:.25;transform:translateY(5px)}to{opacity:1;transform:none}}`}</style>
      <header className={`mx-auto flex w-full max-w-3xl items-center px-4 pb-2 pt-5 sm:px-6 sm:pt-7 ${
        started && screen !== 'resultado' ? 'justify-between' : 'justify-center'
      }`}>
        <Image
          src="/brands/bigcorps/logo-wordmark.png"
          alt="BigCorps"
          width={220}
          height={52}
          priority
          className="h-9 w-auto max-w-[190px] object-contain sm:h-10 sm:max-w-[220px]"
        />
        {started && screen !== 'resultado' && (
          <span className="rounded-full bg-[#FFF7ED] px-3 py-1.5 text-xs font-semibold text-[#A45100]">~2 min</span>
        )}
      </header>

      {started && screen !== 'resultado' && (
        <div className="mx-auto w-full max-w-3xl px-4 pt-2 sm:px-6">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[.12em] text-slate-400">
            <span>Seu diagnóstico</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-[#FD9219] transition-[width] duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-3xl flex-1 px-4 pb-12 pt-7 sm:px-6 sm:pt-10">
        {!started ? (
          <section className="mx-auto w-full max-w-2xl py-4 text-center sm:py-8">
            <div className="mx-auto inline-flex min-h-11 items-center gap-2 rounded-full border border-orange-100 bg-[#FFF7ED] px-4 text-sm font-semibold text-[#A45100]">
              <Sparkles className="h-4 w-4 text-[#FD9219]" /> Diagnóstico gratuito BigCorps
            </div>
            <h1 className="mx-auto mt-6 max-w-xl text-[38px] font-bold leading-[1.02] tracking-[-.03em] text-[#1F1F1F] sm:text-6xl">
              Análise gratuita do seu negócio
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-[17px] leading-7 text-slate-600 sm:text-lg">
              Responda algumas perguntas rápidas e descubra onde a tecnologia e a IA podem ajudar você a vender mais,
              gerar novas receitas e reduzir despesas.
            </p>

            <button
              type="button"
              onClick={start}
              className="mx-auto mt-7 inline-flex min-h-14 w-full max-w-md items-center justify-center gap-2 rounded-2xl bg-[#FD9219] px-6 text-lg font-bold text-white shadow-[0_16px_35px_rgba(253,146,25,.25)] transition hover:brightness-105 active:scale-[.99]"
            >
              Começar análise <ArrowRight className="h-5 w-5" />
            </button>
            <div className="mx-auto mt-5 flex max-w-md items-center justify-center gap-2 text-sm font-semibold text-slate-500">
              <Clock3 className="h-4 w-4 text-[#FD9219]" /> Sem cadastro e sem login
            </div>

            <aside className="mx-auto mt-9 max-w-xl rounded-3xl border border-slate-200 bg-slate-50/70 p-5 text-center">
              <p className="text-2xl font-bold tracking-tight text-[#1F1F1F]">25,4 milhões</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                de empresas estão ativas no Brasil. Em julho de 2026, 485 mil novas empresas foram abertas.
              </p>
              <a
                href="https://www.gov.br/empresas-e-negocios/pt-br/mapa-de-empresas"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-xs font-semibold text-[#A45100] underline underline-offset-2"
              >
                Fonte: Mapa de Empresas — Governo Federal
              </a>
            </aside>
          </section>
        ) : screen === 'tipo' ? (
          <QuestionShell title="Como sua empresa funciona hoje?" subtitle="Escolha a opção que mais se aproxima da sua operação." onBack={back} onNext={next} nextDisabled={!form.tipoEmpresa}>
            <div className="grid gap-3">
              {TIPO_EMPRESA_OPTIONS.map((option) => <SelectChip key={option} selected={form.tipoEmpresa === option} onClick={() => update('tipoEmpresa', option)}>{option}</SelectChip>)}
            </div>
          </QuestionShell>
        ) : screen === 'segmento' ? (
          <QuestionShell title="Qual é o segmento principal?" onBack={back} onNext={next} nextDisabled={!form.segmento}>
            <div className="grid gap-3 sm:grid-cols-2">
              {SEGMENTO_OPTIONS.map((option) => <SelectChip key={option} selected={form.segmento === option} onClick={() => update('segmento', option)}>{option}</SelectChip>)}
            </div>
          </QuestionShell>
        ) : screen === 'porte' ? (
          <QuestionShell title="Qual é o porte aproximado da empresa?" subtitle="Isso nos ajuda a indicar soluções compatíveis com a sua realidade." onBack={back} onNext={next} nextDisabled={!form.porte}>
            <div className="grid gap-3">
              {PORTE_OPTIONS.map((option) => <SelectChip key={option} selected={form.porte === option} onClick={() => update('porte', option)}>{option}</SelectChip>)}
            </div>
          </QuestionShell>
        ) : screen === 'tempo' ? (
          <QuestionShell title="Há quanto tempo a empresa existe?" onBack={back} onNext={next} nextDisabled={!form.tempoEmpresa}>
            <div className="grid gap-3 sm:grid-cols-2">
              {TEMPO_EMPRESA_OPTIONS.map((option) => <SelectChip key={option} selected={form.tempoEmpresa === option} onClick={() => update('tempoEmpresa', option)}>{option}</SelectChip>)}
            </div>
          </QuestionShell>
        ) : screen === 'areas' ? (
          <QuestionShell title="Onde você sente que mais perde tempo ou dinheiro?" subtitle="Escolha até 3 áreas. Vamos aprofundar só no que importa para você." onBack={back} onNext={next} nextDisabled={form.areas.length === 0}>
            <div className="mb-3 text-center text-xs font-semibold text-slate-400">Selecione de 1 a 3 · {form.areas.length}/3</div>
            <div className="grid gap-3 sm:grid-cols-2">
              {AREA_OPTIONS.map((area) => <SelectChip key={area} selected={form.areas.includes(area)} onClick={() => toggleArea(area)}>{area}</SelectChip>)}
            </div>
          </QuestionShell>
        ) : screen.startsWith('sintoma:') ? (() => {
          const area = screen.slice('sintoma:'.length) as Area;
          const answer = form.sintomas[area];
          return (
            <QuestionShell title={AREA_QUESTIONS[area]} subtitle={`Sobre ${area.toLowerCase()}.`} onBack={back} onNext={next} nextDisabled={!answer}>
              <div className="grid gap-3">
                {(['sim', 'as_vezes', 'nao'] as SymptomAnswer[]).map((value) => (
                  <SelectChip
                    key={value}
                    selected={answer === value}
                    onClick={() => setForm((current) => ({ ...current, sintomas: { ...current.sintomas, [area]: value } }))}
                  >
                    {symptomLabel(value)}
                  </SelectChip>
                ))}
              </div>
            </QuestionShell>
          );
        })() : screen === 'gestao' ? (
          <QuestionShell title="O que você usa hoje para gerir a empresa?" subtitle="Você pode marcar mais de uma opção." onBack={back} onNext={next} nextDisabled={form.gestao.length === 0}>
            <div className="grid gap-3">
              {GESTAO_OPTIONS.map((option) => <SelectChip key={option} selected={form.gestao.includes(option)} onClick={() => toggleGestao(option)}>{option}</SelectChip>)}
            </div>
          </QuestionShell>
        ) : screen === 'infraestrutura' ? (
          <QuestionShell
            title="Quais destas estruturas sua empresa já possui?"
            subtitle="Isso nos ajuda a identificar oportunidades específicas para o seu negócio. Você pode marcar mais de uma."
            onBack={back}
            onNext={next}
            nextDisabled={form.infraestrutura.length === 0}
          >
            <div className="grid gap-3">
              {INFRAESTRUTURA_OPTIONS.map((option) => (
                <SelectChip key={option} selected={form.infraestrutura.includes(option)} onClick={() => toggleInfraestrutura(option)}>
                  {option}
                </SelectChip>
              ))}
            </div>
          </QuestionShell>
        ) : screen === 'checkout' ? (
          <QuestionShell
            title="Qual solução de checkout ou pagamento você usa principalmente?"
            subtitle="A marca nos ajuda a comparar custos, confirmação de pagamentos e possibilidades de automação."
            onBack={back}
            onNext={next}
            nextDisabled={!form.checkoutProvider}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {CHECKOUT_PROVIDER_OPTIONS.map((option) => (
                <SelectChip key={option} selected={form.checkoutProvider === option} onClick={() => update('checkoutProvider', option)}>
                  {option}
                </SelectChip>
              ))}
            </div>
          </QuestionShell>
        ) : screen === 'faturamento' ? (
          <QuestionShell title="Qual é o faturamento mensal aproximado?" subtitle="A faixa ajuda a priorizar soluções proporcionais ao tamanho do negócio." onBack={back} onNext={next} nextDisabled={!form.faturamento}>
            <div className="grid gap-3">
              {FATURAMENTO_OPTIONS.map((option) => <SelectChip key={option} selected={form.faturamento === option} onClick={() => update('faturamento', option)}>{option}</SelectChip>)}
            </div>
          </QuestionShell>
        ) : screen === 'contato' ? (
          <QuestionShell title="Pronto. Para onde enviamos a análise?" subtitle="A BigCorps vai revisar suas respostas e falar com você pessoalmente." onBack={back} onNext={() => void submit()} nextDisabled={submitting} nextLabel="Ver meu diagnóstico" busy={submitting}>
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Seu nome *"><input value={form.nome} onChange={(e) => update('nome', e.target.value.slice(0, 100))} autoComplete="name" className="field" placeholder="Como podemos chamar você?" /></Field>
                <Field label="Nome da empresa *"><input value={form.empresa} onChange={(e) => update('empresa', e.target.value.slice(0, 140))} autoComplete="organization" className="field" placeholder="Nome do negócio" /></Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="WhatsApp com DDD *"><input inputMode="tel" value={form.whatsapp} onChange={(e) => update('whatsapp', formatWhatsapp(e.target.value))} autoComplete="tel" className="field" placeholder="(11) 99999-9999" /></Field>
                <Field label="E-mail (opcional)"><input inputMode="email" value={form.email} onChange={(e) => update('email', e.target.value.slice(0, 160))} autoComplete="email" className="field" placeholder="voce@empresa.com.br" /></Field>
              </div>
              <div className="grid grid-cols-[1fr_92px] gap-3">
                <Field label="Cidade *"><input value={form.cidade} onChange={(e) => update('cidade', e.target.value.slice(0, 100))} autoComplete="address-level2" className="field" placeholder="Sua cidade" /></Field>
                <Field label="UF *"><select value={form.uf} onChange={(e) => update('uf', e.target.value)} className="field"><option value="">UF</option>{BR_UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}</select></Field>
              </div>
              <Field label="Melhor horário para contato *">
                <select value={form.melhorHorario} onChange={(e) => update('melhorHorario', e.target.value)} className="field">
                  <option value="">Selecione</option>
                  {MELHOR_HORARIO_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </Field>

              <div className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
                <label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => update('website', e.target.value)} /></label>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center text-sm leading-6 text-slate-600">
                <input type="checkbox" checked={form.consentimento} onChange={(e) => update('consentimento', e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[#FD9219]" />
                <span>
                  Concordo em receber o contato da BigCorps sobre esta análise e com a{' '}
                  <Link href="/ajuda/privacidade" target="_blank" className="font-bold text-[#A45100] underline underline-offset-2">Política de Privacidade</Link>.
                </span>
              </label>
              {submitError && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{submitError}</p>}
            </div>
            <style>{`.field{min-height:48px;width:100%;border-radius:14px;border:1px solid rgb(226 232 240);background:white;padding:0 14px;font-size:15px;color:#1f1f1f;outline:none;transition:.18s}.field:focus{border-color:${ORANGE};box-shadow:0 0 0 3px rgba(253,146,25,.12)}.field::placeholder{color:rgb(148 163 184)}`}</style>
          </QuestionShell>
        ) : result ? (
          <section className="mx-auto w-full max-w-2xl pb-8 pt-2 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FFF0D9] text-[#FD9219]"><CheckCircle2 className="h-9 w-9" /></div>
            <p className="mt-5 text-xs font-bold uppercase tracking-[.18em] text-[#C76600]">Seu diagnóstico</p>
            <h1 className="mt-2 text-4xl font-bold tracking-[-.025em] sm:text-5xl">Encontramos 3 frentes para priorizar</h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-600">
              Este é um primeiro mapa. Um especialista da BigCorps vai te chamar no WhatsApp em até 1 dia útil para revisar as oportunidades com você.
            </p>
            <span className="mt-5 inline-flex rounded-full bg-[#FFF7ED] px-4 py-2 text-sm font-bold text-[#A45100]">{priorityLabel(result.prioridade)}</span>

            <div className="mt-7 grid gap-3 text-center">
              {result.areasPrioritarias.map((area, index) => (
                <article key={area} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start gap-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FD9219] text-sm font-bold text-white">{index + 1}</span>
                    <div className="flex-1"><h2 className="text-lg font-bold">{area}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{areaResultText(area, form.sintomas[area])}</p></div>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {whatsappHref ? (
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#FD9219] px-5 text-base font-bold text-white shadow-[0_12px_28px_rgba(253,146,25,.22)] transition hover:brightness-105">
                  <MessageCircle className="h-5 w-5" /> Falar agora no WhatsApp
                </a>
              ) : (
                <div className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-slate-100 px-5 text-sm font-bold text-slate-500">WhatsApp será enviado pelo especialista</div>
              )}
              <button type="button" onClick={() => void share()} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 text-base font-bold text-slate-700 transition hover:bg-slate-50">
                {copied ? <Copy className="h-5 w-5 text-emerald-600" /> : <Share2 className="h-5 w-5" />}
                {copied ? 'Link copiado' : 'Compartilhar com um amigo que tem empresa'}
              </button>
            </div>
            <p className="mt-5 text-xs font-semibold text-slate-400">Código da análise: {result.id.slice(0, 8).toUpperCase()}</p>
          </section>
        ) : null}
      </div>

      <footer className="mt-auto border-t border-slate-100 px-4 py-5 text-center text-xs text-slate-400">
        BigCorps · <Link href="/ajuda/privacidade" className="font-semibold hover:text-slate-600">Privacidade</Link>
      </footer>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-center text-sm font-semibold text-slate-700">{label}</span>{children}</label>;
}
