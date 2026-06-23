'use client';

// app/lead/page.tsx
//
// Passo 0 do funil /lead: wizard de 4 etapas (ramo → nome do negócio
// → produto/serviço → preço). Ao final, POST /api/demo/create e
// redireciona para /lead/[token] (Passo 1).
//
// Captura UTM (utm_source, utm_medium, utm_campaign) e fallback
// próprio (?origem=) da URL de entrada, na montagem do componente —
// decisão confirmada: precisa ser capturado aqui, na primeira chance,
// porque pode se perder depois (navegação, reload).
//
// Labels dos segmentos espelham EXATAMENTE assistant_segments.label
// (verificado no banco): "Restaurante / Food", "Clínica / Saúde",
// "Loja / Varejo", "Serviços / Escritório", "Academia / Bem-estar",
// "Escola / Educação", "Outro". Ícones lucide-react (sem emoji,
// decisão confirmada).

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  UtensilsCrossed,
  Stethoscope,
  ShoppingBag,
  Wrench,
  Dumbbell,
  GraduationCap,
  Building2,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from 'lucide-react';

const SEGMENTOS = [
  { key: 'restaurante', label: 'Restaurante / Food', Icon: UtensilsCrossed },
  { key: 'clinica', label: 'Clínica / Saúde', Icon: Stethoscope },
  { key: 'loja', label: 'Loja / Varejo', Icon: ShoppingBag },
  { key: 'servicos', label: 'Serviços / Escritório', Icon: Wrench },
  { key: 'academia', label: 'Academia / Bem-estar', Icon: Dumbbell },
  { key: 'educacao', label: 'Escola / Educação', Icon: GraduationCap },
  { key: 'outro', label: 'Outro', Icon: Building2 },
] as const;

type SegmentoKey = (typeof SEGMENTOS)[number]['key'];

interface FormState {
  ramo: SegmentoKey | null;
  nomeNegocio: string;
  produto: string;
  preco: string; // string no form, convertido ao enviar
}

interface OrigemTracking {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  origemSimples: string | null;
}

const TOTAL_STEPS = 4;

export default function LeadCapturePage() {
  return (
    <Suspense fallback={<LeadCapturePageFallback />}>
      <LeadCapturePageInner />
    </Suspense>
  );
}

function LeadCapturePageFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
  );
}

function LeadCapturePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState(0); // 0..3
  const [form, setForm] = useState<FormState>({
    ramo: null,
    nomeNegocio: '',
    produto: '',
    preco: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Captura UTM/origem na montagem — antes que se perca.
  const origemRef = useRef<OrigemTracking>({
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    origemSimples: null,
  });

  useEffect(() => {
    origemRef.current = {
      utmSource: searchParams.get('utm_source'),
      utmMedium: searchParams.get('utm_medium'),
      utmCampaign: searchParams.get('utm_campaign'),
      origemSimples: searchParams.get('origem'),
    };
  }, [searchParams]);

  const podeAvancar = (): boolean => {
    switch (step) {
      case 0:
        return form.ramo !== null;
      case 1:
        return form.nomeNegocio.trim().length >= 2;
      case 2:
        return form.produto.trim().length >= 2;
      case 3: {
        const precoNum = Number(form.preco.replace(',', '.'));
        return Number.isFinite(precoNum) && precoNum >= 0 && form.preco.trim() !== '';
      }
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!podeAvancar()) return;
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!podeAvancar() || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const precoNum = Number(form.preco.replace(',', '.'));
      const response = await fetch('/api/demo/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ramo: form.ramo,
          nomeNegocio: form.nomeNegocio.trim(),
          produto: form.produto.trim(),
          preco: precoNum,
          ...origemRef.current,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Erro ao criar demonstração.');
      }

      const data = await response.json();
      router.push(`/lead/${data.token}`);
    } catch (err: any) {
      console.error('[LeadCapturePage] Erro ao criar demo:', err);
      setError(err.message || 'Algo deu errado. Pode tentar de novo?');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Barra de progresso */}
        <div className="flex gap-2 mb-8">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                i <= step ? 'bg-blue-500' : 'bg-white/10'
              }`}
            />
          ))}
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
          {step === 0 && (
            <StepRamo
              value={form.ramo}
              onChange={ramo => setForm(prev => ({ ...prev, ramo }))}
            />
          )}
          {step === 1 && (
            <StepTexto
              titulo="Qual o nome do seu negócio?"
              subtitulo="Vamos usar para o assistente se apresentar."
              placeholder="Ex: Pizzaria do João"
              value={form.nomeNegocio}
              onChange={v => setForm(prev => ({ ...prev, nomeNegocio: v }))}
              onEnter={handleNext}
            />
          )}
          {step === 2 && (
            <StepTexto
              titulo="Qual produto ou serviço você quer testar?"
              subtitulo="Escolha um item principal para a demonstração."
              placeholder="Ex: Pizza Margherita ou Corte de cabelo"
              value={form.produto}
              onChange={v => setForm(prev => ({ ...prev, produto: v }))}
              onEnter={handleNext}
            />
          )}
          {step === 3 && (
            <StepPreco
              value={form.preco}
              onChange={v => setForm(prev => ({ ...prev, preco: v }))}
              onEnter={handleNext}
            />
          )}

          {error && (
            <p className="mt-4 text-sm text-red-300 bg-red-500/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Navegação */}
          <div className="flex items-center justify-between mt-8">
            <button
              onClick={handleBack}
              disabled={step === 0 || isSubmitting}
              className="flex items-center gap-1 text-sm text-white/50 hover:text-white disabled:opacity-0 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>

            <button
              onClick={handleNext}
              disabled={!podeAvancar() || isSubmitting}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Criando...
                </>
              ) : step === TOTAL_STEPS - 1 ? (
                'Começar demonstração'
              ) : (
                <>
                  Próximo
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-componentes de cada etapa ──────────────────────────────────

function StepRamo({
  value,
  onChange,
}: {
  value: SegmentoKey | null;
  onChange: (v: SegmentoKey) => void;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-1">Qual o ramo do seu negócio?</h2>
      <p className="text-sm text-white/50 mb-6">
        Isso ajuda a personalizar a demonstração para você.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {SEGMENTOS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all text-center ${
              value === key
                ? 'border-blue-400 bg-blue-500/10 text-white'
                : 'border-white/10 hover:border-white/30 text-white/70 hover:text-white'
            }`}
          >
            <Icon className="w-6 h-6" />
            <span className="text-xs font-medium leading-tight">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepTexto({
  titulo,
  subtitulo,
  placeholder,
  value,
  onChange,
  onEnter,
}: {
  titulo: string;
  subtitulo: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onEnter: () => void;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-1">{titulo}</h2>
      <p className="text-sm text-white/50 mb-6">{subtitulo}</p>
      <input
        type="text"
        autoFocus
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') onEnter();
        }}
        placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
      />
    </div>
  );
}

function StepPreco({
  value,
  onChange,
  onEnter,
}: {
  value: string;
  onChange: (v: string) => void;
  onEnter: () => void;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-1">Qual o preço?</h2>
      <p className="text-sm text-white/50 mb-6">
        Valor do produto/serviço que você informou na etapa anterior.
      </p>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 text-sm">
          R$
        </span>
        <input
          type="text"
          inputMode="decimal"
          autoFocus
          value={value}
          onChange={e => {
            // Aceita apenas dígitos e um separador decimal (, ou .)
            const cleaned = e.target.value.replace(/[^0-9.,]/g, '');
            onChange(cleaned);
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') onEnter();
          }}
          placeholder="0,00"
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
        />
      </div>
    </div>
  );
}