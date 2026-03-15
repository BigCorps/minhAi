'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface Props {
  company: {
    name: string;
    logo_url: string | null;
  };
  initialAmount: number | null;
  onSubmit: (value: number) => void;
  loading: boolean;
}

export default function PixValueForm({ company, initialAmount, onSubmit, loading }: Props) {
  const [value, setValue] = useState(initialAmount ? initialAmount.toFixed(2) : '');

  function handleSubmit() {
    const parsed = parseFloat(value.replace(',', '.'));
    if (!parsed || parsed <= 0) return;
    onSubmit(parsed);
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          {company.logo_url ? (
<img
  src={company.logo_url}
  alt={company.name}
  className="max-h-20 max-w-[180px] w-auto h-auto object-contain mx-auto mb-4"
  style={{ display: 'block' }}
/>
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl font-bold">
                {company.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <h1 className="text-xl font-bold text-white">{company.name}</h1>
          <p className="text-slate-400 text-sm mt-1">Pagamento via PIX</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Valor do pagamento
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">
                R$
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="0,00"
                className="w-full pl-12 pr-4 py-4 bg-slate-800 border border-slate-600 rounded-xl text-white text-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !value || parseFloat(value) <= 0}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Gerando PIX...</>
            ) : (
              'Gerar QR Code PIX'
            )}
          </button>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          Pagamento processado com segurança via Banco Inter e BigCorps
        </p>
      </div>
    </div>
  );
}
