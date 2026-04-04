// lib/routing-utils.ts
/**
 * Utilitários para navegação context-aware.
 * Detecta se está em subdomínio próprio ou minhai.app e ajusta rotas.
 */

/**
 * Detecta se estamos em um subdomínio personalizado (*.minhai.com.br / *.minhai.app)
 * @returns { isSubdomain: boolean, currentSlug: string | null }
 */
export function detectSubdomainContext(): {
  isSubdomain: boolean;
  currentSlug: string | null;
} {
  if (typeof window === 'undefined') {
    return { isSubdomain: false, currentSlug: null };
  }

  const hostname = window.location.hostname;

  // Subdomínio .minhai.com.br (ex: loja.minhai.com.br)
  const isMinhaiBr = hostname.endsWith('.minhai.com.br') && !hostname.startsWith('www.');
  if (isMinhaiBr) {
    const slug = hostname.replace('.minhai.com.br', '');
    return { isSubdomain: true, currentSlug: slug };
  }

  // Subdomínio .minhai.app (ex: loja.minhai.app)
  const isMinhaiApp = hostname.endsWith('.minhai.app') && !hostname.startsWith('www.');
  if (isMinhaiApp) {
    const slug = hostname.replace('.minhai.app', '');
    return { isSubdomain: true, currentSlug: slug };
  }

  // Localhost com subdomínio (ex: loja.localhost:3000)
  const isDevSub = hostname.includes('.localhost');
  if (isDevSub) {
    const slug = hostname.split('.')[0];
    return { isSubdomain: true, currentSlug: slug };
  }

  // Está em minhai.app (sem subdomínio)
  return { isSubdomain: false, currentSlug: null };
}

/**
 * Gera a URL correta para navegação baseada no contexto atual.
 * 
 * @param route - Rota desejada (ex: 'vendas', 'fila', 'ia')
 * @param slug - Slug da empresa (opcional se estiver em subdomínio)
 * @returns URL completa para navegação
 * 
 * @example
 * // Em loja.minhai.com.br
 * getContextualRoute('vendas') → '/vendas'
 * 
 * // Em minhai.app
 * getContextualRoute('vendas', 'loja') → '/vendas/loja'
 */
export function getContextualRoute(
  route: 'ia' | 'vendas' | 'fila' | 'atendimento' | 'kiosk',
  slug?: string
): string {
  const { isSubdomain, currentSlug } = detectSubdomainContext();

  // Se está em subdomínio, usa rota simples (sem slug na URL)
  if (isSubdomain) {
    return `/${route}`;
  }

  // Se não está em subdomínio, precisa do slug na URL
  if (!slug) {
    console.warn(`getContextualRoute: slug necessário quando não está em subdomínio`);
    return '/';
  }

  return `/${route}/${slug}`;
}

/**
 * Navega para uma rota usando o contexto correto.
 * 
 * @param router - Next.js router instance
 * @param route - Rota desejada
 * @param slug - Slug da empresa (opcional se estiver em subdomínio)
 * 
 * @example
 * import { useRouter } from 'next/navigation';
 * const router = useRouter();
 * navigateContextual(router, 'vendas', 'loja');
 */
export function navigateContextual(
  router: any,
  route: 'ia' | 'vendas' | 'fila' | 'atendimento' | 'kiosk',
  slug?: string
): void {
  const url = getContextualRoute(route, slug);
  router.push(url);
}
