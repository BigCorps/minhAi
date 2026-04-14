// ============================================================
// DIFF CIRÚRGICO — SlugHeader.tsx
// 3 mudanças apenas
// ============================================================


// ── MUDANÇA 1 ────────────────────────────────────────────────
// Interface: adicionar modo_links_enabled na company + 'link' no pageType
// ANTES:
  company: {
    name: string;
    logo_url?: string | null;
    assistant_role?: string | null;
    webapp_enabled?: boolean;
    modo_vendas_enabled?: boolean;
    modo_fila_enabled?: boolean;
    id: string;
  };
  // ...
  pageType?: 'ia' | 'vendas' | 'fila' | 'cliente';

// DEPOIS:
  company: {
    name: string;
    logo_url?: string | null;
    assistant_role?: string | null;
    webapp_enabled?: boolean;
    modo_vendas_enabled?: boolean;
    modo_fila_enabled?: boolean;
    modo_links_enabled?: boolean;   // ← NOVO
    id: string;
  };
  // ...
  pageType?: 'ia' | 'vendas' | 'fila' | 'cliente' | 'link';  // ← NOVO valor


// ── MUDANÇA 2 ────────────────────────────────────────────────
// Variáveis de visibilidade dos botões: adicionar showLinksButton
// ANTES (após showClienteButton):
  const showClienteButton    = pageType !== 'cliente';

// DEPOIS:
  const showClienteButton    = pageType !== 'cliente';
  const showLinksButton      = company.modo_links_enabled === true && pageType !== 'link';  // ← NOVO


// ── MUDANÇA 3 ────────────────────────────────────────────────
// NavigationButtons: adicionar handler + botão de Links
// ANTES (handleNavigateToFila):
  const handleNavigateToFila   = () => navigateContextual(router, 'fila',    slug);

// DEPOIS:
  const handleNavigateToFila   = () => navigateContextual(router, 'fila',    slug);
  const handleNavigateToLinks  = () => navigateContextual(router, 'link',    slug);  // ← NOVO

// ANTES (dentro de NavigationButtons, após bloco do showFilaButton):
        {/* Cliente / Avatar */}
        {showClienteButton && (

// DEPOIS (inserir bloco de Links ANTES do Cliente):
        {/* Links */}
        {showLinksButton && (
          <button onClick={handleNavigateToLinks} className={btn()} title="Página de Links">
            <svg className={sz} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </button>
        )}

        {/* Cliente / Avatar */}
        {showClienteButton && (
