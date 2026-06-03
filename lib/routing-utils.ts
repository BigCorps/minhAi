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

const MINHAI_DOMAINS = [
    '.minhai.app',
    '.minhai.com.br',
    '.minhaia.app',
    '.nossaia.app',
    '.suaia.app',
  ];

  for (const domain of MINHAI_DOMAINS) {
    if (hostname.endsWith(domain) && !hostname.startsWith('www.')) {
      const slug = hostname.replace(domain, '');
      return { domain: true, currentSlug: slug };
    }
  }

  // Localhost com subdomínio (ex: loja.localhost:3000)
  const isDevSub = hostname.includes('.localhost');
  if (isDevSub) {
    const slug = hostname.split('.')[0];
    return { domain: true, currentSlug: slug };
  }

  // Está em minhai.app (sem subdomínio)
  return { domain: false, currentSlug: null };
}

/**
 * Gera a URL correta para navegação baseada no contexto atual.
 * 
 * @param route - Rota desejada (ex: 'vendas', 'fila', 'ia', 'cliente')
 * @param slug - Slug da empresa (opcional se estiver em subdomínio)
 * @returns URL completa para navegação
 * 
 * @example
 * // Em loja.minhai.com.br
 * getContextualRoute('vendas') → '/vendas'
 * getContextualRoute('ia') → '/'  ← volta para home
 * getContextualRoute('cliente') → '/cliente'
 * 
 * // Em minhai.app
 * getContextualRoute('vendas', 'loja') → '/vendas/loja'
 * getContextualRoute('ia', 'loja') → '/ia/loja'
 * getContextualRoute('cliente', 'loja') → '/cliente/loja'
 */
export function getContextualRoute(
  route: 'ia' | 'vendas' | 'fila' | 'atendimento' | 'kiosk' | 'cliente' | 'link' | 'site',
  slug?: string
): string {
  const { domain, currentSlug } = detectSubdomainContext();

  // Se está em subdomínio
  if (isSubdomain) {
    if (route === 'ia') return '/';
    return `/${route}`;
  }

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
  route: 'ia' | 'vendas' | 'fila' | 'atendimento' | 'kiosk' | 'cliente' | 'link',
  slug?: string
): void {
  const url = getContextualRoute(route, slug);
  router.push(url);
}
