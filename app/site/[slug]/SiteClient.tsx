// app/site/[slug]/SiteClient.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import SlugHeaderWrapper from '@/app/ia/[slug]/SlugHeaderWrapper';
import SlugFooter from '@/components/slug/SlugFooter';

interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  assistant_role: string | null;
  webapp_enabled: boolean;
  webapp_home: string | null;
  webapp_theme_color: string | null;
  website: string;
  modo_vendas_enabled: boolean;
  modo_fila_enabled: boolean;
  modo_links_enabled: boolean;
}

interface SiteClientProps {
  company: Company;
}

type IframeStatus = 'loading' | 'ok' | 'blocked';

export default function SiteClient({ company }: SiteClientProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [iframeStatus, setIframeStatus] = useState<IframeStatus>('loading');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const theme = mounted ? (resolvedTheme as 'dark' | 'light' ?? 'dark') : 'dark';
  const isDark = theme === 'dark';

  useEffect(() => {
    setMounted(true);

    // Timeout: se após 5s o iframe não disparou onLoad, provavelmente bloqueado
    timeoutRef.current = setTimeout(() => {
      setIframeStatus(prev => prev === 'loading' ? 'blocked' : prev);
    }, 5000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleIframeLoad = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Tentar acessar o contentDocument — se bloqueado, lança erro de cross-origin
    try {
      const doc = iframeRef.current?.contentDocument;
      // Se chegou aqui sem erro e tem conteúdo, está ok
      if (doc && doc.body) {
        setIframeStatus('ok');
      } else {
        // Carregou mas sem conteúdo acessível — assume ok (cross-origin normal)
        setIframeStatus('ok');
      }
    } catch {
      // Cross-origin sem bloqueio de iframe — é o comportamento normal e esperado
      setIframeStatus('ok');
    }
  };

  const handleIframeError = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIframeStatus('blocked');
  };

  if (!mounted) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0f172a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 40, height: 40,
          border: '3px solid rgba(99,102,241,0.3)',
          borderTopColor: '#6366f1',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: isDark ? '#0f172a' : '#f8fafc',
      overflow: 'hidden',
      paddingBottom: 32, // altura do SlugFooter (h-8 = 32px)
      boxSizing: 'border-box',
    }}>
      {/* Header */}
      <SlugHeaderWrapper
        company={{
          id: company.id,
          name: company.name,
          logo_url: company.logo_url,
          assistant_role: company.assistant_role,
          webapp_enabled: company.webapp_enabled,
          webapp_home: company.webapp_home,
          website: company.website,
          modo_vendas_enabled: company.modo_vendas_enabled,
          modo_fila_enabled: company.modo_fila_enabled,
          modo_links_enabled: company.modo_links_enabled,
        }}
        slug={company.slug}
        pageType="site"
        overlayMode={false}
      />

      {/* Iframe area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}>

        {/* Loading skeleton */}
        {iframeStatus === 'loading' && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 10,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 16,
            background: isDark ? '#0f172a' : '#f8fafc',
          }}>
            <div style={{
              width: 48, height: 48,
              border: `3px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
              borderTopColor: company.webapp_theme_color || '#6366f1',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
            <p style={{ fontSize: 14, color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
              Carregando {company.name}...
            </p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Bloqueado — fallback */}
        {iframeStatus === 'blocked' && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 10,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 20,
            background: isDark ? '#0f172a' : '#f8fafc',
            padding: 32, textAlign: 'center',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(239,68,68,0.1)',
              border: '2px solid rgba(239,68,68,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="28" height="28" fill="none" stroke="#ef4444" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: isDark ? '#f1f5f9' : '#0f172a', marginBottom: 8 }}>
                Site não pode ser exibido aqui
              </h2>
              <p style={{ fontSize: 14, color: isDark ? 'rgba(241,245,249,0.55)' : 'rgba(15,23,42,0.55)', maxWidth: 400, lineHeight: 1.6 }}>
                O site <strong>{company.website}</strong> bloqueou o uso dentro de outros aplicativos.
                Isso é uma configuração de segurança do site e não pode ser alterada pelo minhAi.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '12px 24px', borderRadius: 10, fontSize: 14, fontWeight: 600,
                  background: company.webapp_theme_color || '#6366f1',
                  color: '#fff', textDecoration: 'none',
                }}
              >
                Abrir site em nova aba ↗
              </a>
              <button
                onClick={() => window.history.back()}
                style={{
                  padding: '12px 24px', borderRadius: 10, fontSize: 14, fontWeight: 600,
                  background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                  border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                  color: isDark ? '#f1f5f9' : '#0f172a', cursor: 'pointer',
                }}
              >
                ← Voltar
              </button>
            </div>
          </div>
        )}

        {/* Iframe */}
        <iframe
          ref={iframeRef}
          src={company.website}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block',
            opacity: iframeStatus === 'ok' ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
          title={company.name}
          allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; payment"
          sandbox="allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts allow-top-navigation-by-user-activation"
        />
      </div>

      {/* Footer */}
      <SlugFooter
        theme={theme}
        slug={company.slug}
        webapp_enabled={company.webapp_enabled}
      />
    </div>
  );
}
