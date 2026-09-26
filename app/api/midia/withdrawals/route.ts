import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase-server';
import { adminMidia } from '@/lib/midia/server';
import { MIDIA_WITHDRAWAL_MIN_CENTS } from '@/lib/midia/constants';
import { documentType, normalizePixKey, onlyDigits, validEmail, type MidiaPixKeyType } from '@/lib/midia/finance';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Faça login para continuar.' }, { status: 401 });

  const body = await request.json().catch(() => null) as {
    fullName?: string;
    document?: string;
    email?: string;
    pixKey?: string;
    pixKeyType?: MidiaPixKeyType;
    amountCents?: number;
  } | null;
  if (!body) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });

  const admin = adminMidia();
  const { data: publisher } = await admin
    .from('publishers')
    .select('id,status')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!publisher || publisher.status !== 'active') return NextResponse.json({ error: 'Conta Midia.Pro não encontrada.' }, { status: 404 });

  const { data: existingProfile } = await admin
    .from('payout_profiles')
    .select('id,full_name,document_type,document_digits,email,pix_key,pix_key_type,verified,verified_at')
    .eq('publisher_id', publisher.id)
    .maybeSingle();

  const fullName = String(body.fullName || existingProfile?.full_name || '').trim().replace(/\s+/g, ' ').slice(0, 140);
  const rawDocument = String(body.document || '').trim();
  const documentDigits = rawDocument ? onlyDigits(rawDocument) : String(existingProfile?.document_digits || '');
  const docType = rawDocument ? documentType(documentDigits) : (existingProfile?.document_type as 'cpf' | 'cnpj' | undefined) ?? null;
  const email = String(body.email || existingProfile?.email || '').trim().toLowerCase();
  const pixKeyType = String(body.pixKeyType || existingProfile?.pix_key_type || '') as MidiaPixKeyType;
  const rawPixKey = String(body.pixKey || existingProfile?.pix_key || '');
  const pixKey = normalizePixKey(rawPixKey, pixKeyType);
  const amountCents = Math.floor(Number(body.amountCents || 0));

  if (fullName.length < 5 || !docType || !documentDigits || !validEmail(email) || !pixKey ||
      !Number.isSafeInteger(amountCents) || amountCents < MIDIA_WITHDRAWAL_MIN_CENTS) {
    return NextResponse.json({ error: 'Confira nome, CPF/CNPJ, e-mail, chave PIX e valor do saque.' }, { status: 400 });
  }

  const profileChanged = !existingProfile
    || existingProfile.full_name !== fullName
    || existingProfile.document_type !== docType
    || existingProfile.document_digits !== documentDigits
    || existingProfile.email !== email
    || existingProfile.pix_key !== pixKey
    || existingProfile.pix_key_type !== pixKeyType;

  const { data: profile, error: profileError } = await admin
    .from('payout_profiles')
    .upsert({
      publisher_id: publisher.id,
      full_name: fullName,
      document_type: docType,
      document_digits: documentDigits,
      email,
      pix_key: pixKey,
      pix_key_type: pixKeyType,
      verified: profileChanged ? false : Boolean(existingProfile?.verified),
      verified_at: profileChanged ? null : existingProfile?.verified_at ?? null,
    }, { onConflict: 'publisher_id' })
    .select('id')
    .single();

  if (profileError || !profile) {
    console.error('[midia/withdrawals] profile:', profileError);
    return NextResponse.json({ error: 'Não foi possível salvar os dados de recebimento.' }, { status: 500 });
  }

  const { data: withdrawalId, error } = await admin.rpc('request_publisher_withdrawal', {
    p_publisher_id: publisher.id,
    p_payout_profile_id: profile.id,
    p_amount_cents: amountCents,
  });

  if (error) {
    const message = String(error.message || '');
    if (message.includes('withdrawal_insufficient_balance')) return NextResponse.json({ error: 'Saldo disponível insuficiente.' }, { status: 409 });
    if (message.includes('withdrawal_already_open')) return NextResponse.json({ error: 'Já existe um saque em andamento.' }, { status: 409 });
    if (message.includes('withdrawal_below_minimum')) return NextResponse.json({ error: 'O saque mínimo é de R$ 50,00.' }, { status: 400 });
    console.error('[midia/withdrawals] request:', error);
    return NextResponse.json({ error: 'Não foi possível solicitar o saque.' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    withdrawalId,
    message: 'Saque solicitado. O repasse PIX será processado após a conferência operacional.',
  });
}
