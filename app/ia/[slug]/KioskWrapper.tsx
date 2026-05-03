'use client';
// KioskWrapper.tsx
// Caminho: app/ia/[slug]/KioskWrapper.tsx
//
// Wrapper client-side que desabilita comportamentos indesejados
// em modo kiosk: clique direito, seleção de texto, arraste.
// Separado do layout.tsx (Server Component) pois usa event handlers.
//
// ✅ FIX: Exceção para teclado virtual funcionar corretamente

import { useEffect, useState } from 'react';

// ── Toast de bloqueio kiosk ───────────────────────────────────────────────────
function KioskBlockedToast() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handle = () => {
      setVisible(true);
      setTimeout(() => setVisible(false), 2500);
    };
    window.addEventListener('eai:kioskBlocked', handle);
    return () => window.removeEventListener('eai:kioskBlocked', handle);
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 48,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        background: 'rgba(15,23,42,0.95)',
        border: '1px solid rgba(239,68,68,0.4)',
        borderRadius: 14,
        padding: '10px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {/* Ícone cadeado */}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>
        Bloqueado em modo kiosk
      </span>
    </div>
  );
}

export default function KioskWrapper({ children }: { children: React.ReactNode }) {

  // Monkey-patch window.open para bloquear qualquer abertura de link externo no kiosk
  useEffect(() => {
    const originalOpen = window.open.bind(window);

    window.open = (...args: Parameters<typeof window.open>) => {
      try {
        const session = sessionStorage.getItem('eai:kioskSession');
        const isKiosk = session ? JSON.parse(session)?.active === true : false;
        if (isKiosk) {
          window.dispatchEvent(new CustomEvent('eai:kioskBlocked'));
          return null;
        }
      } catch {}
      return originalOpen(...args);
    };

    return () => {
      window.open = originalOpen;
    };
  }, []);

  return (
    <>
      <style>{`
        /* Kiosk: desabilita seleção de texto, menu de contexto e arraste */
        * {
          -webkit-user-select: none;
          -moz-user-select: none;
          user-select: none;
          -webkit-touch-callout: none;
          -webkit-tap-highlight-color: transparent;
        }
        
        /* Exceção: campos de texto continuam funcionando */
        input, textarea, [contenteditable="true"] {
          -webkit-user-select: text;
          -moz-user-select: text;
          user-select: text;
        }
        
        /* Desabilita arraste de imagens — MAS MANTÉM EVENTOS DE POINTER */
        img, svg {
          -webkit-user-drag: none;
          user-drag: none;
        }
        
        /* ✅ NOVA REGRA: Teclado virtual sempre funcional */
        [data-virtual-keyboard],
        [data-virtual-keyboard] *,
        [data-virtual-keyboard] button,
        [data-virtual-keyboard] svg,
        [data-virtual-keyboard] input {
          pointer-events: auto !important;
          -webkit-user-select: none !important;
          user-select: none !important;
        }
        
        /* Reabilita pointer-events em botões e links gerais */
        button, a, [role="button"] {
          pointer-events: auto;
        }
        
        /* ✅ EXCEÇÃO: Input de texto do teclado virtual pode selecionar texto */
        [data-virtual-keyboard] input {
          -webkit-user-select: text !important;
          user-select: text !important;
        }
      `}</style>
      <main
        className="flex-1"
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
        onClick={(e) => {
          try {
            const session = sessionStorage.getItem('eai:kioskSession');
            const isKiosk = session ? JSON.parse(session)?.active === true : false;
            if (!isKiosk) return;
          } catch { return; }

          const anchor = (e.target as HTMLElement).closest('a');
          if (!anchor) return;
          const href = anchor.getAttribute('href') ?? '';
          const isExternal = href.startsWith('http') || href.startsWith('//') || anchor.target === '_blank';
          if (isExternal) {
            e.preventDefault();
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent('eai:kioskBlocked'));
          }
        }}
      >
        {children}
      </main>
      <KioskBlockedToast />
    </>
  );
}
