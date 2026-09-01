// app/pay/resultado/PayResultadoClient.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, Loader2, Clock } from 'lucide-react';

interface Props {
  cobrancaId: string;
  companyId: string;
  orderStatus: string | null;
}

type Stage = 'confirming' | 'success' | 'pending' | 'error';

const MAX_ATTEMPTS = 8;
const RETRY_DELAY_MS = 3000;

export default function PayResultadoClient({ cobrancaId, companyId, orderStatus }: Props) {
  const [stage, setStage] = useState<Stage>('confirming');
  const [attempt, setAttempt] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    if (orderStatus && ['cancelled', 'failed', 'rejected'].includes(orderStatus.toLowerCase())) {
      setStage('error');
      setErrorMsg('Pagamento não concluído ou cancelado pelo cliente.');
      return;
    }

    confirm(0);
    return () => { isMounted.current = false; };
  }, []);

  async function confirm(currentAttempt: number) {
    if (!isMounted.current) return;
    setAttempt(currentAttempt + 1);

    try {
      // Mesma lógica do InfinitePayDisplay: fetch direto para capturar HTTP status real
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      const response = await fetch(`${supabaseUrl}/functions/v1/confirmar-pagamento-infinitepay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({ cobranca_id: cobrancaId, company_id: companyId }),
      });

      if (!isMounted.current) return;
      const json = await response.json();

      if (response.ok && json.success) {
        setStage('success');
        return;
      }

      // HTTP 400 + pending: ainda não identificado — retenta automaticamente
      if (response.status === 400 && json.pending) {
        if (currentAttempt < MAX_ATTEMPTS - 1) {
          setTimeout(() => {
            if (isMounted.current) confirm(currentAttempt + 1);
          }, RETRY_DELAY_MS);
          return; // mantém 'confirming'
        }
        setStage('pending');
        return;
      }

      setErrorMsg(json.error || 'Erro ao confirmar pagamento.');
      setStage('error');

    } catch (err: any) {
      if (!isMounted.current) return;
      setErrorMsg(err.message || 'Erro de conexão.');
      setStage('error');
    }
  }

  const progressPct = Math.min((attempt / MAX_ATTEMPTS) * 100, 95);

  return (
    <div style={{
      minHeight: '100vh', background: '#020617',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
    }}>
      <div style={{
        background: '#0f172a', border: '1px solid #1e293b',
        borderRadius: '20px', padding: '40px 32px', textAlign: 'center',
        maxWidth: '380px', width: '100%',
      }}>
        <img
          src="https://minhai.app/icons/icon-192x192.png"
          alt="minhAi"
          style={{ width: '48px', height: '48px', borderRadius: '10px', margin: '0 auto 20px' }}
        />

        {stage === 'confirming' && (
          <>
            <Loader2 style={{
              width: '40px', height: '40px', color: '#8b5cf6',
              margin: '0 auto 16px', animation: 'spin 1s linear infinite',
            }} />
            <p style={{ color: '#f1f5f9', fontSize: '17px', fontWeight: 600, marginBottom: '8px' }}>
              Confirmando pagamento...
            </p>
            <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '24px' }}>
              Verificando junto à InfinitePay
            </p>
            <div style={{
              background: '#1e293b', borderRadius: '99px',
              height: '4px', overflow: 'hidden', marginBottom: '8px',
            }}>
              <div style={{
                height: '100%', borderRadius: '99px',
                background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                width: `${progressPct}%`, transition: 'width 0.5s ease',
              }} />
            </div>
            <p style={{ color: '#334155', fontSize: '11px' }}>
              Tentativa {attempt} de {MAX_ATTEMPTS}
            </p>
          </>
        )}

        {stage === 'success' && (
          <>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: 'rgba(34,197,94,0.15)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            }}>
              <CheckCircle style={{ width: '36px', height: '36px', color: '#22c55e' }} />
            </div>
            <p style={{ color: '#f1f5f9', fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
              Pagamento confirmado!
            </p>
            <p style={{ color: '#64748b', fontSize: '13px' }}>
              Obrigado. Seu pagamento foi registrado com sucesso.
            </p>
          </>
        )}

        {stage === 'pending' && (
          <>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: 'rgba(245,158,11,0.15)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            }}>
              <Clock style={{ width: '36px', height: '36px', color: '#f59e0b' }} />
            </div>
            <p style={{ color: '#f1f5f9', fontSize: '17px', fontWeight: 600, marginBottom: '8px' }}>
              Aguardando confirmação
            </p>
            <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>
              Seu pagamento pode estar sendo processado. Confirmaremos em breve.
            </p>
            <button
              onClick={() => { setStage('confirming'); confirm(0); }}
              style={{
                background: '#1e293b', color: '#94a3b8', border: '1px solid #334155',
                borderRadius: '10px', padding: '10px 24px',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              Verificar novamente
            </button>
          </>
        )}

        {stage === 'error' && (
          <>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: 'rgba(239,68,68,0.15)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            }}>
              <XCircle style={{ width: '36px', height: '36px', color: '#ef4444' }} />
            </div>
            <p style={{ color: '#f1f5f9', fontSize: '17px', fontWeight: 600, marginBottom: '8px' }}>
              Não confirmado
            </p>
            <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>
              {errorMsg}
            </p>
            <button
              onClick={() => { setStage('confirming'); confirm(0); }}
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

        <p style={{ color: '#0f172a', fontSize: '11px', marginTop: '24px' }}>
          Powered by minhAi
        </p>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
