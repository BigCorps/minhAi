'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Check } from 'lucide-react';
import PixValueForm from './PixValueForm';
import PixQRCodeDisplay from './PixQRCodeDisplay';

interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  receiving_pix_key: string;
}

interface Props {
  company: Company;
  initialAmount: number | null;
}

export default function PixLinkPage({ company, initialAmount }: Props) {
  const [amount, setAmount] = useState<number | null>(null);
  const [pixData, setPixData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const supabase = createClient();

  // Se veio com valor na URL, gera automático
  useEffect(() => {
    if (initialAmount && initialAmount > 0) {
      generatePix(initialAmount);
    }
  }, []);

  async function generatePix(value: number) {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('gerar-pix-assistente', {
        body: {
          company_id: company.id,
          amount_cents: Math.round(value * 100),
        },
      });
      if (error) throw error;
      setAmount(value);
      setPixData(data);
    } catch (err) {
      console.error('Erro ao gerar PIX:', err);
      alert('Erro ao gerar PIX. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function confirmPix() {
    if (!pixData?.transaction_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('confirmar-pix-assistente', {
        body: { transaction_id: pixData.transaction_id },
      });
      if (error) throw error;
      if (data?.success) {
        setConfirmed(true);
      } else {
        alert('PIX ainda não confirmado. Aguarde e tente novamente.');
      }
    } catch (err) {
      alert('Erro ao verificar pagamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  if (confirmed) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-10 text-center max-w-sm w-full">
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
            <Check className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Pagamento Confirmado!</h2>
          <p className="text-slate-400 text-sm mb-1">{company.name}</p>
          <p className="text-blue-400 font-bold text-xl">
            R$ {amount?.toFixed(2).replace('.', ',')}
          </p>
          <p className="text-slate-500 text-xs mt-6">
            Obrigado pelo seu pagamento.
          </p>
        </div>
      </div>
    );
  }

  if (!pixData) {
    return (
      <PixValueForm
        company={company}
        initialAmount={initialAmount}
        onSubmit={generatePix}
        loading={loading}
      />
    );
  }

  return (
    <PixQRCodeDisplay
      company={company}
      pixData={pixData}
      amount={amount!}
      onConfirm={confirmPix}
      onNewPix={() => { setPixData(null); setAmount(null); }}
      loading={loading}
    />
  );
}
