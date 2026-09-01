// app/pay/[slug]/[valor]/PayValorClient.tsx
'use client';

import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useTurnstile } from '@/hooks/useTurnstile';
import {
  ArrowRight,
  Loader2,
  Mail,
  Phone,
  ShieldAlert,
  User,
} from 'lucide-react';

interface Props {
  companyId: string;
  companyName: string;
  amountCents: number;
}

type Stage = 'form' | 'verifying' | 'redirecting' | 'error';

interface CustomerForm {
  name: string;
  email: string;
  phone: string;
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 13);

  // Aceita o usuário digitando com ou sem o DDI 55.
  const local = digits.startsWith('55') && digits.length > 11
    ? digits.slice(2)
    : digits;

  if (local.length <= 2) return local;
  if (local.length <= 7) return `(${local.slice(0, 2)}) ${local.slice(2)}`;
  if (local.length <= 10) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  }

  return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7, 11)}`;
}

function phoneToE164(value: string) {
  const digits = value.replace(/\D/g, '');

  if (digits.startsWith('55') && digits.length >= 12 && digits.length <= 13) {
    return `+${digits}`;
  }

  return `+55${digits}`;
}

function isValidBrazilianPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  const local = digits.startsWith('55') && digits.length > 11
    ? digits.slice(2)
    : digits;

  return local.length === 10 || local.length === 11;
}

export default function PayValorClient({ companyId, companyName, amountCents }: Props) {
  const [stage, setStage] = useState<Stage>('form');
  const [errorMsg, setErrorMsg] = useState('');
  const [customer, setCustomer] = useState<CustomerForm>({
    name: '',
    email: '',
    phone: '',
  });

  const supabase = useMemo(() => createClient(), []);
  const { getToken, containerRef, ready: turnstileReady } = useTurnstile();

  const amountBRL = (amountCents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  const isLoading = stage === 'verifying' || stage === 'redirecting';

  function validateForm() {
    const name = customer.name.trim().replace(/\s+/g, ' ');
    const email = customer.email.trim().toLowerCase();

    if (name.length < 3 || !name.includes(' ')) {
      return 'Informe seu nome completo.';
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'Informe um e-mail válido.';
    }

    if (!isValidBrazilianPhone(customer.phone)) {
      return 'Informe um telefone válido com DDD.';
    }

    return '';
  }

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isLoading) return;

    const validationError = validateForm();
    if (validationError) {
      setErrorMsg(validationError);
      setStage('error');
      return;
    }

    if (!turnstileReady) {
      setErrorMsg('A verificação de segurança ainda está carregando. Tente novamente.');
      setStage('error');
      return;
    }

    setStage('verifying');
    setErrorMsg('');

    try {
      const token = await getToken();

      if (token) {
        const { data: turnstileData, error: turnstileError } =
          await supabase.functions.invoke('validate-turnstile', {
            body: { token },
          });

        if (turnstileError || !turnstileData?.success) {
          throw new Error(
            turnstileData?.error ||
              'Verificação de segurança falhou. Tente novamente.',
          );
        }
      }

      setStage('redirecting');

      const { data, error } = await supabase.functions.invoke(
        'gerar-cobranca-infinitepay',
        {
          body: {
            company_id: companyId,
            amount_cents: amountCents,
            tipo: 'LINK_PAGAMENTO',
            descricao: `Pagamento para ${companyName}`,
            customer: {
              name: customer.name.trim().replace(/\s+/g, ' '),
              email: customer.email.trim().toLowerCase(),
              phone_number: phoneToE164(customer.phone),
            },
          },
        },
      );

      if (error || !data?.success || !data?.link_cobranca) {
        throw new Error(data?.error || 'Erro ao gerar cobrança.');
      }

      window.location.assign(data.link_cobranca);
    } catch (error: unknown) {
      setErrorMsg(
        error instanceof Error
          ? error.message
          : 'Erro inesperado. Tente novamente.',
      );
      setStage('error');
    }
  }

  function updateField(field: keyof CustomerForm, value: string) {
    setCustomer((current) => ({
      ...current,
      [field]: field === 'phone' ? normalizePhone(value) : value,
    }));

    if (stage === 'error') {
      setStage('form');
      setErrorMsg('');
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#020617',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div ref={containerRef} style={{ display: 'none' }} aria-hidden="true" />

      <section
        style={{
          background: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '420px',
          width: '100%',
          boxShadow: '0 24px 70px rgba(0, 0, 0, 0.35)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img
            src="https://minhai.app/icons/icon-192x192.png"
            alt="minhAi"
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              margin: '0 auto 16px',
            }}
          />

          <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 4px' }}>
            {companyName}
          </p>
          <p
            style={{
              color: '#ffffff',
              fontSize: '26px',
              fontWeight: 700,
              margin: '0 0 8px',
            }}
          >
            {amountBRL}
          </p>
          <p
            style={{
              color: '#64748b',
              fontSize: '13px',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Confirme seus dados para continuar para o pagamento seguro da InfinitePay.
          </p>
        </div>

        <form onSubmit={handleGenerate} noValidate>
          <label style={labelStyle}>
            Nome completo
            <span style={inputWrapperStyle}>
              <User style={iconStyle} aria-hidden="true" />
              <input
                type="text"
                name="name"
                autoComplete="name"
                value={customer.name}
                onChange={(event) => updateField('name', event.target.value)}
                placeholder="Seu nome completo"
                disabled={isLoading}
                required
                style={inputStyle}
              />
            </span>
          </label>

          <label style={labelStyle}>
            E-mail
            <span style={inputWrapperStyle}>
              <Mail style={iconStyle} aria-hidden="true" />
              <input
                type="email"
                name="email"
                inputMode="email"
                autoComplete="email"
                value={customer.email}
                onChange={(event) => updateField('email', event.target.value)}
                placeholder="voce@email.com"
                disabled={isLoading}
                required
                style={inputStyle}
              />
            </span>
          </label>

          <label style={{ ...labelStyle, marginBottom: '18px' }}>
            Telefone com DDD
            <span style={inputWrapperStyle}>
              <Phone style={iconStyle} aria-hidden="true" />
              <input
                type="tel"
                name="phone"
                inputMode="tel"
                autoComplete="tel"
                value={customer.phone}
                onChange={(event) => updateField('phone', event.target.value)}
                placeholder="(11) 99999-9999"
                disabled={isLoading}
                required
                style={inputStyle}
              />
            </span>
          </label>

          {stage === 'error' && errorMsg && (
            <div
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: '10px',
                padding: '12px',
                marginBottom: '16px',
              }}
            >
              <ShieldAlert
                style={{
                  width: '18px',
                  height: '18px',
                  color: '#f87171',
                  flexShrink: 0,
                  marginTop: '1px',
                }}
              />
              <span style={{ color: '#fca5a5', fontSize: '13px', lineHeight: 1.4 }}>
                {errorMsg}
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !turnstileReady}
            style={{
              width: '100%',
              minHeight: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '9px',
              background: isLoading || !turnstileReady ? '#334155' : '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '12px 18px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: isLoading || !turnstileReady ? 'not-allowed' : 'pointer',
              opacity: isLoading || !turnstileReady ? 0.75 : 1,
            }}
          >
            {stage === 'verifying' && (
              <>
                <Loader2 style={spinnerStyle} />
                Verificando segurança...
              </>
            )}

            {stage === 'redirecting' && (
              <>
                <Loader2 style={spinnerStyle} />
                Abrindo pagamento...
              </>
            )}

            {(stage === 'form' || stage === 'error') && (
              <>
                Continuar para pagamento
                <ArrowRight style={{ width: '18px', height: '18px' }} />
              </>
            )}
          </button>
        </form>

        <p
          style={{
            color: '#475569',
            fontSize: '11px',
            margin: '18px 0 0',
            textAlign: 'center',
            lineHeight: 1.45,
          }}
        >
          Seus dados serão usados somente para identificar esta cobrança e preencher o checkout.
        </p>
      </section>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        input::placeholder {
          color: #475569;
        }

        input:focus {
          outline: none;
        }
      `}</style>
    </main>
  );
}

const labelStyle = {
  display: 'block',
  color: '#cbd5e1',
  fontSize: '12px',
  fontWeight: 600,
  marginBottom: '14px',
} as const;

const inputWrapperStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  background: '#020617',
  border: '1px solid #334155',
  borderRadius: '10px',
  padding: '0 13px',
  marginTop: '7px',
} as const;

const inputStyle = {
  width: '100%',
  height: '46px',
  background: 'transparent',
  color: '#ffffff',
  border: 'none',
  fontSize: '14px',
} as const;

const iconStyle = {
  width: '18px',
  height: '18px',
  color: '#64748b',
  flexShrink: 0,
} as const;

const spinnerStyle = {
  width: '18px',
  height: '18px',
  animation: 'spin 1s linear infinite',
} as const;
