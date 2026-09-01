'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface Props {
  referralCode: string;
  referrerName: string;
}

export default function ReferralLandingPage({ referralCode, referrerName }: Props) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const saved = localStorage.getItem('publicTheme') as 'dark' | 'light' | null;
    setTheme(saved || (prefersDark ? 'dark' : 'light'));

    // Salvar ref ao carregar a página — cobre todos os fluxos de cadastro
    if (referralCode) {
      document.cookie = `pendingRefCode=${referralCode}; path=/; max-age=86400; samesite=lax; secure`;
    }
  }, [referralCode]);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('publicTheme', next);
  }

  if (!mounted) return null;

  const isDark = theme === 'dark';

  return (
    <div style={{ minHeight: '100vh', background: isDark ? '#020617' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', transition: 'background 0.3s' }}>

      {/* Botão de tema */}
      <button
        onClick={toggleTheme}
        style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 50,
          width: '44px', height: '44px', borderRadius: '50%',
          background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
          border: isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.12)',
          color: isDark ? '#ffffff' : '#000000',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(10px)', transition: 'all 0.2s',
        }}
      >
        {isDark ? (
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </button>

      <div style={{ width: '100%', maxWidth: '448px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Image src="/logo.png" alt="eAi" width={140} height={72} className="mx-auto mb-4" />
        </div>

        {/* Card */}
        <div style={{
          background: isDark ? '#0f172a' : '#ffffff',
          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          borderRadius: '16px', padding: '32px', textAlign: 'center',
          boxShadow: isDark ? 'none' : '0 4px 24px rgba(0,0,0,0.08)',
        }}>

          {/* Ícone */}
          <div style={{
            width: '64px', height: '64px',
            background: 'rgba(59,130,246,0.1)',
            borderRadius: '50%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 20px',
          }}>
            <svg style={{ width: '32px', height: '32px', color: '#60a5fa' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>

          <h1 style={{ fontSize: '22px', fontWeight: 700, color: isDark ? '#ffffff' : '#0f172a', marginBottom: '8px' }}>
            {referrerName} te convidou!
          </h1>
          <p style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: '14px', marginBottom: '32px', lineHeight: 1.6 }}>
            Crie sua conta no{' '}
            <span style={{ color: '#60a5fa', fontWeight: 600 }}>minhAi</span>
            {' '}e tenha seu próprio assistente de IA para automatizar seu negócio.
          </p>

          {/* Benefícios */}
          <div style={{ marginBottom: '32px', textAlign: 'left' }}>
            {[
              'Assistente de voz e texto com IA para seu negócio',
              'Integração com WhatsApp, Instagram e Facebook',
              'Pagamentos PIX com confirmação automática integrados',
              'Prático e fácil de configurar, sem necessidade de programação',
            ].map((item) => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{
                  width: '20px', height: '20px', flexShrink: 0,
                  background: 'rgba(34,197,94,0.15)', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg style={{ width: '12px', height: '12px', color: '#4ade80' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span style={{ color: isDark ? '#cbd5e1' : '#475569', fontSize: '14px' }}>{item}</span>
              </div>
            ))}
          </div>

          {/* Botão principal */}
          <button
            onClick={() => {
              window.location.href = '/';
            }}
            style={{
              display: 'block', width: '100%', padding: '16px',
              background: '#2563eb', color: '#ffffff',
              borderRadius: '12px', fontWeight: 700, fontSize: '16px',
              border: 'none', cursor: 'pointer', transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#1d4ed8')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#2563eb')}
          >
            Criar minha conta grátis
          </button>

          <p style={{ color: isDark ? '#475569' : '#94a3b8', fontSize: '12px', marginTop: '16px' }}>
            Já tem conta?{' '}
            <Link href="/login" style={{ color: isDark ? '#94a3b8' : '#64748b', textDecoration: 'none' }}>
              Fazer login
            </Link>
          </p>
        </div>

        <p style={{ textAlign: 'center', fontSize: '12px', color: isDark ? '#1e293b' : '#94a3b8', marginTop: '24px' }}>
          minhAi — Uma IA pra chamar de sua!
        </p>
      </div>
    </div>
  );
}