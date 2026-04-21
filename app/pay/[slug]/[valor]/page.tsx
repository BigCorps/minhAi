import { redirect, notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

interface Props {
  params: Promise<{ slug: string; valor: string }>;
}

export default async function PayValorPage({ params }: Props) {
  const { slug, valor } = await params;

  // Valida o valor
  const valorNum = parseFloat(valor.replace(',', '.'));
  if (isNaN(valorNum) || valorNum <= 0 || valorNum > 100000) notFound();

  const amount_cents = Math.round(valorNum * 100);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Busca a empresa pelo slug
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, infinitepay_handle')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (companyError || !company) notFound();
  if (!company.infinitepay_handle) notFound();

  // Gera a cobrança chamando a edge function
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/gerar-cobranca-infinitepay`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        company_id: company.id,
        amount_cents,
        tipo: 'LINK_PAGAMENTO',
        descricao: `Link pay/${slug}/${valor}`,
      }),
    }
  );

  if (!response.ok) notFound();

  const data = await response.json();
  if (!data.success || !data.link_cobranca) notFound();

  // Redireciona direto para o checkout InfinitePay
  redirect(data.link_cobranca);
}