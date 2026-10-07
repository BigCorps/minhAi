'use client';

import { Check, Copy, CreditCard, Loader2, QrCode, RefreshCcw, ShieldCheck, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { invokeFuncionarIAEdge } from '@/lib/funcionaria-api';

function money(cents: number | null | undefined) {
  if (cents == null) return '—';
  return (Number(cents || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function FuncionarIAStorefrontPlanCard({
  companyId,
  onChanged,
}: {
  companyId: string;
  onChanged: () => Promise<void>;
}) {
  const [data,setData]=useState<any>(null);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [checking,setChecking]=useState(false);
  const [notice,setNotice]=useState<string|null>(null);
  const [invoice,setInvoice]=useState<any>(null);
  const [copied,setCopied]=useState(false);

  const storefront=data?.storefront || {};
  const plan=storefront.plan || {};
  const ent=storefront.entitlement || {};
  const compare=storefront.comparison || {};
  const sub=data?.subscription || {};
  const desiredSkills=useMemo(
    ()=>Array.isArray(sub?.next_skill_keys) ? sub.next_skill_keys :
      Array.isArray(sub?.current_skill_keys) ? sub.current_skill_keys : [],
    [sub?.next_skill_keys,sub?.current_skill_keys],
  );

  async function load() {
    setLoading(true);
    try {
      const next=await invokeFuncionarIAEdge<any>('funcionaria-billing-v2',{
        action:'status',company_id:companyId,
      });
      setData(next);
      if (next?.pending_payment?.invoice_id && next?.pending_payment?.pix_code) {
        setInvoice(next.pending_payment);
      }
    } catch (error:any) {
      setNotice(error?.message || 'Não foi possível carregar o plano da loja.');
    } finally { setLoading(false); }
  }

  useEffect(()=>{ if(companyId) void load(); },[companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function choose(mode:'commission'|'monthly_direct') {
    if (saving) return;
    setSaving(true); setNotice(null);
    try {
      const result=await invokeFuncionarIAEdge<any>('funcionaria-billing-v2',{
        action:'create',company_id:companyId,
        desired_skill_keys:desiredSkills,
        desired_storefront_mode:mode,
      });
      if (result?.payment_required) {
        setInvoice({
          invoice_id:result.invoice_id || result.invoice?.id,
          amount_cents:Number(result.amount_cents || result.invoice?.amount_cents || 0),
          pix_code:String(result.pix_code || ''),
          qr_code_url:result.qr_code_url || null,
          expires_at:result.expires_at || null,
          prorated:result.prorated === true,
        });
        setNotice(mode==='monthly_direct'
          ? 'Pague a fatura para ativar o recebimento direto sem 5%.'
          : null);
      } else {
        setNotice(mode==='commission'
          ? 'O modo gratuito de 5% ficará efetivo conforme o período já pago.'
          : 'Configuração atualizada.');
        await load();
        await onChanged();
      }
    } catch (error:any) {
      const code=String(error?.message || '');
      setNotice(
        code.includes('storefront_monthly_plan_unavailable')
          ? 'O preço do plano mensal ainda não foi configurado pela BigCorps.'
          : code.includes('storefront_direct_payment_not_configured')
            ? 'Configure Mercado Pago ou InfinitePay na conta da empresa antes de ativar o recebimento direto.'
            : error?.message || 'Não foi possível alterar o plano da loja.'
      );
    } finally { setSaving(false); }
  }

  async function checkPayment() {
    if (!invoice?.invoice_id) return;
    setChecking(true);
    try {
      const result=await invokeFuncionarIAEdge<any>('funcionaria-billing-v2',{
        action:'check',company_id:companyId,invoice_id:invoice.invoice_id,
      });
      if (result?.status==='paid') {
        setInvoice(null);
        setNotice('Pagamento confirmado. O modo mensal sem 5% foi ativado.');
        await load();
        await onChanged();
      } else setNotice('Pagamento ainda não identificado.');
    } catch (error:any) {
      setNotice(error?.message || 'Não foi possível verificar o pagamento.');
    } finally { setChecking(false); }
  }

  async function copyPix() {
    if (!invoice?.pix_code) return;
    await navigator.clipboard.writeText(invoice.pix_code);
    setCopied(true); setTimeout(()=>setCopied(false),1600);
  }

  if (loading) {
    return <section className="rounded-3xl border border-slate-200 bg-white p-6 text-center text-sm font-bold text-slate-400">
      <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Carregando plano da loja…
    </section>;
  }

  const directReady=ent.direct_pix_configured===true || ent.direct_card_configured===true;
  const effective=String(ent.effective_mode || 'commission');
  const requested=String(ent.requested_mode || 'commission');
  const savings=compare.estimated_savings_cents;
  const planAvailable=plan.available===true;

  return (
    <>
      <section className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[.16em] text-[#6D28D9]">Como receber suas vendas</div>
            <h3 className="mt-2 text-xl font-black text-slate-950">Escolha entre 5% por venda ou mensalidade fixa</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              A loja continua publicada nos dois modos. Se a mensalidade deixar de estar válida, novos pagamentos voltam automaticamente ao plano grátis de 5%.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white">
            <div className="text-[10px] font-black uppercase tracking-[.15em] text-white/55">Modo efetivo agora</div>
            <div className="mt-1 text-sm font-black">{effective==='monthly_direct'?'Mensal • conta própria':'Grátis • 5% por venda'}</div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <button type="button" onClick={()=>void choose('commission')} disabled={saving}
            className={`rounded-2xl border p-4 text-left transition ${requested==='commission'?'border-violet-300 bg-violet-50':'border-slate-200 bg-white'} disabled:opacity-60`}>
            <div className="flex items-start justify-between gap-3">
              <div><div className="font-black text-slate-950">Grátis</div><div className="mt-1 text-sm font-black text-[#6D28D9]">5% por venda confirmada</div></div>
              {requested==='commission'?<Check className="h-5 w-5 text-[#6D28D9]" />:null}
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">PIX Banco Inter + cartão InfinitePay pela BigCorps. Você saca o saldo líquido depois.</p>
          </button>

          <button type="button" onClick={()=>void choose('monthly_direct')}
            disabled={saving || !planAvailable || !directReady}
            className={`rounded-2xl border p-4 text-left transition ${requested==='monthly_direct'?'border-lime-300 bg-lime-50':'border-slate-200 bg-white'} disabled:opacity-50`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-black text-slate-950">Mensal • sem 5%</div>
                <div className="mt-1 text-sm font-black text-lime-700">{planAvailable?`${money(plan.monthly_price_cents)}/mês`:'Preço ainda não configurado'}</div>
              </div>
              {requested==='monthly_direct'?<Check className="h-5 w-5 text-lime-700" />:null}
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">Receba direto na sua própria conta. Taxas do seu provedor continuam sendo responsabilidade da sua conta.</p>
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-xs font-black text-slate-700"><QrCode className="h-4 w-4" /> PIX próprio</div>
            <div className="mt-1 text-xs text-slate-500">{ent.direct_pix_configured?'Mercado Pago conectado':'Não configurado'}</div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-xs font-black text-slate-700"><CreditCard className="h-4 w-4" /> Cartão próprio</div>
            <div className="mt-1 text-xs text-slate-500">{ent.direct_card_configured?'InfinitePay configurada':'Não configurado'}</div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-xs font-black text-slate-700"><ShieldCheck className="h-4 w-4" /> Fallback automático</div>
            <div className="mt-1 text-xs text-slate-500">{ent.fallback_reason?'Ativo: '+String(ent.fallback_reason).replaceAll('_',' '):'Proteção pronta'}</div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 p-4">
          <div className="text-xs font-black uppercase tracking-[.14em] text-slate-500">Comparador • últimos 30 dias</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div><div className="text-xs text-slate-400">Vendas da loja</div><div className="font-black">{money(compare.merchandise_cents)}</div></div>
            <div><div className="text-xs text-slate-400">5% estimados</div><div className="font-black">{money(compare.estimated_commission_5pct_cents)}</div></div>
            <div><div className="text-xs text-slate-400">Economia com mensal</div><div className={`font-black ${Number(savings || 0)>0?'text-lime-700':'text-slate-700'}`}>{savings==null?'Aguardando preço':money(savings)}</div></div>
          </div>
          {compare.break_even_merchandise_cents ? (
            <p className="mt-3 text-xs text-slate-500">O mensal passa a ser mais econômico perto de {money(compare.break_even_merchandise_cents)} em vendas de mercadorias por mês.</p>
          ):null}
        </div>

        {notice?<div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">{saving?<Loader2 className="mr-2 inline h-4 w-4 animate-spin" />:null}{notice}</div>:null}
      </section>

      {invoice ? (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[30px] bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-2 text-sm font-black text-[#6D28D9]"><Sparkles className="h-4 w-4" /> Plano mensal da loja</div>
            <h2 className="mt-2 text-2xl font-black">Pague com Pix</h2>
            <p className="mt-1 text-sm text-slate-500">{invoice.prorated?'Valor proporcional até a próxima renovação.':'Valor do próximo período de 30 dias.'}</p>
            <div className="mt-5 text-center text-3xl font-black">{money(invoice.amount_cents)}</div>
            <div className="mt-4 flex justify-center rounded-2xl bg-white p-3">
              <img className="h-56 w-56 rounded-xl object-contain" alt="QR Code Pix"
                src={invoice.qr_code_url || `/api/qrcode?size=300&data=${encodeURIComponent(invoice.pix_code)}&color=%236D28D9`} />
            </div>
            <button type="button" onClick={()=>void copyPix()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700">
              <Copy className="h-4 w-4" />{copied?'Código copiado':'Copiar Pix'}
            </button>
            <button type="button" onClick={()=>void checkPayment()} disabled={checking}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#6D28D9] px-4 py-3.5 text-sm font-black text-white disabled:opacity-50">
              {checking?<Loader2 className="h-4 w-4 animate-spin" />:<RefreshCcw className="h-4 w-4" />}Verificar pagamento
            </button>
          </div>
        </div>
      ):null}
    </>
  );
}
