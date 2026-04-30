'use client';
// KioskWrapper.tsx
// Caminho: app/ia/[slug]/KioskWrapper.tsx
//
// Wrapper client-side que desabilita comportamentos indesejados
// em modo kiosk: clique direito, seleção de texto, arraste.
// Separado do layout.tsx (Server Component) pois usa event handlers.
//
// ✅ FIX: Exceção para teclado virtual funcionar corretamente

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
      >
        {children}
      </main>
    </>
  );
}
