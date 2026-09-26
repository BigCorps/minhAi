import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { getUser } from '@/lib/supabase-server';
import { adminMidia } from '@/lib/midia/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type OwnedScreen = {
  id: string;
  publisher_id: string;
  plan_key: string;
  billing_status: string;
  billing_current_period_start: string | null;
  billing_current_period_end: string | null;
};

async function context(screenId: string) {
  const user = await getUser();
  if (!user) return { error: 'unauthorized' as const, status: 401 };
  const admin = adminMidia();
  const { data: publisher } = await admin
    .from('publishers')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();
  if (!publisher) return { error: 'publisher_not_found' as const, status: 404 };
  const { data: screen } = await admin
    .from('screens')
    .select('id,publisher_id,plan_key,billing_status,billing_current_period_start,billing_current_period_end')
    .eq('id', screenId)
    .eq('publisher_id', publisher.id)
    .maybeSingle();
  if (!screen) return { error: 'screen_not_found' as const, status: 404 };
  if (screen.billing_status === 'active' && screen.billing_current_period_end) {
    const end = new Date(screen.billing_current_period_end).getTime();
    if (Number.isFinite(end) && end <= Date.now()) {
      await admin.from('screens').update({ billing_status: 'past_due' }).eq('id', screen.id).eq('billing_status', 'active');
      screen.billing_status = 'past_due';
    }
  }
  const { data: plan } = await admin
    .from('screen_plan_catalog')
    .select('plan_key,name,monthly_price_cents,active')
    .eq('plan_key', screen.plan_key)
    .eq('active', true)
    .maybeSingle();
  if (!plan) return { error: 'plan_not_found' as const, status: 409 };
  return { user, admin, publisher, screen: screen as OwnedScreen, plan };
}

async function syncPayment(admin: ReturnType<typeof adminMidia>, payment: any) {
  if (!payment?.pix_transaction_id) return payment;
  const publicAdmin = createAdminClient();
  const { data: tx } = await publicAdmin
    .from('pix_transactions')
    .select('id,status,expires_at,confirmed_at')
    .eq('id', payment.pix_transaction_id)
    .maybeSingle();

  if (tx?.status === 'confirmed' && payment.status !== 'confirmed') {
    const { error } = await admin.rpc('finalize_screen_plan_payment', {
      p_pix_transaction_id: payment.pix_transaction_id,
    });
    if (error) console.error('[midia/billing] finalize:', error);
  } else if (tx && ['expired', 'cancelled'].includes(String(tx.status)) && payment.status === 'pending') {
    await admin.from('screen_plan_payments').update({ status: 'expired' }).eq('id', payment.id).eq('status', 'pending');
  } else if (!tx && payment.status === 'pending' && new Date(payment.expires_at).getTime() <= Date.now()) {
    await admin.from('screen_plan_payments').update({ status: 'expired' }).eq('id', payment.id).eq('status', 'pending');
  }

  const { data: refreshed } = await admin
    .from('screen_plan_payments')
    .select('*')
    .eq('id', payment.id)
    .maybeSingle();
  return refreshed ?? payment;
}

function payload(payment: any, screen: OwnedScreen, plan: any) {
  return {
    screen: {
      id: screen.id,
      billingStatus: screen.billing_status,
      currentPeriodStart: screen.billing_current_period_start,
      currentPeriodEnd: screen.billing_current_period_end,
    },
    plan: {
      key: plan.plan_key,
      name: plan.name,
      monthlyPriceCents: Number(plan.monthly_price_cents),
    },
    payment: payment ? {
      id: payment.id,
      status: payment.status,
      amountCents: Number(payment.amount_cents),
      pixCode: payment.pix_code,
      qrCodeUrl: payment.qr_code_url,
      expiresAt: payment.expires_at,
      confirmedAt: payment.confirmed_at,
      periodStart: payment.period_start,
      periodEnd: payment.period_end,
    } : null,
  };
}

export async function GET(request: Request) {
  const screenId = new URL(request.url).searchParams.get('screenId')?.trim() || '';
  if (!screenId) return NextResponse.json({ error: 'screen_required' }, { status: 400 });
  const ctx = await context(screenId);
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const { data: latest } = await ctx.admin
    .from('screen_plan_payments')
    .select('*')
    .eq('screen_id', screenId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const payment = await syncPayment(ctx.admin, latest);

  const { data: freshScreen } = await ctx.admin
    .from('screens')
    .select('id,publisher_id,plan_key,billing_status,billing_current_period_start,billing_current_period_end')
    .eq('id', screenId)
    .single();
  return NextResponse.json(payload(payment, (freshScreen ?? ctx.screen) as OwnedScreen, ctx.plan), {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { screenId?: string } | null;
  const screenId = String(body?.screenId || '').trim();
  if (!screenId) return NextResponse.json({ error: 'screen_required' }, { status: 400 });
  const ctx = await context(screenId);
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const price = Number(ctx.plan.monthly_price_cents);
  if (!Number.isSafeInteger(price) || price <= 0) {
    return NextResponse.json({ error: 'Este plano não exige mensalidade.' }, { status: 409 });
  }

  const { data: existing } = await ctx.admin
    .from('screen_plan_payments')
    .select('*')
    .eq('screen_id', screenId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const synced = await syncPayment(ctx.admin, existing);
    if (synced?.status === 'pending' && new Date(synced.expires_at).getTime() > Date.now() + 20_000) {
      return NextResponse.json(payload(synced, ctx.screen, ctx.plan));
    }
    if (synced?.status === 'pending') {
      await ctx.admin.from('screen_plan_payments').update({ status: 'expired' }).eq('id', synced.id).eq('status', 'pending');
    }
  }

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const { data: payment, error: paymentError } = await ctx.admin
    .from('screen_plan_payments')
    .insert({
      screen_id: screenId,
      publisher_id: ctx.publisher.id,
      plan_key: ctx.plan.plan_key,
      amount_cents: price,
      status: 'pending',
      expires_at: expiresAt,
    })
    .select('*')
    .single();
  if (paymentError || !payment) {
    console.error('[midia/billing] payment row:', paymentError);
    return NextResponse.json({ error: 'Não foi possível iniciar a cobrança.' }, { status: 500 });
  }

  const pixResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/gerar-pix-assistente`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    },
    body: JSON.stringify({
      // Mesma faixa retida já validada no ZIP04. `purpose` é a identidade
      // financeira real e impede crédito no saldo comum da empresa-plataforma.
      origem: 'conviteria',
      referencia_id: payment.id,
      valor_centavos: price,
      descricao: `Midia.Pro · ${ctx.plan.name} · tela ${screenId.slice(0, 8).toUpperCase()}`,
      purpose: 'midia_screen_plan',
      tipo: 'presente',
      brand: 'midia',
    }),
  });
  const pix = await pixResponse.json().catch(() => null);
  if (!pixResponse.ok || !pix?.transaction_id || !pix?.copia_e_cola) {
    console.error('[midia/billing] gerar pix:', pix);
    await ctx.admin.from('screen_plan_payments').update({ status: 'failed' }).eq('id', payment.id);
    return NextResponse.json({ error: pix?.message || pix?.error || 'Não foi possível gerar o PIX.' }, { status: 502 });
  }

  const { data: linked, error: linkError } = await ctx.admin
    .from('screen_plan_payments')
    .update({
      pix_transaction_id: pix.transaction_id,
      provider: pix.payment_provider || 'bigcorps',
      txid: pix.txid ?? null,
      pix_code: pix.copia_e_cola,
      qr_code_url: pix.qrcode ?? pix.qr_code_url ?? null,
      expires_at: pix.expires_at || expiresAt,
    })
    .eq('id', payment.id)
    .select('*')
    .single();
  if (linkError || !linked) {
    console.error('[midia/billing] link pix:', linkError);
    return NextResponse.json({ error: 'O PIX foi criado, mas não foi possível vinculá-lo à tela.' }, { status: 500 });
  }

  return NextResponse.json(payload(linked, ctx.screen, ctx.plan));
}
