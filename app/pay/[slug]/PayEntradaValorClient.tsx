// app/pay/[slug]/PayEntradaValorClient.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  slug: string;
  companyName: string;
}

export default function PayEntradaValorClient({ slug, companyName }: Props) {
  const [valor, setValor] = useState('');
  const router = useRouter();

  function handleSubmit() {
    const num = parseFloat(valor.replace(',', '.'));
    if (isNaN(num) || num <= 0) return;
    // Formata com vírgula para bater com o parseFloat do PayValorPage
    const valorFormatado = num.toFixed(2).replace('.', ',');
    router.push(`/pay/${slug}/${valorFormatado}`);
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#020617',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
    }}>
      <div style={{
        background: '#0f172a', border: '1px solid #334155',
        borderRadius: '16px', padding: '40px', textAlign: 'center',
        maxWidth: '360px', width: '100%',
      }}>
        <img
          src="https://minhai.app/icons/icon-192x192.png"
          alt="minhAi"
          style={{ width: '56px', height: '56px', borderRadius: '12px', margin: '0 auto 16px' }}
        />
        <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '16px' }}>
          {companyName}
        </p>
        <p style={{ color: '#ffffff', fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
          Digite o valor a pagar
        </p>
        <input
          type="number"
          min="0.01"
          step="0.01"
          placeholder="0,00"
          value={valor}
          onChange={e => setValor(e.target.value)}
          style={{
            width: '100%', padding: '12px 16px', borderRadius: '10px',
            background: '#1e293b', border: '1px solid #334155',
            color: '#fff', fontSize: '20px', textAlign: 'center',
            outline: 'none', marginBottom: '16px', boxSizing: 'border-box',
          }}
        />
        <button
          onClick={handleSubmit}
          style={{
            background: '#3b82f6', color: '#fff', border: 'none',
            borderRadius: '10px', padding: '12px 24px', width: '100%',
            fontSize: '15px', fontWeight: 600, cursor: 'pointer',
          }}
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
