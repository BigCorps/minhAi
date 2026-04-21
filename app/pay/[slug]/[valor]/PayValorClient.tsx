// app/pay/[slug]/[valor]/PayValorClient.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useTurnstile } from '@/hooks/useTurnstile';
import { Loader2, ShieldAlert } from 'lucide-react';

interface Props {
  companyId: string;
  companyName: string;
  amountCents: number;
}

type Stage = 'verifying' | 'redirecting' | 'error';

export default function PayValorClient({ companyId, companyName, amountCents }: Props) {
  const [stage, setStage] = useState<Stage>('verifying');
  const [errorMsg, setErrorMsg] = useState('');
  const supabase = createClient();
  const { getToken, containerRef, ready: turnstileReady } = useTurnstile();

  const amountBRL = (amountCents / 100).toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL',
  });

  useEffect(() => {
    if (!turnstileReady) return;
    handleGenerate();
  }, [turnstileReady]);

  async function handleGenerate() {
    setStage('verifying');
    setErrorMsg('');
    try {
      // Turnstile: valida se disponível, pula silenciosamente se não
      const token = await getToken();
      if (token) {
        const { data: td, error: te } = await supabase.functions.invoke(
          'validate-turnstile',
          { body: { token } }
        );
        if (te || !td?.success) {
          setErrorMsg(td?.error || 'Verificação de segurança falhou. Tente novamente.');
          setStage('error');
          return;
        }
      }

      // Gera cobrança InfinitePay
      setStage('redirecting');
      const { data, error } = await supabase.functions.invoke('gerar-cobranca-infinitepay', {
        body: {
          company_id: companyId,
          amount_cents: amountCents,
          tipo: 'LINK_PAGAMENTO',
          descricao: `Link pay/${companyId}`,
        },
      });

      if (error || !data?.success || !data?.link_cobranca) {
        throw new Error(data?.error || 'Erro ao gerar cobrança.');
      }

      window.location.href = data.link_cobranca;
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro inesperado. Tente novamente.');
      setStage('error');
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#020617',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
    }}>
      <div ref={containerRef} style={{ display: 'none' }} aria-hidden="true" />

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

        <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '4px' }}>{companyName}</p>
        <p style={{ color: '#ffffff', fontSize: '24px', fontWeight: 700, marginBottom: '24px' }}>
          {amountBRL}
        </p>

        {stage === 'verifying' && (
          <>
            <Loader2
              style={{ width: '32px', height: '32px', color: '#3b82f6', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }}
            />
            <p style={{ color: '#64748b', fontSize: '13px' }}>Verificando segurança...</p>
          </>
        )}

        {stage === 'redirecting' && (
          <>
            <Loader2
              style={{ width: '32px', height: '32px', color: '#8b5cf6', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }}
            />
            <p style={{ color: '#64748b', fontSize: '13px' }}>Gerando link de pagamento...</p>
          </>
        )}

        {stage === 'error' && (
          <>
            <ShieldAlert style={{ width: '36px', height: '36px', color: '#ef4444', margin: '0 auto 12px' }} />
            <p style={{ color: '#ef4444', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
              Erro
            </p>
            <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '20px' }}>
              {errorMsg}
            </p>
            <button
              onClick={handleGenerate}
              style={{
                background: '#3b82f6', color: '#fff', border: 'none',
                borderRadius: '10px', padding: '10px 24px',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              Tentar novamente
            </button>
          </>
        )}

        <p style={{ color: '#1e293b', fontSize: '11px', marginTop: '24px' }}>
          Captcha automático via Cloudflare
        </p>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
