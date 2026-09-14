import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const CREDIT_FIELDS =
  'available_credits,total_used,has_active_plan,plan_expires_at,active_plan_name';

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: existing, error: existingError } = await admin
    .from('user_credits')
    .select(CREDIT_FIELDS)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingError) {
    console.error('[credits/ensure] lookup:', existingError.message);
    return NextResponse.json({ error: 'credits_lookup_failed' }, { status: 500 });
  }

  if (existing) {
    return NextResponse.json(existing, {
      headers: { 'Cache-Control': 'private, no-store, max-age=0' },
    });
  }

  // Mantém exatamente o fallback legado do CreditsCard.
  // Não concede Trial nem plano: apenas recria a linha antiga de 20 créditos.
  const { error: insertError } = await admin
    .from('user_credits')
    .insert({
      user_id: user.id,
      available_credits: 20,
      total_purchased: 20,
      total_used: 0,
      has_active_plan: false,
      plan_expires_at: null,
      active_plan_name: null,
    });

  // Em duas requisições simultâneas, uma pode perder a corrida para a constraint.
  // Nesse caso apenas relê a linha já criada.
  if (insertError && insertError.code !== '23505') {
    console.error('[credits/ensure] insert:', insertError.message);
    return NextResponse.json({ error: 'credits_ensure_failed' }, { status: 500 });
  }

  const { data: ensured, error: ensuredError } = await admin
    .from('user_credits')
    .select(CREDIT_FIELDS)
    .eq('user_id', user.id)
    .maybeSingle();

  if (ensuredError || !ensured) {
    console.error('[credits/ensure] reload:', ensuredError?.message || 'row_missing');
    return NextResponse.json({ error: 'credits_ensure_failed' }, { status: 500 });
  }

  return NextResponse.json(ensured, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  });
}
