// app/pay/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import PayEntradaValorClient from './PayEntradaValorClient';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function PayRedirectPage({ params }: Props) {
  const { slug } = await params;
  if (!slug || slug.length !== 6) notFound();

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
    <PayEntradaValorClient
      slug={slug}
      companyName={company.name}
    />
  );
}
