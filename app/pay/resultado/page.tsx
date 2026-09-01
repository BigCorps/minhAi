// app/pay/resultado/page.tsx
//
// BigCorps redireciona para cá após pagamento:
// /pay/resultado?cobranca_id=xxx&company_id=yyy&status=paid
//
import { notFound } from 'next/navigation';
import PayResultadoClient from './PayResultadoClient';

interface Props {
  searchParams: Promise<{ cobranca_id?: string; company_id?: string; status?: string }>;
}

export default async function PayResultadoPage({ searchParams }: Props) {
  const { cobranca_id, company_id, status } = await searchParams;

  if (!cobranca_id || !company_id) notFound();

  return (
    <PayResultadoClient
      cobrancaId={cobranca_id}
      companyId={company_id}
      orderStatus={status ?? null}
    />
  );
}
