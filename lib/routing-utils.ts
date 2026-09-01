/**
 * Utilitários para navegação context-aware.
 * Detecta se está em um subdomínio próprio e ajusta rotas.
 */
export function detectSubdomainContext(): {
  isSubdomain: boolean;
  currentSlug: string | null;
} {
  if (typeof window === 'undefined') {
    return { isSubdomain: false, currentSlug: null };
  }

  const hostname = window.location.hostname;

  const SUBDOMAIN_SUFFIXES = [
    '.minhai.app',
    '.minhai.com.br',
    '.minhaia.app',
    '.nossaia.app',
    '.suaia.app',
    '.funcionaria.net',
  ];

  for (const domain of SUBDOMAIN_SUFFIXES) {
    if (hostname.endsWith(domain) && !hostname.startsWith('www.')) {
      const slug = hostname.replace(domain, '');
      return { isSubdomain: true, currentSlug: slug };
    }
  }

  const isDevSub = hostname.includes('.localhost');
  if (isDevSub) {
    const slug = hostname.split('.')[0];
    return { isSubdomain: true, currentSlug: slug };
  }

  return { isSubdomain: false, currentSlug: null };
}

export function getContextualRoute(
  route: 'ia' | 'vendas' | 'fila' | 'atendimento' | 'kiosk' | 'cliente' | 'link' | 'site',
  slug?: string
): string {
  const { isSubdomain } = detectSubdomainContext();

  if (isSubdomain) {
    if (route === 'ia') return '/';
    return `/${route}`;
  }

  if (!slug) {
    console.warn('getContextualRoute: slug necessário quando não está em subdomínio');
    return '/';
  }

  return `/${route}/${slug}`;
}

export function navigateContextual(
  router: any,
  route: 'ia' | 'vendas' | 'fila' | 'atendimento' | 'kiosk' | 'cliente' | 'link',
  slug?: string
): void {
  const url = getContextualRoute(route, slug);
  router.push(url);
}
