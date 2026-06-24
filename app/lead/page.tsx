'use client';

// app/lead/page.tsx
//
// Passo 0 do funil /lead: wizard de 3 etapas (ramo → nome do negócio
// → produto/serviço + preço juntos). Ao final, POST /api/demo/create
// e redireciona para /lead/[token] (Passo 1).
//
// ATUALIZAÇÃO: reduzido de 4 para 3 etapas — produto e preço agora
// na mesma tela (StepProdutoPreco), empilhados (produto acima, preço
// abaixo), por decisão de simplificar o fluxo.
//
// ATUALIZAÇÃO: tema dinâmico via next-themes (mesmo padrão de
// LeadDemoHeader), com botão de troca de tema na linha de navegação,
// à esquerda do "Voltar"/"Próximo".
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
import { useTheme } from 'next-themes';
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
  Sun,
  Moon,
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

const TOTAL_STEPS = 3;

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
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? (resolvedTheme as 'dark' | 'light' ?? 'dark') !== 'light' : true;

  const handleToggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  const [step, setStep] = useState(0); // 0..2
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
      case 2: {
        const precoNum = Number(form.preco.replace(',', '.'));
        const precoValido = Number.isFinite(precoNum) && precoNum >= 0 && form.preco.trim() !== '';
        return form.produto.trim().length >= 2 && precoValido;
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
    <div className={`min-h-screen flex items-center justify-center px-4 py-8 transition-colors duration-300 ${
      isDark
        ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'
        : 'bg-gradient-to-br from-slate-100 via-gray-100 to-slate-200'
    }`}>
      <div className="w-full max-w-lg">
        {/* Barra de progresso */}
        <div className="flex gap-2 mb-8">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                i <= step ? 'bg-blue-500' : isDark ? 'bg-white/10' : 'bg-black/10'
              }`}
            />
          ))}
        </div>

        <div className={`rounded-3xl border backdrop-blur-xl p-6 sm:p-8 shadow-2xl transition-colors duration-300 ${
          isDark ? 'border-white/10 bg-slate-900/50' : 'border-black/10 bg-white/70'
        }`}>
          {step === 0 && (
            <StepRamo
              isDark={isDark}
              value={form.ramo}
              onChange={ramo => setForm(prev => ({ ...prev, ramo }))}
            />
          )}
          {step === 1 && (
            <StepTexto
              isDark={isDark}
              titulo="Qual o nome do seu negócio?"
              subtitulo="Vamos usar para o assistente se apresentar."
              placeholder="Ex: Pizzaria do João ou Clínica Saúde"
              value={form.nomeNegocio}
              onChange={v => setForm(prev => ({ ...prev, nomeNegocio: v }))}
              onEnter={handleNext}
            />
          )}
          {step === 2 && (
            <StepProdutoPreco
              isDark={isDark}
              produto={form.produto}
              preco={form.preco}
              onChangeProduto={v => setForm(prev => ({ ...prev, produto: v }))}
              onChangePreco={v => setForm(prev => ({ ...prev, preco: v }))}
              onEnter={handleNext}
            />
          )}

          {error && (
            <p className={`mt-4 text-sm rounded-lg px-3 py-2 ${
              isDark ? 'text-red-300 bg-red-500/10' : 'text-red-700 bg-red-50'
            }`}>
              {error}
            </p>
          )}

          {/* Navegação */}
          <div className="flex items-center justify-between mt-8">
            <div className="flex items-center gap-3">
              <button
                onClick={handleToggleTheme}
                aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
                className={`p-2 rounded-lg transition-colors ${
                  isDark ? 'bg-white/5 hover:bg-white/10 text-white/70' : 'bg-black/5 hover:bg-black/10 text-gray-600'
                }`}
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              <button
                onClick={handleBack}
                disabled={step === 0 || isSubmitting}
                className={`flex items-center gap-1 text-sm transition-colors disabled:opacity-0 ${
                  isDark ? 'text-white/50 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>
            </div>

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
  isDark,
  value,
  onChange,
}: {
  isDark: boolean;
  value: SegmentoKey | null;
  onChange: (v: SegmentoKey) => void;
}) {
  return (
    <div>
      <h2 className={`text-xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Qual o ramo do seu negócio?
      </h2>
      <p className={`text-sm mb-6 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
        Isso ajuda a personalizar a demonstração para você.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {SEGMENTOS.map(({ key, label, Icon }, index) => {
          const isLastOdd = index === SEGMENTOS.length - 1 && SEGMENTOS.length % 2 !== 0;
          const isSelected = value === key;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left
                ${isLastOdd ? 'col-span-2 justify-center' : 'flex-col justify-center text-center'}
                ${
                  isSelected
                    ? 'border-blue-400 bg-blue-500/10 ' + (isDark ? 'text-white' : 'text-gray-900')
                    : isDark
                    ? 'border-white/10 hover:border-white/30 text-white/70 hover:text-white'
                    : 'border-black/10 hover:border-black/30 text-gray-600 hover:text-gray-900'
                }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="text-xs font-medium leading-tight">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepTexto({
  isDark,
  titulo,
  subtitulo,
  placeholder,
  value,
  onChange,
  onEnter,
}: {
  isDark: boolean;
  titulo: string;
  subtitulo: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onEnter: () => void;
}) {
  return (
    <div>
      <h2 className={`text-xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{titulo}</h2>
      <p className={`text-sm mb-6 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>{subtitulo}</p>
      <input
        type="text"
        autoFocus
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') onEnter();
        }}
        placeholder={placeholder}
        className={`w-full rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400/50 border ${
          isDark
            ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30'
            : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 shadow-sm'
        }`}
      />
    </div>
  );
}

function StepProdutoPreco({
  isDark,
  produto,
  preco,
  onChangeProduto,
  onChangePreco,
  onEnter,
}: {
  isDark: boolean;
  produto: string;
  preco: string;
  onChangeProduto: (v: string) => void;
  onChangePreco: (v: string) => void;
  onEnter: () => void;
}) {
  return (
    <div>
      <h2 className={`text-xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Produto ou serviço e preço
      </h2>
      <p className={`text-sm mb-6 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
        Escolha um item principal e o valor para a demonstração.
      </p>

      <div className="flex flex-col gap-4">
        <div>
          <label className={`text-xs font-medium mb-1.5 block ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
            Produto ou serviço
          </label>
          <input
            type="text"
            autoFocus
            value={produto}
            onChange={e => onChangeProduto(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') onEnter();
            }}
            placeholder="Ex: Pizza Margherita ou Corte de cabelo"
            className={`w-full rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400/50 border ${
              isDark
                ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30'
                : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 shadow-sm'
            }`}
          />
        </div>

        <div>
          <label className={`text-xs font-medium mb-1.5 block ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
            Preço
          </label>
          <div className="relative">
            <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-sm ${
              isDark ? 'text-white/50' : 'text-gray-400'
            }`}>
              R$
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={preco}
              onChange={e => {
                // Aceita apenas dígitos e um separador decimal (, ou .)
                const cleaned = e.target.value.replace(/[^0-9.,]/g, '');
                onChangePreco(cleaned);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') onEnter();
              }}
              placeholder="0,00"
              className={`w-full rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400/50 border ${
                isDark
                  ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30'
                  : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 shadow-sm'
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}