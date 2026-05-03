'use client';
// KioskWrapper.tsx
// Caminho: app/ia/[slug]/KioskWrapper.tsx
//
// Wrapper client-side que desabilita comportamentos indesejados
// em modo kiosk: clique direito, seleção de texto, arraste.
// Separado do layout.tsx (Server Component) pois usa event handlers.
//
// ✅ FIX: Exceção para teclado virtual funcionar corretamente

import { useEffect } from 'react';

export default function KioskWrapper({ children }: { children: React.ReactNode }) {

  // Monkey-patch window.open para bloquear qualquer abertura de link externo no kiosk
  useEffect(() => {
    const originalOpen = window.open.bind(window);

    window.open = (...args: Parameters<typeof window.open>) => {
      try {
        const session = sessionStorage.getItem('eai:kioskSession');
        const isKiosk = session ? JSON.parse(session)?.active === true : false;
        if (isKiosk) return null; // bloqueia silenciosamente
      } catch {}
      return originalOpen(...args);
    };

    // Listener reativo: quando o kiosk muda, o patch já está no lugar
    // (a verificação é feita em tempo de execução dentro do window.open)

    return () => {
      window.open = originalOpen; // restaura ao desmontar
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
          /* ✅ REMOVIDO: pointer-events: none; (bloqueava o teclado virtual) */
        }
        
        /* ✅ NOVA REGRA: Teclado virtual sempre funcional */
        /* Garante que todos os elementos dentro do teclado virtual sejam clicáveis */
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
            if (!isKiosk) return; // fora do kiosk, comportamento normal
          } catch { return; }

          const anchor = (e.target as HTMLElement).closest('a');
          if (!anchor) return;
          const href = anchor.getAttribute('href') ?? '';
          const isExternal = href.startsWith('http') || href.startsWith('//') || anchor.target === '_blank';
          if (isExternal) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        {children}
      </main>
    </>
  );
}
