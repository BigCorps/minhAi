// app/pay/[slug]/[valor]/page.tsx
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import PayValorClient from './PayValorClient';

interface Props {
  params: Promise<{ slug: string; valor: string }>;
}

export default async function PayValorPage({ params }: Props) {
  const { slug, valor } = await params;

  const valorNum = parseFloat(valor.replace(',', '.'));
  if (isNaN(valorNum) || valorNum <= 0 || valorNum > 100000) notFound();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, slug, infinitepay_handle')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (!company || !company.infinitepay_handle) notFound();

  return (
    <PayValorClient
      companyId={company.id}
      companyName={company.name}
      amountCents={Math.round(valorNum * 100)}
    />
  );
}
