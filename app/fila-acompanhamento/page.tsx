'use client';

import { useState, useEffect } from 'react';

export default function FilaAtendimentoPage() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const saved = localStorage.getItem('publicTheme') as 'dark' | 'light' | null;
    setTheme(saved || (prefersDark ? 'dark' : 'light'));
  }, []);

  if (!mounted) return null;

  const isDark = theme === 'dark';

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('publicTheme', next);
  };

  const bg = isDark ? '#020617' : '#f1f5f9';
  const cardBg = isDark ? '#0f172a' : '#ffffff';
  const cardBorder = isDark ? '#334155' : '#e2e8f0';
  const textPrimary = isDark ? '#ffffff' : '#0f172a';
  const textSecondary = isDark ? '#94a3b8' : '#64748b';
  const accentColor = '#3b82f6';

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: bg, 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '24px', 
      transition: 'background 0.3s', 
      fontFamily: 'sans-serif',
      textAlign: 'center'
    }}>
      
      {/* Botão de Tema */}
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

      <div style={{ width: '100%', maxWidth: '600px' }}>
        {/* Ícone de Fila */}
        <div style={{ 
          width: '80px', 
          height: '80px', 
          borderRadius: '20px', 
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          margin: '0 auto 24px',
          boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.3)'
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        </div>

        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: 800, 
          color: textPrimary, 
          marginBottom: '16px',
          letterSpacing: '-0.025em'
        }}>
          Gerenciamento de Fila Inteligente
        </h1>
        
        <p style={{ 
          fontSize: '18px', 
          lineHeight: '1.6', 
          color: textSecondary, 
          marginBottom: '32px' 
        }}>
          Organize o atendimento do seu negócio com a tecnologia da <strong>minhAi</strong>. 
          Reduza a espera, melhore a experiência do cliente e tenha controle total do seu fluxo de atendimento.
        </p>

        <div style={{
          background: cardBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: '24px',
          padding: '32px',
          marginBottom: '40px',
          boxShadow: isDark ? 'none' : '0 10px 25px rgba(0,0,0,0.05)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '24px',
          textAlign: 'left'
        }}>
          <div>
            <h3 style={{ color: accentColor, fontWeight: 700, marginBottom: '8px' }}>Painel de Senhas</h3>
            <p style={{ color: textSecondary, fontSize: '14px' }}>Visualização clara e moderna para seus clientes acompanharem a vez.</p>
          </div>
          <div>
            <h3 style={{ color: accentColor, fontWeight: 700, marginBottom: '8px' }}>Chamada por Voz</h3>
            <p style={{ color: textSecondary, fontSize: '14px' }}>Sistema integrado que anuncia as senhas automaticamente por áudio.</p>
          </div>
          <div>
            <h3 style={{ color: accentColor, fontWeight: 700, marginBottom: '8px' }}>Acompanhamento</h3>
            <p style={{ color: textSecondary, fontSize: '14px' }}>O cliente pode acompanhar a posição da fila direto pelo celular.</p>
          </div>
          <div>
            <h3 style={{ color: accentColor, fontWeight: 700, marginBottom: '8px' }}>Relatórios AI</h3>
            <p style={{ color: textSecondary, fontSize: '14px' }}>Insights automáticos sobre horários de pico e tempo de atendimento.</p>
          </div>
        </div>

        <a
          href="https://minhai.app"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            padding: '18px 48px',
            background: accentColor,
            color: '#ffffff',
            borderRadius: '16px',
            fontWeight: 700,
            fontSize: '18px',
            textDecoration: 'none',
            boxShadow: '0 4px 14px 0 rgba(59, 130, 246, 0.39)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.23)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 14px 0 rgba(59, 130, 246, 0.39)';
          }}
        >
          Saiba Mais na minhAi
        </a>

        <p style={{ marginTop: '32px', fontSize: '14px', color: textSecondary }}>
          Transforme sua espera em uma experiência premium.
        </p>
      </div>
    </div>
  );
}
