'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bot, Check, Loader2, MessageCircle, Mic, RefreshCcw, ShieldCheck, Sparkles, WalletCards } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import PaymentModal from '@/components/PaymentModal';

type CreditPackage = {
  id: string;
  name: string;
  description?: string | null;
  credits: number;
  price_cents: number;
  is_highlighted?: boolean;
  display_order?: number;
};

type UsageRate = {
  usage_key: string;
  label: string;
  description: string;
  category: string;
  unit_label: string;
  credits_per_unit: number;
  provider?: string | null;
  pricing_status: 'active' | 'provisional' | 'disabled';
};

type UsageSummary = {
  usage_key: string;
  label: string;
  category: string;
  events: number;
  units: number;
  credits_consumed: number;
};

type RecentUsage = {
  id: string;
  usage_key: string;
  label: string;
  units: number;
  credits_consumed: number;
  source?: string | null;
  channel?: string | null;
  provider?: string | null;
  created_at: string;
};

type CreditState = {
  wallet: { available_credits: number; total_purchased: number; total_used: number };
  settings: { ai_enabled: boolean; voice_input_enabled: boolean };
  packages: CreditPackage[];
  rates: UsageRate[];
  usage_30d: UsageSummary[];
  recent_usage: RecentUsage[];
};

type PaymentData = {
  payment_id: string;
  pix_code: string;
  pix_qrcode?: string;
  amount: number;
  packageName: string;
};

function money(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(cents || 0) / 100);
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function Toggle({ enabled, disabled, onChange }: { enabled: boolean; disabled?: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={`relative h-7 w-12 rounded-full transition ${enabled ? 'bg-[#6D28D9]' : 'bg-slate-200'} disabled:opacity-50`}
      aria-pressed={enabled}
    >
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${enabled ? 'left-6' : 'left-1'}`} />
    </button>
  );
}

export default function FuncionarIACreditsPanel({ companyId }: { companyId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [state, setState] = useState<CreditState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('funcionaria_get_credit_state', { p_company_id: companyId });
    if (error) {
      console.error('[FuncionarIA credits] load:', error);
      setMessage('Não foi possível carregar os créditos agora.');
    } else {
      setState(data as CreditState);
    }
    setLoading(false);
  }, [companyId, supabase]);

  useEffect(() => { void load(); }, [load]);

  async function saveSettings(next: Partial<CreditState['settings']>) {
    if (!state) return;
    const merged = { ...state.settings, ...next };
    setSaving(true);
    setMessage(null);
    const { error } = await supabase.rpc('funcionaria_save_usage_settings', {
      p_company_id: companyId,
      p_ai_enabled: merged.ai_enabled,
      p_voice_input_enabled: merged.voice_input_enabled,
    });
    if (error) {
      setMessage('Não foi possível salvar essa configuração.');
    } else {
      setState({ ...state, settings: merged });
      setMessage('Configuração salva.');
    }
    setSaving(false);
  }

  async function buy(pkg: CreditPackage) {
    setBuying(pkg.id);
    setMessage(null);
    try {
      const response = await fetch('/api/funcionaria/credits/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId, package_id: pkg.id }),
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) throw new Error(data?.error || 'Erro ao criar cobrança');
      setPayment({
        payment_id: data.payment_id,
        pix_code: data.pix_code,
        pix_qrcode: data.pix_qrcode,
        amount: Number(data.amount || 0),
        packageName: `${pkg.name} — ${pkg.credits} créditos`,
      });
    } catch (error: any) {
      setMessage(error?.message || 'Não foi possível iniciar a compra.');
    } finally {
      setBuying(null);
    }
  }

  if (loading) {
    return <div className="rounded-3xl border border-violet-100 bg-white p-10 text-center text-sm font-bold text-slate-400"><Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />Carregando créditos…</div>;
  }
  if (!state) return null;

  const balance = Number(state.wallet?.available_credits || 0);
  const low = balance <= 20;
  const aiRate = state.rates.find(r => r.usage_key === 'ai_generation');
  const sttRate = state.rates.find(r => r.usage_key === 'stt_minute');
  const whatsappRate = state.rates.find(r => r.usage_key === 'whatsapp_message');

  return (
    <div className="space-y-6">
      {message && <div className="rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm font-bold text-violet-800">{message}</div>}

      <div className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.15em] text-[#6D28D9]"><WalletCards className="h-4 w-4" />Créditos de uso</div>
              <div className="mt-3 text-5xl font-black tracking-tight">{balance}</div>
              <p className="mt-2 text-sm font-semibold text-slate-500">Um único saldo para os custos variáveis da sua FuncionarIA.</p>
            </div>
            <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600"><RefreshCcw className="h-4 w-4" />Atualizar</button>
          </div>

          <div className={`mt-5 rounded-2xl border p-4 ${low ? 'border-amber-200 bg-amber-50' : 'border-lime-200 bg-lime-50'}`}>
            <div className="flex items-start gap-3">
              <ShieldCheck className={`mt-0.5 h-5 w-5 ${low ? 'text-amber-600' : 'text-lime-700'}`} />
              <div>
                <div className={`font-black ${low ? 'text-amber-900' : 'text-lime-900'}`}>{low ? 'Saldo baixo' : 'Saldo disponível'}</div>
                <p className={`mt-1 text-xs leading-5 ${low ? 'text-amber-700' : 'text-lime-800'}`}>FAQ, toque/texto local, navegação, funções sem provedor pago e reprodução de áudio já em cache continuam sem consumir créditos.</p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs font-black text-slate-400">COMPRADOS</div><div className="mt-2 text-2xl font-black">{state.wallet.total_purchased || 0}</div></div>
            <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs font-black text-slate-400">UTILIZADOS</div><div className="mt-2 text-2xl font-black">{state.wallet.total_used || 0}</div></div>
            <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs font-black text-slate-400">ÚLTIMOS 30 DIAS</div><div className="mt-2 text-2xl font-black">{state.usage_30d.reduce((sum, row) => sum + Number(row.credits_consumed || 0), 0)}</div></div>
          </div>
        </section>

        <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
          <div className="text-xs font-black uppercase tracking-[.15em] text-[#6D28D9]">Recursos opcionais</div>
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 p-4">
              <div className="flex min-w-0 items-start gap-3"><Sparkles className="mt-0.5 h-5 w-5 text-[#6D28D9]" /><div><div className="font-black">IA generativa</div><p className="mt-1 text-xs leading-5 text-slate-500">Só entra como última camada quando o motor sem IA não resolveu.</p>{aiRate && <div className="mt-1 text-[11px] font-black text-violet-700">{aiRate.credits_per_unit} créditos por {aiRate.unit_label}</div>}</div></div>
              <Toggle enabled={state.settings.ai_enabled} disabled={saving} onChange={(value) => void saveSettings({ ai_enabled: value })} />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 p-4">
              <div className="flex min-w-0 items-start gap-3"><Mic className="mt-0.5 h-5 w-5 text-[#6D28D9]" /><div><div className="font-black">Reconhecimento de voz</div><p className="mt-1 text-xs leading-5 text-slate-500">Permite falar com a FuncionarIA; o áudio é convertido para texto antes do motor determinístico.</p>{sttRate && <div className="mt-1 text-[11px] font-black text-violet-700">{sttRate.credits_per_unit} crédito por {sttRate.unit_label}</div>}</div></div>
              <Toggle enabled={state.settings.voice_input_enabled} disabled={saving} onChange={(value) => void saveSettings({ voice_input_enabled: value })} />
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><div className="text-xs font-black uppercase tracking-[.15em] text-[#6D28D9]">Adicionar créditos</div><h2 className="mt-2 text-xl font-black">Escolha um pacote</h2></div>
          <p className="text-xs font-semibold text-slate-400">Pagamento pelo mesmo motor PIX de créditos já usado pela minhAi.</p>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {state.packages.map(pkg => (
            <button key={pkg.id} onClick={() => void buy(pkg)} disabled={buying !== null} className={`relative rounded-2xl border p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60 ${pkg.is_highlighted ? 'border-violet-300 bg-violet-50' : 'border-slate-200 bg-white'}`}>
              {pkg.is_highlighted && <span className="absolute right-3 top-3 rounded-full bg-[#6D28D9] px-2 py-1 text-[9px] font-black text-white">MAIS ESCOLHIDO</span>}
              <div className="font-black">{pkg.name}</div>
              <div className="mt-3 text-3xl font-black">{pkg.credits}</div>
              <div className="text-xs font-bold text-slate-400">créditos</div>
              <div className="mt-4 text-lg font-black text-[#6D28D9]">{money(pkg.price_cents)}</div>
              <p className="mt-2 min-h-[36px] text-xs leading-5 text-slate-500">{pkg.description}</p>
              <div className="mt-4 inline-flex items-center gap-2 text-xs font-black text-violet-700">{buying === pkg.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Comprar</div>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2"><Bot className="h-5 w-5 text-[#6D28D9]" /><h2 className="text-lg font-black">O que pode consumir</h2></div>
          <div className="mt-4 space-y-3">
            {state.rates.map(rate => (
              <div key={rate.usage_key} className="flex items-start justify-between gap-4 rounded-2xl bg-slate-50 p-4">
                <div><div className="font-black">{rate.label}</div><p className="mt-1 text-xs leading-5 text-slate-500">{rate.description}</p>{rate.pricing_status === 'provisional' && <div className="mt-1 text-[10px] font-black uppercase tracking-wide text-amber-600">Equivalência provisória e ajustável</div>}</div>
                <div className="shrink-0 rounded-xl bg-white px-3 py-2 text-right shadow-sm"><div className="text-lg font-black">{rate.credits_per_unit}</div><div className="text-[10px] font-bold text-slate-400">/{rate.unit_label}</div></div>
              </div>
            ))}
          </div>
          {whatsappRate?.pricing_status === 'provisional' && <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800"><MessageCircle className="mr-2 inline h-4 w-4" />A equivalência do WhatsApp fica em tabela, não no código. Assim pode ser ajustada quando a tarifa aplicável for congelada, sem novo deploy.</div>}
        </section>

        <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black">Consumo recente</h2>
          <p className="mt-1 text-xs font-semibold text-slate-400">Telemetria de custos variáveis; habilidades determinísticas não aparecem aqui.</p>
          <div className="mt-4 space-y-2">
            {state.recent_usage.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-400">Ainda não houve consumo variável.</div>
            ) : state.recent_usage.map(row => (
              <div key={row.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 px-4 py-3">
                <div className="min-w-0"><div className="truncate text-sm font-black">{row.label}</div><div className="mt-0.5 text-[11px] font-semibold text-slate-400">{dateTime(row.created_at)}{row.channel ? ` • ${row.channel}` : ''}</div></div>
                <div className="shrink-0 text-sm font-black text-[#6D28D9]">-{row.credits_consumed}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {payment && (
        <PaymentModal
          isOpen={true}
          onClose={() => setPayment(null)}
          pixCode={payment.pix_code}
          qrCodeUrl={payment.pix_qrcode}
          amount={payment.amount}
          packageName={payment.packageName}
          paymentId={payment.payment_id}
          theme="light"
        />
      )}
    </div>
  );
}
