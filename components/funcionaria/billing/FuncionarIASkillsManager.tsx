'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Clock3, Copy, Loader2, RefreshCcw, Sparkles, X } from 'lucide-react';
import { useFuncionarIAState } from '@/components/funcionaria/FuncionarIADashboardShell';
import { calculateLocalQuote, formatBrlCents } from '@/lib/funcionaria-skills';
import { invokeFuncionarIAEdge } from '@/lib/funcionaria-api';

interface BillingStatus {
  subscription?: {
    status: string;
    current_skill_keys: string[];
    next_skill_keys: string[];
    current_period_start?: string | null;
    current_period_end?: string | null;
    grace_until?: string | null;
  } | null;
  pending_payment?: {
    invoice_id: string;
    amount_cents: number;
    pix_code: string;
    qr_code_url?: string | null;
    expires_at?: string | null;
    prorated?: boolean;
  } | null;
}

interface InvoiceState {
  id: string;
  amountCents: number;
  pixCode: string;
  qrUrl?: string | null;
  expiresAt?: string | null;
  prorated?: boolean;
}

export default function FuncionarIASkillsManager() {
  const { state, reload } = useFuncionarIAState();
  const paidSkills = useMemo(() => state.skills.filter(s => !s.is_free && s.is_active), [state.skills]);
  const initialDesired = useMemo(() => paidSkills.filter(s => ['active','cancel_pending','selected'].includes(String(s.company_status))).map(s => s.skill_key), [paidSkills]);
  const [desired, setDesired] = useState<string[]>(initialDesired);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceState | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const companyId = state.company?.id || '';
  const quote = useMemo(() => calculateLocalQuote(state.skills, desired), [state.skills, desired]);
  const current = billing?.subscription?.current_skill_keys || [];
  const next = billing?.subscription?.next_skill_keys || [];

  useEffect(() => { if (companyId) void loadStatus(); }, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadStatus() {
    setLoading(true);
    try {
      const data = await invokeFuncionarIAEdge<any>('funcionaria-billing', { action: 'status', company_id: companyId });
      setBilling(data);
      const sub = data?.subscription;
      if (Array.isArray(sub?.next_skill_keys) && (sub?.status !== 'free' || (sub?.current_skill_keys?.length || 0) > 0 || sub.next_skill_keys.length > 0)) {
        setDesired(sub.next_skill_keys);
      } else {
        setDesired(initialDesired);
      }
      const pending = data?.pending_payment;
      if (pending?.invoice_id && pending?.pix_code) {
        setInvoice({
          id: pending.invoice_id,
          amountCents: Number(pending.amount_cents || 0),
          pixCode: String(pending.pix_code),
          qrUrl: pending.qr_code_url || null,
          expiresAt: pending.expires_at || null,
          prorated: pending.prorated === true,
        });
      }
    } catch (error) {
      console.error(error);
    } finally { setLoading(false); }
  }

  function toggle(key: string) {
    setDesired(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
    setNotice(null);
  }

  async function updateSubscription() {
    if (!companyId) return;
    setSaving(true); setNotice(null);
    try {
      const data = await invokeFuncionarIAEdge<any>('funcionaria-billing', { action: 'create', company_id: companyId, desired_skill_keys: desired });
      if (!data.payment_required) {
        setNotice(data.scheduled ? 'Alteração programada. As habilidades removidas continuam ativas até o fim do período já pago.' : 'Sua seleção já está atualizada.');
        await loadStatus(); await reload();
        return;
      }
      setInvoice({
        id: data.invoice?.id,
        amountCents: Number(data.amount_cents || data.invoice?.amount_cents || 0),
        pixCode: String(data.pix_code || ''),
        qrUrl: data.qr_code_url || null,
        expiresAt: data.expires_at || data.invoice?.expires_at || null,
        prorated: data.prorated === true || data.invoice?.prorated === true,
      });
    } catch (error: any) {
      setNotice(error?.message || 'Não foi possível atualizar a assinatura.');
    } finally { setSaving(false); }
  }

  async function checkPayment() {
    if (!invoice || !companyId) return;
    setChecking(true);
    try {
      const data = await invokeFuncionarIAEdge<any>('funcionaria-billing', { action: 'check', company_id: companyId, invoice_id: invoice.id });
      if (data?.status === 'paid') {
        setInvoice(null);
        setNotice('Pagamento confirmado. As novas habilidades já foram liberadas.');
        await loadStatus(); await reload();
      } else setNotice('Pagamento ainda não identificado. Aguarde alguns segundos e tente novamente.');
    } catch (error: any) {
      setNotice(error?.message || 'Não foi possível verificar o pagamento.');
    } finally { setChecking(false); }
  }

  async function copyPix() {
    if (!invoice?.pixCode) return;
    await navigator.clipboard.writeText(invoice.pixCode);
    setCopied(true); setTimeout(() => setCopied(false), 1600);
  }

  if (loading) return <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-400"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Carregando assinatura…</div>;

  return (
    <div className="space-y-6">
      {billing?.subscription?.current_period_end && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-100 bg-violet-50/60 px-4 py-3 text-sm">
          <div className="flex items-center gap-2 font-bold text-violet-800"><Clock3 className="h-4 w-4" /> Período atual até {new Date(billing.subscription.current_period_end).toLocaleDateString('pt-BR')}</div>
          {billing.subscription.status === 'past_due' && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">RENOVAÇÃO PENDENTE</span>}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {paidSkills.map(skill => {
          const selected = desired.includes(skill.skill_key);
          const activeNow = current.includes(skill.skill_key) || skill.company_status === 'active' || skill.company_status === 'cancel_pending';
          const cancelling = skill.company_status === 'cancel_pending' || (activeNow && !next.includes(skill.skill_key) && !!billing?.subscription?.current_period_end);
          return (
            <button key={skill.skill_key} type="button" onClick={() => toggle(skill.skill_key)} className={`rounded-3xl border p-5 text-left shadow-sm transition ${selected ? 'border-violet-300 bg-violet-50/40 ring-2 ring-violet-100' : 'border-slate-200 bg-white hover:border-violet-200'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-black text-slate-950">{skill.name}</div>
                  <div className="mt-1 text-xs font-black text-[#6D28D9]">{formatBrlCents(skill.monthly_price_cents)}/mês</div>
                </div>
                <div className={`flex h-7 w-7 items-center justify-center rounded-full border ${selected ? 'border-[#6D28D9] bg-[#6D28D9] text-white' : 'border-slate-300 text-transparent'}`}><Check className="h-4 w-4" /></div>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-500">{skill.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {activeNow && <span className="rounded-full bg-lime-100 px-2.5 py-1 text-[10px] font-black text-lime-800">ATIVA AGORA</span>}
                {cancelling && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black text-amber-800">SAI NO PRÓXIMO CICLO</span>}
              </div>
            </button>
          );
        })}
      </div>

      <section className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <div className="text-xs font-black uppercase tracking-[.16em] text-[#6D28D9]">Próxima configuração</div>
            <div className="mt-2 text-3xl font-black">{formatBrlCents(quote.total_cents)}<span className="text-sm font-bold text-slate-400">/mês</span></div>
            <p className="mt-2 text-sm text-slate-500">{quote.skill_count} habilidade{quote.skill_count === 1 ? '' : 's'} paga{quote.skill_count === 1 ? '' : 's'} • desconto automático de {quote.discount_percent}%.</p>
            <p className="mt-1 text-xs text-slate-400">Se você adicionar uma habilidade no meio do ciclo, paga somente o adicional proporcional até a próxima renovação. Remoções valem ao fim do período já pago.</p>
          </div>
          <button type="button" onClick={() => void updateSubscription()} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#6D28D9] px-5 py-3.5 text-sm font-black text-white disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Atualizar assinatura
          </button>
        </div>
        {notice && <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">{notice}</div>}
      </section>

      {invoice && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[30px] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div><div className="flex items-center gap-2 text-sm font-black text-[#6D28D9]"><Sparkles className="h-4 w-4" /> Ativar habilidades</div><h2 className="mt-2 text-2xl font-black">Pague com Pix</h2></div>
              <button type="button" onClick={() => setInvoice(null)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <p className="mt-2 text-sm text-slate-500">{invoice.prorated ? 'Valor proporcional até a próxima renovação.' : 'Primeiro período de 30 dias.'}</p>
            <div className="mt-5 text-center text-3xl font-black">{formatBrlCents(invoice.amountCents)}</div>
            <div className="mt-4 flex justify-center rounded-2xl bg-white p-3">
              <img className="h-56 w-56 rounded-xl object-contain" alt="QR Code Pix" src={invoice.qrUrl || `/api/qrcode?size=300&data=${encodeURIComponent(invoice.pixCode)}&color=%236D28D9`} />
            </div>
            <button type="button" onClick={() => void copyPix()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700"><Copy className="h-4 w-4" /> {copied ? 'Código copiado' : 'Copiar Pix'}</button>
            <button type="button" onClick={() => void checkPayment()} disabled={checking} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#6D28D9] px-4 py-3.5 text-sm font-black text-white disabled:opacity-50">{checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Já paguei, verificar</button>
          </div>
        </div>
      )}
    </div>
  );
}
