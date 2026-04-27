'use client';

// KioskWrapper.tsx
// Caminho: app/ia/[slug]/KioskWrapper.tsx
//
// Wrapper client-side que desabilita comportamentos indesejados
// em modo kiosk: clique direito, seleção de texto, arraste.
// Separado do layout.tsx (Server Component) pois usa event handlers.

export default function KioskWrapper({ children }: { children: React.ReactNode }) {
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
        /* Desabilita arraste de imagens */
        img, svg {
          -webkit-user-drag: none;
          user-drag: none;
          pointer-events: none;
        }
        /* Reabilita pointer-events em botões e links */
        button, a, [role="button"] {
          pointer-events: auto;
        }
      `}</style>
      <main
        className="flex-1"
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      >
        {children}
      </main>
    </>
  );
}
